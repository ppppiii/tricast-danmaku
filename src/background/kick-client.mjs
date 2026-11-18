// Kick Pusher WebSocket stream + 7TV emote loader + open-tab channel metadata fallback.

import { parseKickPusherFrame, ingest7tvEmoteSet } from '../protocols/kick-protocol.mjs';

const KICK_PUSHER_URL =
  'wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false';
const KICK_CACHE_KEY = 'tcd_kick_cache_v1';

export function createKickClient({
  fetchFn = fetch,
  storage = chrome.storage,
  tabs = typeof chrome !== 'undefined' ? chrome.tabs : null,
  scripting = typeof chrome !== 'undefined' ? chrome.scripting : null,
} = {}) {
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
      const map = store[KICK_CACHE_KEY] && typeof store[KICK_CACHE_KEY] === 'object'
        ? { ...store[KICK_CACHE_KEY] }
        : {};
      map[slug] = {
        chatroomId: String(info.chatroomId),
        userId: String(info.userId || ''),
        updatedAt: Date.now(),
      };
      // Keep cache bounded to 40 channels
      const keys = Object.keys(map);
      if (keys.length > 40) delete map[keys[0]];
      await storage?.local?.set({ [KICK_CACHE_KEY]: map });
    } catch {}
  }

  async function resolveChannelViaOpenTab(slug) {
    if (!tabs?.query || !scripting?.executeScript) return null;
    try {
      const all = await tabs.query({ url: ['https://kick.com/*', 'https://*.kick.com/*'] });
      const targetTab = all.find((t) => {
        try {
          const u = new URL(t.url);
          const seg = u.pathname.split('/').filter(Boolean)[0]?.toLowerCase() || '';
          return seg === slug;
        } catch {
          return false;
        }
      });
      if (!targetTab?.id) return null;
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

  async function load7tvEmotes(kickUserId) {
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
    return map;
  }

  function createStream({ slug, onEvent = () => {}, onStatus = () => {} }) {
    let closed = false;
    let ws = null;
    let attempt = 0;
    let revision = 0;
    let retryTimer = 0;
    let authTimer = 0;
    let heartbeatTimer = 0;

    function updateStatus(state, text = '') {
      onStatus({ platform: 'kick', room: slug, state, text });
    }

    async function start() {
      if (closed) return;
      const rev = ++revision;
      clearTimeout(retryTimer);
      clearTimeout(authTimer);
      clearInterval(heartbeatTimer);

      try {
        updateStatus('connecting', '正在连接 Kick 弹幕…');
        const channel = await resolveChannel(slug);
        if (closed || rev !== revision) return;

        const thirdPartyEmotes = await load7tvEmotes(channel.userId);
        if (closed || rev !== revision) return;

        ws = new WebSocket(KICK_PUSHER_URL);
        let connectedAt = 0;
        let lastReply = Date.now();
        let failReason = 'Kick 弹幕连接中断';

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

        const sendJson = (obj) => {
          if (!isCurrent() || ws.readyState !== 1) return;
          try {
            ws.send(JSON.stringify(obj));
          } catch {
            fail('Kick 弹幕发送心跳失败');
          }
        };

        authTimer = setTimeout(() => fail('Kick 弹幕订阅超时'), 15000);

        ws.onmessage = (event) => {
          if (!isCurrent()) return;
          lastReply = Date.now();
          const parsed = parseKickPusherFrame(event.data, thirdPartyEmotes, Date.now());
          if (!parsed) return;

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
    writeCachedChannel,
    resolveChannel,
    createStream,
  };
}
