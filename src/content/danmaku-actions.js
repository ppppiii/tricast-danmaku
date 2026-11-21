(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.__TCD__ = root.__TCD__ || {};
  root.__TCD__.danmakuActions = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const PLAT_NAMES = {
    bilibili: 'B站',
    kick: 'Kick',
    douyin: '抖音',
  };

  function createDanmakuActions(options) {
    const {
      shadowRoot,
      getSettings,
      chatBlocking,
      chatRules,
      onRepeat = async () => '已发送',
      onReply = () => {},
      onRevealTab = () => {},
      onNotice = () => {},
    } = options;

    const $ = (id) => shadowRoot.getElementById(id);
    const overlay = $('danmaku');
    const player = $('player');
    const doc = shadowRoot.ownerDocument || document;

    const menu = doc.createElement('div');
    menu.id = 'danmakuActions';
    menu.className = 'chat-action-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'group');
    menu.setAttribute('aria-label', '弹幕操作');

    const make = (id, text) => {
      const b = doc.createElement('button');
      b.type = 'button';
      b.id = id;
      b.textContent = text;
      menu.append(b);
      return b;
    };

    const copy = make('copyDanmaku', '复制');
    const repeat = make('repeatDanmaku', '+1');
    const reply = make('replyDanmaku', '回复');
    const blockUser = make('blockUserDanmaku', '屏蔽用户');
    const block = make('blockKeywordDanmaku', '屏蔽弹幕');

    const status = doc.createElement('div');
    status.className = 'chat-action-status';
    status.setAttribute('role', 'status');
    menu.append(status);
    player.append(menu);

    let selected = null;
    let timer = 0;
    let watch = 0;
    let lastPointerType = 'mouse';

    function lanesOverlap(el, startLane, span) {
      const elLane = Number(el.dataset?.lane);
      const elSpan = Math.max(1, Number(el.dataset?.laneSpan) || 1);
      if (!Number.isFinite(elLane)) return false;
      return elLane <= startLane + span - 1 && elLane + elSpan - 1 >= startLane;
    }

    function setStatus(msg, needsPageTabId = null) {
      status.replaceChildren();
      if (!msg) return;
      const span = doc.createElement('span');
      span.textContent = msg;
      status.appendChild(span);
      if (Number.isInteger(needsPageTabId)) {
        const go = doc.createElement('button');
        go.type = 'button';
        go.className = 'tcd-toast-action';
        go.textContent = '去登录/验证 ↗';
        go.addEventListener('click', (e) => {
          e.stopPropagation();
          onRevealTab(needsPageTabId);
        });
        status.appendChild(go);
      }
    }

    function close() {
      clearTimeout(timer);
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(watch);
      for (const el of overlay.children) {
        el.classList.remove('danmaku-held', 'danmaku-selected');
      }
      selected = null;
      menu.hidden = true;
    }

    function position() {
      if (!selected) return;
      const { el } = selected;
      const r = el.getBoundingClientRect();
      const o = overlay.getBoundingClientRect();
      const p = player.getBoundingClientRect();
      const settings = getSettings();
      if (
        !el.isConnected ||
        !settings.showChat ||
        !settings.enableActions ||
        settings.danmakuTransparency >= 100 ||
        player.classList.contains('editing-avoidance') ||
        !o.width ||
        r.right <= o.left ||
        r.left >= o.right
      ) {
        close();
        return;
      }
      const x = Math.max(
        8,
        Math.min(Math.max(r.left, o.left) - p.left, Math.max(8, p.width - menu.offsetWidth - 8)),
      );
      let y = r.bottom - p.top + 2;
      if (y + menu.offsetHeight > p.height - 8) {
        y = r.top - p.top - menu.offsetHeight - 2;
      }
      menu.style.left = x + 'px';
      menu.style.top = Math.max(8, y) + 'px';
      if (typeof requestAnimationFrame === 'function') {
        watch = requestAnimationFrame(position);
      }
    }

    function open(el, message) {
      clearTimeout(timer);
      if (selected?.el === el) return;
      close();

      const settings = getSettings();
      if (!settings.enableActions || !settings.showChat || settings.danmakuTransparency >= 100) return;

      const lane = Number(el.dataset.lane);
      const laneSpan = Math.max(1, Number(el.dataset.laneSpan) || 1);
      selected = { el, message, lane, laneSpan };

      // Pause only the hovered/selected bullet so other bullets on the same row keep flowing smoothly
      el.classList.add('danmaku-held', 'danmaku-selected');
      menu.hidden = false;
      setStatus('');

      const sendable = String(message.sendText || '').trim();
      const copyable = String(message.text || message.sendText || '').trim();
      const platLabel = PLAT_NAMES[message.platform] || message.platform || '';

      copy.disabled = !copyable;
      repeat.textContent = platLabel ? `+1 (→${platLabel})` : '+1';
      repeat.disabled = !sendable;
      repeat.title = sendable ? `发送到 ${platLabel} 直播间` : '纯贴纸/动图暂不支持文本 +1';
      reply.disabled = !message.user;
      reply.title = message.user ? `回复 ${message.user}` : '无法识别用户名';
      block.disabled = !copyable || !chatRules;
      blockUser.disabled = !chatBlocking || !String(message.user || message.uid || '').trim();

      position();
    }

    const leave = () => {
      if (lastPointerType === 'touch') return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const activeEl = shadowRoot.activeElement || doc.activeElement;
        if (menu.matches(':hover') || menu.contains(activeEl) || selected?.el.matches(':hover')) {
          return;
        }
        close();
      }, 220);
    };

    function attach(el, message) {
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute(
        'aria-label',
        `[${PLAT_NAMES[message.platform] || ''}] ${message.user || '观众'}：${message.text || '[表情]'}`,
      );
      el.addEventListener('pointerdown', (e) => {
        if (e.pointerType) lastPointerType = e.pointerType;
      });
      el.addEventListener('pointerenter', (e) => {
        if (e.pointerType) lastPointerType = e.pointerType;
        if (lastPointerType === 'touch') return;
        open(el, message);
      });
      el.addEventListener('pointerleave', leave);
      el.addEventListener('focus', () => open(el, message));
      el.addEventListener('blur', leave);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        open(el, message);
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          open(el, message);
          copy.focus();
        }
      });
    }

    menu.addEventListener('pointerenter', () => clearTimeout(timer));
    menu.addEventListener('pointerleave', leave);
    menu.addEventListener('focusout', leave);
    menu.addEventListener('click', (e) => e.stopPropagation());
    menu.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      e.preventDefault();
      e.stopPropagation();
    });

    copy.onclick = async () => {
      const current = selected;
      if (!current) return;
      const copyText = String(current.message.sendText || current.message.text || '').trim();
      try {
        await navigator.clipboard.writeText(copyText);
        if (selected === current) setStatus('已复制');
      } catch {
        if (selected === current) setStatus('复制失败，请重试');
      }
    };

    repeat.onclick = async () => {
      const current = selected;
      if (!current || repeat.disabled) return;
      repeat.disabled = true;
      setStatus('正在发送 +1…');
      try {
        const result = await onRepeat(current.message);
        if (selected === current) {
          if (result && typeof result === 'object') {
            setStatus(result.text || '已提交', result.needsPage ? result.tabId : null);
          } else {
            setStatus(result || '已提交');
          }
          repeat.disabled = false;
        }
      } catch (err) {
        if (selected === current) {
          setStatus(err?.message || '发送失败');
          repeat.disabled = false;
        }
      }
    };

    reply.onclick = () => {
      const current = selected;
      if (!current || reply.disabled) return;
      close();
      onReply(current.message);
    };

    blockUser.onclick = () => {
      const current = selected;
      if (!current || blockUser.disabled || !chatBlocking) return;
      close();
      chatBlocking.open(current.message);
    };

    block.onclick = () => {
      const current = selected;
      if (!current || block.disabled || !chatRules) return;
      const kw = String(current.message.text || current.message.sendText || '').trim();
      try {
        chatRules.addKeyword(kw);
        close();
        onNotice('已加入屏蔽关键词，可在弹幕设置中取消');
      } catch (error) {
        if (selected === current) setStatus(error.message);
      }
    };

    doc.addEventListener('pointerdown', (e) => {
      if (!selected) return;
      const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
      if (!path.includes(menu) && !path.includes(selected.el)) {
        close();
      }
    });

    doc.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape' && selected) {
          e.preventDefault();
          e.stopImmediatePropagation();
          selected.el.blur();
          close();
        }
      },
      true,
    );

    if (typeof window !== 'undefined') {
      window.addEventListener('blur', close);
    }
    doc.addEventListener('visibilitychange', () => {
      if (doc.hidden) close();
    });

    return {
      attach,
      open,
      close,
      heldLane: () => selected?.lane,
      isLaneHeld: (lane) =>
        selected != null && lane >= selected.lane && lane <= selected.lane + selected.laneSpan - 1,
    };
  }

  return { createDanmakuActions };
});
