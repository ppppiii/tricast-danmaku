// Kick Realtime client (Centrifugo primary + self-healing Pusher fallback + 7TV emotes + page-bridge ingestion).

import {
  parseKickPusherFrame,
  parseKickCentrifugoFrames,
  ingest7tvEmoteSet,
} from '../protocols/kick-protocol.mjs';

const KICK_CACHE_KEY = 'tcd_kick_cache_v1';
const KICK_PUSHER_KEY_CACHE = 'tcd_kick_pusher_v1';
const DEFAULT_PUSHER_CONFIG = Object.freeze({
  appKey: '34bf7a0ff419a2a775b9',
  cluster: 'us2',
});

export function createKickClient({
  fetchFn = fetch,
  storage = chrome.storage,
  tabs = typeof chrome !== 'undefined' ? chrome.tabs : null,
  scripting = typeof chrome !== 'undefined' ? chrome.scripting : null,
} = {}) {
  const emotesBySlug = new Map();

  async function readCachedChannel(slug) {
    try {
      const store = await storage?.local?.get(KICK_CACHE_KEY);
      const entry = store?.[KICK_CACHE_KEY]?.[slug];
      if (entry && entry.chatroomId && Date.now() - (entry.updatedAt || 0) < 3600 * 1000) {
        return entry;
      }
    } catch {}
    return null;
  }

  async function writeCachedChannel(slug, info) {
    if (!slug || !info?.chatroomId) return;
    try {
      const store = (await storage?.local?.get(KICK_CACHE_KEY)) || {};
      const map =
        store[KICK_CACHE_KEY] && typeof store[KICK_CACHE_KEY] === 'object'
          ? { ...store[KICK_CACHE_KEY] }
          : {};
      map[slug] = {
        chatroomId: String(info.chatroomId),
        userId: String(info.userId || ''),
        updatedAt: Date.now(),
      };
      const keys = Object.keys(map);
      if (keys.length > 40) delete map[keys[0]];
      await storage?.local?.set({ [KICK_CACHE_KEY]: map });
    } catch {}
  }

  async function readCachedPusherConfig() {
    try {
      const store = await storage?.local?.get(KICK_PUSHER_KEY_CACHE);
      const cfg = store?.[KICK_PUSHER_KEY_CACHE];
      if (cfg && /^[a-f0-9]{16,32}$/i.test(cfg.appKey) && /^[a-z0-9-]+$/i.test(cfg.cluster)) {
        return cfg;
      }
    } catch {}
    return { ...DEFAULT_PUSHER_CONFIG };
  }

  async function writeCachedPusherConfig(cfg) {
    if (!cfg?.appKey || !cfg?.cluster) return;
    try {
      await storage?.local?.set({
        [KICK_PUSHER_KEY_CACHE]: {
          appKey: String(cfg.appKey),
          cluster: String(cfg.cluster),
          updatedAt: Date.now(),
        },
      });
    } catch {}
  }

  async function findOpenKickTab(slug = '') {
    if (!tabs?.query || !scripting?.executeScript) return null;
    try {
      const all = await tabs.query({ url: ['https://kick.com/*', 'https://*.kick.com/*'] });
      if (slug) {
        const matched = all.find((t) => {
          try {
            const u = new URL(t.url);
            const seg = u.pathname.split('/').filter(Boolean)[0]?.toLowerCase() || '';
            return seg === slug;
          } catch {
            return false;
          }
        });
        if (matched?.id) return matched;
      }
      return all.find((t) => t.id) || null;
    } catch {
      return null;
    }
  }

  async function resolveChannelViaOpenTab(slug) {
    const targetTab = await findOpenKickTab(slug);
    if (!targetTab?.id || !scripting?.executeScript) return null;
    try {
      const results = await scripting.executeScript({
        target: { tabId: targetTab.id },
        args: [slug],
        func: async (ch) => {
          try {
            const res = await fetch(`/api/v2/channels/${encodeURIComponent(ch)}`, {
              credentials: 'include',
            });
            if (!res.ok) return null;
            const d = await res.json();
            return {
              chatroomId: d?.chatroom?.id != null ? String(d.chatroom.id) : '',
              userId: d?.user_id != null ? String(d.user_id) : '',
              channelId: d?.id != null ? String(d.id) : '',
            };
          } catch {
            return null;
          }
        },
      });
      const val = results?.[0]?.result;
      if (val?.chatroomId) return val;
    } catch {}
    return null;
  }

  async function resolveChannel(slug) {
    const clean = String(slug || '').trim().toLowerCase();
    if (!clean) throw new Error('Kick 频道名为空');

    const cached = await readCachedChannel(clean);
    if (cached?.chatroomId) return cached;

    try {
      const res = await fetchFn(`https://kick.com/api/v2/channels/${encodeURIComponent(clean)}`, {
        credentials: 'include',
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        const data = await res.json();
        const chatroomId = data?.chatroom?.id != null ? String(data.chatroom.id) : '';
        const userId = data?.user_id != null ? String(data.user_id) : '';
        if (chatroomId) {
          const out = { chatroomId, userId };
          await writeCachedChannel(clean, out);
          return out;
        }
      }
    } catch {}

    const viaTab = await resolveChannelViaOpenTab(clean);
    if (viaTab?.chatroomId) {
      await writeCachedChannel(clean, viaTab);
      return viaTab;
    }

    throw new Error(`无法获取 Kick 频道「${clean}」聊天室信息，可在浏览器打开 kick.com/${clean} 后自动同步`);
  }

  async function load7tvEmotes(slug, kickUserId) {
    const map = new Map();
    try {
      const gRes = await fetchFn('https://7tv.io/v3/emote-sets/global', {
        signal: AbortSignal.timeout(10000),
      });
      if (gRes.ok) {
        const gData = await gRes.json();
        ingest7tvEmoteSet(gData?.emotes, map);
      }
    } catch {}

    if (kickUserId) {
      try {
        const uRes = await fetchFn(`https://7tv.io/v3/users/kick/${encodeURIComponent(kickUserId)}`, {
          signal: AbortSignal.timeout(10000),
        });
        if (uRes.ok) {
          const uData = await uRes.json();
          ingest7tvEmoteSet(uData?.emote_set?.emotes, map);
        }
      } catch {}
    }
    if (slug) emotesBySlug.set(slug, map);
    return map;
  }

  async function fetchCentrifugoToken(clientId) {
    try {
      const res = await fetchFn('https://web.kick.com/api/v1/realtime/auth/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return '';
      const json = await res.json();
      return String(json?.data?.token || '');
    } catch {
      return '';
    }
  }

  async function queryRealtimeConnection(providers) {
    const clientId = crypto.randomUUID();
    const payload = {
      client: { id: clientId, type: 'web' },
      capabilities: {
        accepted_providers: providers.map((provider) => ({ provider })),
      },
    };
    try {
      const res = await fetchFn('https://web.kick.com/api/v1/realtime/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      const json = await res.json();
      const connections = Array.isArray(json?.data?.connections) ? json.data.connections : [];
      return { clientId, connections };
    } catch {
      return null;
    }
  }

  async function scrapePusherKeyFromAssets() {
    try {
      const home = await fetchFn('https://kick.com/', { signal: AbortSignal.timeout(10000) });
      if (!home.ok) return null;
      const html = await home.text();
      const chunks = Array.from(new Set(html.match(/_next\/static\/chunks\/[^"']+\.js/g) || []));
      for (const p of chunks.slice(0, 12)) {
        try {
          const r = await fetchFn(`https://assets.kick.com/main/${p}`, { signal: AbortSignal.timeout(8000) });
          if (!r.ok) continue;
          const js = await r.text();
          if (!js.includes('pusher') && !js.includes('app_key')) continue;
          const keyMatch = /app_key:\s*["']([a-f0-9]{16,32})["']/.exec(js);
          if (keyMatch) {
            const clusterMatch = /cluster:\s*["']([a-z0-9-]+)["']/.exec(js);
            return { appKey: keyMatch[1], cluster: clusterMatch?.[1] || 'us2' };
          }
        } catch {}
      }
    } catch {}
    return null;
  }

  async function discoverPusherConfig() {
    const res = await queryRealtimeConnection(['pusher']);
    const pusherConn = res?.connections?.find((c) => c.provider === 'pusher');
    if (pusherConn?.credentials?.app_key) {
      const cfg = {
        appKey: String(pusherConn.credentials.app_key),
        cluster: String(pusherConn.credentials.cluster || 'us2'),
      };
      await writeCachedPusherConfig(cfg);
      return cfg;
    }
    const scraped = await scrapePusherKeyFromAssets();
    if (scraped?.appKey) {
      await writeCachedPusherConfig(scraped);
      return scraped;
    }
    return null;
  }

  async function negotiateTransport() {
    // 1. Try Kick's official Centrifugo realtime endpoint + guest/session JWT
    const res = await queryRealtimeConnection(['centrifugo', 'pusher']);
    if (res?.connections?.length) {
      const cent = res.connections.find((c) => c.provider === 'centrifugo');
      if (cent?.credentials?.url) {
        const token = await fetchCentrifugoToken(res.clientId);
        if (token) {
          return {
            provider: 'centrifugo',
            url: String(cent.credentials.url),
            token,
            clientId: res.clientId,
          };
        }
      }
      const pusher = res.connections.find((c) => c.provider === 'pusher');
      if (pusher?.credentials?.app_key) {
        const cfg = {
          appKey: String(pusher.credentials.app_key),
          cluster: String(pusher.credentials.cluster || 'us2'),
        };
        await writeCachedPusherConfig(cfg);
        return { provider: 'pusher', ...cfg };
      }
    }

    // 2. Fallback to cached / current live Pusher key
    const pusherCfg = await readCachedPusherConfig();
    return { provider: 'pusher', ...pusherCfg };
  }

  function createStream({ slug, onEvent = () => {}, onStatus = () => {} }) {
    let closed = false;
    let ws = null;
    let attempt = 0;
    let revision = 0;
    let retryTimer = 0;
    let authTimer = 0;
    let heartbeatTimer = 0;
    let refreshTimer = 0;
    let centrifugoFailCount = 0;

    function updateStatus(state, text = '') {
      onStatus({ platform: 'kick', room: slug, state, text });
    }

    function clearTimers() {
      clearTimeout(retryTimer);
      clearTimeout(authTimer);
      clearInterval(heartbeatTimer);
      clearInterval(refreshTimer);
    }

    async function start() {
      if (closed) return;
      const rev = ++revision;
      clearTimers();

      try {
        updateStatus('connecting', '正在连接 Kick 弹幕…');
        const channel = await resolveChannel(slug);
        if (closed || rev !== revision) return;

        const thirdPartyEmotes = await load7tvEmotes(slug, channel.userId);
        if (closed || rev !== revision) return;

        let transport =
          centrifugoFailCount >= 2
            ? { provider: 'pusher', ...(await readCachedPusherConfig()) }
            : await negotiateTransport();
        if (closed || rev !== revision) return;

        const isCurrent = () => !closed && rev === revision && ws != null;
        let connectedAt = 0;
        let lastReply = Date.now();
        let failReason = 'Kick 弹幕连接中断';

        const fail = (msg, immediate = false) => {
          if (!isCurrent()) return;
          failReason = msg;
          clearTimers();
          revision++;
          try {
            ws.close();
          } catch {}
          ws = null;
          if (immediate) {
            attempt = 0;
            retryTimer = setTimeout(() => start(), 300);
          } else {
            scheduleRetry(failReason);
          }
        };

        if (transport.provider === 'centrifugo') {
          let cmdId = 1;
          ws = new WebSocket(transport.url);
          authTimer = setTimeout(() => {
            centrifugoFailCount++;
            fail('Kick Centrifugo 握手超时', centrifugoFailCount >= 2);
          }, 15000);

          const sendCmd = (obj) => {
            if (!isCurrent() || ws.readyState !== 1) return;
            try {
              ws.send(JSON.stringify(obj) + '\n');
            } catch {
              fail('Kick 弹幕写入失败');
            }
          };

          ws.onopen = () => {
            if (!isCurrent()) return;
            sendCmd({ id: cmdId++, connect: { token: transport.token, name: 'js' } });
          };

          ws.onmessage = (event) => {
            if (!isCurrent()) return;
            lastReply = Date.now();
            const events = parseKickCentrifugoFrames(event.data, thirdPartyEmotes, Date.now());
            for (const ev of events) {
              if (!isCurrent()) return;
              if (ev.kind === 'centrifugo-ping') {
                if (ws.readyState === 1) ws.send('{}\n');
              } else if (ev.kind === 'centrifugo-connected') {
                sendCmd({ id: cmdId++, subscribe: { channel: `chatrooms.${channel.chatroomId}.v2` } });
              } else if (ev.kind === 'centrifugo-subscribed') {
                connectedAt = Date.now();
                attempt = 0;
                centrifugoFailCount = 0;
                clearTimeout(authTimer);
                updateStatus('connected', '已连接 Kick');
                clearInterval(heartbeatTimer);
                heartbeatTimer = setInterval(() => {
                  if (!isCurrent()) return;
                  if (Date.now() - lastReply > 70000) fail('Kick 弹幕心跳超时');
                }, 25000);
                clearInterval(refreshTimer);
                refreshTimer = setInterval(async () => {
                  if (!isCurrent()) return;
                  const newTok = await fetchCentrifugoToken(transport.clientId);
                  if (newTok && isCurrent()) {
                    sendCmd({ id: cmdId++, refresh: { token: newTok } });
                  }
                }, 35 * 60 * 1000);
              } else if (ev.kind === 'centrifugo-error') {
                if (ev.error?.code === 103) continue; // ignore restricted feed
                centrifugoFailCount++;
                fail(`Kick Centrifugo 错误 (${ev.error?.code || 'unknown'})`, centrifugoFailCount <= 2);
                return;
              } else if (ev.kind === 'centrifugo-disconnect') {
                centrifugoFailCount++;
                fail('Kick Centrifugo 断开', centrifugoFailCount <= 2);
                return;
              } else if (ev.kind === 'danmaku' || ev.kind === 'delete' || ev.kind === 'clear') {
                if (ev.kind === 'danmaku' && connectedAt && ev.message.createdAtMs < connectedAt - 10000) {
                  continue;
                }
                onEvent(ev);
              }
            }
          };

          ws.onerror = () => {
            centrifugoFailCount++;
            fail('Kick Centrifugo 线路异常', centrifugoFailCount === 1);
          };
          ws.onclose = (ev) => {
            if (!isCurrent()) return;
            centrifugoFailCount++;
            fail(
              failReason + (ev.code && ev.code !== 1000 ? ` (${ev.code})` : ''),
              centrifugoFailCount <= 2,
            );
          };
          return;
        }

        // Pusher transport with self-healing 4001/4003 app_key rotation
        const wsUrl = `wss://ws-${transport.cluster}.pusher.com/app/${transport.appKey}?protocol=7&client=js&version=8.4.0-rc2&flash=false`;
        ws = new WebSocket(wsUrl);
        authTimer = setTimeout(() => fail('Kick 弹幕订阅超时'), 15000);

        const sendJson = (obj) => {
          if (!isCurrent() || ws.readyState !== 1) return;
          try {
            ws.send(JSON.stringify(obj));
          } catch {
            fail('Kick 弹幕心跳失败');
          }
        };

        ws.onmessage = async (event) => {
          if (!isCurrent()) return;
          lastReply = Date.now();
          const parsed = parseKickPusherFrame(event.data, thirdPartyEmotes, Date.now());
          if (!parsed) return;

          if (parsed.kind === 'pusher-error') {
            if (parsed.code === 4001 || parsed.code === 4003) {
              updateStatus('connecting', 'Kick 密钥轮换，正在自愈刷新…');
              const refreshed = await discoverPusherConfig();
              if (refreshed && isCurrent()) {
                fail(`Kick 密钥已更新 (${refreshed.appKey.slice(0, 6)}…)`, true);
                return;
              }
            }
            fail(`Kick Pusher 错误 (${parsed.code || 'unknown'})`);
            return;
          }

          if (parsed.kind === 'system') {
            if (parsed.event === 'pusher:connection_established') {
              sendJson({
                event: 'pusher:subscribe',
                data: { auth: '', channel: `chatrooms.${channel.chatroomId}.v2` },
              });
            } else if (parsed.event === 'pusher_internal:subscription_succeeded') {
              connectedAt = Date.now();
              attempt = 0;
              clearTimeout(authTimer);
              updateStatus('connected', '已连接 Kick');
              clearInterval(heartbeatTimer);
              heartbeatTimer = setInterval(() => {
                if (!isCurrent()) return;
                if (Date.now() - lastReply > 75000) {
                  fail('Kick 弹幕心跳超时');
                  return;
                }
                sendJson({ event: 'pusher:ping', data: {} });
              }, 25000);
            }
            return;
          }

          if (parsed.kind === 'danmaku') {
            if (connectedAt && parsed.message.createdAtMs < connectedAt - 10000) return;
          }
          onEvent(parsed);
        };

        ws.onerror = () => fail('Kick 弹幕线路无法连接');
        ws.onclose = (ev) =>
          fail(failReason + (ev.code && ev.code !== 1000 ? ` (${ev.code})` : ''));
      } catch (err) {
        if (!closed && rev === revision) scheduleRetry(err?.message || 'Kick 频道解析失败');
      }
    }

    function scheduleRetry(reason) {
      if (closed) return;
      clearTimers();
      const sec = Math.min(30, 2 ** Math.min(++attempt, 5));
      updateStatus('reconnecting', `${reason} · ${sec}s 后重连`);
      retryTimer = setTimeout(() => start(), sec * 1000);
    }

    function stop() {
      closed = true;
      revision++;
      clearTimers();
      try {
        ws?.close();
      } catch {}
      ws = null;
      updateStatus('idle', '未启用');
    }

    return { start, stop };
  }

  function ingestLiveFrame(slug, rawData, onEvent = () => {}) {
    const cleanSlug = String(slug || '').trim().toLowerCase();
    const emotes = (cleanSlug && emotesBySlug.get(cleanSlug)) || null;
    let matched = false;

    const centEvents = parseKickCentrifugoFrames(rawData, emotes, Date.now());
    for (const ev of centEvents) {
      if (ev.kind === 'danmaku' || ev.kind === 'delete' || ev.kind === 'clear') {
        matched = true;
        onEvent(ev);
      }
    }
    if (!matched) {
      const pEv = parseKickPusherFrame(rawData, emotes, Date.now());
      if (pEv && ['danmaku', 'delete', 'clear'].includes(pEv.kind)) {
        matched = true;
        onEvent(pEv);
      }
    }
    return matched;
  }

  return {
    writeCachedChannel,
    resolveChannel,
    createStream,
    ingestLiveFrame,
    discoverPusherConfig,
  };
}
