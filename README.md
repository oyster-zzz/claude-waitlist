<h1 align="center">Claude Waitlist</h1>


<p align="center">
  A Chrome extension that queues your Claude tasks and auto-sends them after the usage limit resets, with 5-hour and weekly usage bars.
  <br/>
  一个 Chrome 扩展，在 Claude 用量重置后自动续发你的排队任务，兼具显示 5 小时和每周用量进度条。
</p>

<img width="2172" height="724" alt="github-banner-apple-style" src="https://github.com/user-attachments/assets/2a2e03fd-6568-4e4a-9e5f-a02ff903871e" />


<p align="center">
  <a href="#features--功能">Features</a> · <a href="#install--安装">Install</a> · <a href="#usage--使用">Usage</a> · <a href="#safety--合规">Safety</a> · <a href="#development--开发">Development</a>
</p>

---

## Features / 功能

- **Usage monitoring** — Real-time 5-hour and weekly usage bars, fetched from Claude's own API.
  实时显示 5 小时和每周用量进度条。

- **Task queue** — Queue up to 6 tasks. Set priority, choose "continue current conversation" or "start new conversation".
  最多排队 6 条任务，支持优先级排序、继续当前对话或新建对话。

- **Auto-send after reset** — Detects when limits reset and sends queued tasks automatically (with opt-in confirmation).
  检测重置后自动发送队列任务（默认需确认）。

- **Reset countdown** — Shows when your limit will reset, with desktop notifications at 5 min before and at reset time.
  显示重置倒计时，重置前 5 分钟和重置时桌面通知。

- **Bilingual UI** — Switch between 中文 and English with one click in settings.
  设置中一键切换中英文界面。

- **Privacy-first** — All data stays in `chrome.storage.local`. No external servers, no tokens collected, no chat history accessed.
  所有数据仅存储在本地，不上传任何信息。

## Install / 安装

### From Chrome Web Store / 商店安装

> Coming soon / 即将上架

### Manual install / 手动安装

1. Download the latest release and unpacked to obtain the `dist/` folder.
   下载最新的release版本并解压得到dist文件夹。

2. Open `chrome://extensions` and enable **Developer mode**.
   打开 `chrome://extensions`，启用「开发者模式」。

3. Click **Load unpacked** and select the `dist/` folder.
   点击「加载已解压的扩展程序」，选择 `dist/` 目录。

4. Open [claude.ai](https://claude.ai) — the floating panel appears automatically.
   打开 Claude 页面，浮窗自动出现。

## Usage / 使用

| Action | How |
|--------|-----|
| **Expand / collapse** | Click the floating pill on any Claude page. 点击浮窗展开或收起。 |
| **Add a task** | Click "Continue conversation" or "New conversation", fill in content, submit. 点击「继续当前对话」或「以新对话继续」，填写内容后提交。 |
| **Reorder** | Use the ↑ button to bump a task to the top. 点击 ↑ 按钮置顶任务。 |
| **Manual send** | Click the send button next to a task. 点击任务旁的发送按钮。 |
| **Switch language** | Settings → Language → 中文 / English. 设置 → 语言切换。 |
| **Import / Export** | Settings → Export JSON / Import JSON. 设置 → 导出 / 导入 JSON。 |

## How It Works / 工作原理

```
┌─────────────────────────────────────────────────┐
│  Claude Page (claude.ai)                        │
│  ┌─────────────────────┐  ┌──────────────────┐  │
│  │   Content Script     │  │  Floating Panel  │  │
│  │  • DOM detection     │  │  • Usage bars    │  │
│  │  • Usage API fetch   │  │  • Task queue    │  │
│  │  • Send to Claude    │  │  • Countdown     │  │
│  └────────┬────────────┘  └────────┬─────────┘  │
│           │  chrome.runtime         │            │
│           └──────────┬──────────────┘            │
└──────────────────────┼──────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │   Service Worker        │
          │  • State management     │
          │  • Alarm scheduling     │
          │  • Notifications        │
          │  • Auto-send logic      │
          └─────────────────────────┘
```

The extension has three layers:

1. **Service Worker** — Owns all state (`chrome.storage.local`), schedules reset alarms (`chrome.alarms`), sends desktop notifications, and coordinates auto-sending.
   后台 Service Worker 管理状态、定时器、通知和自动发送。

2. **Content Script** — Runs on Claude pages. Scans page text for limit messages, fetches the usage API, and physically types task content into Claude's input box.
   内容脚本在 Claude 页面运行，检测限制文本、获取用量 API、向输入框填入任务内容。

3. **Floating Panel** — Shadow DOM UI rendered by the content script. Shows usage, queue, and controls. Fully draggable.
   浮窗面板由内容脚本通过 Shadow DOM 渲染，展示用量、队列和操作按钮，可拖动。

## Safety / 合规

This extension is designed to respect Claude's Terms of Service:

- **Does not bypass usage limits** — It only queues tasks and waits for official resets.
  不绕过用量限制，仅在官方重置后续发。

- **Does not collect data** — No tokens, cookies, chat history, or account info leaves your browser.
  不收集任何用户数据。

- **No multi-account rotation** — Single account only.
  不支持多账号轮换。

- **No hidden automation** — The floating panel is always visible on the page.
  不隐藏自动化行为，浮窗始终可见。

- **Conservative sending** — Refuses to overwrite existing input box content. Confirm-before-send is on by default.
  发送前检查输入框，不覆盖已有内容；默认需确认。

## Tech Stack / 技术栈

TypeScript · Chrome Manifest V3 · Shadow DOM · `chrome.storage.local` · `chrome.alarms`

## License

MIT
