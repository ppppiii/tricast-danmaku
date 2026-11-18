# TriCast 三端融合弹幕 (`tricast-danmaku`)

实时融合 **B 站 (`live.bilibili.com`) + Kick (`kick.com`) + 抖音 (`live.douyin.com`)** 三端直播弹幕与表情/GIF 的 Chrome / Edge 扩展（Manifest V3）。

你可以在 **B 站** 或 **Kick** 任意一个直播间看主播画面的同时，实时把另外两个直播间的弹幕、表情包融进同一层播放器弹幕中，并且可以随时切换选择向 **B 站 / Kick / 抖音** 任意平台发弹幕与 `+1`。

## 核心特性

1. **纯事件流实时采集 · 告别重复刷新与历史回流**
   - 不再抓右侧聊天框 DOM 重绘，而是由扩展后台 Service Worker 分别直连：
     - **B 站**：`getDanmuInfo` (WBI) + `wss://*.chat.bilibili.com/sub`（Deflate）
     - **Kick**：`wss://ws-us2.pusher.com` (`chatrooms.<id>.v2`) + 7TV 全局/频道表情（含 zero-width 叠层）+ Tenor/Giphy GIF + 房管删帖墓碑过滤（`: Deleted by a moderator` 等）
     - **抖音**：`webcastSign` 签名 + `wss://webcast100-ws-web-lq.douyin.com/webcast/im/push/v2/`（Gzip + Protobuf，`need_persist_msg_count=0` 不拉历史）
   - 全局 `platform:msgId` 去重（5000 条 LRU）+ 建连前时间戳过滤，每条实时弹幕只飞一次。

2. **B 站级清爽轨道控制**
   - 默认**关闭满轨叠层**（`allowOverlap: false`），配合 `1.2s` 突发队列微缓冲（上限 25 条，80ms 出队），默认纯白 `#ffffff`、22 px、1.35× 行距、同屏上限 80 条、75% 密度，干净不挡画面。
   - **仅合并纯文字（默认开启）**：8 秒内相同纯文字弹幕合并显示 `×N`，而含表情包、抖音贴纸、GIF、纯 Emoji 的弹幕保持逐条飘屏保留氛围。

3. **可切换的来源标识（`B` / `K` / `抖`）**
   - 开启时在弹幕前显示轻巧来源徽标，方便分辨是哪个直播间的观众在互动；关闭后瞬间隐藏所有角标（含正在飘行的弹幕），变为完全无差别的纯白融合弹幕流。

4. **全三端跨平台发送与悬停 `+1` / 回复（方案 A）**
   - 点击播放器内 `💬 发弹幕`（快捷键 `Alt + C`）或悬停弹幕点 `+1` / `回复`：
     - **发往 B 站**：后台直调官方 `/msg/send` + WBI + 当前浏览器 Cookie 秒发，并自带天蓝自发边框回显。
     - **发往 Kick**：若当前就在对应 Kick 页面，直接注入原生输入框发送；若在 B 站观看，则通过静音断流后台页代发。
     - **发往抖音**：复用已打开的抖音直播间或自动开启静音背景标签页，并用 `declarativeNetRequest` 直接阻断 `.flv/.m3u8/.ts/.m4s` 视频流（0 视频流量与解码开销），由抖音官方前端签名提交。若需登录或滑块验证，提示栏会给出「去登录/验证 ↗」直达按钮。

## 安装（Chrome / Edge）

1. 打开 `chrome://extensions/` 或 `edge://extensions/`
2. 开启右上角 **开发者模式（Developer mode）**
3. 点击 **加载已解压的扩展程序（Load unpacked）**，选择 `d:\00aiwork\项目\其它\tricast-danmaku`

## 快捷键

- `Alt + D`：开关融合弹幕（在 B 站观看时会自动联动隐藏/恢复 B 站原生弹幕防重影）
- `Alt + C`：打开三端发弹幕栏
- `Alt + S`：打开 / 关闭弹幕设置面板

## 测试与打包

```sh
npm test   # 运行协议解码、轨道微队列与合并规则单元测试
npm run pack # 打包 dist/tricast-danmaku-mv3.zip
```
