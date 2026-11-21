(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.__TCD__ = root.__TCD__ || {};
  root.__TCD__.danmakuLayout = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  function createDanmakuLayout(options) {
    const {
      overlay,
      getSettings,
      getHeldLane = () => undefined,
      isLaneHeld = null,
      getAvoidance = () => null,
      maxQueueSize = 25,
      queueMaxWaitMs = 1200,
      queueDrainIntervalMs = 80,
    } = options;

    let signature = '';
    let nextLane = 0;
    let overlapTick = 0;
    const pendingQueue = [];
    let drainTimer = 0;

    function geometry(settings = getSettings()) {
      const width = overlay.clientWidth || 0;
      const height = overlay.clientHeight || 0;
      const fontSize = Math.max(12, Number(settings.danmakuSize) || 22);
      const ratio = Math.max(1.05, Number(settings.lineHeightRatio) || 1.35);
      const line = Math.max(18, Math.ceil(fontSize * ratio) + 4);
      const areaPct = Math.max(25, Math.min(100, Number(settings.danmakuArea) || 100));
      const rows = Math.max(0, Math.floor((height * (areaPct / 100)) / line));
      return { width, height, line, rows };
    }

    function maskSC() {
      const avoidance = getAvoidance();
      if (!avoidance || !avoidance.regions().length) {
        if (overlay.style.clipPath !== 'none' && overlay.style.clipPath !== '') {
          overlay.style.clipPath = 'none';
        }
        return;
      }
      const rect = overlay.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const holes = avoidance.rects(rect.width, rect.height);
      const visible = avoidance.visible(rect.width, rect.height, holes);
      const clip = visible.length
        ? 'path("' + visible.map((r) => `M${r.x} ${r.y}h${r.w}v${r.h}h${-r.w}Z`).join(' ') + '")'
        : 'inset(50%)';
      if (overlay.style.clipPath !== clip) {
        overlay.style.clipPath = clip;
      }
    }

    function layout() {
      const settings = getSettings();
      const g = geometry(settings);
      const key = [
        g.width,
        g.height,
        g.line,
        settings.danmakuArea,
        settings.danmakuDensity,
        settings.lineHeightRatio,
      ].join(':');
      if (signature !== key) {
        signature = key;
        maskSC();
      }
      return g;
    }

    function speed(bullet, speedFactor = getSettings().danmakuSpeed) {
      const s = Math.max(0.4, Math.min(2.5, Number(speedFactor) || 1));
      if (typeof bullet.getAnimations === 'function') {
        const anims = bullet.getAnimations();
        if (anims.length > 0) {
          for (const animation of anims) {
            if (typeof animation.updatePlaybackRate === 'function') {
              animation.updatePlaybackRate(s);
            } else {
              animation.playbackRate = s;
            }
          }
          return;
        }
      }
      const duration = Number(bullet.dataset?.danmakuDuration);
      if (duration > 0) {
        const scaled = duration / s + 's';
        bullet.style.setProperty('--fly-duration', scaled);
        bullet.style.animationDuration = scaled;
      }
    }

    function bulletOverlapsLaneRange(el, startLane, endLane) {
      const bLane = Number(el.dataset?.lane);
      const bSpan = Math.max(1, Number(el.dataset?.laneSpan) || 1);
      if (!Number.isFinite(bLane)) return false;
      const bEnd = bLane + bSpan - 1;
      return bLane <= endLane && bEnd >= startLane;
    }

    function trySpawn(bullet) {
      const settings = getSettings();
      const g = layout();
      if (g.width < 1 || g.rows < 1) return false;

      const maxCount = Number(settings.danmakuMaxCount);
      if (maxCount > 0 && overlay.children.length >= maxCount) return false;

      bullet.style.visibility = 'hidden';
      bullet.style.animationName = 'none';
      overlay.append(bullet);

      const bulletRect = bullet.getBoundingClientRect();
      const width = Math.max(1, Math.ceil(bulletRect.width));
      const measuredHeight = Math.max(g.line - 4, Math.ceil(bulletRect.height));

      const density = Math.max(20, Math.min(100, Number(settings.danmakuDensity) || 75));
      const activeRows = Math.max(1, Math.ceil(g.rows * (density / 100)));
      const span = Math.max(1, Math.min(activeRows, Math.ceil((measuredHeight - 2) / g.line)));
      const maxStartLane = Math.max(0, activeRows - span);

      const overlayRect = overlay.getBoundingClientRect();
      const origin = overlayRect.left;
      const gap = Math.max(48, settings.danmakuSize * 2.2) * (100 / density);
      const maxPerLane = Math.max(2, Math.min(4, Math.round((4 * density) / 75)));
      const heldLane = getHeldLane();
      const children = Array.from(overlay.children).filter((el) => el !== bullet);

      let available;
      let bestFallbackLane;
      let bestFallbackMaxRight = Infinity;

      // Bilibili-native top-down greedy lane packing with comfortable breathing gap and max 4 bullets per row.
      for (let lane = 0; lane <= maxStartLane; lane++) {
        const endLane = lane + span - 1;

        if (
          (typeof isLaneHeld === 'function' && isLaneHeld(lane, endLane)) ||
          (heldLane != null && heldLane >= lane && heldLane <= endLane)
        ) {
          continue;
        }

        const blockers = children.filter((el) => bulletOverlapsLaneRange(el, lane, endLane));
        let maxRight = -Infinity;
        for (const el of blockers) {
          const rightRel = el.getBoundingClientRect().right - origin;
          if (rightRel > maxRight) maxRight = rightRel;
        }

        if (blockers.length < maxPerLane && maxRight <= g.width - gap) {
          available = lane;
          break;
        }

        if (settings.allowOverlap && maxRight < bestFallbackMaxRight) {
          bestFallbackMaxRight = maxRight;
          bestFallbackLane = lane;
        }
      }

      let isOverlap = false;
      if (available === undefined) {
        if (settings.allowOverlap && bestFallbackLane !== undefined) {
          available = bestFallbackLane;
          isOverlap = true;
        } else {
          bullet.remove();
          return false;
        }
      }

      const lane = available;
      bullet.dataset.lane = String(lane);
      bullet.dataset.laneSpan = String(span);

      let startX = g.width;
      if (isOverlap && bestFallbackMaxRight > g.width - gap) {
        const queuedX = Math.round(bestFallbackMaxRight + 20);
        if (queuedX <= g.width * 1.45) {
          startX = queuedX;
        } else {
          startX = g.width + (overlapTick % 4) * Math.round(gap * 1.4);
        }
      }

      bullet.style.top = lane * g.line + 'px';
      bullet.style.minHeight = Math.max(g.line - 4, measuredHeight) + 'px';
      bullet.style.minWidth = width + 'px';
      bullet.style.setProperty('--from-x', startX + 'px');
      bullet.style.setProperty('--to-x', -width + 'px');

      if (isOverlap) {
        overlapTick = (overlapTick + 1) % 6;
        const jitter = ((overlapTick % 3) - 1) * 2;
        bullet.style.setProperty('--jitter-y', jitter + 'px');
        bullet.style.zIndex = String(12 + (overlapTick % 5));
      } else {
        bullet.style.setProperty('--jitter-y', '0px');
        bullet.style.zIndex = '10';
      }

      const pxPerSec = Math.max(120, g.width / 8.5);
      const duration = (startX + width) / pxPerSec;
      bullet.dataset.danmakuDuration = String(duration);

      const initialScaled = duration / Math.max(0.4, Number(settings.danmakuSpeed) || 1) + 's';
      bullet.style.setProperty('--fly-duration', initialScaled);
      bullet.style.animationDuration = initialScaled;
      bullet.style.animationName = '';
      bullet.style.visibility = '';

      speed(bullet, settings.danmakuSpeed);

      let cleaned = false;
      let safetyTimer = 0;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        clearTimeout(safetyTimer);
        bullet.remove();
      };

      const scheduleSafety = (delayMs) => {
        clearTimeout(safetyTimer);
        safetyTimer = setTimeout(() => {
          if (!bullet.isConnected) {
            cleanup();
            return;
          }
          const isHeld = bullet.classList.contains('danmaku-held') || overlay.closest('.paused');
          const anim = typeof bullet.getAnimations === 'function' ? bullet.getAnimations()[0] : null;
          if (isHeld || (anim && anim.playState === 'paused')) {
            scheduleSafety(2500);
            return;
          }
          cleanup();
        }, delayMs);
      };

      const maxWaitMs = Math.ceil((duration / Math.max(0.4, Number(settings.danmakuSpeed) || 1)) * 1000) + 4000;
      scheduleSafety(maxWaitMs);
      bullet.addEventListener('animationend', cleanup, { once: true });

      return true;
    }

    function ensureDrainTimer() {
      if (drainTimer || !pendingQueue.length) return;
      drainTimer = setInterval(() => {
        drainQueue();
      }, queueDrainIntervalMs);
    }

    function stopDrainTimerIfEmpty() {
      if (!pendingQueue.length && drainTimer) {
        clearInterval(drainTimer);
        drainTimer = 0;
      }
    }

    function drainQueue(now = Date.now()) {
      const settings = getSettings();
      if (!settings.showChat) {
        clearQueue();
        return 0;
      }

      let spawned = 0;
      while (pendingQueue.length) {
        const head = pendingQueue[0];
        if (now > head.expiresAt) {
          pendingQueue.shift();
          head.onDrop?.(head.bullet);
          continue;
        }
        if (trySpawn(head.bullet)) {
          pendingQueue.shift();
          head.onSpawn?.(head.bullet);
          spawned++;
        } else {
          break;
        }
      }
      stopDrainTimerIfEmpty();
      return spawned;
    }

    // Immediate non-queued add (used when allowOverlap=true or for direct lane tests)
    function add(bullet) {
      return trySpawn(bullet);
    }

    // Stream-friendly add: when lanes are briefly saturated, buffer briefly in burst micro-queue
    // instead of overlapping text-on-text.
    function enqueue(bullet, { now = Date.now(), onSpawn = null, onDrop = null } = {}) {
      if (trySpawn(bullet)) {
        onSpawn?.(bullet);
        return { status: 'spawned' };
      }

      const settings = getSettings();
      if (settings.allowOverlap) {
        onDrop?.(bullet);
        return { status: 'dropped' };
      }

      // Drop expired items first
      while (pendingQueue.length && now > pendingQueue[0].expiresAt) {
        const expired = pendingQueue.shift();
        expired.onDrop?.(expired.bullet);
      }
      if (pendingQueue.length >= maxQueueSize) {
        const evicted = pendingQueue.shift();
        evicted?.onDrop?.(evicted.bullet);
      }
      pendingQueue.push({
        bullet,
        onSpawn,
        onDrop,
        expiresAt: now + queueMaxWaitMs,
      });
      ensureDrainTimer();
      return { status: 'queued', queueLength: pendingQueue.length };
    }

    function clearQueue() {
      while (pendingQueue.length) {
        const dropped = pendingQueue.shift();
        dropped?.onDrop?.(dropped.bullet);
      }
      stopDrainTimerIfEmpty();
    }

    function snapshotAnimations() {
      const snaps = [];
      for (const bullet of overlay.children) {
        if (typeof bullet.getAnimations !== 'function') continue;
        const anims = bullet.getAnimations();
        if (anims.length > 0 && anims[0].currentTime != null) {
          snaps.push({ bullet, currentTime: anims[0].currentTime });
        }
      }
      return snaps;
    }

    function restoreAnimations(snaps) {
      for (const { bullet, currentTime } of snaps) {
        if (!bullet.isConnected || typeof bullet.getAnimations !== 'function') continue;
        const anims = bullet.getAnimations();
        if (anims.length > 0) {
          try {
            anims[0].currentTime = currentTime;
          } catch {}
        }
      }
    }

    return {
      geometry,
      maskSC,
      layout,
      speed,
      add,
      enqueue,
      drainQueue,
      clearQueue,
      getQueueLength: () => pendingQueue.length,
      snapshotAnimations,
      restoreAnimations,
    };
  }

  return { createDanmakuLayout };
});
