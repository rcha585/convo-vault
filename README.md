# Convo Vault

如果在 ChatGPT 里遇到一段值得长期保存的对话，怎么办？
如果担心把对话交给陌生云端工具会泄露隐私，怎么办？
如果长对话、代码块、表格、附件线索和思考过程只靠手动复制太痛苦，怎么办？

现在你有了 **Convo Vault**。

Convo Vault 是一个本地优先的 Chrome 扩展，专注于把当前 ChatGPT
对话导出成可以长期保存、检索和二次处理的本地档案。捕获、整理、渲染和打包都在你自己的机器上完成：
对话内容不需要上传到第三方服务，也不需要交给陌生的在线转换器。

这个工具的目标很简单：让重要对话从浏览器里的临时页面，变成你真正拥有的 Markdown、PDF、JSONL
和结构化数据包。它适合做个人知识库、项目记录、研究材料、代码问答归档，以及未来接入
Obsidian 或 RAG 流程的本地资料源。

当前版本 `0.6.1` 已经有两种捕获模式，并统一导出为一个便携的 `.zip` 包。本版还补上了跨平台 Node 脚本、基础测试入口和 GitHub Actions CI，让后续版本更新更稳。

- `Fast` - 通过当前已登录的 ChatGPT 页面读取对话 JSON，把当前活跃分支快速转换成
  Convo Vault 的本地导出结构。它速度更快，适合日常保存。
- `Full` - 使用更细致的 DOM 扫描流程，包含滚动遍历、虚拟化内容加载和缺失消息恢复。
  它更慢，但在页面里有 API 没暴露的细节时会更忠实。

每次导出都会下载一个 `.zip` bundle，里面包含 Markdown、PDF、payload JSON、JSONL
messages、QA pairs、topic/entity sidecars 和 summary 文件。

## Status

Convo Vault 现在处在早期正式使用阶段：已经能支撑真实的本地工作流，同时仍然诚实地面对那些还在快速变化的部分。
它优先照顾隐私、透明度和可调试性，而不是急着做成一个商店级的漂亮外壳。

它目前专注于：

- 可靠捕获长对话，
- 渲染真正可复制、可搜索文本的 PDF，
- 生成适合长期保存的 Markdown 档案，
- 为未来的 Obsidian / RAG 工作流准备结构化 sidecar 数据。

目前已知取舍：

- ChatGPT 的内部网页 API 和 DOM 结构可能随时变化。
- `Fast` 模式依赖当前已经登录的 ChatGPT 页面。
- `Full` 模式在超长或高度虚拟化的对话中仍然可能比较慢。
- 图片和附件仍是 best-effort 支持。
- 扩展目前还会为了 PDF 预览请求较宽的图片抓取权限；后续会继续把这部分能力迁移到本地后端里。

## Files

- `manifest.json` - MV3 extension manifest.
- `popup.html`, `popup.css`, `popup.js` - popup, local backend settings, health
  checks, and startup-command generation.
- `content.js` - ChatGPT page access, Fast/Full capture, message selector, and
  bundle download handoff.
- `background.js` - image-fetch helper used by PDF export.
- `tools/advanced-pdf/` - local renderer service and PDF/data pipeline.
- `scripts/` - cross-platform Node helpers plus PowerShell compatibility wrappers.

## Build The Extension Package

Build a small extension-only folder and zip:

```bash
npm run build:extension
```

This creates:

- `dist\convo-vault-extension\` - load this folder with Chrome's **Load unpacked**.
- `dist\convo-vault-extension.zip` - archive/share this file, then unzip before
  loading as an unpacked extension.

Chrome development mode cannot load a zip directly with **Load unpacked**. The
zip is for distribution or backup; the unpacked folder is the convenient local
install target.

## Load In Chrome

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select `dist\convo-vault-extension\`.
5. Open a conversation on `https://chatgpt.com` or `https://chat.openai.com`.
6. Click the extension icon.
7. Set the backend folder, save settings, and copy the start command.
8. Start the local backend in PowerShell.
9. Click **Export**, choose `Fast` or `Full`, adjust message selection, then
   export the bundle.

## First-Time Local Setup

Install the local renderer dependencies once:

```bash
cd tools/advanced-pdf
pnpm install
```

From the repository root, the shared project commands are:

```bash
npm run check
npm test
npm run build:extension
npm run backend
```

The popup stores these settings in `chrome.storage.local`:

- backend folder - the repository folder containing `scripts/`.
- port - default `38474`.
- cache folder - optional; defaults to
  `.convo-vault` inside the repository.
- browser path - optional path to a Chromium-compatible browser executable.

The extension cannot directly launch a local process by itself. The popup
generates a start command for the current operating system from the saved
settings. The command uses the folder where you cloned this repository as the
backend root.

You can also start the backend from the repository root:

```bash
npm run backend
```

Start it hidden in the background:

```bash
npm run backend:detached
```

Check whether it is reachable:

```bash
npm run backend:check
```

The PowerShell scripts in `scripts/` remain available as Windows compatibility
wrappers, but the Node scripts are the primary cross-platform entrypoints.

The backend listens on `http://127.0.0.1:38474` unless you choose another port.

Runtime data stays under `.convo-vault/` by default. This directory is ignored
by Git and may contain browser profiles, exports, cached payloads, and other
private local data.

## Backend Endpoints

Stable extension flow:

- `GET /health`
- `POST /shutdown`
- `POST /render-bundle`
- `POST /render-markdown`
- `POST /render-pdf`
- `POST /render-data`

Experimental backend recapture flow:

- `POST /capture-render-pdf`
- `POST /capture-render-markdown`

The default extension flow captures from the current already signed-in ChatGPT
tab. The experimental backend recapture flow uses an independent browser profile
and may require a separate login.

## Bundle Contents

A bundle normally includes:

- `*.md`
- `*.pdf`
- `*.payload.json`
- `*.data.json`
- `*.conversation.json`
- `*.messages.jsonl`
- `*.qa-pairs.json`
- `*.topics.json`
- `*.entities.json`
- `*.summary.md`

If the debug-log checkbox is enabled, the extension downloads a separate
`*-debug.json` next to the bundle.

## Capture Strategy

`Fast` mode:

1. Reads the conversation id from the current URL.
2. Requests `/backend-api/conversation/{id}` with the current ChatGPT session.
3. Walks the active conversation branch from `current_node`.
4. Converts user/assistant messages into the shared export schema.
5. Sends the selected messages to the local backend bundle renderer.

`Full` mode:

1. Finds ChatGPT turn nodes in the current page.
2. Walks the real scroll container.
3. Hydrates virtualized turns by scrolling them into view.
4. Recovers missing turn numbers when possible.
5. Serializes mounted DOM content, code blocks, images, files, and Thinking
   flyouts where visible.

## Testing Checklist

1. Reload the unpacked extension after code changes.
2. Save popup settings and copy the generated start command.
3. Start the backend and confirm the popup reports it as running.
4. Export a short text-only conversation with `Fast`.
5. Export the same conversation with `Full`.
6. Confirm the downloaded zip opens and includes Markdown, PDF, and JSONL.
7. Test a conversation with code blocks and tables.
8. Test a long conversation and compare Fast vs Full message counts.
9. Enable debug log and confirm a separate `*-debug.json` downloads.

## Roadmap

- Make `Fast` mode enrich attachments and Thinking content with targeted DOM
  lookups.
- Move image fetching fully into the backend to reduce extension permissions.
- Add an asset manifest and local asset cache so AI-generated media can be
  preserved while repeated user uploads are deduplicated.
- Split `content.js` into modules and bundle it for MV3.
- Expand fixture-based tests for API parsing, Markdown normalization, data
  sidecars, and ZIP bundle creation.
- Add Obsidian vault export and RAG chunking from the canonical data schema.
