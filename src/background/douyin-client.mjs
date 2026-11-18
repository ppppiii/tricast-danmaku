// Douyin Webcast Protobuf WebSocket stream client for TriCast Background Hub.

import { buildDouyinWsSignature } from '../protocols/hash-sign.mjs';
import { pbEncode, decodeDouyinFrame, parseDouyinRoomHtml } from '../protocols/douyin-protocol.mjs';

const DOUYIN_WS_HOSTS = [
  'webcast100-ws-web-lq',
  'webcast3-ws-web-lq',
  'webcast5-ws-web-lf',
];

export function createDouyinClient({
  fetchFn = fetch,
  tabs = typeof chrome !== 'undefined' ? chrome.tabs : null,
  scripting = typeof chrome !== 'undefined' ? chrome.scripting : null,
} = {}) {
  async function resolveRoomViaOpenTab(webRid) {
    if (!tabs?.query || !scripting?.executeScript) return null;
    try {
      const all = await tabs.query({ url: ['https://live.douyin.com/*'] });
      const targetTab = all.find((t) => {
        try {
          const u = new URL(t.url);
          const seg = u.pathname.split('/').filter(Boolean)[0] || '';
          return seg === webRid;
        } catch {
          return false;
        }
      });
      if (!targetTab?.id) return null;
      const results = await scripting.executeScript({
        target: { tabId: targetTab.id },
        func: () => document.documentElement?.innerHTML || '',
      });
      const html = results?.[0]?.result || '';
      if (html) {
        const parsed = parseDouyinRoomHtml(html, webRid);
        if (parsed.roomId) return parsed;
      }
    } catch {}
    return null;
  }

  async function resolveRoom(webRid) {
    const clean = String(webRid || '').trim();
    if (!clean) throw new Error('抖音直播间号为空');

    try {
      const res = await fetchFn(`https://live.douyin.com/${encodeURIComponent(clean)}`, {
        credentials: 'include',
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const html = await res.text();
        if (html.length <= 12_000_000) {
          const parsed = parseDouyinRoomHtml(html, clean);
          if (parsed.roomId) return parsed;
        }
      }
    } catch {}

    const viaTab = await resolveRoomViaOpenTab(clean);
    if (viaTab?.roomId) return viaTab;

    throw new Error(`未能解析抖音房间「${clean}」，请确认房间号或打开 live.douyin.com/${clean} 过一下验证`);
  }

  function buildWsUrl(host, roomInfo) {
    const roomId = roomInfo.roomId;
    const userUniqueId =
      roomInfo.userUniqueId ||
      String(7300000000000000000n + BigInt(Math.floor(Math.random() * 1e12)));
    const now = Date.now();
    const browserVer =
      typeof navigator !== 'undefined' && navigator.userAgent
        ? navigator.userAgent.replace(/^Mozilla\//, '')
        : '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36';

    const params = new URLSearchParams({
      app_name: 'douyin_web',
      version_code: '180800',
      webcast_sdk_version: '1.0.14-beta.0',
      update_version_code: '1.0.14-beta.0',
      compress: 'gzip',
      device_platform: 'web',
      cookie_enabled: 'true',
      browser_language: 'zh-CN',
      browser_platform: 'Win32',
      browser_name: 'Mozilla',
      browser_version: browserVer,
      browser_online: 'true',
      screen_width: '1920',
      screen_height: '1080',
      tz_name: 'Asia/Shanghai',
      host: 'https://live.douyin.com',
      aid: '6383',
      live_id: '1',
      did_rule: '3',
      endpoint: 'live_pc',
      support_wrds: '1',
      user_unique_id: userUniqueId,
      im_path: '/webcast/im/fetch/',
      identity: 'audience',
      room_id: roomId,
      heartbeatDuration: '0',
      cursor: `t-${now}_r-1_d-1_u-1_fh-${roomId}`,
      internal_ext: `internal_src:dim|wss_push_room_id:${roomId}|wss_push_did:${userUniqueId}|first_req_ms:${now}|fetch_time:${now}|seq:1|wss_info:0-${now}-0-0`,
      // Do not request persisted message history burst on initial connect
      need_persist_msg_count: '0',
    });
    params.set('signature', buildDouyinWsSignature(params));
    return `wss://${host}.douyin.com/webcast/im/push/v2/?${params.toString()}`;
  }

  function createStream({ webRid, onEvent = () => {}, onStatus = () => {} }) {
    let closed = false;
    let ws = null;
    let attempt = 0;
    let routeIdx = 0;
    let revision = 0;
    let retryTimer = 0;
    let authTimer = 0;
    let heartbeatTimer = 0;

    function updateStatus(state, text = '') {
      onStatus({ platform: 'douyin', room: webRid, state, text });
    }

    async function start() {
      if (closed) return;
      const rev = ++revision;
      clearTimeout(retryTimer);
      clearTimeout(authTimer);
      clearInterval(heartbeatTimer);

      try {
        updateStatus('connecting', '正在连接抖音弹幕…');
        const info = await resolveRoom(webRid);
        if (closed || rev !== revision) return;
        if (info.status != null && info.status !== 2) {
          throw new Error('抖音主播当前未开播');
        }

        const host = DOUYIN_WS_HOSTS[routeIdx++ % DOUYIN_WS_HOSTS.length];
        const wsUrl = buildWsUrl(host, info);
        ws = new WebSocket(wsUrl);
        ws.binaryType = 'arraybuffer';

        let connectedAt = 0;
        let ready = false;
        let lastReply = Date.now();
        let serial = Promise.resolve();
        let queued = 0;
        let failReason = '抖音弹幕连接中断';

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

        const sendBytes = (bytes) => {
          if (!isCurrent() || ws.readyState !== 1) return;
          try {
            ws.send(bytes);
          } catch {
            fail('抖音心跳发送失败');
          }
        };

        authTimer = setTimeout(() => fail('抖音弹幕连接或鉴权超时'), 18000);

        ws.onopen = () => {
          if (!isCurrent()) return;
          sendBytes(pbEncode([[7, 'hb']]));
          clearInterval(heartbeatTimer);
          heartbeatTimer = setInterval(() => {
            if (!isCurrent()) return;
            if (Date.now() - lastReply > 75000) {
              fail('抖音弹幕心跳超时');
              return;
            }
            sendBytes(pbEncode([[7, 'hb']]));
          }, 5000);
        };

        ws.onmessage = (event) => {
          if (!isCurrent()) return;
          if (++queued > 64) {
            fail('抖音弹幕积压，正在重连');
            return;
          }
          serial = serial
            .then(async () => {
              const decoded = await decodeDouyinFrame(event.data, Date.now());
              if (!isCurrent()) return;
              lastReply = Date.now();
              if (!ready) {
                ready = true;
                connectedAt = lastReply;
                attempt = 0;
                clearTimeout(authTimer);
                updateStatus('connected', '已连接抖音');
              }
              if (decoded.ack) sendBytes(decoded.ack);
              for (const msg of decoded.messages) {
                if (!isCurrent()) return;
                if (connectedAt && msg.createdAtMs < connectedAt - 10000) continue;
                onEvent({ kind: 'danmaku', message: msg });
              }
            })
            .catch((err) => fail(err?.message || '抖音弹幕解码失败'))
            .finally(() => {
              queued--;
            });
        };

        ws.onerror = () => fail('抖音弹幕线路无法连接');
        ws.onclose = (ev) =>
          fail(failReason + (ev.code && ev.code !== 1000 ? ` (${ev.code})` : ''));
      } catch (err) {
        if (!closed && rev === revision) scheduleRetry(err?.message || '抖音连接失败');
      }
    }

    function scheduleRetry(reason) {
      if (closed) return;
      clearTimeout(retryTimer);
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
    resolveRoom,
    buildWsUrl,
    createStream,
  };
}
