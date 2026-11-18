// Pure protocol parser for Kick Pusher WebSocket events, 7TV emote tokens, Tenor/Giphy GIFs,
// and moderator-deleted tombstone filtering.

export const DELETED_PLACEHOLDER_RE =
  /^(?:(?:\[|\()?(?:message\s+)?deleted(?:\s+by\s+(?:a\s+)?(?:moderator|broadcaster|author|user|streamer|admin))?(?:\]|\))?$|deleted\s+by\s+(?:a\s+)?(?:moderator|the\s+broadcaster|broadcaster|author|user)\b|message\s+(?:was\s+)?deleted\b|this\s+message\s+(?:was|has\s+been)\s+deleted|被(?:管理员|房管|主播)?删除|已被(?:管理员|房管|主播)?删除|由(?:管理员|房管|主播)删除|消息已删除|该消息已被删除|弹幕已删除|eliminado\s+por\s+un\s+moderador|mensaje\s+eliminado|exclu[ií]do\s+por\s+um\s+moderador|apagado\s+por\s+um\s+moderador|mensagem\s+apagada|supprim[eé]\s+par\s+un\s+mod[eé]rateur|message\s+supprim[eé]|von\s+einem\s+moderator\s+gel[oö]scht|nachricht\s+gel[oö]scht|удалено\s+модератором|сообщение\s+удалено|bir\s+moderat[oö]r\s+taraf[iı]ndan\s+silindi|mesaj\s+silindi|eliminato\s+da\s+un\s+moderatore|usuni[eę]to\s+przez\s+moderatora|モデレーターによって削除|メッセージは削除|모더레이터에\s*의해\s*삭제|메시지가\s*삭제)/i;

const KICK_EMOTE_TOKEN_RE = /(\[emote:(\d+):([^\]]+)\])/g;
const DIRECT_MEDIA_URL_RE =
  /(https?:\/\/[^\s<>"']+\.(?:gif|webp)(?:\?[^\s<>"']*)?|https?:\/\/(?:media\d*\.giphy\.com|media\.tenor\.com|c\.tenor\.com)\/[^\s<>"']+)/gi;

export function isDeletedPlaceholder(text) {
  const cleaned = String(text || '')
    .replace(/^[\s:\u00a0]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return false;
  return DELETED_PLACEHOLDER_RE.test(cleaned);
}

export function safeMediaUrl(raw) {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2048) return '';
  try {
    const normalized = trimmed.startsWith('//') ? 'https:' + trimmed : trimmed;
    const u = new URL(normalized);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return '';
    u.protocol = 'https:';
    return u.href;
  } catch {
    return '';
  }
}

export function ingest7tvEmoteSet(emotes, targetMap = new Map()) {
  if (!Array.isArray(emotes)) return targetMap;
  for (const entry of emotes) {
    const name = entry?.name;
    const host = entry?.data?.host;
    const files = Array.isArray(host?.files) ? host.files : [];
    if (!name || !host?.url || !files.length) continue;
    const picked =
      files.find((f) => f.name === '2x.webp') ||
      files.find((f) => f.name === '1x.webp') ||
      files[0];
    if (!picked?.name) continue;
    const rawUrl = String(host.url).startsWith('//')
      ? 'https:' + host.url + '/' + picked.name
      : 'https://' + String(host.url).replace(/^https?:\/\//, '') + '/' + picked.name;
    const zeroWidth = Boolean((Number(entry.flags) & 1) !== 0 || (Number(entry.data?.flags) & 256) !== 0);
    targetMap.set(name, { url: rawUrl, zeroWidth });
  }
  return targetMap;
}

function buildTextAndThirdPartySegments(chunk, thirdPartyEmotes, out, state) {
  const urlParts = chunk.split(DIRECT_MEDIA_URL_RE);
  for (let i = 0; i < urlParts.length; i++) {
    const part = urlParts[i];
    if (!part) continue;
    if (i % 2 === 1) {
      const url = safeMediaUrl(part);
      if (url && state.mediaCount < 40) {
        state.mediaCount++;
        state.hasGif = true;
        out.push({ type: 'sticker', url, alt: '[GIF]' });
        continue;
      }
    }
    if (!thirdPartyEmotes || typeof thirdPartyEmotes.get !== 'function' || thirdPartyEmotes.size === 0) {
      out.push({ type: 'text', text: part });
      continue;
    }

    const tokens = part.split(/(\s+)/);
    let lastEmoteSeg = null;
    for (let t = 0; t < tokens.length; t++) {
      const tok = tokens[t];
      if (!tok) continue;
      if (/^\s+$/.test(tok)) {
        const nextTok = tokens[t + 1];
        const nextEmote = nextTok ? thirdPartyEmotes.get(nextTok) : null;
        if (nextEmote && nextEmote.zeroWidth && lastEmoteSeg) {
          continue;
        }
        out.push({ type: 'text', text: tok });
        continue;
      }
      const emote = thirdPartyEmotes.get(tok);
      const safeUrl = emote ? safeMediaUrl(emote.url) : '';
      if (emote && safeUrl && state.mediaCount < 40) {
        state.mediaCount++;
        if (emote.zeroWidth && lastEmoteSeg) {
          lastEmoteSeg.overlays ??= [];
          lastEmoteSeg.overlays.push({ url: safeUrl, alt: tok });
        } else {
          const seg = { type: 'emote', url: safeUrl, alt: tok };
          out.push(seg);
          lastEmoteSeg = seg;
        }
      } else {
        lastEmoteSeg = null;
        out.push({ type: 'text', text: tok });
      }
    }
  }
}

export function buildKickSegments(rawContent, thirdPartyEmotes) {
  const raw = String(rawContent || '');
  const segments = [];
  const state = { mediaCount: 0, hasGif: false };
  const parts = raw.split(KICK_EMOTE_TOKEN_RE);
  for (let i = 0; i < parts.length; i += 4) {
    if (parts[i]) {
      buildTextAndThirdPartySegments(parts[i], thirdPartyEmotes, segments, state);
    }
    if (i + 3 < parts.length) {
      const emoteId = parts[i + 2];
      const emoteName = parts[i + 3];
      if (state.mediaCount < 40) {
        state.mediaCount++;
        segments.push({
          type: 'emote',
          url: `https://files.kick.com/emotes/${encodeURIComponent(emoteId)}/fullsize`,
          alt: emoteName,
        });
      } else {
        segments.push({ type: 'text', text: emoteName });
      }
    }
  }
  return {
    segments,
    hasMedia: state.mediaCount > 0,
    hasGif: state.hasGif,
  };
}

export function parseKickPusherFrame(rawData, thirdPartyEmotes = null, receivedAt = Date.now()) {
  let frame;
  try {
    frame = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
  } catch {
    return null;
  }
  if (!frame || typeof frame.event !== 'string') return null;

  let data = frame.data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return { kind: 'system', event: frame.event, data };
    }
  }

  if (frame.event.endsWith('ChatMessageEvent') && data) {
    const rawContent = String(data.content || '');
    const sendText = rawContent
      .replace(/\[emote:\d+:([^\]]+)\]/g, ' $1 ')
      .replace(/\s+/g, ' ')
      .trim();

    if (
      data.deleted ||
      data.type === 'deleted' ||
      isDeletedPlaceholder(sendText || rawContent)
    ) {
      const deletedId = data.id != null ? String(data.id) : '';
      return deletedId ? { kind: 'delete', ids: [deletedId] } : null;
    }

    const user = String(data.sender?.username || '').trim();
    if (!sendText && !user) return null;

    const rawColor = String(data.sender?.identity?.color || data.sender?.color || '').trim();
    const color = /^#[0-9a-f]{6}$/i.test(rawColor) ? rawColor.toLowerCase() : '';
    const uid = data.sender?.id != null ? String(data.sender.id) : '';
    const id = data.id != null ? String(data.id) : '';
    const createdParsed = Date.parse(data.created_at || '');
    const createdAtMs = Number.isFinite(createdParsed) ? createdParsed : receivedAt;

    const { segments, hasMedia, hasGif } = buildKickSegments(rawContent, thirdPartyEmotes);

    return {
      kind: 'danmaku',
      message: {
        platform: 'kick',
        id: id || `kick:${uid}:${createdAtMs}:${sendText}`,
        uid,
        user: user || 'Kick观众',
        color,
        rawContent,
        text: sendText || (hasGif ? '[GIF]' : '[表情]'),
        sendText,
        hasMedia,
        hasGif,
        segments,
        createdAtMs,
        receivedAt,
      },
    };
  }

  if (frame.event === 'pusher:error' && data) {
    return {
      kind: 'pusher-error',
      code: Number(data.code || 0),
      message: String(data.message || ''),
    };
  }

  if (frame.event.endsWith('MessageDeletedEvent') && data) {
    const deletedId = data.message?.id ?? data.id;
    if (deletedId != null) return { kind: 'delete', ids: [String(deletedId)] };
  }

  if (frame.event.endsWith('ChatroomClearEvent')) {
    return { kind: 'clear', platform: 'kick' };
  }

  return { kind: 'system', event: frame.event, data };
}

export function parseKickCentrifugoFrames(rawText, thirdPartyEmotes = null, receivedAt = Date.now()) {
  const lines = String(rawText || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const events = [];

  for (const line of lines) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    if (!obj || typeof obj !== 'object') continue;

    // Centrifugo server ping frame is "{}"
    if (Object.keys(obj).length === 0) {
      events.push({ kind: 'centrifugo-ping' });
      continue;
    }
    if (obj.connect) {
      events.push({ kind: 'centrifugo-connected', connect: obj.connect });
      continue;
    }
    if (obj.subscribe !== undefined && !obj.error) {
      events.push({ kind: 'centrifugo-subscribed', id: obj.id, subscribe: obj.subscribe });
      continue;
    }
    if (obj.refresh) {
      events.push({ kind: 'centrifugo-refreshed', id: obj.id, refresh: obj.refresh });
      continue;
    }
    if (obj.error) {
      events.push({ kind: 'centrifugo-error', id: obj.id, error: obj.error });
      continue;
    }
    if (obj.push?.disconnect) {
      events.push({ kind: 'centrifugo-disconnect', disconnect: obj.push.disconnect });
      continue;
    }
    const pubData = obj.push?.pub?.data;
    if (pubData) {
      const parsed = parseKickPusherFrame(pubData, thirdPartyEmotes, receivedAt);
      if (parsed && ['danmaku', 'delete', 'clear'].includes(parsed.kind)) {
        events.push(parsed);
      }
    }
  }

  return events;
}
