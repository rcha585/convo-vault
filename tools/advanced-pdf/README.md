# Advanced PDF Renderer

Local high-quality PDF renderer for ChatGPT Conversation Exporter.

This is the v0.4.x direction: the Chrome extension keeps extracting structured
conversation data, while this local renderer turns that data into a polished,
real-text PDF using the local Chrome/Edge print engine.

## Why This Exists

The in-extension PDF writer is useful as a lightweight fallback, but high-quality
CJK typography, Markdown tables, code blocks, links, images, and pagination are
better handled by a browser layout engine. This renderer keeps the data local and
avoids a remote PDF service.

## Install

From this directory:

```powershell
pnpm install
```

The `.npmrc` file sets `node-linker=hoisted` because some removable/exFAT drives
do not support pnpm symlinks.

## Render

Export a fresh debug JSON from the extension with exporter `0.4.2` or later, then:

```powershell
node tools\advanced-pdf\render.js path\to\export-debug.json --out output\pdf\conversation.pdf
```

You can also save the intermediate HTML:

```powershell
node tools\advanced-pdf\render.js path\to\export-debug.json --out output\pdf\conversation.pdf --html tmp\conversation.html
```

## Local Renderer Service

For the extension's visible `Markdown` and `PDF` export options, start the local
service first:

```powershell
cd tools\advanced-pdf
pnpm run server
```

The service listens only on `127.0.0.1:38474` by default. It exposes:

- `GET /health` - quick availability check.
- `POST /render-pdf` - accepts an `exportPayload` JSON object and returns a PDF
  binary.
- `POST /render-markdown` - accepts the same `exportPayload` and returns a
  cleaned Markdown document.
- `POST /capture-render-pdf` - opens the conversation in an independent local
  Edge profile, captures it, then renders PDF. If capture fails and the request
  includes an extension payload, it falls back to that payload and returns
  `X-Capture-Warning`.
- `POST /capture-render-markdown` - same backend capture path, returning
  Markdown.

You can change the port with:

```powershell
$env:CGCE_ADVANCED_PDF_PORT=38475
pnpm run server
```

If the port is changed, update `ADVANCED_PDF_RENDERER_URL` in `content.js`.

The renderer defaults to local Chrome/Edge. To try another Chromium-compatible
browser, set its executable path before starting the service:

```powershell
$env:CGCE_RENDER_BROWSER_PATH="C:\Path\To\Browser.exe"
pnpm run server
```

Huawei Browser can be used this way if the installed build supports Chromium
headless printing or Playwright-compatible launch behavior.

## Backend Edge Capture

The current `0.4.2` path can use Microsoft Edge as an independent backend
capture browser. This avoids moving the ChatGPT page the user is actively
reading.

Default local cache/profile location:

```powershell
D:\Programs\ChatGPTConversationExporter
```

Override it with:

```powershell
$env:CGCE_CACHE_DIR="D:\Programs\ChatGPTConversationExporter"
```

Override Edge path with:

```powershell
$env:CGCE_EDGE_PATH="C:\Program Files\Microsoft\Edge\Application\msedge.exe"
```

The first backend capture may open a separate Edge window. Sign into ChatGPT in
that window once; the login is stored in the local backend profile under
`CGCE_CACHE_DIR`.

## Current Scope

- Uses backend Edge capture when the extension sends a conversation URL.
- Uses structured `exportPayload.messages` as a fallback when backend capture is
  not available yet.
- Falls back to old `messageDiagnostics` previews for smoke tests.
- Renders real text through Chrome/Skia PDF, not page screenshots.
- Preserves Markdown structure, tables, links, blockquotes, lists, code blocks,
  user bubbles, assistant replies, Thinking sections, attachment cards, and page
  numbers.
- Provides a backend Markdown endpoint so PDF, Markdown, and future Obsidian
  export can share the same structured payload.

## Next Integration Step

The extension now keeps only two visible export choices, `Markdown` and `PDF`.
Both post the selected structured messages to the localhost service. The next
packaging step is to turn this service into either a Native Messaging helper or
a small local desktop companion so users do not have to start it manually.

The same `exportPayload` can also become the stable source for:

- Obsidian Markdown vault export.
- Full-conversation archives.
- Keyword/entity indexes.
- Searchable JSONL datasets for later analysis.
