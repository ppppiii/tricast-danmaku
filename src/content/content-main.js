(() => {
  'use strict';

  if (document.documentElement.hasAttribute('data-tcd-running')) return;
  document.documentElement.setAttribute('data-tcd-running', '1.0.0');

  const TCD = globalThis.__TCD__;
  if (!TCD) return;

  const store = TCD.state.createStore();
  let rooms = TCD.state.sanitizeRooms(null);
  let lastStatuses = null;
  let shadowRoot = null;
  let danmakuLayout = null;
  let chatRules = null;
  let chatBlocking = null;
  let avoidance = null;
  let danmakuActions = null;
  let panelUi = null;
  let port = null;
  let reconnectTimer = 0;

  async function saveRooms(nextRooms) {
    rooms = TCD.state.sanitizeRooms(nextRooms);
    await TCD.state.writeData(TCD.state.STORAGE_KEYS.rooms, rooms);
    panelUi?.populateRoomsDialog(rooms);
  }

  async function syncSiteRoomOnNavigate() {
    const info = hostMount.getSiteInfo();
    if (!['bilibili', 'kick'].includes(info.site) || !info.room) {
      return;
    }
    const stored = await TCD.state.readData(TCD.state.STORAGE_KEYS.rooms, null);
    rooms = TCD.state.sanitizeRooms(stored);

    // 1. Auto-activate saved 3-platform preset if URL matches a preset
    const matched = TCD.state.matchPresetForUrl(location.href, rooms);
    if (matched) {
      const next = TCD.state.sanitizeRooms({
        ...rooms,
        presetId: matched.id,
        bilibili: { enabled: Boolean(matched.bilibili), room: matched.bilibili },
        kick: { enabled: Boolean(matched.kick), room: matched.kick },
        douyin: { enabled: Boolean(matched.douyin), room: matched.douyin },
      });
      await saveRooms(next);
      panelUi?.setSendTarget(info.site);
      return;
    }

    // 2. First-run zero-config fallback: populate the current site's room only when still empty
    if (!rooms[info.site]?.room) {
      const next = TCD.state.sanitizeRooms({
        ...rooms,
        [info.site]: { enabled: true, room: info.room },
      });
      await saveRooms(next);
    }

    panelUi?.setSendTarget(info.site);
  }

  async function sendToPlatform({ platform, text }) {
    const clean = String(text || '').trim();
    if (!clean) return { ok: false, error: '弹幕内容为空' };

    const targetPlat = platform || hostMount.getSiteInfo().site || 'bilibili';
    const siteInfo = hostMount.getSiteInfo();
    const targetRoom =
      rooms[targetPlat]?.room || (siteInfo.site === targetPlat ? siteInfo.room : '');

    if (!targetRoom) {
      return { ok: false, error: `尚未配置 ${targetPlat} 直播间号，请先在「融合房间」填写` };
    }

    // If sending to Kick while actively viewing that same Kick channel tab, submit directly in DOM (zero background tab)
    if (targetPlat === 'kick' && siteInfo.site === 'kick' && siteInfo.room === targetRoom) {
      try {
        await chrome.runtime.sendMessage({ type: 'tcd:remember-self', platform: 'kick', text: clean });
      } catch {}
      return TCD.hostMount.submitKickLocalChat(clean, document);
    }

    return chrome.runtime.sendMessage({
      type: 'tcd:send-chat',
      platform: targetPlat,
      room: targetRoom,
      text: clean,
    });
  }

  function revealSendTab(tabId) {
    chrome.runtime.sendMessage({ type: 'tcd:reveal-tab', tabId }).catch(() => {});
  }

  function onShadowReady(sr) {
    shadowRoot = sr;
    TCD.panelUi.mountShadowContent(shadowRoot);

    const overlay = shadowRoot.getElementById('danmaku');

    avoidance = TCD.avoidance.createAvoidance({
      shadowRoot,
      stateApi: TCD.state,
      onMaskChange: () => danmakuLayout?.maskSC(),
      onNotice: (text, err) => panelUi?.notice(text, err),
    });

    danmakuLayout = TCD.danmakuLayout.createDanmakuLayout({
      overlay,
      getSettings: () => store.get(),
      isLaneHeld: (lane, endLane) => {
        if (!danmakuActions) return false;
        for (let l = lane; l <= endLane; l++) {
          if (danmakuActions.isLaneHeld(l)) return true;
        }
        return false;
      },
      getAvoidance: () => avoidance,
    });

    chatRules = TCD.chatRules.createChatRules({
      shadowRoot,
      store,
      stateApi: TCD.state,
    });

    chatBlocking = TCD.chatBlocking.createChatBlocking({
      shadowRoot,
      stateApi: TCD.state,
    });

    danmakuActions = TCD.danmakuActions.createDanmakuActions({
      shadowRoot,
      getSettings: () => store.get(),
      chatBlocking,
      chatRules,
      onNotice: (text, err) => panelUi?.notice(text, err),
      onRevealTab: revealSendTab,
      onRepeat: async (msg) => {
        const res = await sendToPlatform({
          platform: msg.platform,
          text: msg.sendText || msg.text,
        });
        if (!res?.ok) {
          return {
            text: res?.error || '发送失败',
            needsPage: res?.needsPage,
            tabId: res?.tabId,
          };
        }
        return '已 +1';
      },
      onReply: (msg) => {
        panelUi?.openSendBar({ platform: msg.platform, replyMsg: msg });
      },
    });

    panelUi = TCD.panelUi.createPanelUI({
      shadowRoot,
      store,
      danmakuLayout,
      getRooms: () => rooms,
      onSaveRooms: saveRooms,
      onReconnect: () => {
        try {
          port?.postMessage({ type: 'tcd:reconnect' });
        } catch {
          chrome.runtime.sendMessage({ type: 'tcd:reconnect' }).catch(() => {});
        }
      },
      onSendChat: sendToPlatform,
      onRevealTab: revealSendTab,
      onPanelToggle: (open) => {
        if (open) hostMount.wakeTrigger();
      },
      onShowChatChange: (enabled) => {
        if (!enabled) danmakuActions?.close();
      },
      onSuppressNativeChange: (enabled) => {
        hostMount.setNativeDanmakuSuppressed(enabled);
      },
    });

    const webFsBtn = shadowRoot.getElementById('tcdWebFullscreenBtn');
    if (webFsBtn) {
      webFsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hostMount.toggleWebFullscreen();
      });
    }

    const siteInfo = hostMount.getSiteInfo();
    if (['bilibili', 'kick'].includes(siteInfo.site)) {
      panelUi.setSendTarget(siteInfo.site);
    }
    panelUi.populateRoomsDialog(rooms);
    if (lastStatuses) panelUi.updateStatuses(lastStatuses);
  }

  function handleIncomingMessage(message) {
    if (!shadowRoot || !danmakuLayout || !panelUi) return;
    const settings = store.get();
    if (!settings.showChat || document.hidden) return;
    if (!message || typeof message !== 'object') return;

    if (chatBlocking?.isBlocked(message) || chatRules?.blocked(message)) return;

    // 8s pure-text merge (emotes / stickers / GIFs are skipped by default when mergeTextOnly is true)
    const merged = chatRules?.merge(message);
    if (merged && (merged.bullet?.isConnected || merged.queued)) return;

    const group = merged || chatRules?.track(message);
    const overlay = shadowRoot.getElementById('danmaku');
    if (!overlay) return;

    const bullet = document.createElement('span');
    bullet.className = message.isSelf ? 'bullet is-self' : 'bullet';
    if (message.id) bullet.dataset.msgId = String(message.id);
    if (typeof message.color === 'string' && /^#[0-9a-f]{6}$/i.test(message.color)) {
      bullet.style.setProperty('--danmaku-native-color', message.color.toLowerCase());
    }

    TCD.chatContent.append(bullet, message, settings);
    chatBlocking?.tag(bullet, message);
    if (group) group.queued = true;
    chatRules?.attachBullet(group, bullet, message);

    danmakuLayout.enqueue(bullet, {
      onSpawn: (el) => {
        if (group) group.queued = false;
        danmakuActions?.attach(el, message);
      },
      onDrop: () => {
        if (group) {
          group.queued = false;
          if (group.bullet === bullet) group.bullet = null;
        }
      },
    });
  }

  function handleMessageDeleted(ids) {
    if (!shadowRoot || !store.get().hideDeleted || !Array.isArray(ids)) return;
    const overlay = shadowRoot.getElementById('danmaku');
    if (!overlay) return;
    for (const id of ids) {
      overlay
        .querySelectorAll(`[data-msg-id="${CSS.escape(String(id))}"]`)
        .forEach((el) => el.remove());
    }
  }

  function handleChatClear() {
    if (!shadowRoot || !store.get().hideDeleted) return;
    danmakuLayout?.clearQueue();
    shadowRoot.getElementById('danmaku')?.replaceChildren();
    chatRules?.reset();
  }

  function connectHub() {
    if (port) return;
    try {
      port = chrome.runtime.connect({ name: 'tcd-player' });
    } catch {
      reconnectTimer = setTimeout(connectHub, 2000);
      return;
    }

    port.onMessage.addListener((msg) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'tcd:danmaku' || msg.type === 'tcd:self-echo') {
        handleIncomingMessage(msg.message);
      } else if (msg.type === 'tcd:delete') {
        handleMessageDeleted(msg.ids);
      } else if (msg.type === 'tcd:clear') {
        handleChatClear();
      } else if (msg.type === 'tcd:status') {
        if (msg.statuses) {
          lastStatuses = msg.statuses;
          panelUi?.updateStatuses(msg.statuses);
        }
        if (msg.rooms) {
          rooms = TCD.state.sanitizeRooms(msg.rooms);
          panelUi?.populateRoomsDialog(rooms);
        }
      }
    });

    port.onDisconnect.addListener(() => {
      port = null;
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connectHub, 1500);
    });
  }

  const hostMount = TCD.hostMount.createHostMount({
    doc: document,
    win: window,
    onShadowReady,
    onBeforeRelocate: () => danmakuLayout?.snapshotAnimations() || null,
    onAfterRelocate: (snaps) => {
      if (snaps) danmakuLayout?.restoreAnimations(snaps);
      danmakuLayout?.layout();
    },
    onResize: () => danmakuLayout?.layout(),
    onRouteChange: () => {
      syncSiteRoomOnNavigate();
    },
    onWebFullscreenChange: (active) => {
      const btn = shadowRoot?.getElementById('tcdWebFullscreenBtn');
      if (btn) {
        btn.setAttribute('aria-pressed', String(active));
        btn.textContent = active ? '退出全屏' : '网页全屏';
      }
    },
  });

  // Sync changes to tcd_rooms_v1 triggered from popup or another tab
  TCD.state.onDataChange?.(TCD.state.STORAGE_KEYS.rooms, (val) => {
    rooms = TCD.state.sanitizeRooms(val);
    panelUi?.populateRoomsDialog(rooms);
  });

  // Forward passive MAIN-world Kick chatroom metadata to Service Worker
  window.addEventListener('tcd:kick-meta', (e) => {
    const d = e?.detail;
    if (!d?.slug || !d?.chatroomId) return;
    chrome.runtime
      .sendMessage({
        type: 'tcd:kick-meta',
        slug: d.slug,
        chatroomId: d.chatroomId,
        userId: d.userId || '',
      })
      .catch(() => {});
  });

  // Keyboard shortcuts: Alt+D toggle, Alt+S settings, Alt+C quick send
  document.addEventListener('keydown', (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const target = e.target;
    if (
      target &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    ) {
      return;
    }
    const code = e.code || '';
    if (code === 'KeyD') {
      e.preventDefault();
      const next = !store.get().showChat;
      store.update({ showChat: next });
      if (!next) {
        danmakuLayout?.clearQueue();
        shadowRoot?.getElementById('danmaku')?.replaceChildren();
      }
      panelUi?.notice(next ? '已开启融合弹幕' : '已关闭融合弹幕');
    } else if (code === 'KeyS') {
      e.preventDefault();
      hostMount.wakeTrigger();
      panelUi?.togglePanel();
    } else if (code === 'KeyC') {
      e.preventDefault();
      hostMount.wakeTrigger();
      panelUi?.openSendBar();
    }
  });

  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'tcd:get-status') {
        sendResponse({
          mounted: Boolean(hostMount.getHost()?.isConnected),
          siteInfo: hostMount.getSiteInfo(),
          activeBullets: shadowRoot?.getElementById('danmaku')?.children.length || 0,
        });
      } else if (msg.type === 'tcd:open-settings') {
        hostMount.syncMount();
        hostMount.wakeTrigger();
        panelUi?.openPanel(true);
        sendResponse({ ok: true });
      } else if (msg.type === 'tcd:open-rooms') {
        hostMount.syncMount();
        hostMount.wakeTrigger();
        panelUi?.openRoomsDialog();
        sendResponse({ ok: true });
      }
    });
  }

  store.load().then(async () => {
    await syncSiteRoomOnNavigate();
    hostMount.start();
    connectHub();
  });
})();
