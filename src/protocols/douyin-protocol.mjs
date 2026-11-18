// Bounded Protobuf + Gzip decoder for Douyin Live Webcast WS frames & HTML room extractor.

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MAX_PAYLOAD_BYTES = 8 * 1024 * 1024;

const DOUYIN_IMAGE_HOST_RE = /(?:douyinpic\.com|byteimg\.com|bytednsdoc\.com|snssdk\.com|toutiaoimg\.com)$/i;

const asBytes = (x) => (x instanceof Uint8Array ? x : new Uint8Array(x));

function concatBytes(parts) {
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function pbDecode(data) {
  const b = asBytes(data);
  if (b.length > MAX_PAYLOAD_BYTES) throw new Error('抖音弹幕数据超限');
  let i = 0;
  let nodes = 0;
  const out = Object.create(null);

  const readVarint = () => {
    let n = 0n;
    for (let k = 0; k < 10; k++) {
      if (i >= b.length) throw new Error('抖音弹幕包不完整');
      const v = b[i++];
      n |= BigInt(v & 127) << BigInt(k * 7);
      if (!(v & 128)) return n;
    }
    throw new Error('抖音 varint 无效');
  };

  while (i < b.length) {
    if (++nodes > 120000) throw new Error('抖音字段数超限');
    const header = Number(readVarint());
    const tag = header >>> 3;
    const wireType = header & 7;
    if (!tag) throw new Error('抖音字段 tag 无效');
    let value;
    if (wireType === 0) {
      value = readVarint();
    } else {
      const len = wireType === 2 ? Number(readVarint()) : wireType === 1 ? 8 : wireType === 5 ? 4 : -1;
      if (len < 0 || !Number.isSafeInteger(len) || i + len > b.length) {
        throw new Error('抖音字段长度无效');
      }
      value = b.slice(i, i + len);
      i += len;
    }
    (out[tag] ??= []).push(value);
  }

  return out;
}

function encodeVarint(n) {
  let v = BigInt(n);
  if (v < 0n) throw new Error('varint 不能为负');
  const out = [];
  do {
    const byte = Number(v & 127n);
    v >>= 7n;
    out.push(byte | (v ? 128 : 0));
  } while (v);
  return Uint8Array.from(out);
}

export function pbEncode(fields) {
  return concatBytes(
    fields.flatMap(([tag, value]) => {
      if (typeof value === 'bigint' || typeof value === 'number') {
        return [encodeVarint(tag * 8), encodeVarint(value)];
      }
      const b = typeof value === 'string' ? encoder.encode(value) : asBytes(value);
      return [encodeVarint(tag * 8 + 2), encodeVarint(b.length), b];
    }),
  );
}

async function gunzipBytes(raw) {
  const b = asBytes(raw);
  if (b.length < 2 || b[0] !== 31 || b[1] !== 139) return b;
  const reader = new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const parts = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_PAYLOAD_BYTES) throw new Error('抖音解压包超限');
      parts.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return concatBytes(parts);
}

const pbFirst = (obj, tag) => obj?.[tag]?.[0];
const pbText = (obj, tag) => {
  const v = pbFirst(obj, tag);
  return v instanceof Uint8Array ? decoder.decode(v) : '';
};

export function safeDouyinImageUrl(raw) {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2048) return '';
  try {
    const u = new URL(trimmed.startsWith('//') ? 'https:' + trimmed : trimmed);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return '';
    if (!DOUYIN_IMAGE_HOST_RE.test(u.hostname)) return '';
    u.protocol = 'https:';
    return u.href;
  } catch {
    return '';
  }
}

// Recursively scan nested length-delimited fields inside Douyin Emoji / RTF messages for image URLs
export function extractTrustedDouyinImages(bytes, depth = 0, out = []) {
  if (!(bytes instanceof Uint8Array) || depth > 5 || out.length >= 16) return out;
  if (bytes.length >= 8 && bytes.length <= 2048) {
    // Heuristic: check if UTF-8 bytes form an image URL directly
    const str = decoder.decode(bytes);
    if (/^https?:\/\/|^\/\//i.test(str) && !/[\x00-\x1f]/.test(str)) {
      const safe = safeDouyinImageUrl(str);
      if (safe && !out.includes(safe)) {
        out.push(safe);
        return out;
      }
    }
  }
  let parsed;
  try {
    parsed = pbDecode(bytes);
  } catch {
    return out;
  }
  for (const vals of Object.values(parsed)) {
    for (const v of vals) {
      if (v instanceof Uint8Array) {
        extractTrustedDouyinImages(v, depth + 1, out);
        if (out.length >= 16) return out;
      }
    }
  }
  return out;
}

function normalizeColor(value) {
  if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) {
    return value.toLowerCase();
  }
  return '';
}

function extractDouyinCreateTimeMs(commonObj, fallbackMs) {
  if (!commonObj) return fallbackMs;
  const raw = pbFirst(commonObj, 4);
  if (typeof raw !== 'bigint') return fallbackMs;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return fallbackMs;
  return num > 1e12 ? num : num > 1e9 ? num * 1000 : fallbackMs;
}

export async function decodeDouyinFrame(data, receivedAt = Date.now()) {
  const frame = pbDecode(data);
  const payload = pbFirst(frame, 8);
  if (!payload?.length) return { messages: [], ack: null };

  const response = pbDecode(await gunzipBytes(payload));
  const messages = [];

  for (const rawItem of response[1] || []) {
    let item;
    try {
      item = pbDecode(rawItem);
    } catch {
      continue;
    }
    const method = pbText(item, 1);
    const msgId = String(pbFirst(item, 3) ?? '');

    if (method === 'WebcastChatMessage') {
      let chat;
      try {
        chat = pbDecode(pbFirst(item, 2) || new Uint8Array());
      } catch {
        continue;
      }
      const common = (() => {
        try {
          const c = pbFirst(chat, 1);
          return c instanceof Uint8Array ? pbDecode(c) : null;
        } catch {
          return null;
        }
      })();
      const user = (() => {
        try {
          const u = pbFirst(chat, 2);
          return u instanceof Uint8Array ? pbDecode(u) : {};
        } catch {
          return {};
        }
      })();

      const text = pbText(chat, 3).slice(0, 2000).trim();
      const uname = pbText(user, 3).slice(0, 100).trim() || '抖音观众';
      const uid = String(pbFirst(user, 1) ?? '');
      const color = normalizeColor(pbText(chat, 6));
      const rtfBytes = pbFirst(chat, 15);
      const inlineImages = rtfBytes instanceof Uint8Array ? extractTrustedDouyinImages(rtfBytes) : [];
      if (!text && !inlineImages.length) continue;

      const segments = [];
      if (text) segments.push({ type: 'text', text });
      for (const imgUrl of inlineImages) {
        segments.push({ type: 'emote', url: imgUrl, alt: '[抖音表情]' });
      }

      messages.push({
        platform: 'douyin',
        id: msgId || `dy:${uid}:${text}`,
        uid,
        user: uname,
        color,
        text: text || '[表情]',
        sendText: text,
        hasMedia: inlineImages.length > 0,
        hasGif: false,
        segments,
        createdAtMs: extractDouyinCreateTimeMs(common, receivedAt),
        receivedAt,
      });
    } else if (method === 'WebcastEmojiChatMessage') {
      let emojiMsg;
      try {
        emojiMsg = pbDecode(pbFirst(item, 2) || new Uint8Array());
      } catch {
        continue;
      }
      const common = (() => {
        try {
          const c = pbFirst(emojiMsg, 1);
          return c instanceof Uint8Array ? pbDecode(c) : null;
        } catch {
          return null;
        }
      })();
      const user = (() => {
        try {
          const u = pbFirst(emojiMsg, 2);
          return u instanceof Uint8Array ? pbDecode(u) : {};
        } catch {
          return {};
        }
      })();

      const uname = pbText(user, 3).slice(0, 100).trim() || '抖音观众';
      const uid = String(pbFirst(user, 1) ?? '');
      const defaultContent = pbText(emojiMsg, 5).trim() || pbText(emojiMsg, 4).trim() || '[抖音表情]';
      const contentBytes = pbFirst(emojiMsg, 4);
      const bgBytes = pbFirst(emojiMsg, 6);
      const imgs = [
        ...(contentBytes instanceof Uint8Array ? extractTrustedDouyinImages(contentBytes) : []),
        ...(bgBytes instanceof Uint8Array ? extractTrustedDouyinImages(bgBytes) : []),
      ];
      const stickerUrl = imgs[0] || '';
      if (!stickerUrl && !defaultContent) continue;

      messages.push({
        platform: 'douyin',
        id: msgId || `dy-emoji:${uid}:${defaultContent}`,
        uid,
        user: uname,
        color: '',
        text: defaultContent,
        sendText: '',
        hasMedia: Boolean(stickerUrl),
        hasGif: Boolean(stickerUrl),
        segments: stickerUrl
          ? [{ type: 'sticker', url: stickerUrl, alt: defaultContent }]
          : [{ type: 'text', text: defaultContent }],
        createdAtMs: extractDouyinCreateTimeMs(common, receivedAt),
        receivedAt,
      });
    }
  }

  const ack =
    pbFirst(response, 9) === 1n
      ? pbEncode([
          [2, pbFirst(frame, 2) || 0n],
          [7, 'ack'],
          [8, pbText(response, 5)],
        ])
      : null;

  return { messages, ack };
}

function jsonAt(text, start) {
  while (/\s/.test(text[start] || '') && start < text.length) start++;
  const first = text[start];
  if (!['{', '[', '"'].includes(first)) return null;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') {
        quoted = false;
        if (first === '"') {
          try {
            return JSON.parse(text.slice(start, i + 1));
          } catch {
            return null;
          }
        }
      }
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') {
      if (--depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function findObject(roots, predicate) {
  const queue = Array.isArray(roots) ? [...roots] : [roots];
  let seen = 0;
  while (queue.length && seen++ < 30000) {
    const node = queue.shift();
    if (!node || typeof node !== 'object') continue;
    if (predicate(node)) return node;
    for (const v of Object.values(node)) {
      if (v && typeof v === 'object') queue.push(v);
    }
  }
  return null;
}

export function parseDouyinRoomHtml(html, webRid = '') {
  const text = String(html || '');
  const roots = [];

  for (const m of text.matchAll(/self\.(?:__pace_f|__next_f)\.push\(\[\d+,/g)) {
    const raw = jsonAt(text, m.index + m[0].length);
    if (typeof raw === 'string') {
      const body = raw.replace(/^\w+:/, '');
      try {
        roots.push(JSON.parse(body));
      } catch {}
    } else if (raw && typeof raw === 'object') {
      roots.push(raw);
    }
  }

  for (const id of ['RENDER_DATA', '__NEXT_DATA__']) {
    const m = new RegExp('<script[^>]+id=["\']' + id + '["\'][^>]*>([\\s\\S]*?)</script>').exec(text);
    if (m) {
      try {
        roots.push(JSON.parse(id === 'RENDER_DATA' ? decodeURIComponent(m[1]) : m[1]));
      } catch {}
    }
  }

  const wanted = String(webRid || '').trim();
  const matching = wanted ? findObject(roots, (n) => n.room && n.anchor && String(n.web_rid) === wanted) : null;
  const store =
    matching ||
    findObject(roots, (n) => n.room && n.anchor) ||
    findObject(roots, (n) => n.room && n.room.status !== undefined);
  const info = store?.room || findObject(roots, (n) => n.stream_url && n.status !== undefined);
  const anchor = store?.anchor || info?.owner || {};

  let roomId = '';
  for (const cand of [info?.id_str, info?.id, store?.roomId]) {
    if (typeof cand === 'string' && /^\d{10,24}$/.test(cand)) {
      roomId = cand;
      break;
    }
    if (typeof cand === 'number' && Number.isSafeInteger(cand) && cand > 0) {
      roomId = String(cand);
      break;
    }
  }

  // Fallback regex lookup inside Next/Vite hydration chunks
  if (!roomId) {
    const m = /"(?:roomId|room_id|id_str)"\s*:\s*"(\d{10,24})"/i.exec(text);
    if (m) roomId = m[1];
  }

  let userUniqueId = '';
  const uidCand = store?.user_unique_id || findObject(roots, (n) => typeof n.user_unique_id === 'string')?.user_unique_id;
  if (typeof uidCand === 'string' && /^\d+$/.test(uidCand)) userUniqueId = uidCand;
  if (!userUniqueId) {
    const m = /"user_unique_id"\s*:\s*"(\d{8,24})"/.exec(text);
    if (m) userUniqueId = m[1];
  }

  return {
    roomId,
    userUniqueId,
    nickname: String(anchor?.nickname || '').trim(),
    title: String(info?.title || '').trim(),
    status: info?.status != null ? Number(info.status) : null,
  };
}
