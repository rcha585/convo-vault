# Convo Vault

Convo Vault is a local-first Chrome extension for exporting ChatGPT conversations into a portable archive. It captures the current conversation, renders readable Markdown and PDF, and keeps the useful structured data beside them for later search, notes, Obsidian, or RAG workflows.

Convo Vault 是一个本地优先的 Chrome 扩展，用来把 ChatGPT 对话导出成可以长期保存的本地档案。它会抓取当前对话，生成可读的 Markdown 和 PDF，并把结构化数据一起打包，方便之后检索、整理笔记、放进 Obsidian，或继续接入 RAG 流程。

Current version: `0.7.8`

## Status

Convo Vault is now an early alpha / usable MVP. The main local export flow works, Fast and Full capture modes are available, CI is in place, and real conversation bundles can be produced. It is not yet a polished public-store product: ChatGPT page/API changes, extension permissions, media edge cases, and packaging still need continued hardening.

Convo Vault 现在处在早期正式可用的 MVP 阶段。核心本地导出流程已经跑通，Fast 和 Full 两种捕获模式都可用，CI 已经搭好，也能生成真实可用的对话 bundle。它还不是商店级稳定产品：ChatGPT 页面/API 变化、扩展权限、媒体边界情况和发布打包还需要继续打磨。

## What It Exports

Each export downloads a `.zip` bundle with:

- Markdown
- PDF
- payload JSON
- JSONL messages
- asset manifest
- QA/topic/entity/summary sidecars

每次导出会下载一个 `.zip` 包，里面通常包含：

- Markdown
- PDF
- payload JSON
- JSONL messages
- 资源清单
- QA、topic、entity、summary 等 sidecar 文件

## Capture Modes

`Fast` reads the current ChatGPT conversation through the logged-in page session and conversation API. It is the preferred daily mode: quicker, cleaner, and good for most exports.

`Full` scans the visible ChatGPT page DOM more deeply. It is slower, but can recover details that the API does not expose, especially some Thinking/flyout content.

`Fast` 会通过当前已登录的 ChatGPT 页面 session 和 conversation API 读取对话。它是日常优先模式：更快、更干净，适合大多数导出。

`Full` 会更深入地扫描 ChatGPT 页面 DOM。它更慢，但有机会补到 API 没暴露的细节，尤其是部分 Thinking/flyout 内容。

## Quick Start

1. Clone this repo.
2. Install backend dependencies:

```bash
cd tools/advanced-pdf
pnpm install
```

3. Go back to the repo root and build the extension:

```bash
cd ../..
npm run build:extension
```

4. Open Chrome, go to `chrome://extensions`, enable Developer mode, click **Load unpacked**, and select:

```text
dist/convo-vault-extension
```

5. Open the extension popup, set the repo folder, click **Copy Start**, and
   paste the copied command into your terminal. The copied command includes a
   local API token so only this extension can call the browser-facing backend
   endpoints.

6. Open a ChatGPT conversation, click the Convo Vault extension icon, choose `Fast` or `Full`, select messages, and export the bundle.

## 快速开始

1. 克隆这个仓库。
2. 安装本地后端依赖：

```bash
cd tools/advanced-pdf
pnpm install
```

3. 回到项目根目录并构建扩展：

```bash
cd ../..
npm run build:extension
```

4. 打开 Chrome，进入 `chrome://extensions`，开启开发者模式，点击 **Load unpacked**，选择：

```text
dist/convo-vault-extension
```

5. 在项目根目录启动本地后端：

```bash
npm run backend
```

6. 打开一个 ChatGPT 对话，点击 Convo Vault 扩展图标，选择 `Fast` 或 `Full`，选择消息，然后导出 bundle。

## Useful Commands

```bash
npm run backend
npm run backend:check
npm run build:extension
npm test
npm run check
```

For extension exports, prefer the popup's **Copy Start** command instead of
starting the backend manually. Browser-origin requests are rejected unless the
backend was started with the popup's `CGCE_LOCAL_API_TOKEN`.

## Privacy

The normal export flow runs locally. The extension reads the current ChatGPT page in your browser and sends the captured payload to the local backend on `127.0.0.1` for rendering. No remote PDF service is used.

默认导出流程在本地运行。扩展读取你浏览器里当前打开的 ChatGPT 页面，并把捕获到的数据发送到 `127.0.0.1` 上的本地后端进行渲染，不使用远程 PDF 服务。

Runtime data is stored under `.convo-vault/` by default. This folder is ignored by Git.

运行时数据默认放在 `.convo-vault/`，这个目录不会被 Git 跟踪。

## Notes

- Fast mode may not include every Thinking detail if ChatGPT does not expose it through the API.
- Full mode is slower because it interacts with the live page.
- Generated media and uploaded attachments are best-effort exports and will keep improving.

- 如果 ChatGPT API 没暴露完整 Thinking，Fast 模式不一定能导出全部思考过程。
- Full 模式会和真实页面交互，所以速度更慢。
- 生成图片、上传附件等媒体内容目前是 best-effort 支持，后续会继续增强。
