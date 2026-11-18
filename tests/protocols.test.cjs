'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const loadEsm = (rel) => import(pathToFileURL(path.resolve(__dirname, '..', rel)).href);

test('hash-sign: md5, signWbi, and webcastSign work deterministically', async () => {
  const { md5, signWbi, buildDouyinWsSignature } = await loadEsm('src/protocols/hash-sign.mjs');

  assert.equal(md5('abc'), '900150983cd24fb0d6963f7d28e17f72');

  const query = signWbi(
    { id: 10001, type: 0 },
    {
      img_url: 'https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png',
      sub_url: 'https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png',
    },
    1700000000000,
  );
  assert.match(query, /id=10001/);
  assert.match(query, /wts=1700000000/);
  assert.match(query, /w_rid=[0-9a-f]{32}/);

  const params = new URLSearchParams({
    live_id: '1',
    aid: '6383',
    version_code: '180800',
    webcast_sdk_version: '1.0.14-beta.0',
    room_id: '7300000000000000001',
    did_rule: '3',
    user_unique_id: '7300000000000000002',
    device_platform: 'web',
    identity: 'audience',
  });
  const sig = buildDouyinWsSignature(params, [1, true, 42, 77]);
  assert.equal(typeof sig, 'string');
  assert.equal(sig.length, 16);
});

test('bili-protocol decodes protover=2 deflated DANMU_MSG with inline emotes and big sticker', async () => {
  const { encodeBiliPacket, decodeBiliFrames, normalizeBiliCommand } = await loadEsm(
    'src/protocols/bili-protocol.mjs',
  );

  const inner1 = encodeBiliPacket(5, {
    cmd: 'DANMU_MSG',
    info: [
      [0, 1, 25, 16777215, 1700000001000, 0, 0, '', 0, 0, 0, '', 0, '{}', '{}', {
        extra: JSON.stringify({
          id_str: 'bili-msg-1',
          emots: {
            '[doge]': { url: 'http://i0.hdslb.com/bfs/emote/doge.png' },
          },
        }),
      }],
      '好活 [doge] 哈哈',
      [10086, 'B站水友'],
    ],
  });
  const inner2 = encodeBiliPacket(5, {
    cmd: 'DANMU_MSG',
    info: [
      [0, 1, 25, 5816798, 1700000002000, 0, 0, '', 0, 0, 0, '', 0, {
        url: 'https://i0.hdslb.com/bfs/emote/big_up.png',
        width: 60,
        height: 60,
      }, '{}', { extra: JSON.stringify({ id_str: 'bili-msg-2' }) }],
      '大表情',
      [10087, '舰长哥'],
    ],
  });

  const combined = Buffer.concat([Buffer.from(inner1), Buffer.from(inner2)]);
  const deflated = zlib.deflateSync(combined);
  const outer = Buffer.alloc(16 + deflated.length);
  outer.writeUInt32BE(outer.length, 0);
  outer.writeUInt16BE(16, 4);
  outer.writeUInt16BE(2, 6); // protover = 2
  outer.writeUInt32BE(5, 8);
  outer.writeUInt32BE(1, 12);
  deflated.copy(outer, 16);

  const frames = await decodeBiliFrames(outer);
  assert.equal(frames.length, 2);

  const m1 = normalizeBiliCommand(frames[0].body, 1700000001500).message;
  assert.equal(m1.platform, 'bilibili');
  assert.equal(m1.id, 'bili-msg-1');
  assert.equal(m1.hasMedia, true);
  assert.equal(m1.hasGif, false);
  assert.equal(m1.segments.length, 3);
  assert.equal(m1.segments[1].type, 'emote');
  assert.equal(m1.segments[1].url, 'https://i0.hdslb.com/bfs/emote/doge.png');

  const m2 = normalizeBiliCommand(frames[1].body, 1700000002500).message;
  assert.equal(m2.hasMedia, true);
  assert.equal(m2.hasGif, true);
  assert.equal(m2.segments[0].type, 'sticker');
});

test('douyin-protocol decodes gzipped PushFrame ChatMessage + EmojiChatMessage + ack + HTML roomId', async () => {
  const { pbEncode, decodeDouyinFrame, parseDouyinRoomHtml, extractDouyinWebRid } = await loadEsm(
    'src/protocols/douyin-protocol.mjs',
  );

  assert.equal(extractDouyinWebRid('https://live.douyin.com/200525029536'), '200525029536');
  assert.equal(
    extractDouyinWebRid('https://www.douyin.com/follow/live/200525029536?anchor_id=470203709260235'),
    '200525029536',
  );
  assert.equal(extractDouyinWebRid('https://www.douyin.com/root/live/200525029536'), '200525029536');
  assert.equal(extractDouyinWebRid('https://www.douyin.com/'), '');
  assert.equal(extractDouyinWebRid('https://www.douyin.com/follow'), '');
  assert.equal(extractDouyinWebRid('https://www.douyin.com/video/7412345678901234567'), '');
  assert.equal(extractDouyinWebRid('https://live.douyin.com/category/4_103'), '');

  const common = pbEncode([[4, 1700000010]]);
  const user = pbEncode([
    [1, 99001122],
    [3, '抖音老铁'],
  ]);
  const rtf = pbEncode([[2, pbEncode([[1, 'https://p3.douyinpic.com/img/aweme-emote.png']]) ]]);
  const chatPayload = pbEncode([
    [1, common],
    [2, user],
    [3, '太秀了'],
    [6, '#25f4ee'],
    [15, rtf],
  ]);
  const emojiPayload = pbEncode([
    [1, common],
    [2, user],
    [4, pbEncode([[1, pbEncode([[1, 'https://p3.douyinpic.com/img/sticker.webp']])]])],
    [5, '[比心]'],
  ]);

  const msg1 = pbEncode([
    [1, 'WebcastChatMessage'],
    [2, chatPayload],
    [3, 777111222],
  ]);
  const msg2 = pbEncode([
    [1, 'WebcastEmojiChatMessage'],
    [2, emojiPayload],
    [3, 777111223],
  ]);
  const respBytes = pbEncode([
    [1, msg1],
    [1, msg2],
    [5, 'internal-ext-token'],
    [9, 1],
  ]);
  const gzippedResp = zlib.gzipSync(Buffer.from(respBytes));
  const outerFrame = pbEncode([
    [2, 998877n],
    [8, gzippedResp],
  ]);

  const decoded = await decodeDouyinFrame(outerFrame, 1700000010500);
  assert.ok(decoded.ack instanceof Uint8Array);
  assert.equal(decoded.messages.length, 2);

  assert.equal(decoded.messages[0].platform, 'douyin');
  assert.equal(decoded.messages[0].text, '太秀了');
  assert.equal(decoded.messages[0].hasMedia, true);
  assert.equal(decoded.messages[0].segments[1].url, 'https://p3.douyinpic.com/img/aweme-emote.png');

  assert.equal(decoded.messages[1].platform, 'douyin');
  assert.equal(decoded.messages[1].hasGif, true);
  assert.equal(decoded.messages[1].segments[0].type, 'sticker');
  assert.equal(decoded.messages[1].segments[0].url, 'https://p3.douyinpic.com/img/sticker.webp');

  const sampleHtml = `<script id="RENDER_DATA" type="application/json">${encodeURIComponent(
    JSON.stringify({
      app: {
        initialState: {
          roomStore: {
            roomInfo: {
              web_rid: '80017709309',
              roomId: '7345678901234567890',
              anchor: { nickname: '抖音主播A' },
              room: { id_str: '7345678901234567890', status: 2, title: '开播测试' },
            },
            user_unique_id: '7399999999999999999',
          },
        },
      },
    }),
  )}</script>`;
  const roomMeta = parseDouyinRoomHtml(sampleHtml, '80017709309');
  assert.equal(roomMeta.roomId, '7345678901234567890');
  assert.equal(roomMeta.nickname, '抖音主播A');
  assert.equal(roomMeta.status, 2);

  // Also extract roomId from Flight self.__pace_f multi-line escaped chunk
  const flightHtml = `<script>self.__pace_f.push([1,"a:null\\n15:{\\"roomId\\":\\"7412345678901234567\\",\\"user_unique_id\\":\\"7311111111111111111\\"}"])</script>`;
  const flightMeta = parseDouyinRoomHtml(flightHtml, '200525029536');
  assert.equal(flightMeta.roomId, '7412345678901234567');
  assert.equal(flightMeta.userUniqueId, '7311111111111111111');
});

test('douyin-emojis renders 214 official inline shortcodes ([捂脸] etc.) and field 22 rtfContent pieces', async () => {
  const { DEFAULT_DOUYIN_EMOJIS, parseDouyinEmojiListResponse, tokenizeDouyinTextWithEmojis } = await loadEsm(
    'src/protocols/douyin-emojis.mjs',
  );
  const { pbEncode, decodeDouyinFrame } = await loadEsm('src/protocols/douyin-protocol.mjs');

  assert.ok(Object.keys(DEFAULT_DOUYIN_EMOJIS).length >= 200);
  assert.match(DEFAULT_DOUYIN_EMOJIS['[捂脸]'], /^https:\/\/.*douyinpic\.com\//);
  assert.match(DEFAULT_DOUYIN_EMOJIS['[流泪]'], /^https:\/\/.*douyinpic\.com\//);
  assert.match(DEFAULT_DOUYIN_EMOJIS['[比心]'], /^https:\/\/.*douyinpic\.com\//);

  const parsedApi = parseDouyinEmojiListResponse({
    emoji_list: [
      { display_name: '[捂脸]', emoji_url: { url_list: ['https://p3-pc-sign.douyinpic.com/obj/wulian.webp'] } },
      { display_name: '[恶意]', emoji_url: { url_list: ['https://evil.example.com/x.png'] } },
    ],
  });
  assert.equal(parsedApi['[捂脸]'], 'https://p3-pc-sign.douyinpic.com/obj/wulian.webp');
  assert.equal(parsedApi['[恶意]'], undefined);

  const tok = tokenizeDouyinTextWithEmojis('笑死我了[捂脸][比心][普通括号]');
  assert.deepEqual(
    tok.map((s) => [s.type, s.alt || s.text]),
    [
      ['text', '笑死我了'],
      ['emote', '[捂脸]'],
      ['emote', '[比心]'],
      ['text', '[普通括号]'],
    ],
  );

  // Verify real protobuf WebcastChatMessage with uint64 eventTime=15 + content="[捂脸]" + rtfContent field 22
  const common = pbEncode([[4, 1700000010]]);
  const user = pbEncode([
    [1, 99001133],
    [3, '捂脸水友'],
  ]);
  const chatShortcode = pbEncode([
    [1, common],
    [2, user],
    [3, '哈哈哈[捂脸][普通括号]'],
    [15, 1700000010], // real Douyin eventTime is varint, not bytes!
  ]);
  const rtfPieceText = pbEncode([[3, '前排 '], [1, 1]]);
  const rtfPieceImg = pbEncode([
    [8, pbEncode([[1, pbEncode([[1, 'https://p3.douyinpic.com/obj/badge.png']])]])],
  ]);
  const rtfTextMsg = pbEncode([
    [1, 'chat'],
    [4, rtfPieceText],
    [4, rtfPieceImg],
  ]);
  const chatRtf22 = pbEncode([
    [1, common],
    [2, user],
    [3, '前排'],
    [15, 1700000011],
    [22, rtfTextMsg],
  ]);

  const respBytes = pbEncode([
    [1, pbEncode([[1, 'WebcastChatMessage'], [2, chatShortcode], [3, 888001]])],
    [1, pbEncode([[1, 'WebcastChatMessage'], [2, chatRtf22], [3, 888002]])],
  ]);
  const frame = pbEncode([[8, zlib.gzipSync(Buffer.from(respBytes))]]);
  const decoded = await decodeDouyinFrame(frame, 1700000010500);
  assert.equal(decoded.messages.length, 2);

  const m1 = decoded.messages[0];
  assert.equal(m1.hasMedia, true);
  assert.equal(m1.sendText, '哈哈哈[捂脸][普通括号]');
  assert.equal(m1.segments[1].type, 'emote');
  assert.equal(m1.segments[1].alt, '[捂脸]');
  assert.equal(m1.segments[1].url, DEFAULT_DOUYIN_EMOJIS['[捂脸]']);
  assert.equal(m1.segments[2].type, 'text');
  assert.equal(m1.segments[2].text, '[普通括号]');

  const m2 = decoded.messages[1];
  assert.equal(m2.hasMedia, true);
  assert.equal(m2.segments[0].text, '前排 ');
  assert.equal(m2.segments[1].type, 'emote');
  assert.equal(m2.segments[1].url, 'https://p3.douyinpic.com/obj/badge.png');
});

test('kick-protocol decodes Centrifugo ping/replies/publications and Pusher 4001 error', async () => {
  const { parseKickPusherFrame, parseKickCentrifugoFrames, ingest7tvEmoteSet, isDeletedPlaceholder } = await loadEsm(
    'src/protocols/kick-protocol.mjs',
  );

  const err4001 = parseKickPusherFrame(
    JSON.stringify({
      event: 'pusher:error',
      data: { code: 4001, message: 'App key 32cbd69e4b950bf97679 not in this cluster' },
    }),
  );
  assert.equal(err4001.kind, 'pusher-error');
  assert.equal(err4001.code, 4001);

  const centRaw = [
    '{}',
    JSON.stringify({ id: 1, connect: { client: 'cid-1', ping: 25, pong: true } }),
    JSON.stringify({ id: 2, subscribe: {} }),
    JSON.stringify({
      push: {
        channel: 'chatrooms.456.v2',
        pub: {
          data: {
            event: 'App\\Events\\ChatMessageEvent',
            data: JSON.stringify({
              id: 'cent-msg-1',
              content: 'Centrifugo works [emote:37226:KEKW]',
              sender: { id: 88, username: 'CentUser', identity: { color: '#53fc18' } },
            }),
          },
        },
      },
    }),
    JSON.stringify({
      push: {
        channel: 'chatrooms.456.v2',
        pub: {
          data: {
            event: 'App\\Events\\MessageDeletedEvent',
            data: JSON.stringify({ message: { id: 'cent-msg-1' } }),
          },
        },
      },
    }),
  ].join('\n');

  const centEvents = parseKickCentrifugoFrames(centRaw, null, 1700000020000);
  assert.equal(centEvents[0].kind, 'centrifugo-ping');
  assert.equal(centEvents[1].kind, 'centrifugo-connected');
  assert.equal(centEvents[2].kind, 'centrifugo-subscribed');
  assert.equal(centEvents[3].kind, 'danmaku');
  assert.equal(centEvents[3].message.id, 'cent-msg-1');
  assert.equal(centEvents[3].message.hasMedia, true);
  assert.equal(centEvents[4].kind, 'delete');
  assert.deepEqual(centEvents[4].ids, ['cent-msg-1']);

  assert.equal(isDeletedPlaceholder(': Deleted by a moderator'), true);
  assert.equal(isDeletedPlaceholder('Deleted by the broadcaster'), true);
  assert.equal(isDeletedPlaceholder('被管理员删除'), true);
  assert.equal(isDeletedPlaceholder(':D nice play'), false);

  const deletedRes = parseKickPusherFrame(
    JSON.stringify({
      event: 'App\\Events\\ChatMessageEvent',
      data: JSON.stringify({
        id: 'mod-del-1',
        content: ': Deleted by a moderator',
        sender: { id: 1, username: 'ModTarget' },
      }),
    }),
  );
  assert.equal(deletedRes.kind, 'delete');

  const emotes7tv = ingest7tvEmoteSet([
    {
      name: 'Sadge',
      flags: 0,
      data: { host: { url: '//cdn.7tv.app/emote/sadge', files: [{ name: '2x.webp' }] } },
    },
    {
      name: 'Crown',
      flags: 1,
      data: { flags: 256, host: { url: '//cdn.7tv.app/emote/crown', files: [{ name: '2x.webp' }] } },
    },
  ]);

  const richFrame = parseKickPusherFrame(
    JSON.stringify({
      event: 'App\\Events\\ChatMessageEvent',
      data: JSON.stringify({
        id: 'kick-msg-1',
        content: 'Nice [emote:37226:KEKW] Sadge Crown https://media.tenor.com/cat/dance.gif',
        sender: { id: 42, username: 'KickUser', identity: { color: '#53fc18' } },
      }),
    }),
    emotes7tv,
  );
  assert.equal(richFrame.kind, 'danmaku');
  const m = richFrame.message;
  assert.equal(m.hasMedia, true);
  assert.equal(m.hasGif, true);
  assert.ok(m.segments.some((s) => s.type === 'emote' && s.alt === 'KEKW'));
  const sadgeSeg = m.segments.find((s) => s.type === 'emote' && s.alt === 'Sadge');
  assert.ok(sadgeSeg && sadgeSeg.overlays?.length === 1 && sadgeSeg.overlays[0].alt === 'Crown');
  assert.ok(m.segments.some((s) => s.type === 'sticker'));
});
