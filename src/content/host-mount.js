(function (root, factory) {
  const api = factory(root.__TCD__?.state);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.__TCD__ = root.__TCD__ || {};
  root.__TCD__.hostMount = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (stateMod) {
  'use strict';

  const HOST_ID = 'tcd-host';
  const POS_ATTR = 'data-tcd-pos';
  const WEBFS_ATTR = 'data-tcd-webfs';
  const HIDE_BILI_ATTR = 'data-tcd-hide-bili-dm';
  const WEBFS_LOCK_CLASS = 'tcd-webfs-lock';
  const STYLE_ID = 'tcd-page-host-style';

  const PLAYER_HOST_SELECTORS = [
    '#live-player',
    '.live-player-mounter',
    '#js-player-decorator',
    '#injected-channel-player',
    '[data-testid="player"]',
    '#injected-embedded-channel-player-video',
    '.video-player',
  ];

  function detectHostSite(loc = typeof location !== 'undefined' ? location : null) {
    const host = String(loc?.hostname || '').toLowerCase();
    const path = String(loc?.pathname || '');
    if (host === 'live.bilibili.com') {
      const room = stateMod?.normalizeRoomInput?.('bilibili', `https://live.bilibili.com${path}`) || '';
      return { site: 'bilibili', room };
    }
    if (host === 'kick.com' || host.endsWith('.kick.com')) {
      const room = stateMod?.normalizeRoomInput?.('kick', `https://kick.com${path}`) || '';
      return { site: 'kick', room };
    }
    return { site: 'generic', room: '' };
  }

  function isExcludedVideo(video) {
    if (!video || !video.isConnected) return true;
    if (
      video.closest(
        'nav, #chatroom, #channel-chatroom, [data-testid="chatroom"], #user-identity, #tcd-host, .aside-area',
      )
    ) {
      return true;
    }
    const src = String(video.currentSrc || video.getAttribute?.('src') || '');
    if (/\/rewards\//i.test(src)) return true;
    return false;
  }

  function findStreamVideo(doc = document) {
    const videos = Array.from(doc.querySelectorAll('video'));
    let best = null;
    let bestArea = 0;

    for (const v of videos) {
      if (isExcludedVideo(v)) continue;
      const r = v.getBoundingClientRect();
      if (r.width < 160 || r.height < 90) continue;
      const area = r.width * r.height;
      if (area > bestArea) {
        bestArea = area;
        best = v;
      }
    }
    return best;
  }

  function ensurePageStyle(doc) {
    if (doc.getElementById(STYLE_ID)) return;
    const style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
[${POS_ATTR}="1"] { position: relative !important; }
[${WEBFS_ATTR}="1"] {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100dvh !important;
  max-width: none !important;
  max-height: none !important;
  z-index: 2147483640 !important;
  background: #000 !important;
}
html.${WEBFS_LOCK_CLASS}, html.${WEBFS_LOCK_CLASS} body {
  overflow: hidden !important;
}
html[${HIDE_BILI_ATTR}="1"] .web-player-danmaku,
html[${HIDE_BILI_ATTR}="1"] .danmaku-item-container {
  opacity: 0 !important;
  pointer-events: none !important;
}
`;
    (doc.head || doc.documentElement).appendChild(style);
  }

  function isValidHostBox(el, videoRect, win = window) {
    if (!el || el === el.ownerDocument?.body || el === el.ownerDocument?.documentElement) {
      return false;
    }
    let cs;
    try {
      cs = win.getComputedStyle(el);
    } catch {
      return false;
    }
    if (cs.display === 'contents' || cs.display === 'none') return false;
    const r = el.getBoundingClientRect();
    return r.width >= videoRect.width - 4 && r.height >= videoRect.height - 4 && r.width > 0 && r.height > 0;
  }

  function findPlayerHost(video, doc = document, win = window) {
    if (!video || !video.isConnected) return null;

    const fsEl = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (fsEl && (fsEl === video || fsEl.contains(video))) {
      return fsEl.tagName === 'VIDEO' ? video.parentElement : fsEl;
    }

    const videoRect = video.getBoundingClientRect();

    for (const sel of PLAYER_HOST_SELECTORS) {
      const candidate = video.closest(sel);
      if (candidate && isValidHostBox(candidate, videoRect, win)) {
        try {
          if (win.getComputedStyle(candidate).position === 'static') {
            ensurePageStyle(doc);
            candidate.setAttribute(POS_ATTR, '1');
          }
        } catch {}
        return candidate;
      }
    }

    let parent = video.parentElement;
    while (parent && parent !== doc.body && parent !== doc.documentElement) {
      if (isValidHostBox(parent, videoRect, win)) {
        try {
          if (win.getComputedStyle(parent).position !== 'static') {
            return parent;
          }
        } catch {}
      }
      parent = parent.parentElement;
    }

    const fallback = video.parentElement;
    if (fallback && fallback !== doc.body && fallback !== doc.documentElement) {
      try {
        if (win.getComputedStyle(fallback).position === 'static') {
          ensurePageStyle(doc);
          fallback.setAttribute(POS_ATTR, '1');
        }
      } catch {}
      return fallback;
    }

    return null;
  }

  function findFallbackBox(doc = document, win = window) {
    for (const sel of ['#live-player', '.live-player-mounter', '#injected-channel-player', '[data-testid="player"]']) {
      const el = doc.querySelector(sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.width >= 200 && r.height >= 120) {
        try {
          if (win.getComputedStyle(el).position === 'static') {
            ensurePageStyle(doc);
            el.setAttribute(POS_ATTR, '1');
          }
        } catch {}
        return el;
      }
    }
    return null;
  }

  // Submit directly in current Kick page Lexical composer (zero extra tabs)
  async function submitKickLocalChat(text, doc = document) {
    const clean = String(text || '').trim();
    if (!clean) return { ok: false, error: '弹幕内容为空' };

    const selectors = [
      '[data-testid="chat-input"]',
      '.editor-input[contenteditable]',
      '#chatroom-footer div[contenteditable="true"]',
      'div[contenteditable="true"][role="textbox"]',
    ];
    let field = null;
    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      if (el) {
        field = el;
        break;
      }
    }
    if (!field) return { ok: false, error: '未找到 Kick 聊天输入框，请检查是否已登录' };
    if (field.getAttribute?.('contenteditable') === 'false' || field.disabled) {
      return { ok: false, error: '当前 Kick 聊天不可输入（可能未登录或受限）' };
    }
    const existing = (field.innerText || field.textContent || '').replace(/\u200B/g, '').trim();
    if (existing && existing !== clean) {
      return { ok: false, error: 'Kick 聊天框已有未发送草稿，未覆盖' };
    }

    field.focus();
    let inserted = false;
    try {
      const sel = typeof getSelection === 'function' ? getSelection() : null;
      if (sel && doc.createRange) {
        const range = doc.createRange();
        range.selectNodeContents(field);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      inserted = doc.execCommand?.('insertText', false, clean) || false;
    } catch {
      inserted = false;
    }
    if (!inserted || !(field.innerText || field.textContent || '').trim()) {
      field.textContent = clean;
      field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: clean }));
    }

    await new Promise((r) => setTimeout(r, 120));
    const btn =
      doc.querySelector('#send-message-button') ||
      doc.querySelector('[data-testid="send-message-button"]') ||
      field.closest('form')?.querySelector('button[type="submit"]');
    if (btn && (btn.disabled || btn.getAttribute('aria-disabled') === 'true')) {
      return { ok: false, error: 'Kick 发送按钮不可用' };
    }
    if (btn) btn.click();
    else {
      field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
    }
    return { ok: true };
  }

  function createHostMount(options = {}) {
    const {
      doc = typeof document !== 'undefined' ? document : null,
      win = typeof window !== 'undefined' ? window : null,
      onShadowReady = () => {},
      onBeforeRelocate = () => null,
      onAfterRelocate = () => {},
      onResize = () => {},
      onVideoPlayChange = () => {},
      onWebFullscreenChange = () => {},
      onRouteChange = () => {},
    } = options;

    let host = null;
    let shadowRoot = null;
    let currentHostEl = null;
    let currentVideo = null;
    let resizeObserver = null;
    let checkTimer = 0;
    let triggerTimer = 0;
    let paused = false;
    let webFullscreen = false;
    let lastHref = win?.location?.href || '';

    function createHost() {
      if (host) return host;
      host = doc.createElement('div');
      host.id = HOST_ID;
      host.style.cssText =
        'position:absolute!important;inset:0!important;width:100%!important;height:100%!important;pointer-events:none!important;z-index:999!important;overflow:hidden!important;margin:0!important;padding:0!important;display:block!important;';
      shadowRoot = host.attachShadow({ mode: 'open' });
      onShadowReady(shadowRoot, host);
      return host;
    }

    function wakeTrigger() {
      const player = shadowRoot?.getElementById('player');
      if (!player) return;
      player.classList.add('tcd-show-trigger');
      player.classList.remove('tcd-controls-hidden');
      clearTimeout(triggerTimer);
      triggerTimer = setTimeout(() => {
        const panel = shadowRoot?.getElementById('danmakuSettings');
        const sendBar = shadowRoot?.getElementById('tcdSendBar');
        if ((panel && !panel.hidden) || (sendBar && !sendBar.hidden)) return;
        player.classList.remove('tcd-show-trigger');
        player.classList.add('tcd-controls-hidden');
      }, 2800);
    }

    function setNativeDanmakuSuppressed(enabled) {
      if (!doc?.documentElement) return;
      const { site } = detectHostSite(win?.location);
      if (site === 'bilibili' && enabled) {
        ensurePageStyle(doc);
        doc.documentElement.setAttribute(HIDE_BILI_ATTR, '1');
      } else {
        doc.documentElement.removeAttribute(HIDE_BILI_ATTR);
      }
    }

    function updatePausedState() {
      paused = Boolean(currentVideo && currentVideo.paused && !currentVideo.ended);
      const player = shadowRoot?.getElementById('player');
      if (player) player.classList.toggle('paused', paused);
      onVideoPlayChange(paused);
    }

    const onPlay = () => updatePausedState();
    const onPause = () => updatePausedState();
    const onPointerMove = () => wakeTrigger();

    function attachVideoListeners(video) {
      if (currentVideo === video) return;
      if (currentVideo) {
        currentVideo.removeEventListener('play', onPlay);
        currentVideo.removeEventListener('playing', onPlay);
        currentVideo.removeEventListener('pause', onPause);
        currentVideo.removeEventListener('ended', onPlay);
      }
      currentVideo = video;
      if (currentVideo) {
        currentVideo.addEventListener('play', onPlay);
        currentVideo.addEventListener('playing', onPlay);
        currentVideo.addEventListener('pause', onPause);
        currentVideo.addEventListener('ended', onPlay);
      }
      updatePausedState();
    }

    function setWebFullscreen(enabled) {
      const next = Boolean(enabled);
      if (next && (doc?.fullscreenElement || doc?.webkitFullscreenElement)) {
        try {
          doc.exitFullscreen?.();
        } catch {}
      }
      webFullscreen = next;
      if (currentHostEl) {
        if (webFullscreen) {
          ensurePageStyle(doc);
          currentHostEl.setAttribute(WEBFS_ATTR, '1');
        } else {
          currentHostEl.removeAttribute(WEBFS_ATTR);
        }
      }
      doc?.documentElement?.classList.toggle(WEBFS_LOCK_CLASS, webFullscreen);
      onWebFullscreenChange(webFullscreen);
      onResize();
      wakeTrigger();
      return webFullscreen;
    }

    function toggleWebFullscreen() {
      return setWebFullscreen(!webFullscreen);
    }

    function attachHostListeners(hostEl) {
      if (currentHostEl && currentHostEl !== hostEl) {
        currentHostEl.removeEventListener('pointermove', onPointerMove);
        currentHostEl.removeEventListener('pointerenter', onPointerMove);
        currentHostEl.removeEventListener('pointerdown', onPointerMove);
        currentHostEl.removeEventListener('touchstart', onPointerMove);
        currentHostEl.removeAttribute(WEBFS_ATTR);
      }
      currentHostEl = hostEl;
      if (currentHostEl) {
        currentHostEl.addEventListener('pointermove', onPointerMove, { passive: true });
        currentHostEl.addEventListener('pointerenter', onPointerMove, { passive: true });
        currentHostEl.addEventListener('pointerdown', onPointerMove, { passive: true });
        currentHostEl.addEventListener('touchstart', onPointerMove, { passive: true });
        if (webFullscreen) {
          ensurePageStyle(doc);
          currentHostEl.setAttribute(WEBFS_ATTR, '1');
        }
      }
      if (resizeObserver) resizeObserver.disconnect();
      if (typeof ResizeObserver === 'function' && currentHostEl) {
        resizeObserver = new ResizeObserver(() => onResize());
        resizeObserver.observe(currentHostEl);
      }
    }

    function syncMount() {
      if (!doc) return false;
      if (win?.location?.href && win.location.href !== lastHref) {
        lastHref = win.location.href;
        onRouteChange(detectHostSite(win.location));
      }

      const video = findStreamVideo(doc);
      const targetHost = video ? findPlayerHost(video, doc, win) : findFallbackBox(doc, win);
      if (!targetHost) return false;

      createHost();
      attachVideoListeners(video);

      if (host.parentElement !== targetHost) {
        const snap = host.isConnected ? onBeforeRelocate() : null;
        targetHost.appendChild(host);
        attachHostListeners(targetHost);
        onAfterRelocate(snap);
        wakeTrigger();
      } else if (currentHostEl !== targetHost) {
        attachHostListeners(targetHost);
      }
      return true;
    }

    const onViewportChange = () => {
      if (webFullscreen && (doc?.fullscreenElement || doc?.webkitFullscreenElement)) {
        setWebFullscreen(false);
      }
      syncMount();
      onResize();
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && webFullscreen && !e.defaultPrevented) {
        e.preventDefault();
        setWebFullscreen(false);
      }
    };

    function start() {
      syncMount();
      doc?.addEventListener('fullscreenchange', onViewportChange);
      doc?.addEventListener('webkitfullscreenchange', onViewportChange);
      doc?.addEventListener('keydown', onKeyDown);
      win?.addEventListener('resize', onViewportChange, { passive: true });
      checkTimer = setInterval(syncMount, 600);
    }

    function stop() {
      clearInterval(checkTimer);
      clearTimeout(triggerTimer);
      if (webFullscreen) setWebFullscreen(false);
      setNativeDanmakuSuppressed(false);
      doc?.removeEventListener('fullscreenchange', onViewportChange);
      doc?.removeEventListener('webkitfullscreenchange', onViewportChange);
      doc?.removeEventListener('keydown', onKeyDown);
      win?.removeEventListener('resize', onViewportChange);
      if (resizeObserver) resizeObserver.disconnect();
      attachVideoListeners(null);
      if (currentHostEl) {
        currentHostEl.removeEventListener('pointermove', onPointerMove);
        currentHostEl.removeEventListener('pointerenter', onPointerMove);
        currentHostEl.removeEventListener('pointerdown', onPointerMove);
        currentHostEl.removeEventListener('touchstart', onPointerMove);
        currentHostEl.removeAttribute(WEBFS_ATTR);
        currentHostEl = null;
      }
      if (host) {
        host.remove();
        host = null;
      }
      shadowRoot = null;
    }

    return {
      start,
      stop,
      syncMount,
      wakeTrigger,
      setNativeDanmakuSuppressed,
      setWebFullscreen,
      toggleWebFullscreen,
      isWebFullscreen: () => webFullscreen,
      getShadowRoot: () => shadowRoot,
      getHost: () => host,
      getSiteInfo: () => detectHostSite(win?.location),
    };
  }

  return {
    HOST_ID,
    detectHostSite,
    findStreamVideo,
    findPlayerHost,
    submitKickLocalChat,
    createHostMount,
  };
});
