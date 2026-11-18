'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDanmakuLayout } = require('../src/content/danmaku-layout.js');

function createFakeBullet(width = 90, height = 24) {
  const listeners = new Map();
  const styleProps = {};
  return {
    nodeType: 1,
    isConnected: false,
    _width: width,
    _height: height,
    _left: 1000,
    dataset: {},
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      contains(c) { return this._set.has(c); },
    },
    style: {
      setProperty(k, v) { styleProps[k] = v; },
      getPropertyValue(k) { return styleProps[k] || ''; },
    },
    getBoundingClientRect() {
      return {
        left: this._left,
        right: this._left + this._width,
        width: this._width,
        height: this._height,
      };
    },
    addEventListener(name, fn) {
      listeners.set(name, fn);
    },
    remove() {
      this.isConnected = false;
      this._parent?._removeChild(this);
    },
  };
}

function createFakeOverlay(width = 1000, height = 100) {
  const children = [];
  return {
    clientWidth: width,
    clientHeight: height,
    children,
    style: {},
    getBoundingClientRect: () => ({ left: 0, right: width, width, height }),
    append(el) {
      el.isConnected = true;
      el._parent = this;
      if (!children.includes(el)) children.push(el);
    },
    _removeChild(el) {
      const idx = children.indexOf(el);
      if (idx >= 0) children.splice(idx, 1);
    },
    closest: () => null,
  };
}

test('danmakuLayout enforces non-overlapping lanes by default and drains burst queue cleanly', () => {
  const overlay = createFakeOverlay(1000, 90);
  const settings = {
    showChat: true,
    allowOverlap: false,
    danmakuSize: 22,
    lineHeightRatio: 1.35,
    danmakuArea: 100,
    danmakuDensity: 100,
    danmakuSpeed: 1.0,
    danmakuMaxCount: 80,
  };

  const layout = createDanmakuLayout({
    overlay,
    getSettings: () => settings,
    maxQueueSize: 5,
    queueMaxWaitMs: 1200,
    queueDrainIntervalMs: 5000,
  });

  // Geometry: line = ceil(22*1.35)+4 = 34, rows = floor(90 / 34) = 2 lanes
  assert.equal(layout.geometry().rows, 2);

  // Fill both lanes right at the spawn edge (x = 950 -> right > 1000 - gap)
  const b1 = createFakeBullet(100, 24);
  b1._left = 920;
  const r1 = layout.enqueue(b1, { now: 1000 });
  assert.equal(r1.status, 'spawned');

  const b2 = createFakeBullet(100, 24);
  b2._left = 920;
  const r2 = layout.enqueue(b2, { now: 1010 });
  assert.equal(r2.status, 'spawned');

  // Third simultaneous bullet must queue rather than overlap in non-overlap mode
  let spawnedB3 = false;
  const b3 = createFakeBullet(100, 24);
  const r3 = layout.enqueue(b3, {
    now: 1020,
    onSpawn: () => {
      spawnedB3 = true;
    },
  });
  assert.equal(r3.status, 'queued');
  assert.equal(overlay.children.length, 2);
  assert.equal(spawnedB3, false);

  // Simulate lane 0 bullet advancing cleanly leftward
  b1._left = 400;
  const drained = layout.drainQueue(1100);
  assert.equal(drained, 1);
  assert.equal(spawnedB3, true);
  assert.equal(overlay.children.length, 3);
  assert.equal(layout.getQueueLength(), 0);

  // Simulate expired queued item calling onDrop
  b1._left = 950;
  b2._left = 950;
  b3._left = 950;
  let droppedB4 = false;
  const b4 = createFakeBullet(100, 24);
  layout.enqueue(b4, {
    now: 2000,
    onDrop: () => {
      droppedB4 = true;
    },
  });
  layout.drainQueue(4000);
  assert.equal(droppedB4, true);

  layout.clearQueue();
  for (const el of [...overlay.children]) el.remove();
});

test('danmakuLayout reserves multi-lane span for tall stickers/GIFs', () => {
  const overlay = createFakeOverlay(1000, 200);
  const settings = {
    showChat: true,
    allowOverlap: false,
    danmakuSize: 22,
    lineHeightRatio: 1.35,
    danmakuArea: 100,
    danmakuDensity: 100,
    danmakuSpeed: 1.0,
    danmakuMaxCount: 80,
  };
  const layout = createDanmakuLayout({ overlay, getSettings: () => settings });

  const gifBullet = createFakeBullet(120, 62); // spans 2 lanes (line=34)
  assert.equal(layout.add(gifBullet), true);
  assert.equal(Number(gifBullet.dataset.laneSpan), 2);
  assert.equal(gifBullet.dataset.lane, '0');

  // Next bullet should skip lanes 0 and 1 and start at lane 2
  const textBullet = createFakeBullet(80, 24);
  assert.equal(layout.add(textBullet), true);
  assert.equal(textBullet.dataset.lane, '2');

  for (const el of [...overlay.children]) el.remove();
});
