// TriCast Danmaku MV3 Service Worker Hub:
// Manages Bilibili + Kick + Douyin WS streams, global deduplication, self-echo tracking, and 3-platform sending.

import { createBiliClient } from './bili-client.mjs';
import { createKickClient } from './kick-client.mjs';
import { createDouyinClient } from './douyin-client.mjs';
import { createTabSender } from './tab-sender.mjs';
import { extractDouyinWebRid } from '../protocols/douyin-protocol.mjs';

const ROOMS_STORAGE_KEY = 'tcd_rooms_v1';

const DEFAULT_ROOMS = {
  presetId: '',
  bilibili: { enabled: true, room: '' },
  kick: { enabled: true, room: '' },
  douyin: { enabled: true, room: '' },
  sendPlatform: 'auto',
  presets: [],
};

const bili = createBiliClient();
const kick = createKickClient();
const douyin = createDouyinClient();
const tabSender = createTabSender();

const ports = new Set();
const seenIds = new Map(); // global LRU deduplication across reconnects
const recentSelfSent = []; // { platform, normText, at }
let currentRooms = structuredClone(DEFAULT_ROOMS);
let idleStopTimer = 0;

const streamState = {
  bilibili: { sig: '', runner: null, status: { platform: 'bilibili', room: '', state: 'idle', text: '未启用' } },
  kick: { sig: '', runner: null, status: { platform: 'kick', room: '', state: 'idle', text: '未启用' } },
  douyin: { sig: '', runner: null, status: { platform: 'douyin', room: '', state: 'idle', text: '未启用' } },
};

const normSendText = (s) =>
  String(s || '')
    .replace(/\u200B/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

function rememberSelfSent(platform, text) {
  const normText = normSendText(text);
  if (!normText) return;
  const now = Date.now();
  recentSelfSent.push({ platform, normText, at: now });
  while (recentSelfSent.length > 25 || (recentSelfSent.length && now - recentSelfSent[0].at > 20000)) {
    recentSelfSent.shift();
  }
}

function consumeSelfSent(platform, msg) {
  const now = Date.now();
  const cand = normSendText(msg.sendText || msg.text || '');
  if (!cand) return false;
  const idx = recentSelfSent.findIndex(
    (x) => x.platform === platform && now - x.at <= 15000 && x.normText === cand,
  );
  if (idx >= 0) {
    recentSelfSent.splice(idx, 1);
    return true;
  }
  return false;
}

function getStatusSnapshot() {
  return {
    bilibili: { ...streamState.bilibili.status },
    kick: { ...streamState.kick.status },
    douyin: { ...streamState.douyin.status },
  };
}

function broadcast(payload) {
  for (const port of Array.from(ports)) {
    try {
      port.postMessage(payload);
    } catch {
      ports.delete(port);
    }
  }
}

function handleStreamEvent(ev) {
  if (!ev || typeof ev !== 'object') return;
  if (ev.kind === 'danmaku' && ev.message) {
    const m = ev.message;
    const dedupKey = m.id ? `${m.platform}:${m.id}` : '';
    if (dedupKey) {
      if (seenIds.has(dedupKey)) return;
      seenIds.set(dedupKey, Date.now());
      while (seenIds.size > 5000) {
        seenIds.delete(seenIds.keys().next().value);
      }
    }
    const enriched = {
      ...m,
      isSelf: Boolean(m.isSelf || consumeSelfSent(m.platform, m)),
    };
    broadcast({ type: 'tcd:danmaku', message: enriched });
  } else if (ev.kind === 'delete' && Array.isArray(ev.ids)) {
    broadcast({ type: 'tcd:delete', ids: ev.ids });
  } else if (ev.kind === 'clear') {
    broadcast({ type: 'tcd:clear', platform: ev.platform || '' });
  }
}

function handleStreamStatus(st) {
  if (!st?.platform || !streamState[st.platform]) return;
  streamState[st.platform].status = { ...st };
  broadcast({ type: 'tcd:status', statuses: getStatusSnapshot() });
}

function syncStreams(forceRestart = false) {
  const hasClients = ports.size > 0;
  for (const platform of ['bilibili', 'kick', 'douyin']) {
    const entry = streamState[platform];
    const cfg = currentRooms[platform] || { enabled: false, room: '' };
    const active = hasClients && Boolean(cfg.enabled) && Boolean(cfg.room);
    const nextSig = active ? `${platform}:${cfg.room}` : '';

    if (forceRestart || entry.sig !== nextSig) {
      if (entry.runner) {
        entry.runner.stop();
        entry.runner = null;
      }
      entry.sig = nextSig;
      if (!active) {
        handleStreamStatus({
          platform,
          room: cfg.room || '',
          state: 'idle',
          text: cfg.room ? '已暂停' : '未配置',
        });
        continue;
      }
      if (platform === 'bilibili') {
        entry.runner = bili.createStream({
          roomInput: cfg.room,
          onEvent: handleStreamEvent,
          onStatus: handleStreamStatus,
        });
      } else if (platform === 'kick') {
        entry.runner = kick.createStream({
          slug: cfg.room,
          onEvent: handleStreamEvent,
          onStatus: handleStreamStatus,
        });
      } else {
        entry.runner = douyin.createStream({
          webRid: cfg.room,
          onEvent: handleStreamEvent,
          onStatus: handleStreamStatus,
        });
      }
      entry.runner.start();
    }
  }
}

async function loadRooms() {
  try {
    const res = await chrome.storage.local.get(ROOMS_STORAGE_KEY);
    if (res && res[ROOMS_STORAGE_KEY]) {
      const merged = { ...structuredClone(DEFAULT_ROOMS), ...res[ROOMS_STORAGE_KEY] };
      const rawDy = merged.douyin?.room || '';
      const fixedDy = extractDouyinWebRid(rawDy);
      if (rawDy !== fixedDy) {
        merged.douyin = { ...merged.douyin, room: fixedDy };
        chrome.storage.local.set({ [ROOMS_STORAGE_KEY]: merged }).catch(() => {});
      }
      currentRooms = merged;
    }
  } catch {}
}

async function setupHeaderRules() {
  const domains = [
    ['bilibili.com', 'https://live.bilibili.com/', ['xmlhttprequest', 'websocket']],
    ['douyin.com', 'https://live.douyin.com/', ['xmlhttprequest', 'websocket']],
    ['kick.com', 'https://kick.com/', ['xmlhttprequest', 'websocket']],
  ];
  const makeRules = (withWs) =>
    domains.map(([domain, referer, types], idx) => ({
      id: 100 + idx,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          { header: 'Referer', operation: 'set', value: referer },
          { header: 'Origin', operation: 'set', value: new URL(referer).origin },
        ],
      },
      condition: {
        initiatorDomains: [chrome.runtime.id],
        requestDomains: [domain],
        resourceTypes: withWs ? types : types.filter((t) => t !== 'websocket'),
      },
    }));

  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [100, 101, 102],
      addRules: makeRules(true),
    });
  } catch {
    try {
      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [100, 101, 102],
        addRules: makeRules(false),
      });
    } catch {}
  }
}

const initPromise = Promise.all([loadRooms(), setupHeaderRules()]).then(() => syncStreams());

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  if (Object.prototype.hasOwnProperty.call(changes, ROOMS_STORAGE_KEY)) {
    currentRooms = {
      ...structuredClone(DEFAULT_ROOMS),
      ...(changes[ROOMS_STORAGE_KEY].newValue || {}),
    };
    syncStreams(false);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabSender.cleanupOwner(tabId).catch(() => {});
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'tcd-player') return;
  clearTimeout(idleStopTimer);
  ports.add(port);

  initPromise.then(() => {
    syncStreams(false);
    try {
      port.postMessage({ type: 'tcd:status', statuses: getStatusSnapshot(), rooms: currentRooms });
    } catch {}
  });

  port.onMessage.addListener((msg) => {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'tcd:get-state') {
      port.postMessage({ type: 'tcd:status', statuses: getStatusSnapshot(), rooms: currentRooms });
    } else if (msg.type === 'tcd:reconnect') {
      initPromise.then(() => syncStreams(true));
    }
  });

  port.onDisconnect.addListener(() => {
    ports.delete(port);
    if (ports.size === 0) {
      clearTimeout(idleStopTimer);
      // Short grace period during same-tab navigation / fullscreen reloads
      idleStopTimer = setTimeout(() => {
        if (ports.size === 0) syncStreams(false);
      }, 15000);
    }
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !msg || typeof msg !== 'object') return false;

  (async () => {
    await initPromise;

    switch (msg.type) {
      case 'tcd:get-hub-status':
        return { ok: true, statuses: getStatusSnapshot(), rooms: currentRooms };

      case 'tcd:reconnect':
        syncStreams(true);
        return { ok: true, statuses: getStatusSnapshot() };

      case 'tcd:kick-meta': {
        const slug = String(msg.slug || '').trim().toLowerCase();
        const chatroomId = String(msg.chatroomId || '').trim();
        const userId = String(msg.userId || '').trim();
        if (slug && chatroomId) {
          await kick.writeCachedChannel(slug, { chatroomId, userId });
          if (currentRooms.kick?.enabled && currentRooms.kick?.room === slug && streamState.kick.status.state !== 'connected') {
            syncStreams(true);
          }
        }
        return { ok: true };
      }

      case 'tcd:kick-live-frame': {
        const slug = String(msg.slug || '').trim().toLowerCase();
        if (slug && currentRooms.kick?.enabled && currentRooms.kick?.room === slug) {
          const ok = kick.ingestLiveFrame(slug, msg.raw, handleStreamEvent);
          if (ok && streamState.kick.status.state !== 'connected') {
            handleStreamStatus({
              platform: 'kick',
              room: slug,
              state: 'connected',
              text: '已连接 Kick (页面桥接)',
            });
          }
        }
        return { ok: true };
      }

      case 'tcd:remember-self':
        rememberSelfSent(msg.platform, msg.text);
        return { ok: true };

      case 'tcd:send-chat': {
        const platform = msg.platform;
        const text = String(msg.text || '').trim();
        const room = msg.room || currentRooms[platform]?.room || '';
        if (!room) return { ok: false, error: `尚未配置 ${platform} 直播间号` };
        rememberSelfSent(platform, text);

        if (platform === 'bilibili') {
          const res = await bili.sendDanmaku(room, text);
          if (res.ok) {
            const selfId = res.receipt || 'self-bili-' + Date.now();
            if (res.receipt) seenIds.set(`bilibili:${res.receipt}`, Date.now());
            broadcast({
              type: 'tcd:self-echo',
              message: {
                platform: 'bilibili',
                id: selfId,
                uid: '',
                user: '我',
                color: '',
                text,
                sendText: text,
                hasMedia: false,
                hasGif: false,
                isSelf: true,
                segments: [{ type: 'text', text }],
                receivedAt: Date.now(),
              },
            });
          }
          return res;
        }

        if (platform === 'douyin' || platform === 'kick') {
          return tabSender.send({
            platform,
            room,
            text,
            ownerTabId: sender.tab?.id,
          });
        }

        return { ok: false, error: '未知发送目标平台' };
      }

      case 'tcd:reveal-tab':
        await tabSender.revealTab(Number(msg.tabId));
        return { ok: true };

      case 'tcd:debug-inject':
        // Allows automated E2E harness to push realistic decoded messages through the Service Worker hub
        if (msg.event) {
          handleStreamEvent(msg.event);
          return { ok: true };
        }
        return { ok: false };

      default:
        return { ok: false };
    }
  })().then(sendResponse, (err) => sendResponse({ ok: false, error: err?.message || '请求失败' }));

  return true;
});
