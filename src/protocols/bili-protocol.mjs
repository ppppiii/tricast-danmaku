// Bilibili Live WebSocket binary framing (protover=2 deflate), normalization, and unified segments.

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MAX_PAYLOAD_BYTES = 8 * 1024 * 1024;

export function encodeBiliPacket(op, body = '') {
  const data = encoder.encode(typeof body === 'string' ? body : JSON.stringify(body));
  const out = new Uint8Array(16 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, out.length);
  view.setUint16(4, 16);
  view.setUint16(6, 1);
  view.setUint32(8, op);
  view.setUint32(12, 1);
  out.set(data, 16);
  return out;
}

async function inflateBytes(body) {
  const reader = new Blob([body]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
  const parts = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_PAYLOAD_BYTES) throw new Error('B 站弹幕压缩包超出安全上限');
      parts.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export async function decodeBiliFrames(data, depth = 0) {
  if (depth > 4 || data.byteLength > MAX_PAYLOAD_BYTES) {
    throw new Error('B 站弹幕数据包超限');
  }
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = [];

  for (let i = 0; i < bytes.length; ) {
    if (bytes.length - i < 16) throw new Error('B 站弹幕包头不完整');
    const packetLen = view.getUint32(i);
    const headerLen = view.getUint16(i + 4);
    const protoVer = view.getUint16(i + 6);
    const op = view.getUint32(i + 8);
    if (packetLen < 16 || headerLen < 16 || headerLen > packetLen || i + packetLen > bytes.length) {
      throw new Error('B 站弹幕包长度无效');
    }
    const body = bytes.subarray(i + headerLen, i + packetLen);
    if (protoVer === 2) {
      out.push(...(await decodeBiliFrames(await inflateBytes(body), depth + 1)));
    } else if (op === 3) {
      out.push({ op, body: null });
    } else if (op === 5 || op === 8) {
      try {
        out.push({ op, body: JSON.parse(decoder.decode(body)) });
      } catch {
        // Ignore malformed JSON frames
      }
    }
    i += packetLen;
  }

  return out;
}

function asObj(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string' && value.length < 65536) {
    try {
      return asObj(JSON.parse(value));
    } catch {
      return {};
    }
  }
  return {};
}

export function safeBiliImageUrl(raw) {
  if (typeof raw !== 'string' || raw.length > 2048) return '';
  try {
    const u = new URL(raw.startsWith('//') ? 'https:' + raw : raw);
    if (
      !['http:', 'https:'].includes(u.protocol) ||
      u.username ||
      u.password ||
      !['hdslb.com', 'biliimg.com'].some((d) => u.hostname === d || u.hostname.endsWith('.' + d))
    ) {
      return '';
    }
    u.protocol = 'https:';
    return u.href;
  } catch {
    return '';
  }
}

function buildBiliInlineSegments(text, emotsObj) {
  const emotes = [];
  for (const [token, val] of Object.entries(asObj(emotsObj)).slice(0, 64)) {
    const info = asObj(val);
    const url = safeBiliImageUrl(info.url);
    if (url && token && token.length <= 80 && text.includes(token)) {
      emotes.push({ token, url });
    }
  }
  if (!emotes.length) {
    return { segments: [{ type: 'text', text }], hasEmote: false };
  }

  // Sort longest token first to match compound emote names before shorter prefixes
  const escaped = emotes
    .map((e) => e.token)
    .sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp('(' + escaped.join('|') + ')', 'g');
  const map = new Map(emotes.map((e) => [e.token, e.url]));

  const parts = text.split(re);
  const segments = [];
  let hasEmote = false;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p) continue;
    const emoteUrl = map.get(p);
    if (emoteUrl) {
      hasEmote = true;
      segments.push({ type: 'emote', url: emoteUrl, alt: p });
    } else {
      segments.push({ type: 'text', text: p });
    }
  }
  return { segments, hasEmote };
}

export function normalizeBiliCommand(body, receivedAt = Date.now()) {
  if (typeof body?.cmd !== 'string') return null;
  const cmd = body.cmd.split(':')[0];
  const data = asObj(body.data);

  if (cmd === 'DANMU_MSG') {
    const info = body.info;
    if (!Array.isArray(info)) return null;

    const text = String(info[1] || '').slice(0, 2000).trim();
    const meta15 = asObj(info[0]?.[15]);
    const metaUser = asObj(meta15.user);
    const metaBase = asObj(metaUser.base);
    const rawUid = info[2]?.[0] || metaUser.uid || '';
    const uid = rawUid && String(rawUid) !== '0' ? String(rawUid) : '';
    const user = String(info[2]?.[1] || metaBase.name || '观众').slice(0, 100).trim();
    const rgb = info[0]?.[3];
    const color =
      Number.isInteger(rgb) && rgb >= 0 && rgb <= 0xffffff
        ? '#' + rgb.toString(16).padStart(6, '0')
        : '';

    const extra = asObj(meta15.extra);
    const idStr = String(extra.id_str || '').trim();
    const tsSecOrMs = Number(info[0]?.[4]);
    const createdAtMs =
      Number.isFinite(tsSecOrMs) && tsSecOrMs > 1e12
        ? tsSecOrMs
        : Number.isFinite(tsSecOrMs) && tsSecOrMs > 1e9
          ? tsSecOrMs * 1000
          : receivedAt;

    // Fallback stable fingerprint when id_str is absent in legacy test payloads
    const id = idStr || `bili:${uid}:${createdAtMs}:${text}`;

    // Big room sticker (dm_type === 1)
    const bigEmoteData = asObj(info[0]?.[13]);
    const bigEmoteUrl = safeBiliImageUrl(bigEmoteData.url);
    if (bigEmoteUrl) {
      return {
        kind: 'danmaku',
        message: {
          platform: 'bilibili',
          id,
          uid,
          user,
          color,
          text: text || '[表情]',
          sendText: '',
          hasMedia: true,
          hasGif: true,
          segments: [{ type: 'sticker', url: bigEmoteUrl, alt: text || '[表情]' }],
          createdAtMs,
          receivedAt,
        },
      };
    }

    if (!text) return null;
    const { segments, hasEmote } = buildBiliInlineSegments(text, extra.emots);
    return {
      kind: 'danmaku',
      message: {
        platform: 'bilibili',
        id,
        uid,
        user,
        color,
        text,
        sendText: text,
        hasMedia: hasEmote,
        hasGif: false,
        segments,
        createdAtMs,
        receivedAt,
      },
    };
  }

  if (cmd === 'SUPER_CHAT_MESSAGE' || cmd === 'SUPER_CHAT_MESSAGE_JPN') {
    const id = String(data.id || '').trim();
    const text = String(data.message || data.message_jpn || '').slice(0, 500).trim();
    const price = Number(data.price || 0);
    if (!text && !(price > 0)) return null;
    const uinfo = asObj(data.user_info);
    const uid = data.uid ? String(data.uid) : uinfo.uid ? String(uinfo.uid) : '';
    const user = String(uinfo.uname || '观众').slice(0, 100).trim();
    const avatar = safeBiliImageUrl(uinfo.face || '');
    const duration = Math.max(15, Math.min(3600, Number(data.time) || 60));
    const hex = (v) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim().toLowerCase() : '');
    const headerColor = hex(data.background_price_color) || hex(data.background_color);
    const bgColor = hex(data.background_bottom_color) || hex(data.background_price_color);
    const startSec = Number(data.start_time || data.ts || 0);
    const createdAtMs = startSec > 1e9 ? startSec * 1000 : receivedAt;
    return {
      kind: 'superchat',
      superchat: {
        platform: 'bilibili',
        id: id || `sc:${uid}:${createdAtMs}:${price}`,
        uid,
        user,
        avatar,
        price,
        text: text || `发送了 ¥${price} 醒目留言`,
        duration,
        headerColor,
        bgColor,
        createdAtMs,
        receivedAt,
      },
    };
  }

  if (cmd === 'SUPER_CHAT_MESSAGE_DELETE') {
    const ids = (Array.isArray(data.ids) ? data.ids : [])
      .slice(0, 1000)
      .map(String)
      .filter((id) => /^[\w-]{1,80}$/.test(id));
    if (ids.length) return { kind: 'delete', ids };
  }

  return null;
}
