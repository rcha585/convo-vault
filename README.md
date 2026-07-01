# ChatGPT Conversation Exporter

Personal-use Manifest V3 Chrome extension for exporting the current ChatGPT
conversation to Markdown or PDF.

The extension now has two visible export formats. Both are backed by the local
renderer when it is running:

- `Markdown` - asks the local service to capture the conversation in an
  independent Edge profile, then returns cleaned Markdown. If backend capture is
  unavailable, it temporarily falls back to the extension payload.
- `PDF` - uses the same backend capture path and returns a polished true-text
  PDF generated through the local Chrome/Edge print engine.

## Files

- `manifest.json` - MV3 manifest, popup, content script, and background helper registration.
- `popup.html`, `popup.css`, `popup.js` - Simple extension popup with the export button.
- `content.js` - ChatGPT page access, message selection, lightweight payload capture, and download handoff.
- `background.js` - Image-fetching helper used by PDF export to render image previews when ChatGPT image URLs are reachable.
- `tools/advanced-pdf/` - Local advanced renderer and localhost service.

## Load In Chrome

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `chatgpt-conversation-exporter`.
5. Open a conversation on `https://chatgpt.com` or `https://chat.openai.com`.
6. Click the extension icon, then click **Export**.
7. In the message selector, choose **Markdown** or **PDF**.

Chrome will show a broad host-permission warning because `<all_urls>` is
available for image-fetching helpers. Message scanning stays passive, while PDF
export may fetch image references at export time to render previews when
available.

## Local Backend Renderer

Install the local renderer once:

```powershell
cd tools\advanced-pdf
pnpm install
```

Start the local renderer before exporting **Markdown** or **PDF** in the extension:

```powershell
pnpm run server
```

Or from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-local-backend.ps1
```

To start it hidden in the background:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-local-backend-detached.ps1
```

Check whether it is reachable:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\check-local-backend.ps1
```

The service listens on `http://127.0.0.1:38474`. It receives the current
conversation URL, selected turn orders, and a fallback extension payload. It
first tries to capture the conversation in a separate local Edge profile, then
returns Markdown or PDF for the extension to download.

Backend cache and Edge profile default to:

```powershell
D:\Programs\ChatGPTConversationExporter
```

On the first backend capture, sign into ChatGPT in the separate Edge window.
That login remains in the local backend profile and does not touch the page you
already have open.

If the extension says `Local renderer is not running` or `Failed to fetch`, the
server is not listening on `127.0.0.1:38474`; backend capture has not started,
and the cache folder may not exist yet.

For command-line debugging with a fresh debug JSON:

```powershell
node tools\advanced-pdf\render.js path\to\export-debug.json --out output\pdf\conversation.pdf
```

## Testing Checklist

1. Test a short text-only conversation.
2. Test a conversation with fenced code blocks and confirm the exported Markdown keeps language hints.
3. Test a long conversation and confirm older messages are included.
4. Test Markdown export with uploaded or generated images and confirm image references are preserved as links.
5. Test a conversation with uploaded files and confirm file attachments are preserved as `[File: ...]` blocks.
6. Test PDF export with the local backend stopped and confirm the UI reports that the local renderer must be started.
7. Start `tools/advanced-pdf` with `pnpm run server`, choose **Markdown**, and confirm the downloaded Markdown comes from backend capture or includes an `X-Capture-Warning` fallback message.
8. Choose **PDF** and confirm the downloaded PDF is selectable/searchable text rather than a page screenshot.
9. Test a ChatGPT turn with an uploaded/generated image and confirm `button > img` attachments are preserved and rendered as PDF previews when fetchable.
10. Test a conversation with Thinking entries and confirm the debug log includes `features.autoOpenThinkingFlyouts: true` plus `thinkingFlyout.autoStart` / `thinkingFlyout.autoResult` events.
11. If a file exports with missing messages after a ChatGPT UI change, inspect the DOM for updated message containers and adjust `getCandidateMessageNodes`, `detectRole`, or `getMessageBody` in `content.js`.
