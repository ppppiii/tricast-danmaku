// Passive MAIN-world metadata & realtime frame bridge on kick.com:
// Captures Kick chatroomId & userId from Pusher/Centrifugo subscriptions and /api/v2/channels/<slug> fetches,
// and forwards live Centrifugo/Pusher chat events cleanly when viewing kick.com.

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

  function emitLiveFrame(slug, raw) {
    if (!slug || typeof raw !== 'string') return;
    try {
      window.dispatchEvent(new CustomEvent('tcd:kick-live-frame', { detail: { slug, raw } }));
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

  // Wrap WebSocket via Proxy to inspect both Centrifugo & Pusher outgoing subscribe frames and incoming chat frames
  const NativeWebSocket = window.WebSocket;
  if (typeof NativeWebSocket === 'function' && typeof Proxy === 'function') {
    window.WebSocket = new Proxy(NativeWebSocket, {
      construct(target, args, newTarget) {
        const ws = Reflect.construct(target, args, newTarget);
        const wsUrl = String(args?.[0] || '');
        const isKickRealtime = /(?:platform\.kick\.com|pusher\.com)/i.test(wsUrl);

        if (isKickRealtime) {
          ws.addEventListener('message', (event) => {
            try {
              const raw = typeof event.data === 'string' ? event.data : '';
              if (
                raw &&
                (raw.includes('ChatMessageEvent') ||
                  raw.includes('MessageDeletedEvent') ||
                  raw.includes('ChatroomClearEvent'))
              ) {
                emitLiveFrame(currentSlug(), raw);
              }
            } catch {}
          });
        }

        return ws;
      },
    });
  }

  const origSend = NativeWebSocket?.prototype?.send;
  if (typeof origSend === 'function') {
    NativeWebSocket.prototype.send = function (data) {
      try {
        if (typeof data === 'string') {
          const m = /chatrooms\.(\d+)\.v2|chatroom_(\d+)/.exec(data);
          const cid = m?.[1] || m?.[2];
          const slug = currentSlug();
          if (cid && slug && (data.includes('pusher:subscribe') || data.includes('"subscribe"'))) {
            emitMeta({ slug, chatroomId: cid, userId: '' });
          }
        }
      } catch {}
      return origSend.apply(this, arguments);
    };
  }
})();
