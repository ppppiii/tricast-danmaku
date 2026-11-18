// Passive MAIN-world metadata bridge on kick.com:
// Captures Kick chatroomId & userId from Pusher subscriptions and /api/v2/channels/<slug> fetches
// so the Background Service Worker can connect Kick chat even from a Bilibili tab without extra fetches.

(() => {
  'use strict';

  if (window.__tcdKickBridgeInstalled) return;
  window.__tcdKickBridgeInstalled = true;

  function emitMeta(meta) {
    if (!meta || !meta.chatroomId) return;
    try {
      window.dispatchEvent(new CustomEvent('tcd:kick-meta', { detail: meta }));
    } catch {}
  }

  function currentSlug() {
    const parts = (location.pathname || '').split('/').filter(Boolean);
    if (!parts.length) return '';
    return (parts[0] === 'popout' && parts[1] ? parts[1] : parts[0]).toLowerCase();
  }

  // Wrap fetch passively to capture /api/v2/channels/<slug>
  const origFetch = window.fetch;
  if (typeof origFetch === 'function') {
    window.fetch = function (input) {
      const p = Reflect.apply(origFetch, this, arguments);
      try {
        const url = typeof input === 'string' ? input : input?.url || '';
        const m = /\/api\/v2\/channels\/([a-z0-9_-]+)/i.exec(url);
        if (m) {
          const slug = m[1].toLowerCase();
          p.then((res) => {
            if (!res || !res.ok) return;
            res
              .clone()
              .json()
              .then((d) => {
                if (d?.chatroom?.id != null) {
                  emitMeta({
                    slug,
                    chatroomId: String(d.chatroom.id),
                    userId: d.user_id != null ? String(d.user_id) : '',
                  });
                }
              })
              .catch(() => {});
          }).catch(() => {});
        }
      } catch {}
      return p;
    };
  }

  // Wrap WebSocket.prototype.send passively to spot chatrooms.<id>.v2 subscriptions
  const origSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function (data) {
    try {
      if (typeof data === 'string' && data.includes('pusher:subscribe') && data.includes('chatroom')) {
        const parsed = JSON.parse(data);
        const channel = String(parsed?.data?.channel || '');
        const m = /chatrooms\.(\d+)\.v2|chatroom_(\d+)/.exec(channel);
        const cid = m?.[1] || m?.[2];
        const slug = currentSlug();
        if (cid && slug) {
          emitMeta({ slug, chatroomId: cid, userId: '' });
        }
      }
    } catch {}
    return origSend.apply(this, arguments);
  };
})();
