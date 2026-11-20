(() => {
  'use strict';

  const stateApi = globalThis.__TCD__.state;
  const store = stateApi.createStore();
  const $ = (id) => document.getElementById(id);
  let rooms = stateApi.sanitizeRooms(null);
  let currentUpdate = null;

  function renderUpdate(upd) {
    currentUpdate = upd || null;
    const banner = $('updateBanner');
    if (!banner) return;
    if (upd?.shouldNotify && upd?.latestVersion) {
      $('updateBannerTitle').textContent = `✨ 发现新版本 v${upd.latestVersion}`;
      $('updateBannerDesc').textContent = `${upd.releaseName || 'v' + upd.latestVersion} · 点击前往 GitHub 下载覆盖更新`;
      banner.hidden = false;
    } else {
      banner.hidden = true;
    }
  }

  function renderSettings(s) {
    const enabled = Boolean(s.extensionEnabled);
    $('extensionEnabled').checked = enabled;
    const powerLabel = $('powerLabel');
    if (powerLabel) {
      powerLabel.textContent = enabled ? '已开启' : '已关闭';
      powerLabel.classList.toggle('off', !enabled);
    }
    $('mainControls')?.classList.toggle('is-off', !enabled);

    $('danmakuTransparency').value = String(s.danmakuTransparency);
    $('danmakuTransparencyVal').textContent = s.danmakuTransparency + '%';
    $('danmakuSize').value = String(s.danmakuSize);
    $('danmakuSizeVal').textContent = s.danmakuSize + ' px';
    $('danmakuSpeed').value = String(s.danmakuSpeed);
    $('danmakuSpeedVal').textContent = Number(s.danmakuSpeed).toFixed(1) + '×';

    const maxSlider = s.danmakuMaxCount <= 0 ? 310 : s.danmakuMaxCount;
    $('danmakuMaxCount').value = String(maxSlider);
    $('danmakuMaxCountVal').textContent = s.danmakuMaxCount <= 0 ? '不限' : s.danmakuMaxCount + ' 条';

    for (const id of [
      'showChat',
      'showControlBar',
      'showSuperChat',
      'showChatFeed',
      'showPlatformBadge',
      'allowOverlap',
      'suppressNativeBili',
      'mergeRepeated',
      'mergeTextOnly',
    ]) {
      if ($(id)) $(id).checked = Boolean(s[id]);
    }

    const textOnlyDisabled = !s.mergeRepeated;
    $('mergeTextOnly').disabled = textOnlyDisabled;
    $('mergeTextOnly').parentElement?.classList.toggle('is-disabled', textOnlyDisabled);
  }

  function renderRooms(r) {
    rooms = stateApi.sanitizeRooms(r);
    $('roomEnBili').checked = Boolean(rooms.bilibili.enabled);
    $('roomValBili').value = rooms.bilibili.room || '';
    $('roomEnKick').checked = Boolean(rooms.kick.enabled);
    $('roomValKick').value = rooms.kick.room || '';
    $('roomEnDouyin').checked = Boolean(rooms.douyin.enabled);
    $('roomValDouyin').value = rooms.douyin.room || '';
  }

  function renderHubStatus(statuses) {
    if (!statuses) return;
    const map = [
      ['bilibili', 'pillBili', 'B站'],
      ['kick', 'pillKick', 'Kick'],
      ['douyin', 'pillDouyin', '抖音'],
    ];
    for (const [key, id, label] of map) {
      const el = $(id);
      const st = statuses[key];
      if (!el || !st) continue;
      el.dataset.state = st.state || 'idle';
      el.title = `${label}：${st.text || st.state || '未启用'}`;
    }
  }

  function bind() {
    try {
      const ver = chrome?.runtime?.getManifest?.()?.version;
      if (ver && $('versionLabel')) $('versionLabel').textContent = 'v' + ver;
    } catch {}

    $('extensionEnabled').addEventListener('change', (e) => {
      store.update({ extensionEnabled: e.target.checked });
      setTimeout(refreshStatus, 220);
    });

    $('danmakuTransparency').addEventListener('input', (e) =>
      store.update({ danmakuTransparency: Number(e.target.value) }),
    );
    $('danmakuSize').addEventListener('input', (e) =>
      store.update({ danmakuSize: Number(e.target.value) }),
    );
    $('danmakuSpeed').addEventListener('input', (e) =>
      store.update({ danmakuSpeed: Math.round(Number(e.target.value) * 10) / 10 }),
    );
    $('danmakuMaxCount').addEventListener('input', (e) => {
      const v = Number(e.target.value);
      store.update({ danmakuMaxCount: v >= 310 ? 0 : v });
    });

    for (const id of [
      'showChat',
      'showControlBar',
      'showSuperChat',
      'showChatFeed',
      'showPlatformBadge',
      'allowOverlap',
      'suppressNativeBili',
      'mergeRepeated',
      'mergeTextOnly',
    ]) {
      $(id).addEventListener('change', (e) => store.update({ [id]: e.target.checked }));
    }

    $('saveRoomsBtn').addEventListener('click', async () => {
      const next = stateApi.sanitizeRooms({
        ...rooms,
        bilibili: {
          enabled: $('roomEnBili').checked,
          room: stateApi.normalizeRoomInput('bilibili', $('roomValBili').value),
        },
        kick: {
          enabled: $('roomEnKick').checked,
          room: stateApi.normalizeRoomInput('kick', $('roomValKick').value),
        },
        douyin: {
          enabled: $('roomEnDouyin').checked,
          room: stateApi.normalizeRoomInput('douyin', $('roomValDouyin').value),
        },
      });
      await stateApi.writeData(stateApi.STORAGE_KEYS.rooms, next);
      renderRooms(next);
      chrome.runtime.sendMessage({ type: 'tcd:reconnect' }).catch(() => {});
      setTimeout(refreshStatus, 300);
    });

    $('resetBtn').addEventListener('click', () => store.reset());

    $('openRoomsPanelBtn').addEventListener('click', async () => {
      if (!chrome?.tabs?.query) return;
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'tcd:open-rooms' }).catch(() => {});
        window.close();
      }
    });

    $('openPlayerPanel').addEventListener('click', async () => {
      if (!chrome?.tabs?.query) return;
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'tcd:open-settings' }).catch(() => {});
        window.close();
      }
    });

    $('updateOpenBtn')?.addEventListener('click', () => {
      const url =
        currentUpdate?.releaseUrl || 'https://github.com/ppppiii/tricast-danmaku/releases/latest';
      chrome.tabs?.create ? chrome.tabs.create({ url }) : window.open(url, '_blank', 'noopener');
    });

    $('updateDismissBtn')?.addEventListener('click', async () => {
      if (!currentUpdate?.latestVersion) return;
      try {
        const res = await chrome.runtime.sendMessage({
          type: 'tcd:dismiss-update',
          version: currentUpdate.latestVersion,
        });
        renderUpdate(res?.update || null);
      } catch {
        $('updateBanner').hidden = true;
      }
    });

    $('checkUpdateBtn')?.addEventListener('click', async () => {
      const btn = $('checkUpdateBtn');
      const stEl = $('updateCheckStatus');
      if (btn) btn.disabled = true;
      if (stEl) stEl.textContent = '检查中…';
      try {
        const res = await chrome.runtime.sendMessage({ type: 'tcd:get-update-info', force: true });
        const upd = res?.update;
        renderUpdate(upd);
        if (stEl) {
          if (upd?.error) {
            stEl.textContent = '检查失败，请稍后重试';
          } else if (upd?.hasUpdate) {
            // If user manually clicked check update, show banner even if previously dismissed
            renderUpdate({ ...upd, shouldNotify: true });
            stEl.textContent = `有新版 v${upd.latestVersion}`;
          } else {
            stEl.textContent = '已是最新版本';
          }
        }
      } catch {
        if (stEl) stEl.textContent = '检查失败';
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  async function refreshStatus() {
    const statusEl = $('tabStatus');
    const enabled = Boolean(store.get().extensionEnabled);

    try {
      const hub = await chrome.runtime.sendMessage({ type: 'tcd:get-hub-status' });
      if (hub?.statuses) renderHubStatus(hub.statuses);
      if (hub?.update) renderUpdate(hub.update);
    } catch {}

    if (!enabled) {
      statusEl.className = 'off';
      statusEl.textContent = '插件已关闭（点右上角开关随时启用）';
      return;
    }

    if (!chrome?.tabs?.query) {
      statusEl.className = '';
      statusEl.textContent = '预览模式';
      return;
    }
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url || !/^https:\/\/(?:live\.bilibili\.com|([^/]+\.)?kick\.com|(?:live|www)\.douyin\.com)\//i.test(tab.url)) {
        statusEl.className = '';
        statusEl.textContent = '请打开 B站 / Kick / 抖音 直播间';
        $('openPlayerPanel').disabled = true;
        $('openRoomsPanelBtn').disabled = true;
        return;
      }
      const res = await chrome.tabs.sendMessage(tab.id, { type: 'tcd:get-status' });
      if (res?.mounted) {
        statusEl.className = 'ok';
        const siteNames = { bilibili: 'B站页', kick: 'Kick页', douyin: '抖音页' };
        const siteLabel = siteNames[res.siteInfo?.site] || '直播页';
        statusEl.textContent = `已挂载 (${siteLabel}) · 同屏 ${res.activeBullets} 条`;
        $('openPlayerPanel').disabled = false;
        $('openRoomsPanelBtn').disabled = false;
      } else if (res?.siteInfo && !res.siteInfo.room) {
        statusEl.className = '';
        statusEl.textContent = '请进入 B站 / Kick / 抖音 直播间';
        $('openPlayerPanel').disabled = true;
        $('openRoomsPanelBtn').disabled = true;
      } else {
        statusEl.className = '';
        statusEl.textContent = '等待播放器加载…';
      }
    } catch {
      statusEl.className = '';
      statusEl.textContent = '刷新直播页后生效';
      $('openPlayerPanel').disabled = true;
      $('openRoomsPanelBtn').disabled = true;
    }
  }

  store.onChange(renderSettings);
  bind();
  Promise.all([
    store.load(),
    stateApi.readData(stateApi.STORAGE_KEYS.rooms, null).then(renderRooms),
  ]).then(refreshStatus);
})();
