# ChatGPT Conversation Exporter

Local-first Chrome extension for exporting the current ChatGPT conversation as a
portable archive. This is an alpha learning project: it favors transparency,
debuggability, and local processing over store-ready polish.

Version `0.6.0` adds two capture modes and a single bundle export:

- `Fast` - reads the current conversation through ChatGPT's signed-in
  conversation JSON endpoint, then converts the active branch into the local
  export schema. This is much faster, but it may miss some UI-only details.
- `Full` - uses the older virtualization-aware DOM scan, including scroll
  walking, hydration, and missing-turn recovery. This is slower but more
  faithful when the page contains details that the API payload does not expose.

Every export downloads one `.zip` bundle containing Markdown, PDF, payload JSON,
JSONL messages, QA pairs, topic/entity sidecars, and a summary file.

## Status

This project is not a polished alternative to mature exporters yet. It is a
local research/workflow tool for:

- reliable long-conversation capture experiments,
- true-text PDF rendering,
- Markdown archives,
- future Obsidian/RAG-friendly sidecars.

Known tradeoffs:

- ChatGPT's internal web API and DOM can change without notice.
- `Fast` mode depends on the current logged-in ChatGPT page.
- `Full` mode can still be slow on very large or heavily virtualized chats.
- Images and attachments are best-effort.
- The extension still requests broad image-fetching host permission for PDF
  previews; this should move further into the local backend over time.

## Files

- `manifest.json` - MV3 extension manifest.
- `popup.html`, `popup.css`, `popup.js` - popup, local backend settings, health
  checks, and startup-command generation.
- `content.js` - ChatGPT page access, Fast/Full capture, message selector, and
  bundle download handoff.
- `background.js` - image-fetch helper used by PDF export.
- `tools/advanced-pdf/` - local renderer service and PDF/data pipeline.
- `scripts/` - PowerShell helpers for starting and checking the local backend.

## Load In Chrome

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository folder.
5. Open a conversation on `https://chatgpt.com` or `https://chat.openai.com`.
6. Click the extension icon.
7. Set the backend folder, save settings, and copy the start command.
8. Start the local backend in PowerShell.
9. Click **Export**, choose `Fast` or `Full`, adjust message selection, then
   export the bundle.

## First-Time Local Setup

Install the local renderer once:

```powershell
cd tools\advanced-pdf
pnpm install
```

The popup stores these settings in `chrome.storage.local`:

- backend folder - the repository folder containing `scripts\`.
- port - default `38474`.
- cache folder - optional; defaults to
  `%LOCALAPPDATA%\ChatGPTConversationExporter` on Windows.
- browser path - optional path to a Chromium-compatible browser executable.

The extension cannot directly launch a local process by itself. The popup
generates a PowerShell start command from the saved settings.

You can also start the backend from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-local-backend.ps1
```

Start it hidden in the background:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-local-backend-detached.ps1
```

Check whether it is reachable:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\check-local-backend.ps1
```

The backend listens on `http://127.0.0.1:38474` unless you choose another port.

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
- Split `content.js` into modules and bundle it for MV3.
- Add fixture-based tests for API parsing, Markdown normalization, data sidecars,
  and ZIP bundle creation.
- Add Obsidian vault export and RAG chunking from the canonical data schema.
