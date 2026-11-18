// Pure-JS MD5, Bilibili WBI signing, and Douyin Webcast WebSocket signature.
// No external dependencies so both Service Worker and Node.js tests can import directly.

const encoder = new TextEncoder();

export function md5(text) {
  const input = text instanceof Uint8Array ? text : encoder.encode(String(text || ''));
  const size = Math.ceil((input.length + 9) / 64) * 64;
  const bytes = new Uint8Array(size);
  bytes.set(input);
  bytes[input.length] = 128;

  const view = new DataView(bytes.buffer);
  view.setUint32(size - 8, (input.length * 8) >>> 0, true);
  view.setUint32(size - 4, Math.floor(input.length / 0x20000000), true);

  const shifts = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  let h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];

  for (let offset = 0; offset < size; offset += 64) {
    let [a, b, c, d] = h;
    for (let i = 0; i < 64; i++) {
      const group = i >> 4;
      const g =
        group === 0
          ? i
          : group === 1
            ? (5 * i + 1) % 16
            : group === 2
              ? (3 * i + 5) % 16
              : (7 * i) % 16;
      const f =
        group === 0
          ? (b & c) | (~b & d)
          : group === 1
            ? (d & b) | (~d & c)
            : group === 2
              ? b ^ c ^ d
              : c ^ (b | ~d);
      const sum = (a + f + Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) + view.getUint32(offset + g * 4, true)) | 0;
      const s = shifts[group * 4 + (i % 4)];
      [a, b, c, d] = [d, (b + ((sum << s) | (sum >>> (32 - s)))) | 0, b, c];
    }
    h = h.map((x, idx) => (x + [a, b, c, d][idx]) | 0);
  }

  return h
    .map((x) =>
      [0, 8, 16, 24].map((n) => ((x >>> n) & 255).toString(16).padStart(2, '0')).join(''),
    )
    .join('');
}

const WBI_MIXIN_TABLE = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
];

export function signWbi(params, images, now = Date.now()) {
  const extract = (url) => {
    try {
      return new URL(url).pathname.split('/').at(-1).split('.')[0];
    } catch {
      return '';
    }
  };
  const key = extract(images?.img_url) + extract(images?.sub_url);
  if (key.length !== 64) {
    throw new Error('B 站 WBI 签名密钥暂不可用，请刷新登录状态');
  }
  const mix = WBI_MIXIN_TABLE.map((i) => key[i]).join('').slice(0, 32);
  const wts = String(Math.round(now / 1000));
  const query = Object.entries({ ...params, wts })
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .filter(([, v]) => v != null)
    .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v).replace(/[!'()*]/g, '')))
    .join('&');
  return new URLSearchParams({ ...params, wts, w_rid: md5(query + mix) }).toString();
}

const hexToBytes = (s) => Uint8Array.from(String(s).match(/../g) || [], (x) => parseInt(x, 16));
const EMPTY_MD5_BYTES = hexToBytes(md5(hexToBytes(md5(''))));
const DOUYIN_ALPHABET = 'Dkdpgh4ZKsQB80/Mfvw36XI1R25+WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe';
let douyinSeq = 0;

// Ported from jwwsjlm/douyinLive webcastsign/native.go (MIT).
export function webcastSign(stub, values) {
  if (!/^[a-f\d]{32}$/i.test(stub)) {
    throw new Error('抖音弹幕签名参数无效');
  }
  const randomByte = () => {
    let n;
    do {
      n = crypto.getRandomValues(new Uint8Array(1))[0];
    } while (n === 255);
    return n;
  };
  const [counter, flag, payloadRandom, key] =
    values || [++douyinSeq & 63, Boolean(randomByte() & 1), randomByte(), randomByte()];
  const digest = hexToBytes(md5(hexToBytes(stub)));
  const payload = Uint8Array.from([
    counter & 63,
    0,
    1,
    14,
    EMPTY_MD5_BYTES[14],
    EMPTY_MD5_BYTES[15],
    digest[14],
    digest[15],
    payloadRandom,
    0,
  ]);
  for (let i = 0; i < 9; i++) payload[9] ^= payload[i];

  const state = Uint8Array.from({ length: 256 }, (_, i) => i);
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + state[i] + key) & 255;
    [state[i], state[j]] = [state[j], state[i]];
  }

  let i = 0;
  j = 0;
  const out = Uint8Array.from([64 | (flag ? 16 : 0), key, ...payload]);
  for (let k = 2; k < out.length; k++) {
    i = (i + 1) & 255;
    j = (j + state[i]) & 255;
    [state[i], state[j]] = [state[j], state[i]];
    out[k] ^= state[(state[i] + state[j]) & 255];
  }

  let result = '';
  for (let k = 0; k < out.length; k += 3) {
    const n = (out[k] << 16) | (out[k + 1] << 8) | out[k + 2];
    for (const shift of [18, 12, 6, 0]) {
      result += DOUYIN_ALPHABET[(n >>> shift) & 63];
    }
  }
  return result;
}

const DOUYIN_SIGN_FIELDS = [
  'live_id',
  'aid',
  'version_code',
  'webcast_sdk_version',
  'room_id',
  'sub_room_id',
  'sub_channel_id',
  'did_rule',
  'user_unique_id',
  'device_platform',
  'device_type',
  'ac',
  'identity',
];

export function buildDouyinWsSignature(params, values) {
  const raw = DOUYIN_SIGN_FIELDS.map((key) => `${key}=${params.get(key) || ''}`).join(',');
  return webcastSign(md5(raw), values);
}
