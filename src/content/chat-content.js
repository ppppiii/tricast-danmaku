(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.__TCD__ = root.__TCD__ || {};
  root.__TCD__.chatContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const PLATFORM_LABELS = Object.freeze({
    bilibili: 'B',
    kick: 'K',
    douyin: '抖',
  });

  const PLATFORM_NAMES = Object.freeze({
    bilibili: 'B站',
    kick: 'Kick',
    douyin: '抖音',
  });

  function safeImageUrl(raw) {
    if (typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length > 2048) return '';
    try {
      const u = new URL(trimmed.startsWith('//') ? 'https:' + trimmed : trimmed);
      if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return '';
      u.protocol = 'https:';
      return u.href;
    } catch {
      return '';
    }
  }

  function createImageEl(doc, url, alt, isSticker, isZeroWidth) {
    const img = doc.createElement('img');
    img.className = isSticker ? 'chat-gif' : isZeroWidth ? 'chat-emote tcd-emote-zw' : 'chat-emote';
    img.alt = alt || '';
    img.decoding = 'async';
    img.loading = 'eager';
    img.fetchPriority = 'high';
    img.referrerPolicy = 'no-referrer';
    img.draggable = false;
    img.addEventListener?.(
      'error',
      () => {
        if (img.parentNode && alt) {
          img.replaceWith(doc.createTextNode(alt));
        }
      },
      { once: true },
    );
    img.src = url;
    return img;
  }

  function append(parent, message, settings = {}) {
    const doc = parent.ownerDocument || document;
    const plat = PLATFORM_LABELS[message?.platform] ? message.platform : 'kick';

    // Always append platform-badge; CSS controls visibility instantaneously so toggling updates flying bullets live
    const badge = doc.createElement('span');
    badge.className = 'platform-badge';
    badge.dataset.plat = plat;
    badge.textContent = PLATFORM_LABELS[plat];
    badge.title = PLATFORM_NAMES[plat] || plat;
    parent.appendChild(badge);

    if (settings.showUsername && message?.user) {
      const userSpan = doc.createElement('span');
      userSpan.className = 'bullet-user';
      userSpan.textContent = `${message.user}: `;
      parent.appendChild(userSpan);
    }

    const bodySpan = doc.createElement('span');
    bodySpan.className = 'bullet-text';

    const state = { mediaCount: 0, hasGif: Boolean(message?.hasGif) };
    const segments = Array.isArray(message?.segments) && message.segments.length
      ? message.segments
      : [{ type: 'text', text: String(message?.text || '') }];

    for (const seg of segments) {
      if (!seg || state.mediaCount > 40) continue;
      if (seg.type === 'text') {
        if (seg.text) bodySpan.appendChild(doc.createTextNode(seg.text));
      } else if (seg.type === 'emote') {
        const url = safeImageUrl(seg.url);
        if (!url) {
          if (seg.alt) bodySpan.appendChild(doc.createTextNode(seg.alt));
          continue;
        }
        state.mediaCount++;
        const hasOverlays = Array.isArray(seg.overlays) && seg.overlays.length > 0;
        if (hasOverlays) {
          const wrap = doc.createElement('span');
          wrap.className = 'tcd-emote-wrap';
          wrap.appendChild(createImageEl(doc, url, seg.alt || '', false, false));
          for (const ov of seg.overlays) {
            const ovUrl = safeImageUrl(ov?.url);
            if (!ovUrl) continue;
            state.mediaCount++;
            wrap.appendChild(createImageEl(doc, ovUrl, ov.alt || '', false, true));
          }
          bodySpan.appendChild(wrap);
        } else {
          bodySpan.appendChild(createImageEl(doc, url, seg.alt || '', false, false));
        }
      } else if (seg.type === 'sticker' || seg.type === 'gif') {
        const url = safeImageUrl(seg.url);
        if (!url) {
          if (seg.alt) bodySpan.appendChild(doc.createTextNode(seg.alt));
          continue;
        }
        state.mediaCount++;
        state.hasGif = true;
        bodySpan.appendChild(createImageEl(doc, url, seg.alt || '[表情]', true, false));
      }
    }

    parent.appendChild(bodySpan);
    return state;
  }

  return {
    PLATFORM_LABELS,
    PLATFORM_NAMES,
    safeImageUrl,
    append,
  };
});
