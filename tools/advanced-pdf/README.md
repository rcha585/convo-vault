# Advanced PDF Renderer

Local high-quality PDF renderer for ChatGPT Conversation Exporter.

This is the v0.5.x local backend rendering direction: the extension keeps the
page permission and selection UI, captures the currently open ChatGPT page, and
sends structured data to the local backend for Markdown or polished real-text
PDF output.

The backend also contains an experimental independent Edge recapture path. That
path is not the default extension flow because it uses a separate browser
profile and can require a separate ChatGPT login.

## Why This Exists

The earlier in-extension PDF writer has been removed. High-quality CJK
typography, Markdown tables, code blocks, links, images, and pagination are now
handled by this local browser layout engine. The renderer keeps the data local
and avoids a remote PDF service.

## Install

From this directory:

```powershell
pnpm install
```

The `.npmrc` file sets `node-linker=hoisted` because some removable/exFAT drives
do not support pnpm symlinks.

## Render

Export a fresh debug JSON from the extension with exporter `0.5.0` or later, then:

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
- `POST /shutdown` - stop the local renderer process.
- `POST /render-pdf` - accepts an `exportPayload` JSON object and returns a PDF
  binary.
- `POST /render-markdown` - accepts the same `exportPayload` and returns a
  cleaned Markdown document.
- `POST /render-data` - accepts the same `exportPayload` and returns a
  normalized JSON bundle for downstream processing.
- `POST /capture-render-pdf` - opens the conversation in an independent local
  Edge profile, captures it, then renders PDF. If capture fails and the request
  includes an extension payload, it falls back to that payload and returns
  `X-Capture-Warning`. This endpoint is experimental and should not be wired to
  the default export buttons yet.
- `POST /capture-render-markdown` - same backend capture path, returning
  Markdown. This endpoint is experimental.

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

The current `0.5.9` codebase can use Microsoft Edge as an independent backend
capture browser, but this remains experimental. It avoids moving the ChatGPT
page the user is actively reading, at the cost of a separate browser profile.

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

The first backend capture may open a separate Edge window and ask for ChatGPT
login. That login is stored in the local backend profile under `CGCE_CACHE_DIR`
and is separate from the browser tab where the extension runs.

## Current Scope

- Uses structured `exportPayload.messages` for the default Markdown/PDF export
  path.
- Keeps backend Edge capture endpoints available as an explicit experimental
  route.
- Falls back to old `messageDiagnostics` previews for smoke tests.
- Renders real text through Chrome/Skia PDF, not page screenshots.
- Preserves Markdown structure, tables, links, blockquotes, lists, code blocks,
  user bubbles, assistant replies, Thinking sections, attachment cards, and page
  numbers.
- Adds stable Turn numbers to message headings, table of contents entries,
  Markdown headings, and JSON payloads.
- Adds PDF outline/bookmarks from those headings with a local post-processing
  pass that targets the PDF's existing named destinations.
- Provides a backend Markdown endpoint so PDF, Markdown, and future Obsidian
  export can share the same structured payload.
- Provides a backend data endpoint and PDF sidecar files (`*.data.json`,
  `*.summary.md`) for later analytics, search indexes, QA-pair review, and
  archive workflows.

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
