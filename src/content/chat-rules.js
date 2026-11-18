(function (root, factory) {
  const api = factory(root.__TCD__?.state);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.__TCD__ = root.__TCD__ || {};
  root.__TCD__.chatRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (stateMod) {
  'use strict';

  const normalize = (s) =>
    String(s || '')
      .normalize('NFKC')
      .toLocaleLowerCase()
      .trim()
      .replace(/\s+/g, ' ');

  const HAS_EMOJI_RE = /[\p{Extended_Pictographic}\p{Emoji_Presentation}]/u;
  const ONLY_EMOJI_RE =
    /^(?:[\p{Extended_Pictographic}\p{Emoji_Presentation}\u200d\ufe0f\u20e3\u{1f3fb}-\u{1f3ff}\s])+$/u;

  function isEmoteOrMediaMessage(m) {
    if (!m) return false;
    if (m.hasMedia || m.hasGif) return true;
    if (Array.isArray(m.segments) && m.segments.some((s) => s && s.type !== 'text')) return true;
    const raw = String(m.rawContent || '');
    if (/\[emote:\d+:[^\]]+\]/.test(raw)) return true;
    const txt = String(m.text || m.sendText || '').trim();
    if (txt && HAS_EMOJI_RE.test(txt) && ONLY_EMOJI_RE.test(txt)) return true;
    return false;
  }

  function createChatRules(options = {}) {
    const {
      shadowRoot = null,
      store = null,
      stateApi = stateMod,
      onPurge = () => {},
    } = options;

    const $ = (id) => shadowRoot?.getElementById(id) || null;
    const storageKey = stateApi?.STORAGE_KEYS?.rules || 'tcd_rules_v1';

    let words = [];
    const recent = new Map();
    const messageText = new WeakMap();

    function applySaved(raw) {
      const seen = new Set();
      const rawWords = Array.isArray(raw?.words) ? raw.words : [];
      words = rawWords
        .filter((x) => {
          if (typeof x !== 'string' || !normalize(x) || seen.has(normalize(x))) return false;
          seen.add(normalize(x));
          return true;
        })
        .map((x) => x.trim())
        .slice(0, 100);
    }

    async function load() {
      const saved = await stateApi?.readData(storageKey, { words: [] });
      applySaved(saved);
      renderWords();
    }

    stateApi?.onDataChange?.(storageKey, (val) => {
      applySaved(val);
      renderWords();
      purge();
    });

    function saveRules() {
      stateApi?.writeData(storageKey, { words });
    }

    function messageKey(m) {
      return JSON.stringify([
        m.isSelf === true,
        normalize(m.sendText || m.text || m.rawContent || ''),
        Boolean(m.hasGif),
      ]);
    }

    function stamp(m) {
      return Number.isFinite(m.receivedAt) ? m.receivedAt : Date.now();
    }

    function blocked(m) {
      if (!words.length) return false;
      const text = normalize(m.text || m.sendText || m.rawContent || '');
      if (!text) return false;
      return words.some((word) => text.includes(normalize(word)));
    }

    function tag(el, m) {
      messageText.set(el, String(m.text || m.sendText || m.rawContent || ''));
    }

    function purge() {
      const overlay = $('danmaku');
      if (overlay) {
        for (const el of Array.from(overlay.children)) {
          const text = messageText.get(el);
          if (text !== undefined && blocked({ text })) {
            el.remove();
          }
        }
      }
      for (const [k, group] of recent) {
        if (group.bullet && !group.bullet.isConnected) {
          recent.delete(k);
        }
      }
      onPurge();
    }

    function reset() {
      recent.clear();
    }

    function countBadge(el, count) {
      if (!el) return;
      const doc = el.ownerDocument || document;
      let badge = el.querySelector('.repeat-count');
      if (!badge) {
        badge = doc.createElement('small');
        badge.className = 'repeat-count';
        el.append(badge);
      }
      badge.textContent = count > 1 ? (count > 999 ? '×999+' : '×' + count) : '';
      badge.title = '相同弹幕 ' + count + ' 条';
      badge.style.display = count > 1 ? 'inline-block' : 'none';
    }

    function shouldMerge(m) {
      const s = store ? store.get() : null;
      const mergeEnabled = s ? Boolean(s.mergeRepeated) : true;
      if (!mergeEnabled) return false;
      const textOnly = s && typeof s.mergeTextOnly === 'boolean' ? s.mergeTextOnly : true;
      if (textOnly && isEmoteOrMediaMessage(m)) return false;
      return true;
    }

    function merge(m) {
      if (!shouldMerge(m)) return null;
      const now = stamp(m);
      for (const [k, r] of recent) {
        if ((r.bullet && !r.bullet.isConnected && !r.queued) || now - r.at > 8000) {
          recent.delete(k);
        }
      }
      const k = messageKey(m);
      const r = recent.get(k);
      if (!r || now < r.at) return null;
      r.at = now;
      r.count++;
      if (r.bullet && (r.bullet.isConnected || r.queued)) {
        countBadge(r.bullet, r.count);
      }
      return r;
    }

    function track(m) {
      if (!shouldMerge(m)) return null;
      const at = stamp(m);
      const r = { count: 1, at, bullet: null, queued: false };
      recent.set(messageKey(m), r);
      if (recent.size > 180) {
        recent.delete(recent.keys().next().value);
      }
      return r;
    }

    function attachBullet(r, bullet, m) {
      if (m) tag(bullet, m);
      if (r) {
        r.bullet = bullet;
        countBadge(bullet, r.count);
      }
    }

    function renderWords() {
      const list = $('blockedKeywords');
      if (!list) return;
      const doc = list.ownerDocument || document;
      list.replaceChildren();
      for (const word of words) {
        const chip = doc.createElement('span');
        const label = doc.createElement('span');
        const remove = doc.createElement('button');
        chip.className = 'keyword-chip';
        label.textContent = word;
        remove.type = 'button';
        remove.textContent = '×';
        remove.setAttribute('aria-label', '取消屏蔽 ' + word);
        remove.addEventListener('click', () => {
          words = words.filter((w) => w !== word);
          saveRules();
          renderWords();
          $('addKeyword')?.focus();
        });
        chip.append(label, remove);
        list.append(chip);
      }
    }

    function addKeyword(value) {
      const word = typeof value === 'string' ? value.trim() : '';
      if (!normalize(word)) throw Error('请输入要屏蔽的关键词');
      if (word.length > 2000) throw Error('内容过长，请在关键词设置中添加');
      if (words.some((w) => normalize(w) === normalize(word))) throw Error('这个关键词已屏蔽');
      if (words.length >= 100) throw Error('最多添加 100 个关键词');
      words = [...words, word];
      saveRules();
      renderWords();
      purge();
    }

    function bindUI() {
      const editor = $('keywordEditor');
      const input = $('keywordInput');
      const add = $('addKeyword');
      const status = $('keywordStatus');
      const modal = $('chatRulesDialog');
      if (!editor || !input || !add || !modal) return;

      const closeEditor = () => {
        editor.hidden = true;
        input.value = '';
        if (status) status.textContent = '';
        add.hidden = false;
        add.focus();
      };

      const addWord = () => {
        try {
          addKeyword(input.value);
          closeEditor();
        } catch (error) {
          if (status) status.textContent = error.message;
          input.focus();
        }
      };

      add.addEventListener('click', () => {
        editor.hidden = false;
        add.hidden = true;
        if (status) status.textContent = '';
        input.focus();
      });

      $('confirmKeyword')?.addEventListener('click', addWord);
      editor.addEventListener('keydown', (event) => {
        event.stopPropagation();
        if (event.isComposing) return;
        if (event.key === 'Enter') {
          event.preventDefault();
          addWord();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          closeEditor();
        }
      });

      if (store?.onChange) {
        store.onChange((s) => {
          if (!s.mergeRepeated) reset();
        });
      }

      $('chatRulesButton')?.addEventListener('click', () => {
        renderWords();
        modal.hidden = false;
      });

      const closeModal = () => {
        modal.hidden = true;
        editor.hidden = true;
        input.value = '';
        if (status) status.textContent = '';
        add.hidden = false;
      };

      modal.addEventListener('pointerdown', (e) => {
        if (e.target === modal) closeModal();
      });
      modal.querySelectorAll('[data-close="chatRulesDialog"]').forEach((btn) => {
        btn.addEventListener('click', closeModal);
      });
    }

    bindUI();
    load();

    return {
      load,
      blocked,
      merge,
      track,
      attachBullet,
      reset,
      tag,
      purge,
      addKeyword,
      getWords: () => [...words],
    };
  }

  return { createChatRules, normalize, isEmoteOrMediaMessage };
});
