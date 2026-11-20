(() => {
  'use strict';

  if (location.hash === '#tcd-bg-send') return;
  if (document.documentElement.hasAttribute('data-tcd-running')) return;
  document.documentElement.setAttribute('data-tcd-running', '1.2.0');

  const TCD = globalThis.__TCD__;
  if (!TCD) return;

  const SUPPORTED_SITES = ['bilibili', 'kick', 'douyin'];
  const PLAT_LABELS = { bilibili: 'B站', kick: 'Kick', douyin: '抖音' };

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
    if (!SUPPORTED_SITES.includes(info.site) || !info.room) {
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

    // If sending to Kick or Douyin while actively viewing that same room tab, submit directly in DOM (zero background tab)
    if (targetPlat === 'kick' && siteInfo.site === 'kick' && siteInfo.room === targetRoom) {
      try {
        await chrome.runtime.sendMessage({ type: 'tcd:remember-self', platform: 'kick', text: clean });
      } catch {}
      return TCD.hostMount.submitKickLocalChat(clean, document);
    }
    if (targetPlat === 'douyin' && siteInfo.site === 'douyin' && siteInfo.room === targetRoom) {
      try {
        await chrome.runtime.sendMessage({ type: 'tcd:remember-self', platform: 'douyin', text: clean });
      } catch {}
      return TCD.hostMount.submitDouyinLocalChat(clean, document);
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

  async function dismissCurrentSiteTip() {
    const { site } = hostMount.getSiteInfo();
    if (!SUPPORTED_SITES.includes(site)) return;
    const prev = await TCD.state.readData(TCD.state.STORAGE_KEYS.tips, {});
    const dismissedSites = {
      ...(prev && typeof prev.dismissedSites === 'object' ? prev.dismissedSites : {}),
      [site]: true,
    };
    await TCD.state.writeData(TCD.state.STORAGE_KEYS.tips, { dismissedSites });
  }

  async function maybeShowSiteTip() {
    const { site, room } = hostMount.getSiteInfo();
    if (!SUPPORTED_SITES.includes(site) || !room || !panelUi) return;
    const tips = await TCD.state.readData(TCD.state.STORAGE_KEYS.tips, {});
    if (tips?.dismissedSites?.[site]) return;
    panelUi.showOnboardingTip(site);
    hostMount.wakeTrigger();
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
      chatContent: TCD.chatContent,
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
      onRepeatFeed: async (msg) => {
        const res = await sendToPlatform({
          platform: msg.platform,
          text: msg.sendText || msg.text,
        });
        if (res?.ok) {
          panelUi?.notice(`已往 ${PLAT_LABELS[msg.platform] || msg.platform} +1`);
        } else {
          panelUi?.notice(
            res?.error || '发送失败',
            true,
            res?.needsPage && Number.isInteger(res?.tabId)
              ? { label: '去登录/验证 ↗', onClick: () => revealSendTab(res.tabId) }
              : null,
          );
        }
      },
      onRevealTab: revealSendTab,
      onDismissTip: dismissCurrentSiteTip,
      onDismissUpdate: (version) => {
        chrome.runtime.sendMessage({ type: 'tcd:dismiss-update', version }).catch(() => {});
      },
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

    const siteInfo = hostMount.getSiteInfo();
    if (SUPPORTED_SITES.includes(siteInfo.site)) {
      panelUi.setSendTarget(siteInfo.site);
    }
    panelUi.populateRoomsDialog(rooms);
    if (lastStatuses) panelUi.updateStatuses(lastStatuses);
    maybeShowSiteTip();
  }

  function handleIncomingMessage(message) {
    if (!shadowRoot || !danmakuLayout || !panelUi) return;
    if (!message || typeof message !== 'object') return;
    if (chatBlocking?.isBlocked(message) || chatRules?.blocked(message)) return;

    panelUi.appendChatFeed(message);

    const settings = store.get();
    if (!settings.showChat || document.hidden) return;

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

    const launchBullet = () => {
      if (!store.get().extensionEnabled || !store.get().showChat || document.hidden) {
        if (group) {
          group.queued = false;
          if (group.bullet === bullet) group.bullet = null;
        }
        return;
      }
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
    };

    const pendingImgs = Array.from(bullet.querySelectorAll('img')).filter((img) => !img.complete);
    if (!pendingImgs.length) {
      launchBullet();
    } else {
      let launched = false;
      const done = () => {
        if (launched) return;
        launched = true;
        clearTimeout(waitTimer);
        launchBullet();
      };
      const waitTimer = setTimeout(done, 420);
      Promise.all(
        pendingImgs.map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) return resolve();
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
            }),
        ),
      ).then(done);
    }
  }

  function handleMessageDeleted(ids) {
    if (!store.get().hideDeleted || !Array.isArray(ids)) return;
    panelUi?.removeChatFeedMessages(ids);
    if (!shadowRoot) return;
    const overlay = shadowRoot.getElementById('danmaku');
    if (!overlay) return;
    for (const id of ids) {
      overlay
        .querySelectorAll(`[data-msg-id="${CSS.escape(String(id))}"]`)
        .forEach((el) => el.remove());
    }
  }

  function handleChatClear() {
    if (!store.get().hideDeleted) return;
    panelUi?.clearChatFeed();
    if (!shadowRoot) return;
    danmakuLayout?.clearQueue();
    shadowRoot.getElementById('danmaku')?.replaceChildren();
    chatRules?.reset();
  }

  function disconnectHub() {
    clearTimeout(reconnectTimer);
    reconnectTimer = 0;
    if (port) {
      try {
        port.disconnect();
      } catch {}
      port = null;
    }
  }

  function syncHubConnection() {
    if (!store.get().extensionEnabled) {
      disconnectHub();
      return;
    }
    const info = hostMount.getSiteInfo();
    if (SUPPORTED_SITES.includes(info.site) && info.room) {
      connectHub();
    } else {
      disconnectHub();
    }
  }

  function syncExtensionEnabled(enabled) {
    hostMount.setEnabled(enabled);
    if (!enabled) {
      disconnectHub();
      danmakuLayout?.clearQueue();
      shadowRoot?.getElementById('danmaku')?.replaceChildren();
      danmakuActions?.close();
      panelUi?.hideOnboardingTip();
      panelUi?.hideUpdateTip();
    } else {
      syncSiteRoomOnNavigate();
      syncHubConnection();
    }
  }

  function connectHub() {
    if (port) return;
    try {
      port = chrome.runtime.connect({ name: 'tcd-player' });
    } catch {
      reconnectTimer = setTimeout(syncHubConnection, 2000);
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
      } else if (msg.type === 'tcd:update-available' && msg.update?.shouldNotify) {
        panelUi?.showUpdateTip(msg.update);
        hostMount.wakeTrigger();
      }
    });

    port.onDisconnect.addListener(() => {
      port = null;
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(syncHubConnection, 1500);
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
      if (!store.get().extensionEnabled) return;
      syncSiteRoomOnNavigate();
      syncHubConnection();
      maybeShowSiteTip();
    },
  });

  // Sync changes to tcd_rooms_v1 triggered from popup or another tab
  TCD.state.onDataChange?.(TCD.state.STORAGE_KEYS.rooms, (val) => {
    rooms = TCD.state.sanitizeRooms(val);
    panelUi?.populateRoomsDialog(rooms);
  });

  // Forward passive MAIN-world Kick chatroom metadata and live frames to Service Worker
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

  window.addEventListener('tcd:kick-live-frame', (e) => {
    const d = e?.detail;
    if (!d?.slug || !d?.raw) return;
    chrome.runtime
      .sendMessage({
        type: 'tcd:kick-live-frame',
        slug: d.slug,
        raw: d.raw,
      })
      .catch(() => {});
  });

  // Passive native chat submit watcher so messages sent from official B站/Kick/抖音 input boxes also get blue self-border
  const NATIVE_INPUT_SELECTORS = {
    bilibili: ['.chat-input', '.chat-input-ctnr textarea', 'textarea.chat-input'],
    kick: ['[data-testid="chat-input"]', '#chatroom-footer [contenteditable="true"]'],
    douyin: ['[data-e2e="chat-input"][contenteditable]', '[data-e2e="chat-input"] [contenteditable]', '.webcast-chatroom___textarea'],
  };
  const NATIVE_SEND_BTN_SELECTORS = {
    bilibili: ['.bl-button--primary', '[data-report="send-danmaku"]', '.right-action button'],
    kick: ['#send-message-button', '[data-testid="send-message-button"]'],
    douyin: ['[data-e2e="chat-send-button"]', '.webcast-chatroom___send-btn'],
  };

  function captureNativeSelfSend(site, explicitEl = null) {
    if (!store.get().extensionEnabled || !SUPPORTED_SITES.includes(site)) return;
    let field = explicitEl;
    if (!field) {
      for (const sel of NATIVE_INPUT_SELECTORS[site] || []) {
        const hit = document.querySelector(sel);
        if (hit) {
          field = hit;
          break;
        }
      }
    }
    if (!field) return;
    const raw =
      'value' in field && (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT')
        ? field.value
        : field.innerText || field.textContent || '';
    const clean = String(raw || '').replace(/\u200B/g, '').trim();
    if (!clean || clean.length > 200) return;
    chrome.runtime.sendMessage({ type: 'tcd:remember-self', platform: site, text: clean }).catch(() => {});
  }

  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
      const target = e.target;
      if (!target || (!target.isContentEditable && target.tagName !== 'TEXTAREA' && target.tagName !== 'INPUT')) return;
      const { site } = hostMount.getSiteInfo();
      const sels = NATIVE_INPUT_SELECTORS[site];
      if (sels && sels.some((sel) => target.matches?.(sel) || target.closest?.(sel))) {
        captureNativeSelfSend(site, target);
      }
    },
    true,
  );

  document.addEventListener(
    'pointerdown',
    (e) => {
      const { site } = hostMount.getSiteInfo();
      const sels = NATIVE_SEND_BTN_SELECTORS[site];
      if (sels && sels.some((sel) => e.target?.closest?.(sel))) {
        captureNativeSelfSend(site);
      }
    },
    true,
  );

  // Keyboard shortcuts: Alt+D toggle, Alt+B control bar, Alt+L chat feed, Alt+S settings, Alt+C quick send
  document.addEventListener('keydown', (e) => {
    if (!store.get().extensionEnabled) return;
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
    } else if (code === 'KeyB') {
      e.preventDefault();
      const next = !store.get().showControlBar;
      store.update({ showControlBar: next });
      if (next) hostMount.wakeTrigger();
      panelUi?.notice(next ? '已显示右下角设置条' : '已隐藏右下角设置条（按 Alt+B 可恢复）');
    } else if (code === 'KeyL') {
      e.preventDefault();
      hostMount.wakeTrigger();
      const next = !store.get().showChatFeed;
      store.update({ showChatFeed: next });
      panelUi?.notice(next ? '已打开三端聊天窗' : '已关闭三端聊天窗');
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
          enabled: Boolean(store.get().extensionEnabled),
          mounted: Boolean(hostMount.getHost()?.isConnected),
          siteInfo: hostMount.getSiteInfo(),
          activeBullets: shadowRoot?.getElementById('danmaku')?.children.length || 0,
        });
      } else if (msg.type === 'tcd:open-settings') {
        if (!store.get().extensionEnabled) store.update({ extensionEnabled: true });
        hostMount.syncMount();
        hostMount.wakeTrigger();
        panelUi?.openPanel(true);
        sendResponse({ ok: true });
      } else if (msg.type === 'tcd:open-rooms') {
        if (!store.get().extensionEnabled) store.update({ extensionEnabled: true });
        hostMount.syncMount();
        hostMount.wakeTrigger();
        panelUi?.openRoomsDialog();
        sendResponse({ ok: true });
      }
    });
  }

  let lastEnabledState = true;
  store.onChange((nextSettings) => {
    const nextEnabled = Boolean(nextSettings.extensionEnabled);
    if (nextEnabled !== lastEnabledState) {
      lastEnabledState = nextEnabled;
      syncExtensionEnabled(nextEnabled);
    }
  });

  store.load().then(async (loadedSettings) => {
    lastEnabledState = Boolean(loadedSettings.extensionEnabled);
    hostMount.setEnabled(lastEnabledState);
    if (lastEnabledState) {
      await syncSiteRoomOnNavigate();
    }
    hostMount.start();
    syncHubConnection();
  });
})();
