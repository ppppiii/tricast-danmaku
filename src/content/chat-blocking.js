(function (root, factory) {
  const api = factory(root.__TCD__?.state);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.__TCD__ = root.__TCD__ || {};
  root.__TCD__.chatBlocking = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (stateMod) {
  'use strict';

  function createChatBlocking(options = {}) {
    const { shadowRoot = null, stateApi = stateMod } = options;
    const $ = (id) => shadowRoot?.getElementById(id) || null;
    const storageKey = stateApi?.STORAGE_KEYS?.blocked || 'tcd_blocked_v1';
    const validUid = (value) => /^[1-9]\d{0,19}$/.test(String(value || ''));

    let blocked = [];

    function sanitizeList(saved) {
      if (!Array.isArray(saved)) return [];
      return saved
        .filter(
          (x) =>
            x &&
            typeof x.value === 'string' &&
            x.value.trim().length > 0 &&
            x.value.length <= 100 &&
            (x.type === 'name' || (x.type === 'uid' && validUid(x.value))),
        )
        .slice(0, 500);
    }

    async function load() {
      const saved = await stateApi?.readData(storageKey, []);
      blocked = sanitizeList(saved);
      render();
    }

    stateApi?.onDataChange?.(storageKey, (val) => {
      blocked = sanitizeList(val);
      purge();
      render();
    });

    const key = (m) => (validUid(m.uid) ? 'uid:' + m.uid : 'name:' + String(m.user || '').toLowerCase());

    const isBlocked = (m) => {
      if (!blocked.length) return false;
      const uid = String(m.uid || '');
      const userLower = String(m.user || '').trim().toLowerCase();
      return blocked.some((x) =>
        x.type === 'uid'
          ? validUid(uid) && x.value === uid
          : userLower && x.value.toLowerCase() === userLower,
      );
    };

    function tag(el, m) {
      el.dataset.userKey = key(m);
      el.dataset.userName = m.user || '';
      if (validUid(m.uid)) el.dataset.userUid = String(m.uid);
    }

    function purge() {
      const overlay = $('danmaku');
      if (!overlay) return;
      for (const el of Array.from(overlay.querySelectorAll('[data-user-key]'))) {
        if (isBlocked({ uid: el.dataset.userUid || '', user: el.dataset.userName || '' })) {
          el.remove();
        }
      }
    }

    function persist() {
      stateApi?.writeData(storageKey, blocked);
      purge();
      render();
    }

    function render() {
      const manageBtn = $('manageBlocked');
      if (manageBtn) {
        manageBtn.textContent = '屏蔽用户管理（' + blocked.length + '）';
      }
      const list = $('blockedList');
      if (!list) return;
      const doc = list.ownerDocument || document;
      list.replaceChildren();
      if (!blocked.length) {
        const empty = doc.createElement('p');
        empty.textContent = '还没有屏蔽用户';
        list.append(empty);
        return;
      }
      for (const item of blocked) {
        const row = doc.createElement('div');
        const name = doc.createElement('span');
        const remove = doc.createElement('button');
        row.className = 'blocked-row';
        row.append(name, remove);
        name.textContent =
          item.type === 'uid'
            ? (item.name || '用户') + ' · UID ' + item.value
            : item.value + '（按昵称）';
        remove.type = 'button';
        remove.textContent = '解除屏蔽';
        remove.addEventListener('click', () => {
          blocked = blocked.filter((x) => x !== item);
          persist();
        });
        list.append(row);
      }
    }

    function open(m) {
      const input = $('blockUserInput');
      const status = $('blockStatus');
      const modal = $('blockedDialog');
      if (!modal || !input) return;

      if (m) {
        input.value = validUid(m.uid) ? String(m.uid) : String(m.user || '');
        input.dataset.name = m.user || '';
        if (status) {
          status.textContent =
            '确认屏蔽 ' +
            (m.user || '该用户') +
            '？' +
            (validUid(m.uid) ? '将按 UID 匹配。' : '本条未提供 UID，将按昵称匹配。');
        }
      } else {
        input.value = '';
        delete input.dataset.name;
        if (status) status.textContent = '';
      }
      render();
      modal.hidden = false;
      input.focus();
    }

    function addUser(value, displayName = '') {
      const trimmed = String(value || '').trim();
      if (!trimmed) return false;
      const type = validUid(trimmed) ? 'uid' : 'name';
      if (
        blocked.some((x) =>
          x.type === type &&
          (type === 'uid' ? x.value === trimmed : x.value.toLowerCase() === trimmed.toLowerCase()),
        )
      ) {
        throw Error('该用户已在屏蔽列表');
      }
      if (blocked.length >= 500) {
        throw Error('最多保存 500 位，请先解除部分屏蔽');
      }
      blocked = [...blocked, { type, value: trimmed, name: displayName || '' }];
      persist();
      return true;
    }

    function bindUI() {
      const modal = $('blockedDialog');
      const form = $('blockUserForm');
      const input = $('blockUserInput');
      const status = $('blockStatus');
      if (!modal || !form || !input) return;

      $('manageBlocked')?.addEventListener('click', () => open());
      $('closeBlocked')?.addEventListener('click', () => {
        modal.hidden = true;
      });
      modal.addEventListener('pointerdown', (e) => {
        if (e.target === modal) modal.hidden = true;
      });

      input.addEventListener('input', () => {
        delete input.dataset.name;
      });
      input.addEventListener('keydown', (e) => e.stopPropagation());

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        try {
          const added = addUser(input.value, input.dataset.name || '');
          if (added) {
            if (status) status.textContent = '已屏蔽，当前画面弹幕已清理';
            input.value = '';
            delete input.dataset.name;
          }
        } catch (err) {
          if (status) status.textContent = err.message;
        }
      });
    }

    bindUI();
    load();

    return {
      load,
      isBlocked,
      tag,
      purge,
      open,
      addUser,
      getBlocked: () => [...blocked],
    };
  }

  return { createChatBlocking };
});
