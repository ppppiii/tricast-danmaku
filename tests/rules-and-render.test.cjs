'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const state = require('../src/shared/state.js');
const { createChatRules, isEmoteOrMediaMessage } = require('../src/content/chat-rules.js');
const { append } = require('../src/content/chat-content.js');
const hostMount = require('../src/content/host-mount.js');
const panelUi = require('../src/content/panel-ui.js');

function makeFakeElement(tag) {
  const listeners = new Map();
  const matchesSelector = (el, sel) => {
    if (!sel || !el) return false;
    const msgMatch = /^\.tcd-feed-item\[data-msg-id="(.+)"\]$/.exec(sel);
    if (msgMatch) {
      return el.className?.split(/\s+/).includes('tcd-feed-item') && String(el.dataset?.msgId || '') === msgMatch[1];
    }
    if (sel.startsWith('.')) {
      return (el.className || '').split(/\s+/).includes(sel.slice(1));
    }
    return false;
  };
  return {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    className: '',
    textContent: '',
    hidden: false,
    dataset: {},
    style: { setProperty() {}, getPropertyValue() { return ''; } },
    children: [],
    childNodes: [],
    isConnected: true,
    scrollHeight: 200,
    scrollTop: 200,
    clientHeight: 150,
    classList: {
      toggle() {},
    },
    setAttribute(k, v) {
      this['attr_' + k] = String(v);
    },
    append(...nodes) {
      for (const n of nodes) {
        if (typeof n === 'object' && n) {
          n._parent = this;
          this.children.push(n);
          this.childNodes.push(n);
        }
      }
    },
    appendChild(n) {
      if (typeof n === 'object' && n) n._parent = this;
      this.children.push(n);
      this.childNodes.push(n);
      return n;
    },
    insertBefore(newNode, refNode) {
      const idx = this.children.indexOf(refNode);
      if (idx < 0) return this.appendChild(newNode);
      newNode._parent = this;
      this.children.splice(idx, 0, newNode);
      this.childNodes.splice(idx, 0, newNode);
      return newNode;
    },
    remove() {
      this.isConnected = false;
      if (this._parent) {
        this._parent.children = this._parent.children.filter((c) => c !== this);
        this._parent.childNodes = this._parent.childNodes.filter((c) => c !== this);
      }
    },
    querySelector(sel) {
      if (sel === '.repeat-count') {
        return this.children.find((c) => c.className === 'repeat-count') || null;
      }
      return this.children.find((c) => matchesSelector(c, sel)) || null;
    },
    querySelectorAll(sel) {
      return this.children.filter((c) => matchesSelector(c, sel));
    },
    addEventListener(name, fn) {
      listeners.set(name, fn);
    },
  };
}

function makeFakeDoc() {
  const doc = {
    addEventListener() {},
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
  assert.equal(def.showChatFeed, false);
  assert.equal(def.allowOverlap, false);
  assert.equal(def.danmakuSize, 22);
  assert.equal(def.danmakuMaxCount, 80);
  assert.equal(def.danmakuDensity, 75);
  assert.equal(def.showPlatformBadge, true);
  assert.equal(def.suppressNativeBili, true);
  assert.equal(def.mergeRepeated, true);
  assert.equal(def.mergeTextOnly, true);

  assert.equal(state.normalizeRoomInput('bilibili', 'https://live.bilibili.com/21452505?spm=1'), '21452505');
  assert.equal(state.normalizeRoomInput('bilibili', 'https://live.bilibili.com/blanc/21452505'), '21452505');
  assert.equal(state.normalizeRoomInput('kick', 'https://kick.com/xQc'), 'xqc');
  assert.equal(state.normalizeRoomInput('douyin', 'https://live.douyin.com/80017709309'), '80017709309');
  assert.equal(
    state.normalizeRoomInput(
      'douyin',
      'https://www.douyin.com/follow/live/200525029536?anchor_id=470203709260235',
    ),
    '200525029536',
  );
  assert.equal(state.normalizeRoomInput('douyin', 'https://www.douyin.com/root/live/200525029536'), '200525029536');
  assert.equal(state.normalizeRoomInput('douyin', 'follow'), '');
  assert.equal(state.normalizeRoomInput('douyin', 'https://www.douyin.com/'), '');
  assert.equal(state.normalizeRoomInput('douyin', 'https://www.douyin.com/video/7412345678901234567'), '');
  assert.equal(state.normalizeRoomInput('douyin', 'https://live.douyin.com/category/4_103'), '');

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

test('hostMount.detectHostSite identifies live vs non-live URLs across all 3 platforms', () => {
  assert.deepEqual(
    hostMount.detectHostSite({
      hostname: 'live.bilibili.com',
      pathname: '/10001',
      href: 'https://live.bilibili.com/10001',
    }),
    { site: 'bilibili', room: '10001' },
  );
  assert.deepEqual(
    hostMount.detectHostSite({
      hostname: 'kick.com',
      pathname: '/teststreamer',
      href: 'https://kick.com/teststreamer',
    }),
    { site: 'kick', room: 'teststreamer' },
  );
  assert.deepEqual(
    hostMount.detectHostSite({
      hostname: 'www.douyin.com',
      pathname: '/follow/live/200525029536',
      href: 'https://www.douyin.com/follow/live/200525029536?anchor_id=470203709260235',
    }),
    { site: 'douyin', room: '200525029536' },
  );
  assert.deepEqual(
    hostMount.detectHostSite({
      hostname: 'www.douyin.com',
      pathname: '/video/7412345678901234567',
      href: 'https://www.douyin.com/video/7412345678901234567',
    }),
    { site: 'douyin', room: '' },
  );
  assert.deepEqual(
    hostMount.detectHostSite({
      hostname: 'www.douyin.com',
      pathname: '/',
      href: 'https://www.douyin.com/',
    }),
    { site: 'douyin', room: '' },
  );
});

test('panelUi chat feed appends tri-platform messages, respects filter state, and deletes by id', () => {
  assert.match(panelUi.buildShadowMarkup(), /id="tcdChatFeed"/);
  assert.match(panelUi.buildShadowMarkup(), /id="tcdFeedToggleBtn"/);

  const doc = makeFakeDoc();
  const ids = new Map();
  const makeById = (id, tag = 'div') => {
    const el = doc.createElement(tag);
    el.id = id;
    ids.set(id, el);
    return el;
  };

  makeById('player');
  makeById('danmaku');
  const feed = makeById('tcdChatFeed', 'aside');
  feed.hidden = true;
  makeById('tcdChatFeedHeader');
  const feedList = makeById('tcdChatFeedList');
  feedList.dataset.activeFilter = 'all';
  const feedEmpty = makeById('tcdChatFeedEmpty');
  feedList.appendChild(feedEmpty);

  const filterBtns = ['all', 'bilibili', 'kick', 'douyin'].map((f) => {
    const b = doc.createElement('button');
    b.dataset.filter = f;
    b.className = f === 'all' ? 'tcd-feed-filter active' : 'tcd-feed-filter';
    b.classList = {
      toggle(cls, on) {
        if (cls === 'active') b.className = on ? 'tcd-feed-filter active' : 'tcd-feed-filter';
      },
    };
    b._click = () => b._listeners?.get('click')?.({ stopPropagation() {} });
    const origAdd = b.addEventListener;
    b._listeners = new Map();
    b.addEventListener = (evt, fn) => {
      b._listeners.set(evt, fn);
      origAdd.call(b, evt, fn);
    };
    return b;
  });

  const store = state.createStore();
  const fakeShadow = {
    ownerDocument: doc,
    getElementById: (id) => ids.get(id) || null,
    querySelectorAll: (sel) => (sel === '.tcd-feed-filter' ? filterBtns : []),
    querySelector: () => null,
  };

  const ui = panelUi.createPanelUI({
    shadowRoot: fakeShadow,
    store,
    chatContent: { append },
  });

  store.update({ showChatFeed: true });
  assert.equal(feed.hidden, false);

  ui.appendChatFeed({ platform: 'bilibili', id: 'm1', user: 'B友', text: '来了' });
  ui.appendChatFeed({ platform: 'kick', id: 'm2', user: 'K友', text: 'W stream' });
  ui.appendChatFeed({ platform: 'douyin', id: 'm3', user: '抖友', text: '666' });

  const itemsAfterAdd = feedList.querySelectorAll('.tcd-feed-item');
  assert.equal(itemsAfterAdd.length, 3);
  assert.equal(feedEmpty.hidden, true);
  assert.deepEqual(
    itemsAfterAdd.map((el) => el.dataset.plat),
    ['bilibili', 'kick', 'douyin'],
  );

  // Switch filter to douyin -> active attribute updates cleanly
  filterBtns[3]._click();
  assert.equal(feedList.dataset.activeFilter, 'douyin');
  assert.equal(feedEmpty.hidden, true);

  // Delete m3 -> douyin filter view reflects empty Douyin state cleanly
  ui.removeChatFeedMessages(['m3']);
  assert.equal(feedList.querySelectorAll('.tcd-feed-item').length, 2);
  assert.equal(feedEmpty.hidden, false);

  ui.clearChatFeed();
  assert.equal(feedList.querySelectorAll('.tcd-feed-item').length, 0);
});
