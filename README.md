# TriCast 三端融合弹幕 (`tricast-danmaku`)

实时融合 **B 站 (`live.bilibili.com`) + Kick (`kick.com`) + 抖音 (`live.douyin.com` / `www.douyin.com/follow/live/...`)** 三端直播弹幕、表情与 GIF 的开源 Chrome / Edge 浏览器扩展（Manifest V3）。

无论你在 **B 站**、**Kick** 还是 **抖音** 观看主播直播，都能在当前播放器的主界面同时查看三个直播间的实时飘屏弹幕与可拖动三端聊天窗，并随时切换向 **B 站 / Kick / 抖音** 任意平台发弹幕与 `+1` / 回复。

---

## 为什么做成 Manifest V3 扩展而不是油猴脚本？

- **原生跨站直连**：扩展后台 Service Worker 可直连 B 站、Kick、抖音三路 WebSocket，并统一全局去重（5000 条 LRU）与时间戳过滤，避免油猴脚本仅能抓当前页聊天框 DOM 造成的历史回流与重复刷屏。
- **静音断流跨平台代发**：通过 `declarativeNetRequest` 自动屏蔽后台代发标签页的 `.flv` / `.m3u8` / `.ts` 视频流，发往另一平台几乎 0 视频流量与 GPU 开销，免受油猴单页沙箱和 CORS 限制。

---

## 下载与安装（Chrome / Edge）

### 方式 A：下载安装包（推荐）

1. 前往 [**GitHub Releases**](https://github.com/ppppiii/tricast-danmaku/releases/latest) 下载最新的 `tricast-danmaku-v*-mv3.zip`（或仓库内预构建的 [tricast-danmaku-mv3.zip](dist/tricast-danmaku-mv3.zip)）并**完整解压**到固定文件夹。
2. 在 Chrome 打开 `chrome://extensions/` 或在 Edge 打开 `edge://extensions/`。
3. 打开右上角 **开发者模式（Developer mode）**。
4. 点击 **加载已解压的扩展程序（Load unpacked）**，选择解压后的扩展目录（包含 `manifest.json` 的文件夹）。

### 方式 B：从源码目录直接加载

```sh
git clone https://github.com/ppppiii/tricast-danmaku.git
cd tricast-danmaku
npm test      # 运行全部单元测试（零外部依赖，仅需 Node.js >= 20）
npm run pack  # 重新打包 dist/tricast-danmaku-mv3.zip
```

> **升级方式**：后续升级只需拉取新代码（或用新版压缩包解压覆盖原文件夹），再在扩展管理页点一下 **刷新（↻）**，已保存的主播预设与弹幕样式全部自动保留。

---

## 使用说明与防重影建议

首次进入任意一个平台的直播间时，播放器右下角会弹出一次轻巧的防重影提示（点击 **「知道了，不再提示」** 后该站永久不再弹出）：

- **在 B 站 / 抖音观看**：建议顺手关掉播放器底栏自带的原生弹幕按钮（插件默认也已启用 `隐藏网页原弹幕(B/抖)` 样式兜底）。
- **在 Kick 观看**：Kick 原生播放器无画面飘屏弹幕；如之前装过其他 Kick 弹幕扩展或油猴脚本（如 DanMage 等），建议关闭以免与本插件双层重叠。
- **配置融合房间**：点击工具栏 `融合房间`（支持贴入房间号、`live.douyin.com/<id>` 或 `www.douyin.com/follow/live/<id>` 链接），填好三端房间后可保存为 **主播预设**，以后打开三端任意页面自动匹配加载。

### 核心特性一览

1. **纯事件流实时采集 · 告别历史回流**
   - **B 站**：`getDanmuInfo` (WBI) + `wss://*.chat.bilibili.com/sub`（Deflate）
   - **Kick**：`web.kick.com/api/v1/realtime/connection` (Centrifugo) + Pusher WebSocket 自愈回退（`chatrooms.<id>.v2`）+ 页面 WebSocket 实况镜像 + 7TV 全局/频道表情（含 zero-width 叠层）+ Tenor/Giphy GIF + 房管删帖墓碑过滤（`: Deleted by a moderator` 等）
   - **抖音**：`webcastSign` 签名 + `wss://webcast100-ws-web-lq.douyin.com/webcast/im/push/v2/`（Gzip + Protobuf，`need_persist_msg_count=0` 不拉历史），完整内置并自动刷新抖音 **214 个官方系统小黄脸表情**（`[捂脸]` / `[流泪]` / `[比心]` 等）+ `rtfContent`（字段 22）富文本内嵌图 + 表情贴纸；自动避让 `www.douyin.com` 短视频页。
2. **B 站级清爽轨道控制与三端聊天窗（`📋 聊天窗` / `Alt + L`）**
   - 默认纯白 `#ffffff`、22 px、1.35× 行距、同屏上限 80 条、75% 密度、`allowOverlap: false` 防叠字微缓冲。
   - **仅合并纯文字（默认开启）**：8 秒内相同纯文字弹幕合并 `×N`，表情/贴纸/GIF 保持逐条飘屏。
   - **可拖动三端聊天窗**：支持按 `全部 / B / K / 抖` 筛选与快捷 `+1` / `@回复`。
3. **可切换来源角标（`B` / `K` / `抖`）与三端互发（`💬 发弹幕` / `Alt + C`）**
   - 角标开关对画面飘屏与聊天窗实时生效。
   - 当前所在直播间支持原生 DOM 零额外标签直发，跨端发送通过 WBI 直调（B 站）或静音断流后台页（Kick/抖音）安全提交。

---

## 快捷键

- `Alt + D`：开关融合飘屏弹幕
- `Alt + L`：开关主界面三端实时聊天窗
- `Alt + C`：打开三端发弹幕栏
- `Alt + S`：打开 / 关闭弹幕设置面板

---

## 目录结构与参与贡献 (Pull Requests)

```text
tricast-danmaku/
├─ manifest.json                # MV3 扩展清单
├─ popup/                       # 工具栏弹出快捷面板
├─ src/
│  ├─ shared/state.js           # 设置、房间号、预设与持久化键
│  ├─ protocols/                # B站 / Kick / 抖音协议解码与 214 抖音小黄脸表
│  ├─ background/               # Service Worker 弹幕中心 & 静音跨端代发
│  └─ content/                  # Shadow DOM 播放器挂载、轨道排版、聊天窗与提示框
├─ tests/                       # Node 内置 test runner 单元测试
├─ scripts/pack-zip.cjs         # 零依赖打包 dist/tricast-danmaku-mv3.zip
└─ .github/workflows/           # CI 测试与 Tag 自动发版工作流
```

欢迎提交 Issue 或 Pull Request 改进协议兼容、表情渲染或播放器适配：

1. Fork 本仓库并创建功能分支（`git checkout -b fix/xxx`）。
2. 提交 PR 前请确保在本地执行通过（与 GitHub CI 检查项一致）：
   ```sh
   npm test
   npm run pack
   ```

## 致谢与协议

- 弹幕排版、避让区、7TV 叠层、合并/屏蔽及静音后台代发等核心设计灵感来自开源项目 [Sur4lis/FreeCast](https://github.com/Sur4lis/FreeCast)。
- 本项目采用 [MIT License](LICENSE) 开源。
