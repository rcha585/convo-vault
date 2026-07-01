#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");
const { pathToFileURL } = require("url");
const { spawnSync } = require("child_process");

const MarkdownIt = require("markdown-it");
const hljs = require("highlight.js");
const { chromium } = require("playwright-core");

const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), "output", "pdf");
const DEFAULT_HTML_DIR = path.resolve(process.cwd(), "tmp", "advanced-pdf");
const ASSET_DIR = path.resolve(__dirname, "assets");
const AVATAR_IMAGES = {
  user: loadPngDataUri("user.png"),
  assistant: loadPngDataUri("artificial-intelligence.png")
};
const FIRST_PAGE_TOC_ROWS = 54;
const CONTINUATION_TOC_ROWS = 88;

main().catch((error) => {
  console.error(`[advanced-pdf] ${error.stack || error.message || error}`);
  process.exit(1);
});

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.input) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const inputPath = path.resolve(args.input);
  const payload = loadExportPayload(inputPath);
  const title = cleanText(payload.title || "ChatGPT Conversation");
  const safeBase = sanitizeFilename(args.name || title || "chatgpt-conversation");
  const outputPath = path.resolve(args.out || path.join(DEFAULT_OUTPUT_DIR, `${safeBase}.pdf`));
  const htmlPath = path.resolve(args.html || path.join(DEFAULT_HTML_DIR, `${safeBase}.html`));

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });

  const html = buildDocumentHtml(payload);
  fs.writeFileSync(htmlPath, html, "utf8");

  if (args.htmlOnly) {
    console.log(`[advanced-pdf] HTML written: ${htmlPath}`);
    return;
  }

  await renderPdfWithChrome({
    htmlPath,
    outputPath,
    chromePath: args.chrome || findChromeExecutable()
  });

  const sizeMb = fs.statSync(outputPath).size / 1024 / 1024;
  console.log(`[advanced-pdf] PDF written: ${outputPath} (${sizeMb.toFixed(2)} MB)`);
  console.log(`[advanced-pdf] HTML source: ${htmlPath}`);
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--out" || arg === "-o") {
      args.out = argv[++index];
    } else if (arg === "--html") {
      args.html = argv[++index];
    } else if (arg === "--html-only") {
      args.htmlOnly = true;
    } else if (arg === "--chrome") {
      args.chrome = argv[++index];
    } else if (arg === "--name") {
      args.name = argv[++index];
    } else if (!args.input) {
      args.input = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node tools/advanced-pdf/render.js <export-debug-or-payload.json> [--out output.pdf] [--html output.html]

Options:
  --out, -o      PDF output path
  --html         Write the intermediate HTML to this path
  --html-only    Only generate HTML, do not print PDF
  --chrome       Explicit Chrome/Edge executable path
  --name         Output basename when --out/--html are omitted
`);
}

function loadExportPayload(inputPath) {
  const data = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const payload = data.exportPayload || data;
  const messages = Array.isArray(payload.messages)
    ? payload.messages
    : buildMessagesFromDiagnostics(data.messageDiagnostics || []);

  if (!messages.length) {
    throw new Error("No messages found. Export a fresh debug JSON with exporter 0.4.0 or later.");
  }

  return {
    schemaVersion: payload.schemaVersion || 0,
    exporterVersion: payload.exporterVersion || data.exporterVersion || "",
    title: payload.title || data.title || "ChatGPT Conversation",
    source: payload.source || data.pageUrl || "",
    exportedAt: payload.exportedAt || data.finishedAt || new Date().toISOString(),
    messages
  };
}

function buildMessagesFromDiagnostics(diagnostics) {
  return diagnostics.map((message, index) => ({
    id: message.id || `diagnostic-${index + 1}`,
    role: message.role || "unknown",
    order: message.order ?? index,
    timestamp: message.timestamp || "",
    markdown: message.markdownPreview || "",
    thinkingMarkdown: message.thinkingPreview || "",
    preview: message.markdownPreview || "",
    codeBlockCount: message.codeBlockCount || 0,
    fileCount: message.fileCount || 0,
    imageCount: message.imageCount || 0
  }));
}

function buildDocumentHtml(payload) {
  const md = createMarkdownRenderer();
  const messages = payload.messages.map((message, index) => normalizeMessage(message, index));
  const exportedAt = formatDateTime(payload.exportedAt);
  const imageRegistry = buildImageRegistry(messages);
  const tocRows = buildTocRows(messages);

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(payload.title)}</title>
  <style>${buildCss()}</style>
</head>
<body>
  ${renderIntroPages(payload, messages, exportedAt, tocRows)}

  <main class="conversation">
    ${messages.map((message, index) => renderMessage(md, message, index, imageRegistry)).join("\n")}
  </main>

  <script>${buildPaginationScript()}</script>
  ${renderImageGallery(imageRegistry.items)}
</body>
</html>`;
}

function renderIntroPages(payload, messages, exportedAt, tocRows) {
  return chunkTocRows(tocRows).map((rows, index) => {
    const isFirst = index === 0;
    return `<section class="intro-sheet ${isFirst ? "intro-sheet-first" : "intro-sheet-continuation"} page-break-after">
      ${isFirst ? renderCoverCard(payload, messages, exportedAt) : ""}
      ${renderTocCard(rows, index)}
    </section>`;
  }).join("\n");
}

function renderCoverCard(payload, messages, exportedAt) {
  return `<div class="cover-card">
    <div class="cover-rule"></div>
    <h1>${escapeHtml(payload.title)}</h1>
    <p>Exported ${escapeHtml(exportedAt)} | ${messages.length} messages | ChatGPT conversation</p>
    ${payload.source ? `<p class="source">Source: <a href="${escapeAttr(payload.source)}">${escapeHtml(payload.source)}</a></p>` : ""}
  </div>`;
}

function renderTocCard(rows, sectionIndex) {
  const title = sectionIndex === 0 ? "Contents" : "Contents (continued)";
  return `<section class="toc">
    <h2>${title}</h2>
    <div class="toc-grid">
      ${rows.map((row) => renderTocRow(row)).join("")}
    </div>
  </section>`;
}

function renderTocRow(row) {
  return `
        <a class="toc-row ${row.kind} ${row.hasThinking ? "has-thinking" : ""}" href="#${escapeAttr(row.id)}">
          <span class="toc-label">${escapeHtml(row.label)}</span>
          <span class="toc-meta">
            ${row.hasThinking ? `<span class="toc-chip" aria-label="Thinking"></span>` : ""}
            <span class="toc-type">${escapeHtml(row.type)}</span>
          </span>
        </a>`;
}

function chunkTocRows(rows) {
  const chunks = [];
  let index = 0;

  chunks.push(rows.slice(index, FIRST_PAGE_TOC_ROWS));
  index += FIRST_PAGE_TOC_ROWS;

  while (index < rows.length) {
    chunks.push(rows.slice(index, index + CONTINUATION_TOC_ROWS));
    index += CONTINUATION_TOC_ROWS;
  }

  return chunks;
}

function createMarkdownRenderer() {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: false,
    breaks: false,
    highlight(code, language) {
      const lang = normalizeLanguage(language);
      const highlighted = lang && hljs.getLanguage(lang)
        ? hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
        : hljs.highlightAuto(code).value;
      const label = lang ? `<div class="code-label">${escapeHtml(lang)}</div>` : "";
      return `${label}<pre class="hljs"><code>${highlighted}</code></pre>`;
    }
  });

  const defaultLinkOpen = md.renderer.rules.link_open || renderToken;
  md.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const hrefIndex = token.attrIndex("href");
    if (hrefIndex >= 0) {
      const href = token.attrs[hrefIndex][1];
      token.attrSet("href", href);
      token.attrSet("target", "_blank");
      token.attrSet("rel", "noopener noreferrer");
    }
    return defaultLinkOpen(tokens, index, options, env, self);
  };

  md.renderer.rules.image = (tokens, index, options, env) => {
    const token = tokens[index];
    const src = token.attrGet("src") || "";
    const alt = token.content || token.attrGet("alt") || "image";
    const registry = env?.imageRegistry;
    const asset = registry?.bySrc?.get(src);

    if (!src.startsWith("data:image/") && !src.startsWith("file:")) {
      return `<span class="attachment-chip image-chip">Image: ${escapeHtml(alt)}</span>`;
    }

    const figure = `<figure class="inline-image"><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"><figcaption>${escapeHtml(alt)}</figcaption></figure>`;
    return asset
      ? `<a class="inline-image-link" href="#${escapeAttr(asset.id)}">${figure}</a>`
      : figure;
  };

  return md;
}

function renderToken(tokens, index, options, env, self) {
  return self.renderToken(tokens, index, options);
}

function renderMessage(md, message, index, imageRegistry) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const anchorId = getMessageAnchorId(message, index);
  const time = message.timestamp ? `<time>${escapeHtml(message.timestamp)}</time>` : "";
  const content = renderMessageMarkdown(md, isUser ? stripLeadingAttachmentLines(message.markdown) : message.markdown, imageRegistry);
  const thinking = isAssistant && message.thinkingMarkdown
    ? renderThinking(md, message.thinkingMarkdown, imageRegistry)
    : "";

  if (isUser) {
    return `<article id="${escapeAttr(anchorId)}" class="message user-message">
      <div class="user-stack">
        ${renderUserAvatar()}
        ${renderAttachmentLead(message.markdown, imageRegistry)}
        <div class="bubble user-bubble">${content}</div>
        ${time ? `<div class="message-time user-time">${time}</div>` : ""}
      </div>
    </article>`;
  }

  return `<article id="${escapeAttr(anchorId)}" class="message assistant-message">
    <div class="assistant-header">
      ${renderAssistantAvatar()}
    </div>
    <div class="assistant-body">
      ${thinking}
      <div class="assistant-content">${content}</div>
      ${time ? `<div class="message-time assistant-time">${time}</div>` : ""}
    </div>
  </article>`;
}

function renderUserAvatar() {
  return `<div class="avatar user-avatar" aria-label="User">
    ${renderAvatarImage(AVATAR_IMAGES.user, "User")}
  </div>`;
}

function renderAssistantAvatar() {
  return `<div class="assistant-avatar" aria-label="Assistant">
    ${renderAvatarImage(AVATAR_IMAGES.assistant, "ChatGPT")}
  </div>`;
}

function renderAvatarImage(src, alt) {
  return src
    ? `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}">`
    : `<span class="avatar-fallback">${escapeHtml(alt.slice(0, 2))}</span>`;
}

function renderThinking(md, thinkingMarkdown, imageRegistry) {
  return `<section class="thinking">
    <h3>Thinking</h3>
    <div class="thinking-body markdown-body">${md.render(cleanMarkdownForHtml(thinkingMarkdown), { imageRegistry })}</div>
  </section>`;
}

function renderMessageMarkdown(md, markdown, imageRegistry) {
  const cleaned = cleanMarkdownForHtml(markdown || "_No text content found._");
  return `<div class="markdown-body">${md.render(cleaned, { imageRegistry })}</div>`;
}

function buildPaginationScript() {
  return `
(() => {
  const CONTENT_HEIGHT = 1014;
  const HALF_PAGE = CONTENT_HEIGHT * 0.55;

  function outerHeight(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const marginTop = Number.parseFloat(style.marginTop) || 0;
    const marginBottom = Number.parseFloat(style.marginBottom) || 0;
    return rect.height + marginTop + marginBottom;
  }

  function advancePage(y, height, canSplit) {
    if (!canSplit && y > 0 && y + height > CONTENT_HEIGHT) {
      y = 0;
    }

    if (!canSplit || y + height <= CONTENT_HEIGHT) {
      return y + height >= CONTENT_HEIGHT ? (y + height) % CONTENT_HEIGHT : y + height;
    }

    return (height - (CONTENT_HEIGHT - y)) % CONTENT_HEIGHT;
  }

  window.applyConversationPageBreaks = () => {
    const messages = Array.from(document.querySelectorAll(".conversation > .message"));
    let y = 0;

    for (const message of messages) {
      message.classList.remove("force-page-before");
    }

    messages.forEach((message, index) => {
      const isUser = message.classList.contains("user-message");
      const isAssistant = message.classList.contains("assistant-message");
      const height = Math.min(Math.max(outerHeight(message), 1), CONTENT_HEIGHT * 8);

      if (message.classList.contains("force-page-before") && y > 0) {
        y = 0;
      }

      y = advancePage(y, height, !isUser);

      const next = messages[index + 1];
      if (isAssistant && next?.classList.contains("user-message") && y > HALF_PAGE) {
        next.classList.add("force-page-before");
        y = 0;
      }
    });
  };

  window.addEventListener("load", () => {
    window.applyConversationPageBreaks();
  });
})();`;
}

function renderAttachmentLead(markdown, imageRegistry) {
  const attachments = extractLeadingAttachments(markdown);

  if (!attachments.length) {
    return "";
  }

  return `<div class="user-attachments">${attachments.map((item) => {
    const typeClass = item.type === "file" ? "file" : "image";
    const asset = item.type === "image" ? imageRegistry?.bySrc?.get(item.url) : null;
    const content = asset
      ? `<span class="attachment-thumb"><img src="${escapeAttr(item.url)}" alt="${escapeAttr(item.label)}"></span>`
      : `<span class="attachment-icon">${item.type === "file" ? getFileExtensionLabel(item.label) : "IMG"}</span>`;
    const card = `<span class="attachment-card ${typeClass} ${asset ? "with-thumb image-preview-card" : ""}">
      ${content}
      <span class="attachment-name">${escapeHtml(item.label)}</span>
    </span>`;
    return asset
      ? `<a class="attachment-card-link" href="#${escapeAttr(asset.id)}">${card}</a>`
      : card;
  }).join("")}</div>`;
}

function extractLeadingAttachments(markdown) {
  const lines = String(markdown || "").split(/\r?\n/).slice(0, 6);
  const result = [];

  for (const line of lines) {
    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    const file = line.match(/^\[File:\s*([^\]]+)\]/i);

    if (image) {
      result.push({ type: "image", label: image[1] || "Image", url: image[2] || "" });
    } else if (file) {
      result.push({ type: "file", label: file[1] || "Attachment" });
    }
  }

  return result.slice(0, 4);
}

function buildTocRows(messages) {
  const rows = [];

  messages.forEach((message, index) => {
    const label = getMessageLabel(message, index);
    rows.push({
      id: getMessageAnchorId(message, index),
      kind: message.role || "message",
      type: formatRole(message.role),
      label,
      hasThinking: Boolean(message.thinkingMarkdown)
    });
  });

  return rows;
}

function buildImageRegistry(messages) {
  const bySrc = new Map();
  const items = [];

  messages.forEach((message, messageIndex) => {
    for (const image of extractMarkdownImages(`${message.markdown || ""}\n${message.thinkingMarkdown || ""}`)) {
      if (!image.src.startsWith("data:image/") || bySrc.has(image.src)) {
        continue;
      }

      const item = {
        id: `asset-image-${items.length + 1}`,
        src: image.src,
        alt: image.alt || `Image ${items.length + 1}`,
        messageNumber: messageIndex + 1
      };
      bySrc.set(image.src, item);
      items.push(item);
    }
  });

  return { bySrc, items };
}

function extractMarkdownImages(markdown) {
  const images = [];
  const pattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let match;

  while ((match = pattern.exec(String(markdown || "")))) {
    images.push({
      alt: match[1] || "image",
      src: match[2] || ""
    });
  }

  return images;
}

function renderImageGallery(items) {
  if (!items.length) {
    return "";
  }

  return `<section class="image-gallery page-break-before">
    <h2>Image Attachments</h2>
    ${items.map((item, index) => `
      <figure id="${escapeAttr(item.id)}" class="image-detail ${index < items.length - 1 ? "page-break-after" : ""}">
        <img src="${escapeAttr(item.src)}" alt="${escapeAttr(item.alt)}">
        <figcaption>${escapeHtml(item.alt)} · message ${item.messageNumber}</figcaption>
      </figure>`).join("")}
  </section>`;
}

function getFileExtensionLabel(filename) {
  const extension = String(filename || "")
    .split(/[?#]/)[0]
    .match(/\.([a-z0-9]{1,5})$/i)?.[1];
  return (extension || "FILE").slice(0, 4).toUpperCase();
}

function normalizeMessage(message, index) {
  return {
    ...message,
    id: message.id || `message-${index + 1}`,
    role: String(message.role || "message").toLowerCase(),
    markdown: String(message.markdown || ""),
    thinkingMarkdown: String(message.thinkingMarkdown || "")
  };
}

function getMessageAnchorId(message, index) {
  return `message-${index + 1}-${slugify(message.id || message.role || "turn")}`;
}

function getMessageLabel(message, index) {
  const markdownSource = stripLeadingAttachmentLines(cleanMarkdownForHtml(message.markdown || ""));
  const source = markdownSource || cleanMarkdownForHtml(message.preview || message.thinkingMarkdown || "");
  const text = stripMarkdown(source).replace(/\s+/g, " ").trim();
  return `${index + 1}. ${text.slice(0, 86) || formatRole(message.role)}`;
}

function getThinkingLabel(markdown) {
  const firstHeading = String(markdown || "").split(/\r?\n/).find((line) => /^\s*(?:[-*+]\s+)?#{0,6}\s*\S/.test(line));
  return stripMarkdown(firstHeading || markdown).replace(/\s+/g, " ").trim().slice(0, 86) || "Thinking";
}

function formatRole(role) {
  const value = String(role || "Message").toLowerCase();
  if (value === "assistant") return "ChatGPT";
  if (value === "user") return "User";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function cleanMarkdownForHtml(markdown) {
  return String(markdown || "")
    .replace(/\r\n?/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/!\[(image-\d+|Image-\d+)\]\((https?:\/\/[^)]+)\)\s*/gi, "")
    .replace(/\[Image:\s*([^\]]+)\]\((https?:\/\/[^)]+)\)/gi, "[$1]($2)")
    .trim();
}

function stripLeadingAttachmentLines(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      index += 1;
      continue;
    }

    if (/^!\[[^\]]*]\([^)]+\)$/.test(line) || /^\[File:\s*[^\]]+]/i.test(line)) {
      index += 1;
      continue;
    }

    break;
  }

  return lines.slice(index).join("\n");
}

function stripMarkdown(markdown) {
  return String(markdown || "")
    .replace(/```[\s\S]*?```/g, " code ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~|-]/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeLanguage(language) {
  const value = String(language || "").trim().toLowerCase();
  const aliases = {
    js: "javascript",
    ts: "typescript",
    py: "python",
    sh: "bash",
    shell: "bash",
    ps: "powershell",
    ps1: "powershell",
    yml: "yaml"
  };
  return aliases[value] || value;
}

async function renderPdfWithChrome({ htmlPath, outputPath, chromePath }) {
  if (!chromePath) {
    throw new Error("Chrome or Edge was not found. Pass --chrome <path-to-chrome.exe>.");
  }

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true
  });

  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlPath).href, {
      waitUntil: "load",
      timeout: 60_000
    });
    await page.emulateMedia({ media: "print" });
    await page.evaluate(async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      window.applyConversationPageBreaks?.();
    });
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      preferCSSPageSize: true,
      margin: {
        top: "54px",
        right: "46px",
        bottom: "54px",
        left: "46px"
      },
      headerTemplate: `<div style="width:100%;font-size:8px;color:#6b7280;padding:0 46px;font-family:Arial,sans-serif;display:flex;justify-content:space-between;"><span></span><span></span></div>`,
      footerTemplate: `<div style="width:100%;font-size:9px;color:#6b7280;padding:0 46px;font-family:Arial,sans-serif;display:flex;justify-content:center;gap:4px;"><span>Page</span><span class="pageNumber"></span><span>/</span><span class="totalPages"></span></div>`
    });
  } finally {
    await browser.close();
  }
}

function findChromeExecutable() {
  const candidates = [
    process.env.CGCE_RENDER_BROWSER_PATH,
    process.env.CHROME_PATH,
    process.env.HUAWEI_BROWSER_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge"
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function buildCss() {
  return `
@page {
  size: A4;
  margin: 54px 46px;
}

* {
  box-sizing: border-box;
}

html {
  color-scheme: light;
}

body {
  margin: 0;
  color: #111827;
  background: #ffffff;
  font-family: Inter, "Noto Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", "PingFang SC", "Segoe UI", Arial, sans-serif;
  font-size: 13px;
  line-height: 1.62;
  letter-spacing: 0;
}

a {
  color: #2563eb;
  text-decoration: underline;
  text-decoration-thickness: .06em;
  text-underline-offset: .16em;
}

.page-break-after {
  break-after: page;
}

.page-break-before {
  break-before: page;
}

.intro-sheet {
  break-after: page;
}

.cover-card {
  margin: 8px 0 16px;
  padding: 20px 24px 21px;
  border: 1px solid #d8dee8;
  border-radius: 10px;
  background: #f8fbff;
  position: relative;
}

.cover-rule {
  height: 4px;
  background: #10a37f;
  border-radius: 999px;
  margin: -20px -6px 17px;
}

.cover-card h1 {
  margin: 0 0 8px;
  font-size: 27px;
  line-height: 1.18;
  font-weight: 800;
  color: #111827;
}

.cover-card p {
  margin: 4px 0;
  color: #6b7280;
}

.source {
  overflow-wrap: anywhere;
}

.toc {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 15px 18px 15px;
  background: #ffffff;
}

.intro-sheet-continuation .toc {
  margin-top: 8px;
}

.toc h2 {
  margin: 0 0 10px;
  font-size: 18px;
  line-height: 1.25;
}

.toc-grid {
  column-count: 2;
  column-gap: 26px;
}

.toc-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
  break-inside: avoid;
  min-height: 16px;
  padding: 2.5px 0;
  color: #334155;
  text-decoration: none;
  border-bottom: 1px dotted #dbe3ed;
  font-size: 10.9px;
  line-height: 1.22;
}

.toc-row.thinking {
  color: #7c3aed;
}

.toc-row.assistant {
  color: #2563eb;
}

.toc-row.has-thinking .toc-label::after {
  content: "";
  display: inline-block;
  width: 5px;
  height: 5px;
  margin-left: 5px;
  border-radius: 50%;
  background: #8b5cf6;
  vertical-align: middle;
}

.toc-row .toc-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toc-meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #8a94a6;
  white-space: nowrap;
}

.toc-chip {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #8b5cf6;
  display: inline-block;
}

.toc-type {
  color: #8a94a6;
  font-size: 9.5px;
}

.conversation {
  padding-top: 2px;
}

.message {
  margin: 0;
}

.user-message {
  display: flex;
  justify-content: flex-end;
  break-inside: avoid;
  margin: 0 0 9px;
}

.user-stack {
  width: min(78%, 560px);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.avatar,
.assistant-avatar {
  width: 25px;
  height: 25px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.avatar img,
.assistant-avatar img {
  width: 25px;
  height: 25px;
  object-fit: contain;
  display: block;
}

.avatar-fallback {
  font-size: 9px;
  font-weight: 800;
  color: #111827;
}

.user-avatar {
  align-self: flex-end;
}

.bubble {
  width: fit-content;
  max-width: 100%;
  padding: 10px 15px;
  border-radius: 18px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
}

.user-bubble {
  border-bottom-right-radius: 6px;
}

.message-time {
  color: #a0a7b2;
  font-size: 10px;
  font-style: italic;
}

.assistant-message {
  display: block;
  break-inside: auto;
  margin: 0 0 18px;
}

.user-message.force-page-before {
  break-before: page;
}

.assistant-header {
  margin: 0 0 7px;
  display: flex;
  justify-content: flex-start;
}

.assistant-avatar {
  opacity: .9;
}

.assistant-body {
  min-width: 0;
}

.assistant-content {
  padding-top: 1px;
}

.thinking {
  margin: 0 0 14px;
  padding: 14px 16px;
  border: 1px solid #d4dce8;
  border-left: 4px solid #8b5cf6;
  border-radius: 9px;
  background: #faf8ff;
  break-inside: auto;
}

.thinking h3 {
  margin: 0 0 8px;
  font-size: 15px;
  line-height: 1.25;
  color: #4c1d95;
  font-weight: 800;
}

.thinking .markdown-body {
  color: #4b5563;
  font-size: 12px;
}

.thinking ul {
  position: relative;
}

.markdown-body {
  overflow-wrap: anywhere;
}

.markdown-body > :first-child {
  margin-top: 0;
}

.markdown-body > :last-child {
  margin-bottom: 0;
}

.markdown-body p {
  margin: 0 0 10px;
}

.markdown-body strong {
  font-weight: 800;
  color: #0f172a;
}

.markdown-body em {
  font-style: italic;
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4 {
  margin: 17px 0 8px;
  line-height: 1.32;
  color: #0f172a;
  break-after: avoid;
}

.markdown-body h1 { font-size: 21px; }
.markdown-body h2 { font-size: 18px; border-top: 1px solid #e5e7eb; padding-top: 14px; }
.markdown-body h3 { font-size: 15px; }
.markdown-body h4 { font-size: 13px; }

.markdown-body ul,
.markdown-body ol {
  margin: 8px 0 12px 22px;
  padding: 0;
}

.markdown-body li {
  margin: 4px 0;
  padding-left: 2px;
}

.markdown-body blockquote {
  margin: 12px 0;
  padding: 8px 12px 8px 14px;
  border-left: 4px solid #d7dde5;
  background: #f8fafc;
  color: #1f2937;
  font-style: italic;
  break-inside: avoid;
}

.markdown-body code {
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: .9em;
  padding: 1px 4px;
  border-radius: 4px;
  background: #eef2f7;
}

.markdown-body pre {
  margin: 12px 0 14px;
  padding: 14px 16px;
  border-radius: 8px;
  background: #f6f8fa;
  border: 1px solid #edf1f5;
  overflow: hidden;
  white-space: pre-wrap;
  break-inside: avoid;
}

.markdown-body pre code {
  display: block;
  padding: 0;
  background: transparent;
  font-size: 11px;
  line-height: 1.55;
  white-space: pre-wrap;
}

.code-label {
  margin: 12px 0 -12px;
  padding: 3px 10px;
  border-radius: 8px 8px 0 0;
  background: #e8edf5;
  color: #64748b;
  font-family: "Cascadia Mono", Consolas, monospace;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
}

.markdown-body table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0 16px;
  font-size: 11.5px;
  break-inside: avoid;
}

.markdown-body th,
.markdown-body td {
  border: 1px solid #dbe3ed;
  padding: 7px 8px;
  vertical-align: top;
}

.markdown-body th {
  background: #f1f5f9;
  font-weight: 800;
  color: #111827;
}

.markdown-body tr:nth-child(even) td {
  background: #fbfdff;
}

.inline-image {
  margin: 10px 0;
  break-inside: avoid;
}

.inline-image-link,
.attachment-card-link {
  color: inherit;
  text-decoration: none;
}

.inline-image img {
  display: block;
  max-width: 100%;
  max-height: 520px;
  border: 1px solid #dbe3ed;
  border-radius: 10px;
  object-fit: contain;
}

.inline-image figcaption {
  margin-top: 4px;
  font-size: 10px;
  color: #7b8494;
}

.user-attachments {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.attachment-card {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 210px;
  max-width: 350px;
  padding: 8px 12px;
  border: 1px solid #e0e5ec;
  border-radius: 10px;
  background: #ffffff;
}

.attachment-card.with-thumb {
  min-width: 0;
  width: min(285px, 100%);
  max-width: 285px;
  padding: 8px;
  flex-direction: column;
  align-items: stretch;
  gap: 7px;
}

.attachment-thumb {
  width: 100%;
  max-height: 260px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #dbeafe;
  background: #f8fafc;
  flex: 0 0 auto;
  display: block;
}

.attachment-thumb img {
  width: 100%;
  height: auto;
  max-height: 260px;
  object-fit: contain;
  display: block;
}

.attachment-icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: #fee2e2;
  color: #ef4444;
  font-size: 8px;
  font-weight: 800;
}

.attachment-card.image .attachment-icon {
  background: #dbeafe;
  color: #2563eb;
}

.attachment-name {
  min-width: 0;
  color: #111827;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-card.with-thumb .attachment-name {
  color: #64748b;
  font-size: 10.5px;
  font-weight: 650;
}

.attachment-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: #eef2f7;
  color: #475569;
  font-size: 10.5px;
  font-weight: 650;
}

.image-gallery {
  padding-top: 6px;
}

.image-gallery h2 {
  margin: 0 0 18px;
  font-size: 19px;
  line-height: 1.25;
  color: #0f172a;
}

.image-detail {
  margin: 0;
  min-height: 690px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  break-inside: avoid;
}

.image-detail img {
  display: block;
  max-width: 100%;
  max-height: 650px;
  margin: 0 auto;
  object-fit: contain;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  background: #f8fafc;
}

.image-detail figcaption {
  margin-top: 8px;
  text-align: center;
  color: #64748b;
  font-size: 10.5px;
}

.hljs {
  color: #24292f;
  background: #f6f8fa;
}

.hljs-keyword,
.hljs-selector-tag,
.hljs-built_in {
  color: #cf22d5;
}

.hljs-string,
.hljs-attr {
  color: #1a7f37;
}

.hljs-number,
.hljs-literal {
  color: #0969da;
}

.hljs-title,
.hljs-function {
  color: #0969da;
}

.hljs-comment {
  color: #6e7781;
}

.hljs-variable,
.hljs-params {
  color: #953800;
}
`;
}

function sanitizeFilename(value) {
  return cleanText(value)
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 96) || "chatgpt-conversation";
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "turn";
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function loadPngDataUri(filename) {
  try {
    const bytes = fs.readFileSync(path.join(ASSET_DIR, filename));
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch (_) {
    return "";
  }
}

function formatDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return cleanText(value);
  }

  return date.toLocaleString();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
