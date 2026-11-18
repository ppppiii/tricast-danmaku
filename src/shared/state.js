(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.__TCD__ = root.__TCD__ || {};
  root.__TCD__.state = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const STORAGE_KEYS = Object.freeze({
    settings: 'tcd_settings_v1',
    rooms: 'tcd_rooms_v1',
    rules: 'tcd_rules_v1',
    blocked: 'tcd_blocked_v1',
    avoidance: 'tcd_avoidance_v1',
    kickCache: 'tcd_kick_cache_v1',
    tips: 'tcd_tips_v1',
  });

  const KICK_NON_CHANNEL_SLUGS = new Set([
    '', 'home', 'browse', 'following', 'categories', 'category', 'search',
    'login', 'register', 'dashboard', 'settings', 'clips', 'videos', 'video',
    'subscriptions', 'notifications', 'messages', 'wallet', 'popout',
    'terms-of-service', 'privacy-policy', 'cookie-policy',
    'community-guidelines', 'dmca-policy', 'transactions',
  ]);

  const DEFAULT_SETTINGS = Object.freeze({
    showChat: true,
    showChatFeed: false,
    showPlatformBadge: true,
    suppressNativeBili: true,
    allowOverlap: false,
    danmakuMaxCount: 80,
    danmakuTransparency: 15,
    danmakuSize: 22,
    danmakuSpeed: 1.0,
    danmakuDensity: 75,
    danmakuArea: 100,
    lineHeightRatio: 1.35,
    emoteScale: 1.5,
    fontWeight: 400,
    textStroke: 'standard',
    danmakuPlatformColors: false,
    customColor: '#ffffff',
    showUsername: false,
    enableActions: true,
    mergeRepeated: true,
    mergeTextOnly: true,
    hideDeleted: true,
  });

  const DEFAULT_ROOMS = Object.freeze({
    presetId: '',
    bilibili: { enabled: true, room: '' },
    kick: { enabled: true, room: '' },
    douyin: { enabled: true, room: '' },
    sendPlatform: 'auto',
    presets: [],
  });

  const memoryFallback = new Map();

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  const DOUYIN_RESERVED_SEGMENTS = new Set([
    'follow',
    'live',
    'root',
    'discover',
    'category',
    'hot',
    'channel',
    'square',
    'search',
    'video',
    'note',
    'user',
    'collection',
    'vs',
    'series',
  ]);

  function extractDouyinWebRid(raw) {
    const str = String(raw || '').trim();
    if (!str) return '';
    if (/^[\w-]{3,64}$/.test(str)) {
      return DOUYIN_RESERVED_SEGMENTS.has(str.toLowerCase()) ? '' : str;
    }
    try {
      const u = new URL(/^https?:\/\//i.test(str) ? str : 'https://' + str);
      if (!/(^|\.)douyin\.com$/i.test(u.hostname)) return '';
      const qRid = u.searchParams.get('web_rid');
      if (qRid && /^[\w-]{3,64}$/.test(qRid) && !DOUYIN_RESERVED_SEGMENTS.has(qRid.toLowerCase())) {
        return qRid;
      }
      const parts = u.pathname.split('/').filter(Boolean);
      const liveIdx = parts.findIndex((seg) => seg.toLowerCase() === 'live');
      if (liveIdx >= 0 && parts[liveIdx + 1]) {
        const cand = parts[liveIdx + 1];
        if (/^[\w-]{3,64}$/.test(cand) && !DOUYIN_RESERVED_SEGMENTS.has(cand.toLowerCase())) {
          return cand;
        }
      }
      if (
        u.hostname.toLowerCase() === 'live.douyin.com' &&
        parts.length &&
        !DOUYIN_RESERVED_SEGMENTS.has(parts[0].toLowerCase())
      ) {
        for (let i = parts.length - 1; i >= 0; i--) {
          const seg = parts[i];
          if (/^[\w-]{3,64}$/.test(seg) && !DOUYIN_RESERVED_SEGMENTS.has(seg.toLowerCase())) {
            return seg;
          }
        }
      }
      return '';
    } catch {
      return '';
    }
  }

  function normalizeRoomInput(platform, raw) {
    const str = String(raw || '').trim();
    if (!str) return '';

    if (platform === 'bilibili') {
      if (/^\d+$/.test(str)) {
        const n = Number(str);
        return Number.isSafeInteger(n) && n > 0 ? String(n) : '';
      }
      try {
        const u = new URL(/^https?:\/\//i.test(str) ? str : 'https://' + str);
        if (!/(^|\.)bilibili\.com$/i.test(u.hostname)) return '';
        const parts = u.pathname.split('/').filter(Boolean);
        const seg = (parts[0] === 'blanc' ? parts[1] : parts[0]) || '';
        return /^\d+$/.test(seg) && Number(seg) > 0 ? String(Number(seg)) : '';
      } catch {
        return '';
      }
    }

    if (platform === 'kick') {
      if (/^[a-z0-9_-]{2,50}$/i.test(str)) {
        const lower = str.toLowerCase();
        return KICK_NON_CHANNEL_SLUGS.has(lower) ? '' : lower;
      }
      try {
        const u = new URL(/^https?:\/\//i.test(str) ? str : 'https://' + str);
        if (!/(^|\.)kick\.com$/i.test(u.hostname)) return '';
        const parts = u.pathname.split('/').filter(Boolean);
        const rawSlug = parts[0] === 'popout' && parts[1] ? parts[1] : parts[0] || '';
        const lower = rawSlug.toLowerCase();
        if (!/^[a-z0-9_-]{2,50}$/i.test(lower) || KICK_NON_CHANNEL_SLUGS.has(lower)) return '';
        return lower;
      } catch {
        return '';
      }
    }

    if (platform === 'douyin') {
      return extractDouyinWebRid(str);
    }

    return '';
  }

  function sanitizeRooms(raw) {
    const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const channelEntry = (plat) => {
      const item = src[plat] && typeof src[plat] === 'object' ? src[plat] : {};
      return {
        enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
        room: normalizeRoomInput(plat, item.room),
      };
    };

    const sendPlatform = ['auto', 'bilibili', 'kick', 'douyin'].includes(src.sendPlatform)
      ? src.sendPlatform
      : 'auto';

    const presets = [];
    const seenIds = new Set();
    if (Array.isArray(src.presets)) {
      for (const p of src.presets.slice(0, 40)) {
        if (!p || typeof p !== 'object') continue;
        const id = String(p.id || '').trim().slice(0, 64);
        const name = String(p.name || '').trim().slice(0, 60);
        if (!id || !name || seenIds.has(id)) continue;
        seenIds.add(id);
        presets.push({
          id,
          name,
          bilibili: normalizeRoomInput('bilibili', p.bilibili),
          kick: normalizeRoomInput('kick', p.kick),
          douyin: normalizeRoomInput('douyin', p.douyin),
        });
      }
    }

    return {
      presetId: typeof src.presetId === 'string' && seenIds.has(src.presetId) ? src.presetId : '',
      bilibili: channelEntry('bilibili'),
      kick: channelEntry('kick'),
      douyin: channelEntry('douyin'),
      sendPlatform,
      presets,
    };
  }

  function matchPresetForUrl(urlStr, roomsData) {
    if (!urlStr || !roomsData || !Array.isArray(roomsData.presets) || !roomsData.presets.length) {
      return null;
    }
    try {
      const u = new URL(urlStr);
      if (u.hostname === 'live.bilibili.com') {
        const rid = normalizeRoomInput('bilibili', u.href);
        if (!rid) return null;
        return roomsData.presets.find((p) => p.bilibili && p.bilibili === rid) || null;
      }
      if (u.hostname === 'kick.com' || u.hostname.endsWith('.kick.com')) {
        const slug = normalizeRoomInput('kick', u.href);
        if (!slug) return null;
        return roomsData.presets.find((p) => p.kick && p.kick === slug) || null;
      }
      if (u.hostname.endsWith('douyin.com')) {
        const rid = normalizeRoomInput('douyin', u.href);
        if (!rid) return null;
        return roomsData.presets.find((p) => p.douyin && p.douyin === rid) || null;
      }
    } catch {}
    return null;
  }

  function sanitizeSettings(raw) {
    const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const out = { ...DEFAULT_SETTINGS };

    for (const key of [
      'showChat',
      'showChatFeed',
      'showPlatformBadge',
      'suppressNativeBili',
      'danmakuPlatformColors',
      'showUsername',
      'allowOverlap',
      'enableActions',
      'mergeRepeated',
      'mergeTextOnly',
      'hideDeleted',
    ]) {
      if (typeof src[key] === 'boolean') out[key] = src[key];
    }

    if (Number.isFinite(Number(src.danmakuMaxCount))) {
      const n = Math.round(Number(src.danmakuMaxCount));
      out.danmakuMaxCount = n <= 0 ? 0 : clamp(n, 20, 300);
    }
    if (Number.isFinite(Number(src.danmakuTransparency))) {
      out.danmakuTransparency = clamp(Math.round(Number(src.danmakuTransparency)), 0, 95);
    }
    if (Number.isFinite(Number(src.danmakuSize))) {
      out.danmakuSize = clamp(Math.round(Number(src.danmakuSize)), 14, 64);
    }
    if (Number.isFinite(Number(src.danmakuSpeed))) {
      out.danmakuSpeed = clamp(Math.round(Number(src.danmakuSpeed) * 10) / 10, 0.4, 2.5);
    }
    if (Number.isFinite(Number(src.danmakuDensity))) {
      out.danmakuDensity = clamp(Math.round(Number(src.danmakuDensity)), 20, 100);
    }
    if ([25, 50, 75, 100].includes(Number(src.danmakuArea))) {
      out.danmakuArea = Number(src.danmakuArea);
    }
    if (Number.isFinite(Number(src.lineHeightRatio))) {
      out.lineHeightRatio = clamp(Math.round(Number(src.lineHeightRatio) * 100) / 100, 1.05, 2.0);
    }
    if (Number.isFinite(Number(src.emoteScale))) {
      out.emoteScale = clamp(Math.round(Number(src.emoteScale) * 10) / 10, 1.0, 3.0);
    }
    if (Number.isFinite(Number(src.fontWeight))) {
      const w = Math.round(Number(src.fontWeight) / 100) * 100;
      out.fontWeight = clamp(w, 400, 900);
    }
    if (['standard', 'strong', 'soft'].includes(src.textStroke)) {
      out.textStroke = src.textStroke;
    }
    if (typeof src.customColor === 'string' && /^#[0-9a-f]{6}$/i.test(src.customColor)) {
      out.customColor = src.customColor.toLowerCase();
    }
    return out;
  }

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && Boolean(chrome?.storage?.local);
  }

  async function readData(key, fallback) {
    if (hasChromeStorage()) {
      try {
        const result = await chrome.storage.local.get(key);
        if (result && Object.prototype.hasOwnProperty.call(result, key)) {
          return result[key];
        }
        return fallback;
      } catch {}
    }
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(key);
        if (raw != null) return JSON.parse(raw);
      }
    } catch {}
    return memoryFallback.has(key) ? memoryFallback.get(key) : fallback;
  }

  async function writeData(key, value) {
    memoryFallback.set(key, value);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {}
    if (hasChromeStorage()) {
      try {
        await chrome.storage.local.set({ [key]: value });
      } catch {}
    }
  }

  const globalDataListeners = new Map();
  let storageWatchInitialized = false;

  function notifyGlobalData(key, value) {
    const set = globalDataListeners.get(key);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(value);
      } catch {}
    }
  }

  function ensureStorageWatch(onSettingsChange = null) {
    if (storageWatchInitialized) return;
    storageWatchInitialized = true;
    if (hasChromeStorage() && chrome.storage.onChanged?.addListener) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;
        if (
          onSettingsChange &&
          Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.settings)
        ) {
          onSettingsChange(changes[STORAGE_KEYS.settings].newValue);
        }
        for (const key of [
          STORAGE_KEYS.rooms,
          STORAGE_KEYS.rules,
          STORAGE_KEYS.blocked,
          STORAGE_KEYS.avoidance,
        ]) {
          if (Object.prototype.hasOwnProperty.call(changes, key)) {
            notifyGlobalData(key, changes[key].newValue);
          }
        }
      });
    } else if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('storage', (e) => {
        if (!e.key) return;
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : null;
          if (onSettingsChange && e.key === STORAGE_KEYS.settings) {
            onSettingsChange(parsed);
          } else if (
            [
              STORAGE_KEYS.rooms,
              STORAGE_KEYS.rules,
              STORAGE_KEYS.blocked,
              STORAGE_KEYS.avoidance,
            ].includes(e.key)
          ) {
            notifyGlobalData(e.key, parsed);
          }
        } catch {}
      });
    }
  }

  function onDataChange(key, fn) {
    ensureStorageWatch(null);
    if (!globalDataListeners.has(key)) globalDataListeners.set(key, new Set());
    globalDataListeners.get(key).add(fn);
    return () => globalDataListeners.get(key)?.delete(fn);
  }

  function createStore(initialSettings = DEFAULT_SETTINGS) {
    let settings = sanitizeSettings(initialSettings);
    const listeners = new Set();

    function notifySettings() {
      const snap = { ...settings };
      for (const fn of listeners) {
        try {
          fn(snap);
        } catch {}
      }
    }

    async function load() {
      const saved = await readData(STORAGE_KEYS.settings, null);
      if (saved) settings = sanitizeSettings(saved);
      ensureStorageWatch((nextVal) => {
        settings = sanitizeSettings(nextVal);
        notifySettings();
      });
      notifySettings();
      return { ...settings };
    }

    function get() {
      return { ...settings };
    }

    function update(partial) {
      settings = sanitizeSettings({ ...settings, ...(partial || {}) });
      writeData(STORAGE_KEYS.settings, settings);
      notifySettings();
      return { ...settings };
    }

    function reset() {
      settings = { ...DEFAULT_SETTINGS };
      writeData(STORAGE_KEYS.settings, settings);
      notifySettings();
      return { ...settings };
    }

    function onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }

    return {
      load,
      get,
      update,
      reset,
      onChange,
      onDataChange,
    };
  }

  return {
    STORAGE_KEYS,
    KICK_NON_CHANNEL_SLUGS,
    DEFAULT_SETTINGS,
    DEFAULT_ROOMS,
    clamp,
    extractDouyinWebRid,
    normalizeRoomInput,
    sanitizeRooms,
    matchPresetForUrl,
    sanitizeSettings,
    readData,
    writeData,
    onDataChange,
    createStore,
  };
});
