// Muted & video-stream-blocked background tab sender for Douyin (and remote Kick fallback).
// Ports FreeCast platform-sender.mjs safety model: handles native CSRF / a_bogus / moderation inside real page context.

import { extractDouyinWebRid } from '../protocols/douyin-protocol.mjs';

export function createTabSender(browser = chrome) {
  const SESSION_KEY = 'tcd-send-tabs-v1';
  const BLOCK_RULE_BASE = 30000;
  let sending = false;
  let lastSendAt = 0;

  const ruleIdForTab = (tabId) => BLOCK_RULE_BASE + (Number(tabId) % 900000000);

  function roomTargetUrl(platform, room) {
    const clean = String(room || '').trim();
    if (platform === 'douyin') return `https://live.douyin.com/${clean}`;
    if (platform === 'kick') return `https://kick.com/${clean.toLowerCase()}`;
    throw new Error('不支持后台标签页发送的平台');
  }

  function urlMatchesRoom(tabUrl, platform, room, targetUrl) {
    if (!tabUrl) return false;
    if (platform === 'douyin') {
      const rid = extractDouyinWebRid(tabUrl);
      return Boolean(rid && rid === room);
    }
    try {
      const a = new URL(tabUrl);
      const b = new URL(targetUrl);
      const hostOk = a.hostname === b.hostname || a.hostname.endsWith('.' + b.hostname) || b.hostname.endsWith('.' + a.hostname);
      return hostOk && a.pathname.replace(/\/$/, '').toLowerCase() === b.pathname.replace(/\/$/, '').toLowerCase();
    } catch {
      return false;
    }
  }

  async function readRecords() {
    try {
      return (await browser.storage.session.get(SESSION_KEY))[SESSION_KEY] || [];
    } catch {
      return [];
    }
  }

  async function writeRecords(list) {
    try {
      await browser.storage.session.set({ [SESSION_KEY]: list });
    } catch {}
  }

  async function removeTabAndRule(record) {
    if (record.owned) {
      try {
        const t = await browser.tabs.get(record.id);
        if (urlMatchesRoom(t.url || t.pendingUrl, record.platform, record.room, record.roomUrl)) {
          await browser.tabs.remove(record.id);
        }
      } catch {}
    }
    try {
      await browser.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [ruleIdForTab(record.id)],
      });
    } catch {}
  }

  async function ensureRoomTab(platform, room, ownerTabId) {
    const targetUrl = roomTargetUrl(platform, room);

    // 1. Reuse user's own already-open matching tab if available (never auto-close or mute user tab)
    try {
      const pattern =
        platform === 'douyin'
          ? ['https://live.douyin.com/*', 'https://www.douyin.com/*']
          : ['https://kick.com/*', 'https://*.kick.com/*'];
      const openTabs = await browser.tabs.query({ url: pattern });
      const existingUserTab = openTabs.find(
        (t) =>
          t.id !== ownerTabId &&
          !String(t.url || '').includes('#tcd-bg-send') &&
          urlMatchesRoom(t.url, platform, room, targetUrl),
      );
      if (existingUserTab) {
        return { tab: existingUserTab, owned: false, targetUrl };
      }
    } catch {}

    // 2. Reuse existing extension-owned background tab
    let records = await readRecords();
    const found = records.find((r) => r.ownerTabId === ownerTabId && r.roomUrl === targetUrl);
    if (found) {
      try {
        const t = await browser.tabs.get(found.id);
        if (urlMatchesRoom(t.url || t.pendingUrl, platform, room, targetUrl)) {
          return { tab: t, owned: true, targetUrl };
        }
      } catch {}
      await removeTabAndRule(found);
      records = records.filter((r) => r !== found);
    }

    // Cap extension-owned background tabs per player tab to 2
    const mine = records.filter((r) => r.ownerTabId === ownerTabId);
    if (mine.length >= 2) {
      await removeTabAndRule(mine[0]);
      records = records.filter((r) => r !== mine[0]);
    }

    // 3. Create muted background tab + block media segments via DNR so bandwidth/GPU stays near zero
    const tab = await browser.tabs.create({ url: 'about:blank', active: false });
    await browser.tabs.update(tab.id, { muted: true, autoDiscardable: false }).catch(() => {});

    records.push({ id: tab.id, ownerTabId, platform, room, roomUrl: targetUrl, owned: true });
    await writeRecords(records);

    try {
      await browser.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [ruleIdForTab(tab.id)],
        addRules: [
          {
            id: ruleIdForTab(tab.id),
            priority: 10,
            action: { type: 'block' },
            condition: {
              tabIds: [tab.id],
              regexFilter: '\\.(flv|m3u8|m4s|ts|aac)([?]|$)',
              resourceTypes: ['media', 'xmlhttprequest'],
            },
          },
        ],
      });
    } catch {}

    await browser.tabs.update(tab.id, { url: `${targetUrl}#tcd-bg-send` });
    return { tab, owned: true, targetUrl };
  }

  async function waitForTabReady(tabId, platform, room, targetUrl, timeoutMs = 20000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const tab = await browser.tabs.get(tabId);
      const curUrl = tab.pendingUrl || tab.url || '';
      if (tab.status === 'complete' && !tab.pendingUrl && urlMatchesRoom(tab.url, platform, room, targetUrl)) {
        return tab;
      }
      if (
        tab.status === 'complete' &&
        !tab.pendingUrl &&
        curUrl &&
        curUrl !== 'about:blank' &&
        !urlMatchesRoom(curUrl, platform, room, targetUrl)
      ) {
        return null;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    return null;
  }

  // Runs directly inside target room tab DOM
  async function injectedNativeSend({ platform, text, muteMedia, requestId }) {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const visible = (el) => {
      if (!el || !el.isConnected) return false;
      if (typeof el.getClientRects === 'function' && el.getClientRects().length === 0) return false;
      try {
        return getComputedStyle(el).visibility !== 'hidden';
      } catch {
        return true;
      }
    };

    if (muteMedia) {
      const state = (globalThis.__tcdSendTabState ||= { attempts: new Map() });
      if (!state.pauseHooked) {
        state.pauseHooked = true;
        const pauseAll = () => {
          document.querySelectorAll('video,audio').forEach((m) => {
            m.muted = true;
            if (!m.paused) m.pause();
          });
        };
        document.addEventListener('play', pauseAll, true);
        new MutationObserver(pauseAll).observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
        pauseAll();
      }
    }

    const attempts = (globalThis.__tcdSendAttempts ||= new Map());
    if (requestId && attempts.has(requestId)) return attempts.get(requestId);

    const INPUT_SELECTORS =
      platform === 'douyin'
        ? [
            '[data-e2e="chat-input"][contenteditable]',
            '[data-e2e="chat-input"] [contenteditable]',
            '[data-e2e="chat-input"] textarea',
            '.webcast-chatroom___textarea',
            'textarea[placeholder*="说点"]',
            'textarea[placeholder*="聊天"]',
            '[contenteditable="true"][data-placeholder*="说点"]',
          ]
        : [
            '[data-testid="chat-input"]',
            '#chatroom-footer [contenteditable="true"]',
            'div[contenteditable="true"][role="textbox"]',
          ];

    const SEND_SELECTORS =
      platform === 'douyin'
        ? ['[data-e2e="chat-send-button"]', '.webcast-chatroom___send-btn']
        : ['#send-message-button', '[data-testid="send-message-button"]', '#chatroom-footer button[type="submit"]'];

    const findInput = () => {
      for (const sel of INPUT_SELECTORS) {
        const hit = Array.from(document.querySelectorAll(sel)).find(visible);
        if (hit) return hit;
      }
      return Array.from(
        document.querySelectorAll('textarea, [contenteditable="true"], [contenteditable="plaintext-only"]'),
      ).find(
        (el) =>
          visible(el) &&
          /说点|聊天|弹幕|send a message|chat/i.test(
            [el.getAttribute('placeholder'), el.getAttribute('data-placeholder'), el.getAttribute('aria-label')].join(' '),
          ),
      );
    };

    const findSendBtn = (inputEl) => {
      for (const sel of SEND_SELECTORS) {
        const hit = Array.from(document.querySelectorAll(sel)).find(visible);
        if (hit) return hit;
      }
      let node = inputEl?.parentElement;
      for (let d = 0; node && d < 5; d++, node = node.parentElement) {
        const hit = Array.from(node.querySelectorAll('button, [role="button"]')).find(
          (b) => visible(b) && /^(?:发送|chat|send)$/i.test((b.textContent || '').trim()),
        );
        if (hit) return hit;
      }
      return null;
    };

    const readVal = (el) =>
      ('value' in el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')
        ? el.value
        : el.innerText || el.textContent || ''
      ).trim();

    let field = null;
    for (let i = 0; i < 40; i++) {
      field = findInput();
      if (field) break;
      await wait(350);
    }

    if (!field) {
      return {
        ok: false,
        needsPage: true,
        error: `未找到${platform === 'douyin' ? '抖音' : 'Kick'}聊天输入框，可能未登录或需要人机验证`,
      };
    }

    if (field.disabled || field.getAttribute('contenteditable') === 'false') {
      return {
        ok: false,
        needsPage: true,
        error: `${platform === 'douyin' ? '抖音' : 'Kick'}当前禁止输入，请打开后台页面检查登录/禁言状态`,
      };
    }

    const existing = readVal(field);
    if (existing && existing !== text) {
      return {
        ok: false,
        needsPage: true,
        error: '后台直播页输入框已有未发送草稿，未覆盖',
      };
    }

    field.focus();
    if (existing !== text) {
      if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') {
        const proto = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(field, text);
        else field.value = text;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        try {
          const sel = getSelection();
          const range = document.createRange();
          range.selectNodeContents(field);
          sel.removeAllRanges();
          sel.addRange(range);
          document.execCommand('insertText', false, text);
        } catch {}
        if (!readVal(field)) {
          await wait(35);
        }
        if (!readVal(field)) {
          try {
            field.dispatchEvent(
              new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }),
            );
          } catch {}
          if (!readVal(field)) {
            await wait(35);
          }
          if (!readVal(field)) {
            field.textContent = text;
            field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
          }
        }
      }
    }

    await wait(140);
    const btn = findSendBtn(field);
    if (
      btn &&
      (btn.disabled ||
        btn.getAttribute('aria-disabled') === 'true' ||
        /(?:^|[\s_-])disabled(?:[\s_-]|$)/i.test(btn.className || ''))
    ) {
      return {
        ok: false,
        needsPage: true,
        error: '发送按钮不可用，请检查是否已登录或触发发言冷却',
      };
    }

    if (btn) {
      btn.click();
    } else {
      field.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }),
      );
    }

    for (let i = 0; i < 8; i++) {
      await wait(180);
      const toastText = Array.from(
        document.querySelectorAll('[role="alert"], .semi-toast-content, .toast, [class*="toast" i]'),
      )
        .filter(visible)
        .map((el) => (el.textContent || '').trim())
        .find((t) => /登录|验证|禁言|频繁|失败|敏感|限制|绑定|关注/.test(t));
      if (toastText) {
        const res = {
          ok: false,
          needsPage: /登录|验证|绑定/.test(toastText),
          error: toastText,
        };
        if (requestId) attempts.set(requestId, res);
        return res;
      }
      if (!readVal(field)) {
        const res = { ok: true, submitted: true };
        if (requestId) attempts.set(requestId, res);
        return res;
      }
    }

    return { ok: true, submitted: true };
  }

  async function send({ platform, room: rawRoom, text, ownerTabId }) {
    const room = platform === 'douyin' ? extractDouyinWebRid(rawRoom) : String(rawRoom || '').trim();
    if (!room) {
      return { ok: false, error: '目标直播间配置无效，请检查房间号或链接' };
    }
    const cleanText = String(text || '').trim();
    if (!cleanText || [...cleanText].length > 100) {
      return { ok: false, error: '请输入 1–100 字的弹幕内容' };
    }
    if (sending) return { ok: false, error: '上一条弹幕正在发送，请稍候' };
    if (Date.now() - lastSendAt < 3000) {
      return { ok: false, error: '发送太快，请稍等 3 秒' };
    }

    sending = true;
    try {
      const { tab, owned, targetUrl } = await ensureRoomTab(platform, room, ownerTabId);
      const ready = await waitForTabReady(tab.id, platform, room, targetUrl);
      if (!ready) {
        return {
          ok: false,
          needsPage: true,
          tabId: tab.id,
          error: '后台直播页未就绪或跳转到验证页，请点击打开检查',
        };
      }
      lastSendAt = Date.now();
      const values = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'ISOLATED',
        func: injectedNativeSend,
        args: [
          {
            platform,
            text: cleanText,
            muteMedia: owned,
            requestId: crypto.randomUUID(),
          },
        ],
      });
      const res = values?.[0]?.result;
      if (!res?.ok) {
        return {
          ok: false,
          needsPage: Boolean(res?.needsPage),
          tabId: tab.id,
          error: res?.error || '发送结果未知，请检查后台直播页',
        };
      }
      return {
        ok: true,
        platform,
        room,
        tabId: tab.id,
      };
    } catch (err) {
      return { ok: false, error: err?.message || '后台发送失败' };
    } finally {
      sending = false;
    }
  }

  async function revealTab(tabId) {
    if (!Number.isInteger(tabId)) throw new Error('无关联后台标签页');
    await browser.tabs.update(tabId, { active: true });
    return true;
  }

  async function cleanupOwner(ownerTabId) {
    const records = await readRecords();
    const keep = [];
    for (const rec of records) {
      if (rec.ownerTabId === ownerTabId) {
        await removeTabAndRule(rec);
      } else {
        keep.push(rec);
      }
    }
    await writeRecords(keep);
  }

  return {
    send,
    revealTab,
    cleanupOwner,
  };
}
