'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const state = require('../src/shared/state.js');
const { createChatRules, isEmoteOrMediaMessage } = require('../src/content/chat-rules.js');
const { append } = require('../src/content/chat-content.js');

function makeFakeElement(tag) {
  const listeners = new Map();
  return {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    className: '',
    textContent: '',
    dataset: {},
    style: {},
    children: [],
    childNodes: [],
    isConnected: true,
    append(...nodes) {
      for (const n of nodes) {
        if (typeof n === 'object' && n) {
          this.children.push(n);
          this.childNodes.push(n);
        }
      }
    },
    appendChild(n) {
      this.children.push(n);
      this.childNodes.push(n);
      return n;
    },
    querySelector(sel) {
      if (sel === '.repeat-count') {
        return this.children.find((c) => c.className === 'repeat-count') || null;
      }
      return null;
    },
    addEventListener(name, fn) {
      listeners.set(name, fn);
    },
  };
}

function makeFakeDoc() {
  const doc = {
    createElement: (tag) => {
      const el = makeFakeElement(tag);
      el.ownerDocument = doc;
      return el;
    },
    createTextNode: (txt) => ({ nodeType: 3, nodeValue: txt }),
  };
  return doc;
}

test('state defaults use restrained Bilibili-grade limits and normalize tri-platform rooms', () => {
  const def = state.sanitizeSettings(null);
  assert.equal(def.allowOverlap, false);
  assert.equal(def.danmakuSize, 22);
  assert.equal(def.danmakuMaxCount, 80);
  assert.equal(def.danmakuDensity, 75);
  assert.equal(def.showPlatformBadge, true);
  assert.equal(def.suppressNativeBili, true);
  assert.equal(def.mergeRepeated, true);
  assert.equal(def.mergeTextOnly, true);

  assert.equal(state.normalizeRoomInput('bilibili', 'https://live.bilibili.com/21452505?spm=1'), '21452505');
  assert.equal(state.normalizeRoomInput('kick', 'https://kick.com/xQc'), 'xqc');
  assert.equal(state.normalizeRoomInput('douyin', 'https://live.douyin.com/80017709309'), '80017709309');

  const rooms = state.sanitizeRooms({
    presets: [
      { id: 'p1', name: '主播A', bilibili: '10001', kick: 'testkick', douyin: '88888' },
    ],
  });
  assert.equal(state.matchPresetForUrl('https://live.bilibili.com/10001', rooms)?.id, 'p1');
  assert.equal(state.matchPresetForUrl('https://kick.com/testkick', rooms)?.id, 'p1');
  assert.equal(state.matchPresetForUrl('https://kick.com/other', rooms), null);
});

test('chatRules merges repeated pure-text danmaku only and skips emotes/GIFs/emoji when mergeTextOnly=true', () => {
  const settings = { mergeRepeated: true, mergeTextOnly: true };
  const rules = createChatRules({ store: { get: () => settings } });
  const doc = makeFakeDoc();

  const textMsg1 = { platform: 'bilibili', text: '666666', sendText: '666666', hasMedia: false, receivedAt: 1000 };
  const track1 = rules.track(textMsg1);
  const bullet1 = doc.createElement('span');
  rules.attachBullet(track1, bullet1, textMsg1);

  const merged = rules.merge({ platform: 'kick', text: '666666', sendText: '666666', hasMedia: false, receivedAt: 3000 });
  assert.ok(merged);
  assert.equal(merged.count, 2);
  assert.equal(bullet1.querySelector('.repeat-count')?.textContent, '×2');

  // Emotes, GIFs, and pure Unicode emoji should NOT merge when mergeTextOnly is true
  const emoteMsg = {
    platform: 'kick',
    text: 'KEKW',
    hasMedia: true,
    segments: [{ type: 'emote', url: 'https://files.kick.com/emotes/37226/fullsize', alt: 'KEKW' }],
    receivedAt: 2000,
  };
  assert.equal(rules.track(emoteMsg), null);
  assert.equal(rules.merge(emoteMsg), null);

  assert.equal(isEmoteOrMediaMessage({ text: '😂😂😂' }), true);
  assert.equal(isEmoteOrMediaMessage({ text: '666' }), false);

  // Turning mergeTextOnly off enables merging emote/GIF bursts again
  settings.mergeTextOnly = false;
  const emoteTrack = rules.track(emoteMsg);
  assert.ok(emoteTrack);
  const emoteBullet = doc.createElement('span');
  rules.attachBullet(emoteTrack, emoteBullet, emoteMsg);
  const emoteMerged = rules.merge({ ...emoteMsg, receivedAt: 3500 });
  assert.equal(emoteMerged.count, 2);
});

test('chatContent renders platform source badge (B/K/抖) and unified media segments', () => {
  const doc = makeFakeDoc();
  const bullet = doc.createElement('span');
  const res = append(bullet, {
    platform: 'douyin',
    user: '抖音哥',
    text: '冲呀',
    segments: [
      { type: 'text', text: '冲呀 ' },
      { type: 'sticker', url: 'https://p3.douyinpic.com/img/s.webp', alt: '[比心]' },
    ],
  }, { showUsername: true });

  assert.equal(res.hasGif, true);
  assert.equal(res.mediaCount, 1);
  assert.equal(bullet.children[0].className, 'platform-badge');
  assert.equal(bullet.children[0].dataset.plat, 'douyin');
  assert.equal(bullet.children[0].textContent, '抖');
  assert.equal(bullet.children[1].className, 'bullet-user');
  const body = bullet.children[2];
  assert.equal(body.children[1].className, 'chat-gif');
  assert.equal(body.children[1].referrerPolicy, 'no-referrer');
});
