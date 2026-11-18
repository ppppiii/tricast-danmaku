(function (root, factory) {
  const api = factory(root.__TCD__?.shadowUi, root.__TCD__?.state, root.__TCD__?.chatContent);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.__TCD__ = root.__TCD__ || {};
  root.__TCD__.panelUi = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (shadowUiMod, stateMod, chatContentMod) {
  'use strict';

  function buildShadowMarkup() {
    return `
<div id="player">
  <div id="danmaku" aria-label="三端融合弹幕" data-platform-badge="true"></div>

  <div id="tcdFloatingTrigger" data-open="false">
    <button id="tcdRoomsBtn" type="button" title="配置 B站 / Kick / 抖音 融合直播间">
      <span class="tcd-dots">
        <i class="tcd-dot" data-plat="bilibili" data-state="idle" title="B站"></i>
        <i class="tcd-dot" data-plat="kick" data-state="idle" title="Kick"></i>
        <i class="tcd-dot" data-plat="douyin" data-state="idle" title="抖音"></i>
      </span>
      <span>融合房间</span>
    </button>
    <button id="tcdTriggerToggle" type="button" aria-pressed="true" title="开关弹幕 (Alt+D)">弹幕 开</button>
    <button id="tcdFeedToggleBtn" type="button" aria-pressed="false" aria-controls="tcdChatFeed" title="三端实时聊天窗 (Alt+L)">📋 聊天窗</button>
    <button id="tcdSendToggleBtn" type="button" aria-expanded="false" aria-controls="tcdSendBar" title="跨平台发弹幕 (Alt+C)">💬 发弹幕</button>
    <button id="tcdWebFullscreenBtn" type="button" aria-pressed="false" title="网页全屏">网页全屏</button>
    <button id="danmakuSettingsButton" type="button" aria-expanded="false" aria-controls="danmakuSettings" title="弹幕设置 (Alt+S)">⚙</button>
  </div>

  <aside id="tcdChatFeed" aria-label="三端实时聊天窗" data-platform-badge="true" hidden>
    <div id="tcdChatFeedHeader" title="按住可拖动位置">
      <div class="tcd-feed-title">
        <strong>三端弹幕池</strong>
        <div class="tcd-feed-filters" role="tablist" aria-label="按平台筛选">
          <button type="button" class="tcd-feed-filter active" data-filter="all">全部</button>
          <button type="button" class="tcd-feed-filter" data-filter="bilibili">B</button>
          <button type="button" class="tcd-feed-filter" data-filter="kick">K</button>
          <button type="button" class="tcd-feed-filter" data-filter="douyin">抖</button>
        </div>
      </div>
      <div class="tcd-feed-head-actions">
        <button id="tcdFeedClearBtn" type="button" title="清空当前列表">清空</button>
        <button id="tcdFeedCloseBtn" type="button" aria-label="关闭聊天窗">×</button>
      </div>
    </div>
    <div id="tcdChatFeedList" role="log" aria-live="polite" data-active-filter="all">
      <div id="tcdChatFeedEmpty">等待 B站 / Kick / 抖音 实时弹幕…</div>
    </div>
    <div class="tcd-feed-footer">
      <button id="tcdFeedOpenSendBtn" type="button">💬 选择平台发弹幕 (Alt+C)</button>
    </div>
  </aside>

  <form id="tcdSendBar" hidden>
    <div class="tcd-send-targets" role="radiogroup" aria-label="选择发送目标直播间">
      <button type="button" class="tcd-target-btn active" data-target="bilibili">B站</button>
      <button type="button" class="tcd-target-btn" data-target="kick">Kick</button>
      <button type="button" class="tcd-target-btn" data-target="douyin">抖音</button>
    </div>
    <span id="tcdReplyBadge" hidden></span>
    <input id="tcdSendInput" type="text" maxlength="100" placeholder="往 B站 直播间发弹幕…" autocomplete="off">
    <button id="tcdSendSubmit" type="submit">发送</button>
    <button id="tcdSendClose" type="button" aria-label="关闭发送栏">×</button>
  </form>

  <section id="danmakuSettings" class="danmaku-settings" aria-label="画面弹幕设置" hidden>
    <div class="danmaku-settings-heading">
      <div><strong>三端融合弹幕</strong><span>B站 · Kick · 抖音</span></div>
      <button id="closeDanmakuSettings" type="button" aria-label="关闭弹幕设置">×</button>
    </div>

    <div class="danmaku-sliders">
      <div class="danmaku-control">
        <label for="danmakuTransparency">透明度<output id="danmakuTransparencyValue">15%</output></label>
        <input id="danmakuTransparency" type="range" min="0" max="95" step="1" value="15">
      </div>
      <div class="danmaku-control">
        <label for="danmakuSize">字号<output id="danmakuSizeValue">22 px</output></label>
        <input id="danmakuSize" type="range" min="14" max="64" step="1" value="22">
      </div>
      <div class="danmaku-control">
        <label for="danmakuSpeed">速度<output id="danmakuSpeedValue">1.0×</output></label>
        <input id="danmakuSpeed" type="range" min="0.4" max="2.5" step="0.1" value="1">
      </div>
      <div class="danmaku-control">
        <label for="danmakuDensity">密度<output id="danmakuDensityValue">75%</output></label>
        <input id="danmakuDensity" type="range" min="20" max="100" step="5" value="75">
      </div>
      <div class="danmaku-control">
        <label for="danmakuMaxCount">同屏上限<output id="danmakuMaxCountValue">80 条</output></label>
        <input id="danmakuMaxCount" type="range" min="20" max="310" step="10" value="80">
      </div>
      <div class="danmaku-control">
        <label for="emoteScale">表情/GIF<output id="emoteScaleValue">1.5×</output></label>
        <input id="emoteScale" type="range" min="1.0" max="3.0" step="0.1" value="1.5">
      </div>
    </div>

    <div class="danmaku-setting-row">
      <label for="danmakuArea">显示区域</label>
      <select id="danmakuArea">
        <option value="25">顶部 1/4</option>
        <option value="50">顶部 1/2</option>
        <option value="75">顶部 3/4</option>
        <option value="100" selected>全屏</option>
      </select>
    </div>
    <div class="danmaku-setting-row">
      <label for="lineHeightRatio">轨道行距</label>
      <select id="lineHeightRatio">
        <option value="1.15">紧凑 (1.15×)</option>
        <option value="1.35" selected>标准 (1.35×)</option>
        <option value="1.65">宽松 (1.65×)</option>
      </select>
    </div>
    <div class="danmaku-setting-row">
      <label for="fontWeight">字重与描边</label>
      <div style="display:flex;gap:6px;">
        <select id="fontWeight" style="min-width:80px;">
          <option value="400" selected>常规</option>
          <option value="600">中粗</option>
          <option value="700">粗体</option>
          <option value="900">特粗</option>
        </select>
        <select id="textStroke" style="min-width:86px;">
          <option value="strong">强描边</option>
          <option value="standard" selected>标准描边</option>
          <option value="soft">柔和阴影</option>
        </select>
      </div>
    </div>

    <div class="danmaku-toggles">
      <label><input id="showChat" type="checkbox" checked>开启弹幕</label>
      <label><input id="showChatFeed" type="checkbox">三端聊天窗 (Alt+L)</label>
      <label><input id="showPlatformBadge" type="checkbox" checked>显示来源角标 (B/K/抖)</label>
      <label><input id="allowOverlap" type="checkbox">满轨允许叠层</label>
      <label><input id="suppressNativeBili" type="checkbox" checked>隐藏网页原弹幕(B/抖)</label>
      <label><input id="showUsername" type="checkbox">显示用户名</label>
      <label><input id="enableActions" type="checkbox" checked>悬停 +1/回复</label>
      <label><input id="mergeRepeated" type="checkbox" checked>刷屏合并(8s)</label>
      <label><input id="hideDeleted" type="checkbox" checked>隐藏被删消息</label>
      <label class="tcd-span-2"><input id="mergeTextOnly" type="checkbox" checked>仅合并纯文字（表情 / GIF 不合并）</label>
    </div>

    <div class="danmaku-tool-actions">
      <button id="openRoomsModalBtn" type="button" class="tcd-span-2">三端直播间配置与主播预设</button>
      <button id="danmakuColorsButton" type="button">弹幕颜色管理</button>
      <button id="chatRulesButton" type="button">关键词与刷屏</button>
      <button id="avoidanceButton" type="button">弹幕避让区</button>
      <button id="manageBlocked" type="button">屏蔽用户管理（0）</button>
    </div>

    <div class="danmaku-settings-footer">
      <small>Alt+D 弹幕 · Alt+L 聊天窗 · Alt+C 发送 · Alt+S 设置</small>
      <button id="resetDanmakuStyle" type="button">恢复默认</button>
    </div>
  </section>

  <!-- Tri-platform Rooms Dialog -->
  <div id="roomsDialog" class="tcd-modal-backdrop" hidden>
    <div class="tcd-modal" role="dialog" aria-label="三端直播间配置">
      <h2>三端融合直播间配置</h2>
      <p>填入同一主播在不同平台的房间号或链接，即可在 B 站、Kick 或抖音页面实时融合三路弹幕与聊天窗。</p>
      <p class="tcd-rooms-subtip">💡 提示：在 B 站或抖音观看建议随手关掉播放器自带弹幕；在 Kick 观看建议关掉其他弹幕插件/油猴脚本，避免双层重影。</p>

      <div class="tcd-preset-bar">
        <select id="tcdPresetSelect" aria-label="主播预设">
          <option value="">-- 当前临时配置 / 选择预设 --</option>
        </select>
        <button id="tcdSavePresetBtn" type="button">存为预设</button>
        <button id="tcdDeletePresetBtn" type="button">删预设</button>
      </div>

      <div class="tcd-room-rows">
        <div class="tcd-room-row">
          <label class="tcd-room-head"><input id="roomEnBili" type="checkbox" checked><span style="color:var(--bili)">B站</span></label>
          <div class="tcd-room-input-wrap">
            <input id="roomValBili" type="text" placeholder="B站房间号或 live.bilibili.com/12345">
            <span id="roomStatusBili" class="tcd-room-status">未配置</span>
          </div>
        </div>
        <div class="tcd-room-row">
          <label class="tcd-room-head"><input id="roomEnKick" type="checkbox" checked><span style="color:var(--kick)">Kick</span></label>
          <div class="tcd-room-input-wrap">
            <input id="roomValKick" type="text" placeholder="Kick 频道名或 kick.com/slug">
            <span id="roomStatusKick" class="tcd-room-status">未配置</span>
          </div>
        </div>
        <div class="tcd-room-row">
          <label class="tcd-room-head"><input id="roomEnDouyin" type="checkbox" checked><span style="color:var(--douyin)">抖音</span></label>
          <div class="tcd-room-input-wrap">
            <input id="roomValDouyin" type="text" placeholder="房间号 / live.douyin.com / follow/live 链接">
            <span id="roomStatusDouyin" class="tcd-room-status">未配置</span>
          </div>
        </div>
      </div>

      <div class="dialog-actions">
        <button id="tcdReconnectBtn" type="button">重连全部</button>
        <button id="tcdCloseRoomsBtn" type="button">取消</button>
        <button id="tcdApplyRoomsBtn" type="button" class="primary">保存并同步弹幕</button>
      </div>
    </div>
  </div>

  <div id="danmakuColorsDialog" class="tcd-modal-backdrop" hidden>
    <div class="tcd-modal danmaku-colors-dialog" role="dialog" aria-label="弹幕颜色管理">
      <h2>弹幕颜色管理</h2>
      <label class="platform-color-toggle">
        <input id="danmakuPlatformColors" type="checkbox">显示各平台观众原生颜色
      </label>
      <p>关闭原生颜色后，所有弹幕统一使用下方自定义颜色。</p>
      <div class="color-row">
        <label for="customColor">统一/默认弹幕颜色</label>
        <input id="customColor" type="color" value="#ffffff">
      </div>
      <div class="dialog-actions">
        <button id="closeDanmakuColors" type="button" class="primary">完成</button>
      </div>
    </div>
  </div>

  <div id="chatRulesDialog" class="tcd-modal-backdrop" hidden>
    <div class="tcd-modal" role="dialog" aria-label="关键词与刷屏">
      <h2>关键词屏蔽</h2>
      <p>屏蔽包含以下关键词的弹幕（不区分大小写）。</p>
      <div class="keyword-list">
        <div id="blockedKeywords"></div>
        <button id="addKeyword" type="button" aria-label="添加屏蔽关键词" title="添加关键词">＋</button>
      </div>
      <div id="keywordEditor" hidden>
        <input id="keywordInput" type="text" maxlength="100" placeholder="输入关键词，回车添加" autocomplete="off">
        <button id="confirmKeyword" type="button" class="primary">添加</button>
      </div>
      <div id="keywordStatus" role="status"></div>
      <label class="merge-setting"><input id="mergeRepeatedModal" type="checkbox" checked>合并 8 秒内相同弹幕（显示 ×N）</label>
      <label class="merge-setting merge-sub-setting"><input id="mergeTextOnlyModal" type="checkbox" checked>仅合并纯文字弹幕（表情 / GIF 保持逐条飘屏）</label>
      <div class="dialog-actions">
        <button type="button" data-close="chatRulesDialog" class="primary">完成</button>
      </div>
    </div>
  </div>

  <div id="blockedDialog" class="tcd-modal-backdrop" hidden>
    <div class="tcd-modal" role="dialog" aria-label="屏蔽用户">
      <h2>屏蔽用户</h2>
      <p>仅在本机隐藏所选用户的画面弹幕，可随时解除。</p>
      <form id="blockUserForm">
        <label for="blockUserInput" style="font-size:12px;color:var(--muted);">UID 或完整用户名</label>
        <div class="block-add">
          <input id="blockUserInput" type="text" maxlength="100" required placeholder="输入 UID 或完整用户名">
          <button type="submit" class="primary">屏蔽</button>
        </div>
      </form>
      <p id="blockStatus" role="status"></p>
      <div id="blockedList"></div>
      <div class="dialog-actions">
        <button id="closeBlocked" type="button">关闭</button>
      </div>
    </div>
  </div>

  <aside id="tcdOnboardingTip" role="dialog" aria-label="防重影使用提示" hidden>
    <div class="tcd-tip-head">
      <strong>💡 三端弹幕防重影提示</strong>
      <button id="tcdTipCloseX" type="button" aria-label="关闭提示">×</button>
    </div>
    <p id="tcdOnboardingBody"></p>
    <div class="tcd-tip-actions">
      <button id="tcdTipOpenRoomsBtn" type="button">配置融合房间</button>
      <button id="tcdTipDismissBtn" type="button" class="primary">知道了，不再提示</button>
    </div>
  </aside>

  <div id="tcdToast" role="status" hidden></div>
</div>`;
  }

  function mountShadowContent(shadowRoot, cssText = shadowUiMod?.SHADOW_CSS || '') {
    const doc = shadowRoot.ownerDocument || document;
    const style = doc.createElement('style');
    style.textContent = cssText;
    const wrapper = doc.createElement('div');
    wrapper.innerHTML = buildShadowMarkup();
    shadowRoot.replaceChildren(style, wrapper.firstElementChild);
    return shadowRoot;
  }

  function createPanelUI(options) {
    const {
      shadowRoot,
      store,
      danmakuLayout,
      chatContent: chatContentOpt = null,
      getRooms = () => stateMod.DEFAULT_ROOMS,
      onSaveRooms = () => {},
      onReconnect = () => {},
      onSendChat = async () => ({ ok: true }),
      onRepeatFeed = async () => ({ ok: true }),
      onRevealTab = () => {},
      onDismissTip = () => {},
      onPanelToggle = () => {},
      onShowChatChange = () => {},
      onSuppressNativeChange = () => {},
    } = options;

    const chatContentApi = chatContentOpt || chatContentMod || null;
    const $ = (id) => shadowRoot.getElementById(id);
    const overlay = $('danmaku');
    const panel = $('danmakuSettings');
    const trigger = $('tcdFloatingTrigger');
    const triggerToggle = $('tcdTriggerToggle');
    const feedToggleBtn = $('tcdFeedToggleBtn');
    const chatFeed = $('tcdChatFeed');
    const feedHeader = $('tcdChatFeedHeader');
    const feedList = $('tcdChatFeedList');
    const feedEmpty = $('tcdChatFeedEmpty');
    const settingsBtn = $('danmakuSettingsButton');
    const sendBar = $('tcdSendBar');
    const sendInput = $('tcdSendInput');
    const sendSubmit = $('tcdSendSubmit');
    const replyBadge = $('tcdReplyBadge');
    const onboardingTip = $('tcdOnboardingTip');
    const onboardingBody = $('tcdOnboardingBody');

    let toastTimer = 0;
    let activeSendTarget = 'bilibili';
    let replyContext = null;

    const PLAT_LABELS = { bilibili: 'B站', kick: 'Kick', douyin: '抖音' };
    const TIP_COPY = {
      bilibili:
        '为避免双层弹幕重影，建议在 B 站播放器底栏关闭自带弹幕（插件也已默认开启隐藏兜底）。点「配置融合房间」即可填入三端直播间。',
      douyin:
        '为避免双层弹幕重影，建议在抖音播放器底栏关闭原生弹幕开关，只保留本插件的三端融合弹幕。点「配置融合房间」即可填入三端直播间。',
      kick:
        'Kick 原生无画面弹幕；若你同时装了其他 Kick 弹幕扩展或油猴脚本（如 DanMage 等），建议将其关闭以免重影。点「配置融合房间」即可填入三端直播间。',
    };
    const FEED_MAX_ITEMS = 120;

    function showOnboardingTip(site) {
      if (!onboardingTip || !onboardingBody) return;
      const copy = TIP_COPY[site];
      if (!copy) return;
      onboardingBody.textContent = copy;
      onboardingTip.dataset.site = site;
      onboardingTip.hidden = false;
    }

    function hideOnboardingTip() {
      if (onboardingTip) onboardingTip.hidden = true;
    }

    function syncFeedEmptyState() {
      if (!feedList || !feedEmpty) return;
      const filter = feedList.dataset.activeFilter || 'all';
      const items = Array.from(feedList.querySelectorAll('.tcd-feed-item'));
      const hasVisible =
        filter === 'all' ? items.length > 0 : items.some((el) => el.dataset.plat === filter);
      feedEmpty.hidden = hasVisible;
      feedEmpty.textContent =
        filter === 'all' ? '等待 B站 / Kick / 抖音 实时弹幕…' : `等待 ${PLAT_LABELS[filter] || filter} 实时弹幕…`;
    }

    function appendChatFeed(message) {
      if (!feedList || !message || typeof message !== 'object') return;
      const doc = feedList.ownerDocument || document;
      const plat = ['bilibili', 'kick', 'douyin'].includes(message.platform) ? message.platform : 'kick';
      const nearBottom =
        !feedList.scrollHeight || feedList.scrollHeight - feedList.scrollTop - feedList.clientHeight <= 56;

      const item = doc.createElement('div');
      item.className = message.isSelf ? 'tcd-feed-item is-self' : 'tcd-feed-item';
      item.dataset.plat = plat;
      if (message.id) item.dataset.msgId = String(message.id);

      const mainWrap = doc.createElement('div');
      mainWrap.className = 'tcd-feed-main';
      const userSpan = doc.createElement('span');
      userSpan.className = 'tcd-feed-user';
      userSpan.textContent = `${message.user || PLAT_LABELS[plat]}: `;

      if (chatContentApi?.append) {
        chatContentApi.append(mainWrap, message, { showUsername: false });
        const bodyEl = mainWrap.children?.[1] || null;
        if (bodyEl && typeof mainWrap.insertBefore === 'function') {
          mainWrap.insertBefore(userSpan, bodyEl);
        } else {
          mainWrap.appendChild(userSpan);
        }
      } else {
        const badge = doc.createElement('span');
        badge.className = 'platform-badge';
        badge.dataset.plat = plat;
        badge.textContent = plat === 'bilibili' ? 'B' : plat === 'douyin' ? '抖' : 'K';
        const bodySpan = doc.createElement('span');
        bodySpan.className = 'bullet-text';
        bodySpan.textContent = String(message.text || '');
        mainWrap.appendChild(badge);
        mainWrap.appendChild(userSpan);
        mainWrap.appendChild(bodySpan);
      }

      const actions = doc.createElement('div');
      actions.className = 'tcd-feed-actions';
      const repeatText = String(message.sendText || message.text || '').trim();
      if (repeatText) {
        const plusBtn = doc.createElement('button');
        plusBtn.type = 'button';
        plusBtn.textContent = '+1';
        plusBtn.title = `向 ${PLAT_LABELS[plat]} +1 同发`;
        plusBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          onRepeatFeed(message);
        });
        actions.appendChild(plusBtn);
      }
      if (message.user) {
        const replyBtn = doc.createElement('button');
        replyBtn.type = 'button';
        replyBtn.textContent = '@';
        replyBtn.title = `回复 ${message.user}`;
        replyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openSendBar({ platform: plat, replyMsg: message });
        });
        actions.appendChild(replyBtn);
      }

      item.appendChild(mainWrap);
      if (actions.children.length) item.appendChild(actions);
      feedList.appendChild(item);

      const allItems = feedList.querySelectorAll('.tcd-feed-item');
      const excess = allItems.length - FEED_MAX_ITEMS;
      for (let i = 0; i < excess; i++) {
        allItems[i].remove();
      }

      syncFeedEmptyState();
      if (chatFeed && !chatFeed.hidden && nearBottom) {
        feedList.scrollTop = feedList.scrollHeight;
      }
    }

    function removeChatFeedMessages(ids) {
      if (!feedList || !Array.isArray(ids) || !ids.length) return;
      for (const id of ids) {
        const esc = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(String(id)) : String(id);
        feedList.querySelectorAll(`.tcd-feed-item[data-msg-id="${esc}"]`).forEach((el) => el.remove());
      }
      syncFeedEmptyState();
    }

    function clearChatFeed() {
      if (!feedList) return;
      feedList.querySelectorAll('.tcd-feed-item').forEach((el) => el.remove());
      syncFeedEmptyState();
    }

    function notice(text, error = false, action = null) {
      const toast = $('tcdToast');
      if (!toast) return;
      clearTimeout(toastTimer);
      toast.replaceChildren();
      const span = toast.ownerDocument.createElement('span');
      span.textContent = String(text || '');
      toast.appendChild(span);
      if (action?.label && typeof action.onClick === 'function') {
        const btn = toast.ownerDocument.createElement('button');
        btn.type = 'button';
        btn.className = 'tcd-toast-action';
        btn.textContent = action.label;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          action.onClick();
        });
        toast.appendChild(btn);
      }
      toast.classList.toggle('error', Boolean(error));
      toast.hidden = false;
      toastTimer = setTimeout(() => {
        toast.hidden = true;
      }, action ? 6000 : 2600);
    }

    function setSendTarget(plat) {
      if (!['bilibili', 'kick', 'douyin'].includes(plat)) return;
      activeSendTarget = plat;
      shadowRoot.querySelectorAll('.tcd-target-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.target === plat);
      });
      if (sendInput) {
        sendInput.placeholder = `往 ${PLAT_LABELS[plat]} 直播间发弹幕…`;
      }
    }

    function openSendBar({ platform = null, replyMsg = null } = {}) {
      if (!sendBar) return;
      hideOnboardingTip();
      if (platform) setSendTarget(platform);
      if (replyMsg?.user) {
        replyContext = replyMsg;
        if (replyBadge) {
          replyBadge.textContent = `回复 @${replyMsg.user}`;
          replyBadge.hidden = false;
        }
      } else {
        replyContext = null;
        if (replyBadge) {
          replyBadge.textContent = '';
          replyBadge.hidden = true;
        }
      }
      sendBar.hidden = false;
      $('tcdSendToggleBtn')?.setAttribute('aria-expanded', 'true');
      onPanelToggle(true);
      sendInput?.focus();
    }

    function closeSendBar() {
      if (!sendBar) return;
      sendBar.hidden = true;
      replyContext = null;
      if (replyBadge) replyBadge.hidden = true;
      if (sendInput) sendInput.value = '';
      $('tcdSendToggleBtn')?.setAttribute('aria-expanded', 'false');
    }

    function updateStatuses(statuses) {
      if (!statuses) return;
      for (const plat of ['bilibili', 'kick', 'douyin']) {
        const st = statuses[plat];
        if (!st) continue;
        const dot = shadowRoot.querySelector(`.tcd-dot[data-plat="${plat}"]`);
        if (dot) {
          dot.dataset.state = st.state || 'idle';
          dot.title = `${PLAT_LABELS[plat]}：${st.text || st.state || '未启用'}`;
        }
        const rowStatus = $(
          plat === 'bilibili' ? 'roomStatusBili' : plat === 'kick' ? 'roomStatusKick' : 'roomStatusDouyin',
        );
        if (rowStatus) {
          rowStatus.textContent = st.text || '未配置';
        }
      }
    }

    function populateRoomsDialog(rooms = getRooms()) {
      const select = $('tcdPresetSelect');
      if (select) {
        const doc = select.ownerDocument || document;
        select.replaceChildren();
        const optEmpty = doc.createElement('option');
        optEmpty.value = '';
        optEmpty.textContent = '-- 当前配置 / 选择预设 --';
        select.appendChild(optEmpty);
        for (const p of rooms.presets || []) {
          const opt = doc.createElement('option');
          opt.value = p.id;
          opt.textContent = p.name;
          if (p.id === rooms.presetId) opt.selected = true;
          select.appendChild(opt);
        }
      }

      if ($('roomEnBili')) $('roomEnBili').checked = Boolean(rooms.bilibili?.enabled);
      if ($('roomValBili')) $('roomValBili').value = rooms.bilibili?.room || '';
      if ($('roomEnKick')) $('roomEnKick').checked = Boolean(rooms.kick?.enabled);
      if ($('roomValKick')) $('roomValKick').value = rooms.kick?.room || '';
      if ($('roomEnDouyin')) $('roomEnDouyin').checked = Boolean(rooms.douyin?.enabled);
      if ($('roomValDouyin')) $('roomValDouyin').value = rooms.douyin?.room || '';
    }

    function apply(settings = store.get()) {
      overlay.style.opacity = String(1 - settings.danmakuTransparency / 100);
      overlay.style.display = settings.showChat ? '' : 'none';
      overlay.dataset.platformBadge = String(Boolean(settings.showPlatformBadge));
      overlay.dataset.platformColors = String(Boolean(settings.danmakuPlatformColors));
      overlay.dataset.stroke = settings.textStroke || 'standard';
      overlay.dataset.actions = String(Boolean(settings.enableActions));

      overlay.style.setProperty('--danmaku-font-size', settings.danmakuSize + 'px');
      overlay.style.setProperty('--danmaku-font-weight', String(settings.fontWeight));
      overlay.style.setProperty('--danmaku-line-height', String(settings.lineHeightRatio));
      overlay.style.setProperty('--danmaku-emote-size', settings.emoteScale + 'em');
      overlay.style.setProperty('--danmaku-gif-size', (settings.emoteScale * 1.8).toFixed(2) + 'em');
      overlay.style.setProperty('--danmaku-fallback-color', settings.customColor || '#ffffff');

      if ($('danmakuTransparency')) {
        $('danmakuTransparency').value = String(settings.danmakuTransparency);
        $('danmakuTransparencyValue').textContent = settings.danmakuTransparency + '%';
      }
      if ($('danmakuSize')) {
        $('danmakuSize').value = String(settings.danmakuSize);
        $('danmakuSizeValue').textContent = settings.danmakuSize + ' px';
      }
      if ($('danmakuSpeed')) {
        $('danmakuSpeed').value = String(settings.danmakuSpeed);
        $('danmakuSpeedValue').textContent = Number(settings.danmakuSpeed).toFixed(1) + '×';
      }
      if ($('danmakuDensity')) {
        $('danmakuDensity').value = String(settings.danmakuDensity);
        $('danmakuDensityValue').textContent = settings.danmakuDensity + '%';
      }
      if ($('danmakuMaxCount')) {
        const sliderVal = settings.danmakuMaxCount <= 0 ? 310 : settings.danmakuMaxCount;
        $('danmakuMaxCount').value = String(sliderVal);
        $('danmakuMaxCountValue').textContent =
          settings.danmakuMaxCount <= 0 ? '不限' : settings.danmakuMaxCount + ' 条';
      }
      if ($('emoteScale')) {
        $('emoteScale').value = String(settings.emoteScale);
        $('emoteScaleValue').textContent = Number(settings.emoteScale).toFixed(1) + '×';
      }

      if ($('danmakuArea')) $('danmakuArea').value = String(settings.danmakuArea);
      if ($('lineHeightRatio')) $('lineHeightRatio').value = String(settings.lineHeightRatio);
      if ($('fontWeight')) $('fontWeight').value = String(settings.fontWeight);
      if ($('textStroke')) $('textStroke').value = String(settings.textStroke);

      for (const key of [
        'showChat',
        'showChatFeed',
        'showPlatformBadge',
        'allowOverlap',
        'suppressNativeBili',
        'showUsername',
        'enableActions',
        'mergeRepeated',
        'hideDeleted',
        'danmakuPlatformColors',
      ]) {
        if ($(key)) $(key).checked = Boolean(settings[key]);
      }

      if (chatFeed) {
        const wasHidden = chatFeed.hidden;
        chatFeed.hidden = !settings.showChatFeed;
        chatFeed.dataset.platformBadge = String(Boolean(settings.showPlatformBadge));
        if (wasHidden && settings.showChatFeed && feedList) {
          feedList.scrollTop = feedList.scrollHeight;
        }
      }
      if (feedToggleBtn) {
        feedToggleBtn.setAttribute('aria-pressed', String(Boolean(settings.showChatFeed)));
      }

      if ($('mergeRepeatedModal')) $('mergeRepeatedModal').checked = Boolean(settings.mergeRepeated);

      const textOnlyDisabled = !settings.mergeRepeated;
      for (const id of ['mergeTextOnly', 'mergeTextOnlyModal']) {
        const cb = $(id);
        if (cb) {
          cb.checked = Boolean(settings.mergeTextOnly);
          cb.disabled = textOnlyDisabled;
          cb.parentElement?.classList.toggle('is-disabled', textOnlyDisabled);
        }
      }

      if ($('customColor')) $('customColor').value = settings.customColor || '#ffffff';

      if (triggerToggle) {
        triggerToggle.setAttribute('aria-pressed', String(Boolean(settings.showChat)));
        triggerToggle.textContent = settings.showChat ? '弹幕 开' : '弹幕 关';
      }

      onSuppressNativeChange(Boolean(settings.showChat && settings.suppressNativeBili));

      for (const bullet of overlay.children) {
        danmakuLayout?.speed(bullet, settings.danmakuSpeed);
      }
      danmakuLayout?.layout();
    }

    function openPanel(enabled, restoreFocus = false) {
      if (!panel) return;
      if (enabled) hideOnboardingTip();
      panel.hidden = !enabled;
      if (settingsBtn) settingsBtn.setAttribute('aria-expanded', String(enabled));
      if (trigger) trigger.dataset.open = String(enabled);
      onPanelToggle(enabled);
      if (enabled) {
        $('closeDanmakuSettings')?.focus();
      } else if (restoreFocus) {
        settingsBtn?.focus();
      }
    }

    function togglePanel() {
      openPanel(Boolean(panel?.hidden));
    }

    function openRoomsDialog() {
      hideOnboardingTip();
      populateRoomsDialog();
      const modal = $('roomsDialog');
      if (modal) modal.hidden = false;
    }

    function bindEvents() {
      settingsBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanel();
      });
      $('closeDanmakuSettings')?.addEventListener('click', () => openPanel(false, true));
      $('tcdRoomsBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openRoomsDialog();
      });
      $('openRoomsModalBtn')?.addEventListener('click', () => openRoomsDialog());

      $('tcdSendToggleBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (sendBar?.hidden) openSendBar();
        else closeSendBar();
      });
      $('tcdSendClose')?.addEventListener('click', closeSendBar);

      feedToggleBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const next = !store.get().showChatFeed;
        store.update({ showChatFeed: next });
        if (next) onPanelToggle(true);
      });
      $('tcdFeedCloseBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        store.update({ showChatFeed: false });
      });
      $('tcdFeedClearBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        clearChatFeed();
      });
      $('tcdFeedOpenSendBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openSendBar();
      });
      shadowRoot.querySelectorAll('.tcd-feed-filter').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const filter = btn.dataset.filter || 'all';
          if (feedList) feedList.dataset.activeFilter = filter;
          shadowRoot.querySelectorAll('.tcd-feed-filter').forEach((b) => {
            b.classList.toggle('active', b === btn);
          });
          syncFeedEmptyState();
          if (feedList) feedList.scrollTop = feedList.scrollHeight;
        });
      });

      if (chatFeed && feedHeader) {
        let drag = null;
        feedHeader.addEventListener('pointerdown', (e) => {
          if (e.button !== 0 || e.target?.closest?.('button')) return;
          e.stopPropagation();
          const playerEl = $('player');
          if (!playerEl) return;
          const pRect = playerEl.getBoundingClientRect();
          const fRect = chatFeed.getBoundingClientRect();
          drag = {
            startX: e.clientX,
            startY: e.clientY,
            origLeft: fRect.left - pRect.left,
            origTop: fRect.top - pRect.top,
            maxLeft: Math.max(0, pRect.width - fRect.width),
            maxTop: Math.max(0, pRect.height - fRect.height),
          };
          feedHeader.setPointerCapture?.(e.pointerId);
        });
        feedHeader.addEventListener('pointermove', (e) => {
          if (!drag) return;
          const nextLeft = Math.max(0, Math.min(drag.maxLeft, drag.origLeft + (e.clientX - drag.startX)));
          const nextTop = Math.max(0, Math.min(drag.maxTop, drag.origTop + (e.clientY - drag.startY)));
          chatFeed.style.left = `${Math.round(nextLeft)}px`;
          chatFeed.style.top = `${Math.round(nextTop)}px`;
          chatFeed.style.right = 'auto';
          chatFeed.style.bottom = 'auto';
        });
        const endDrag = (e) => {
          if (!drag) return;
          drag = null;
          try {
            feedHeader.releasePointerCapture?.(e.pointerId);
          } catch {}
        };
        feedHeader.addEventListener('pointerup', endDrag);
        feedHeader.addEventListener('pointercancel', endDrag);
      }
      for (const evt of ['click', 'dblclick', 'wheel', 'pointerdown']) {
        chatFeed?.addEventListener(evt, (e) => e.stopPropagation());
      }

      shadowRoot.querySelectorAll('.tcd-target-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          setSendTarget(btn.dataset.target);
          sendInput?.focus();
        });
      });

      if (sendBar && sendInput) {
        for (const evt of ['keydown', 'keyup', 'keypress']) {
          sendBar.addEventListener(evt, (e) => {
            e.stopPropagation();
            if (evt === 'keydown' && e.key === 'Escape') {
              e.preventDefault();
              closeSendBar();
            }
          });
        }
        sendBar.addEventListener('click', (e) => e.stopPropagation());
        sendBar.addEventListener('submit', async (e) => {
          e.preventDefault();
          const raw = String(sendInput.value || '').trim();
          if (!raw) return;
          const textToSend =
            replyContext?.user && !raw.startsWith('@')
              ? `@${replyContext.user} ${raw}`
              : raw;
          if (sendSubmit) sendSubmit.disabled = true;
          try {
            const res = await onSendChat({ platform: activeSendTarget, text: textToSend });
            if (res?.ok) {
              sendInput.value = '';
              replyContext = null;
              if (replyBadge) replyBadge.hidden = true;
              notice(`已发送到 ${PLAT_LABELS[activeSendTarget]}`);
            } else {
              notice(
                res?.error || '发送失败',
                true,
                res?.needsPage && Number.isInteger(res?.tabId)
                  ? { label: '去登录/验证 ↗', onClick: () => onRevealTab(res.tabId) }
                  : null,
              );
            }
          } finally {
            if (sendSubmit) sendSubmit.disabled = false;
          }
        });
      }

      // Rooms Dialog actions
      const roomsModal = $('roomsDialog');
      $('tcdCloseRoomsBtn')?.addEventListener('click', () => {
        if (roomsModal) roomsModal.hidden = true;
      });
      roomsModal?.addEventListener('pointerdown', (e) => {
        if (e.target === roomsModal) roomsModal.hidden = true;
      });
      roomsModal?.addEventListener('keydown', (e) => e.stopPropagation());

      $('tcdReconnectBtn')?.addEventListener('click', () => {
        onReconnect();
        notice('正在重连三端弹幕…');
      });

      $('tcdPresetSelect')?.addEventListener('change', (e) => {
        const pid = e.target.value;
        const rooms = getRooms();
        const found = (rooms.presets || []).find((p) => p.id === pid);
        if (!found) return;
        if ($('roomValBili')) $('roomValBili').value = found.bilibili || '';
        if ($('roomValKick')) $('roomValKick').value = found.kick || '';
        if ($('roomValDouyin')) $('roomValDouyin').value = found.douyin || '';
      });

      const collectRoomsPatch = (extra = {}) => {
        const norm = stateMod?.normalizeRoomInput || ((_, v) => String(v || '').trim());
        const current = getRooms();
        const nextBili = norm('bilibili', $('roomValBili')?.value || '');
        const nextKick = norm('kick', $('roomValKick')?.value || '');
        const nextDouyin = norm('douyin', $('roomValDouyin')?.value || '');
        return stateMod.sanitizeRooms({
          ...current,
          presetId: $('tcdPresetSelect')?.value || '',
          bilibili: { enabled: Boolean($('roomEnBili')?.checked), room: nextBili },
          kick: { enabled: Boolean($('roomEnKick')?.checked), room: nextKick },
          douyin: { enabled: Boolean($('roomEnDouyin')?.checked), room: nextDouyin },
          ...extra,
        });
      };

      $('tcdApplyRoomsBtn')?.addEventListener('click', () => {
        const next = collectRoomsPatch();
        onSaveRooms(next);
        if (roomsModal) roomsModal.hidden = true;
        notice('三端房间配置已保存并重连');
      });

      $('tcdSavePresetBtn')?.addEventListener('click', () => {
        const name = typeof prompt === 'function' ? prompt('给这组三端主播预设起个名字：', '') : '';
        if (!name || !name.trim()) return;
        const cur = collectRoomsPatch();
        const id = 'p_' + Date.now().toString(36);
        const nextPresets = [
          ...(cur.presets || []),
          {
            id,
            name: name.trim().slice(0, 40),
            bilibili: cur.bilibili.room,
            kick: cur.kick.room,
            douyin: cur.douyin.room,
          },
        ];
        const next = stateMod.sanitizeRooms({ ...cur, presetId: id, presets: nextPresets });
        onSaveRooms(next);
        populateRoomsDialog(next);
        notice(`已保存预设「${name.trim()}」`);
      });

      $('tcdDeletePresetBtn')?.addEventListener('click', () => {
        const cur = getRooms();
        const pid = $('tcdPresetSelect')?.value;
        if (!pid) return;
        const next = stateMod.sanitizeRooms({
          ...cur,
          presetId: cur.presetId === pid ? '' : cur.presetId,
          presets: (cur.presets || []).filter((p) => p.id !== pid),
        });
        onSaveRooms(next);
        populateRoomsDialog(next);
        notice('已删除该预设');
      });

      // Danmaku toggles and sliders
      triggerToggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        const next = !store.get().showChat;
        store.update({ showChat: next });
        if (!next) {
          danmakuLayout?.clearQueue();
          overlay.replaceChildren();
        }
        onShowChatChange(next);
      });

      const bindRange = (id, handler) => {
        $(id)?.addEventListener('input', (e) => {
          const val = Number(e.target.value);
          if (!Number.isFinite(val)) return;
          handler(val);
        });
      };

      bindRange('danmakuTransparency', (v) => store.update({ danmakuTransparency: v }));
      bindRange('danmakuSize', (v) => store.update({ danmakuSize: v }));
      bindRange('danmakuSpeed', (v) => store.update({ danmakuSpeed: Math.round(v * 10) / 10 }));
      bindRange('danmakuDensity', (v) => store.update({ danmakuDensity: v }));
      bindRange('danmakuMaxCount', (v) => store.update({ danmakuMaxCount: v >= 310 ? 0 : v }));
      bindRange('emoteScale', (v) => store.update({ emoteScale: Math.round(v * 10) / 10 }));

      $('danmakuArea')?.addEventListener('change', (e) =>
        store.update({ danmakuArea: Number(e.target.value) }),
      );
      $('lineHeightRatio')?.addEventListener('change', (e) =>
        store.update({ lineHeightRatio: Number(e.target.value) }),
      );
      $('fontWeight')?.addEventListener('change', (e) =>
        store.update({ fontWeight: Number(e.target.value) }),
      );
      $('textStroke')?.addEventListener('change', (e) =>
        store.update({ textStroke: e.target.value }),
      );

      for (const key of [
        'showChat',
        'showChatFeed',
        'showPlatformBadge',
        'allowOverlap',
        'suppressNativeBili',
        'showUsername',
        'enableActions',
        'hideDeleted',
      ]) {
        $(key)?.addEventListener('change', (e) => {
          const val = e.target.checked;
          store.update({ [key]: val });
          if (key === 'showChat') {
            if (!val) {
              danmakuLayout?.clearQueue();
              overlay.replaceChildren();
            }
            onShowChatChange(val);
          }
        });
      }

      $('mergeRepeated')?.addEventListener('change', (e) =>
        store.update({ mergeRepeated: e.target.checked }),
      );
      $('mergeRepeatedModal')?.addEventListener('change', (e) =>
        store.update({ mergeRepeated: e.target.checked }),
      );
      $('mergeTextOnly')?.addEventListener('change', (e) =>
        store.update({ mergeTextOnly: e.target.checked }),
      );
      $('mergeTextOnlyModal')?.addEventListener('change', (e) =>
        store.update({ mergeTextOnly: e.target.checked }),
      );

      $('danmakuColorsButton')?.addEventListener('click', () => {
        const modal = $('danmakuColorsDialog');
        if (modal) modal.hidden = false;
      });
      $('closeDanmakuColors')?.addEventListener('click', () => {
        const modal = $('danmakuColorsDialog');
        if (modal) modal.hidden = true;
      });
      $('danmakuColorsDialog')?.addEventListener('pointerdown', (e) => {
        if (e.target === $('danmakuColorsDialog')) $('danmakuColorsDialog').hidden = true;
      });
      $('danmakuPlatformColors')?.addEventListener('change', (e) =>
        store.update({ danmakuPlatformColors: e.target.checked }),
      );
      $('customColor')?.addEventListener('input', (e) =>
        store.update({ customColor: e.target.value }),
      );

      $('resetDanmakuStyle')?.addEventListener('click', () => {
        store.reset();
        notice('已恢复默认弹幕设置');
      });

      const doc = shadowRoot.ownerDocument || document;
      doc.addEventListener('pointerdown', (e) => {
        if (!panel || panel.hidden) return;
        const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
        const modalOpen = [
          $('roomsDialog'),
          $('danmakuColorsDialog'),
          $('chatRulesDialog'),
          $('blockedDialog'),
        ].some((m) => m && !m.hidden);
        if (modalOpen) return;
        if (!path.includes(panel) && !path.includes(settingsBtn)) {
          openPanel(false);
        }
      });

      doc.addEventListener(
        'keydown',
        (e) => {
          if (e.key !== 'Escape') return;
          for (const id of ['roomsDialog', 'danmakuColorsDialog', 'chatRulesDialog', 'blockedDialog']) {
            const modal = $(id);
            if (modal && !modal.hidden) {
              e.preventDefault();
              e.stopImmediatePropagation();
              modal.hidden = true;
              return;
            }
          }
          if (panel && !panel.hidden) {
            e.preventDefault();
            e.stopImmediatePropagation();
            openPanel(false, true);
          }
        },
        true,
      );

      const dismissTip = (e) => {
        e?.stopPropagation?.();
        hideOnboardingTip();
        onDismissTip();
      };
      $('tcdTipDismissBtn')?.addEventListener('click', dismissTip);
      $('tcdTipCloseX')?.addEventListener('click', dismissTip);
      $('tcdTipOpenRoomsBtn')?.addEventListener('click', (e) => {
        e?.stopPropagation?.();
        hideOnboardingTip();
        onDismissTip();
        openRoomsDialog();
      });
      for (const evt of ['click', 'dblclick', 'pointerdown']) {
        onboardingTip?.addEventListener(evt, (e) => e.stopPropagation());
      }

      panel?.addEventListener('click', (e) => e.stopPropagation());
      panel?.addEventListener('dblclick', (e) => e.stopPropagation());
      trigger?.addEventListener('click', (e) => e.stopPropagation());
      trigger?.addEventListener('dblclick', (e) => e.stopPropagation());
    }

    store.onChange(apply);
    bindEvents();
    apply();

    return {
      apply,
      openPanel,
      togglePanel,
      openRoomsDialog,
      openSendBar,
      closeSendBar,
      setSendTarget,
      populateRoomsDialog,
      updateStatuses,
      appendChatFeed,
      removeChatFeedMessages,
      clearChatFeed,
      showOnboardingTip,
      hideOnboardingTip,
      notice,
    };
  }

  return {
    buildShadowMarkup,
    mountShadowContent,
    createPanelUI,
  };
});
