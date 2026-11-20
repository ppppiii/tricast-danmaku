// Bilibili Live WebSocket client & direct API chat sender for TriCast Background Hub.

import { signWbi } from '../protocols/hash-sign.mjs';
import { encodeBiliPacket, decodeBiliFrames, normalizeBiliCommand } from '../protocols/bili-protocol.mjs';

const BILI_COOKIE_URL = 'https://live.bilibili.com/';

export function createBiliClient({
  fetchFn = fetch,
  cookies = chrome.cookies,
  storage = chrome.storage,
} = {}) {
  let wbiImages = null;
  let buvidPromise = null;
  let navCache = null;
  const roomCache = new Map();
  let lastSendAt = 0;
  let sending = false;

  async function getCookie(name) {
    try {
      const c = await cookies.get({ url: BILI_COOKIE_URL, name });
      return c?.value || '';
    } catch {
      return '';
    }
  }

  async function ensureBuvid() {
    if (await getCookie('buvid3')) return;
    if (!buvidPromise) {
      buvidPromise = (async () => {
        try {
          const res = await fetchFn('https://api.bilibili.com/x/frontend/finger/spi', {
            credentials: 'include',
            signal: AbortSignal.timeout(12000),
          });
          if (!res.ok) return;
          const json = await res.json();
          const b3 = json?.data?.b_3;
          if (json?.code === 0 && typeof b3 === 'string' && /^[\w-]{10,100}$/.test(b3)) {
            await cookies
              .set({
                url: BILI_COOKIE_URL,
                domain: '.bilibili.com',
                path: '/',
                name: 'buvid3',
                value: b3,
                secure: true,
                sameSite: 'no_restriction',
                expirationDate: Math.floor(Date.now() / 1000) + 31536000,
              })
              .catch(() => {});
          }
        } catch {}
      })().finally(() => {
        buvidPromise = null;
      });
    }
    await buvidPromise;
  }

  async function apiJson(url, options = {}) {
    const res = await fetchFn(url, {
      ...options,
      credentials: 'include',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error('B 站接口 HTTP ' + res.status);
    const json = await res.json();
    if (json.code !== 0) {
      throw new Error(`B 站 ${json.code}：${json.message || json.msg || '请求失败'}`);
    }
    return json;
  }

  async function fetchNav(force = false) {
    if (!force && navCache && Date.now() - navCache.at < 5 * 60 * 1000 && wbiImages) {
      return navCache.value;
    }
    const res = await fetchFn('https://api.bilibili.com/x/web-interface/nav', {
      credentials: 'include',
      redirect: 'error',
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error('B 站登录状态检查失败 HTTP ' + res.status);
    const json = await res.json();
    if (json.data?.wbi_img) wbiImages = json.data.wbi_img;
    if (json.code === -101 || json.data?.isLogin === false) {
      const value = { loggedIn: false, uid: 0, uname: '' };
      navCache = { value, at: Date.now() };
      return value;
    }
    const value = {
      loggedIn: json.data?.isLogin === true,
      uid: Number(json.data?.mid || 0),
      uname: String(json.data?.uname || ''),
    };
    navCache = { value, at: Date.now() };
    return value;
  }

  async function resolveRealRoom(roomInput, useCache = false) {
    const id = String(roomInput || '').trim();
    if (!/^\d+$/.test(id) || Number(id) <= 0) throw new Error('B 站房间号无效');
    if (useCache) {
      const hit = roomCache.get(id);
      if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.value;
    }
    const json = await apiJson(`https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${id}`);
    const d = json.data || {};
    const value = {
      roomId: Number(d.room_id || id),
      shortId: Number(d.short_id || 0),
      uid: Number(d.uid || 0),
      title: String(d.title || ''),
      liveStatus: Number(d.live_status || 0),
    };
    roomCache.set(id, { value, at: Date.now() });
    return value;
  }

  async function getDanmuConfig(roomInput) {
    await ensureBuvid();
    await fetchNav();
    const roomInfo = await resolveRealRoom(roomInput);
    const query = signWbi(
      { id: roomInfo.roomId, type: 0, web_location: '444.8' },
      wbiImages,
    );
    const json = await apiJson(`https://api.live.bilibili.com/xlive/web-room/v1/index/getDanmuInfo?${query}`);
    const d = json.data || {};
    const hosts = [];
    for (const entry of d.host_list || []) {
      if (typeof entry.host !== 'string' || !/^[\w.-]+\.chat\.bilibili\.com$/.test(entry.host)) continue;
      const port = Number(entry.wss_port);
      if (Number.isInteger(port) && port > 0 && port <= 65535 && port !== 443) {
        hosts.push(`${entry.host}:${port}`);
      }
      if (!hosts.includes(entry.host)) hosts.push(entry.host);
    }
    if (!d.token || !hosts.length) throw new Error('B 站弹幕鉴权暂不可用');
    const [uid, buvid] = await Promise.all([getCookie('DedeUserID'), getCookie('buvid3')]);
    return {
      room: roomInfo.roomId,
      token: d.token,
      hosts,
      uid: Number(uid || 0),
      buvid: buvid || '',
    };
  }

  async function sendDanmaku(roomInput, rawText) {
    const text = String(rawText || '').trim();
    if (!text) return { ok: false, error: '弹幕内容为空' };
    if ([...text].length > 40 || /[\u0000-\u001f\u007f]/u.test(text)) {
      return { ok: false, error: 'B 站弹幕需为 1–40 字的单行文字' };
    }
    if (sending) return { ok: false, error: '上一条 B 站弹幕正在发送' };

    const storedAt = (await storage?.session?.get('tcd_last_bili_send'))?.tcd_last_bili_send || 0;
    const now = Date.now();
    if (now - Math.max(lastSendAt, storedAt) < 3000) {
      return { ok: false, error: '发送太快，请稍等 3 秒' };
    }

    sending = true;
    try {
      await ensureBuvid();
      const account = await fetchNav(false);
      if (!account.loggedIn) {
        navCache = null;
        return { ok: false, error: '请先在浏览器登录 B 站后再发送' };
      }
      const csrf = await getCookie('bili_jct');
      if (!csrf) {
        return { ok: false, error: 'B 站登录态缺失（bili_jct），请刷新 B 站页面登录' };
      }
      const roomInfo = await resolveRealRoom(roomInput, true);
      const body = new FormData();
      const fields = {
        bubble: '0',
        msg: text,
        color: '16777215',
        mode: '1',
        fontsize: '25',
        rnd: String(Math.floor(Date.now() / 1000)),
        roomid: String(roomInfo.roomId),
        data_extend: '{}',
        dm_type: '0',
        csrf,
        csrf_token: csrf,
      };
      for (const [k, v] of Object.entries(fields)) body.set(k, v);

      lastSendAt = Date.now();
      storage?.session?.set({ tcd_last_bili_send: lastSendAt }).catch(() => {});

      const query = signWbi({ web_location: '444.8' }, wbiImages);
      const result = await apiJson(`https://api.live.bilibili.com/msg/send?${query}`, {
        method: 'POST',
        body,
      });

      const warning = [result.message, result.msg].find(
        (v) => v != null && String(v).trim() !== '' && String(v).trim() !== '0',
      );
      if (warning) return { ok: false, error: 'B 站提示：' + warning };

      let extra = result.data?.mode_info?.extra;
      if (typeof extra === 'string') {
        try {
          extra = JSON.parse(extra);
        } catch {
          extra = null;
        }
      }
      const receipt = String(extra?.id_str || result.data?.mode_info?.id_str || '');
      return {
        ok: true,
        platform: 'bilibili',
        room: String(roomInfo.roomId),
        receipt,
      };
    } catch (err) {
      return { ok: false, error: err?.message || 'B 站发送失败' };
    } finally {
      sending = false;
    }
  }

  function createStream({ roomInput, onEvent = () => {}, onStatus = () => {} }) {
    let closed = false;
    let ws = null;
    let attempt = 0;
    let routeIdx = 0;
    let revision = 0;
    let retryTimer = 0;
    let authTimer = 0;
    let heartbeatTimer = 0;

    function updateStatus(state, text = '') {
      onStatus({ platform: 'bilibili', room: roomInput, state, text });
    }

    async function start() {
      if (closed) return;
      const rev = ++revision;
      clearTimeout(retryTimer);
      clearTimeout(authTimer);
      clearInterval(heartbeatTimer);

      try {
        updateStatus('connecting', '正在连接 B 站弹幕…');
        const cfg = await getDanmuConfig(roomInput);
        if (closed || rev !== revision) return;

        const host = cfg.hosts[routeIdx++ % cfg.hosts.length];
        ws = new WebSocket(`wss://${host}/sub`);
        ws.binaryType = 'arraybuffer';

        let connectedAt = 0;
        let authenticated = false;
        let lastReply = Date.now();
        let serial = Promise.resolve();
        let queued = 0;
        let failReason = 'B 站弹幕连接中断';

        const isCurrent = () => !closed && rev === revision && ws != null;
        const fail = (msg) => {
          if (!isCurrent()) return;
          failReason = msg;
          clearTimeout(authTimer);
          clearInterval(heartbeatTimer);
          revision++;
          try {
            ws.close();
          } catch {}
          ws = null;
          scheduleRetry(failReason);
        };

        const sendRaw = (buf) => {
          if (!isCurrent() || ws.readyState !== 1) return;
          try {
            ws.send(buf);
          } catch {
            fail('B 站弹幕连接失效');
          }
        };

        authTimer = setTimeout(() => fail('B 站弹幕连接或鉴权超时'), 15000);

        ws.onopen = () => {
          if (!isCurrent()) return;
          sendRaw(
            encodeBiliPacket(7, {
              uid: cfg.uid,
              buvid: cfg.buvid,
              roomid: cfg.room,
              protover: 2,
              platform: 'web',
              type: 2,
              key: cfg.token,
            }),
          );
        };

        ws.onmessage = (event) => {
          if (!isCurrent()) return;
          if (++queued > 64) {
            fail('B 站弹幕数据积压，正在重连');
            return;
          }
          serial = serial
            .then(async () => {
              const packets = await decodeBiliFrames(event.data);
              for (const pkt of packets) {
                if (!isCurrent()) return;
                if (pkt.op === 8) {
                  if (Number(pkt.body?.code) !== 0) {
                    fail(`B 站鉴权失败(${pkt.body?.code ?? '未知'})`);
                    return;
                  }
                  authenticated = true;
                  connectedAt = Date.now();
                  lastReply = connectedAt;
                  attempt = 0;
                  clearTimeout(authTimer);
                  updateStatus('connected', '已连接 B 站');
                  sendRaw(encodeBiliPacket(2, '[object Object]'));
                  clearInterval(heartbeatTimer);
                  heartbeatTimer = setInterval(() => {
                    if (!isCurrent()) return;
                    if (Date.now() - lastReply > 70000) {
                      fail('B 站心跳超时');
                      return;
                    }
                    sendRaw(encodeBiliPacket(2, '[object Object]'));
                  }, 25000);
                } else if (pkt.op === 3) {
                  lastReply = Date.now();
                } else if (pkt.op === 5) {
                  lastReply = Date.now();
                  if (!authenticated) continue;
                  const normalized = normalizeBiliCommand(pkt.body, Date.now());
                  if (!normalized) continue;
                  if (normalized.kind === 'danmaku') {
                    // Drop any stale persisted message timestamped well before WebSocket connected
                    if (connectedAt && normalized.message.createdAtMs < connectedAt - 10000) {
                      continue;
                    }
                    // Tag messages sent by the logged-in Bilibili account (including native chat box)
                    if (cfg.uid && String(normalized.message.uid) === String(cfg.uid)) {
                      normalized.message.isSelf = true;
                    }
                  }
                  onEvent(normalized);
                }
              }
            })
            .catch((err) => fail(err?.message || 'B 站弹幕解码失败'))
            .finally(() => {
              queued--;
            });
        };

        ws.onerror = () => fail('B 站弹幕线路无法连接');
        ws.onclose = (ev) =>
          fail(failReason + (ev.code && ev.code !== 1000 ? ` (${ev.code})` : ''));
      } catch (err) {
        if (!closed && rev === revision) scheduleRetry(err?.message || 'B 站房间解析失败');
      }
    }

    function scheduleRetry(reason) {
      if (closed) return;
      clearTimeout(retryTimer);
      if (/\b-?412\b/.test(String(reason))) {
        updateStatus('error', 'B 站触发 HTTP 412 验证，请打开 B 站页面刷新后点重连');
        return;
      }
      const sec = Math.min(30, 2 ** Math.min(++attempt, 5));
      updateStatus('reconnecting', `${reason} · ${sec}s 后重连`);
      retryTimer = setTimeout(() => start(), sec * 1000);
    }

    function stop() {
      closed = true;
      revision++;
      clearTimeout(retryTimer);
      clearTimeout(authTimer);
      clearInterval(heartbeatTimer);
      try {
        ws?.close();
      } catch {}
      ws = null;
      updateStatus('idle', '未启用');
    }

    return { start, stop };
  }

  return {
    fetchNav,
    resolveRealRoom,
    sendDanmaku,
    createStream,
  };
}
