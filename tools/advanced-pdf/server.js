#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");
const { captureConversationWithEdge, findEdgeExecutable, getCacheRoot } = require("./capture");
const { buildAssetManifest } = require("./assets");

const HOST = "127.0.0.1";
const PORT = Number(process.env.CGCE_ADVANCED_PDF_PORT || 38474);
const MAX_BODY_BYTES = Number(process.env.CGCE_ADVANCED_PDF_MAX_BODY_BYTES || 90 * 1024 * 1024);
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const WORK_DIR = path.join(ROOT_DIR, "tmp", "advanced-pdf-server");
const RENDER_SCRIPT = path.join(__dirname, "render.js");

fs.mkdirSync(WORK_DIR, { recursive: true });

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    sendJson(response, 500, {
      ok: false,
      error: error.message || String(error)
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[advanced-pdf-server] Listening on http://${HOST}:${PORT}`);
  console.log("[advanced-pdf-server] Endpoints: GET /health, POST /shutdown, POST /render-pdf, POST /render-markdown, POST /render-data, POST /render-bundle, POST /capture-render-pdf, POST /capture-render-markdown");
});

async function handleRequest(request, response) {
  setCorsHeaders(request, response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url || "/", `http://${HOST}:${PORT}`);

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, {
      ok: true,
      renderer: "advanced-local-chrome",
      version: readPackageVersion(),
      cacheRoot: getCacheRoot(),
      edgePath: findEdgeExecutable() || null
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/shutdown") {
    handleShutdown(response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/render-pdf") {
    await handleRenderPdf(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/render-markdown") {
    await handleRenderMarkdown(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/render-data") {
    await handleRenderData(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/render-bundle") {
    await handleRenderBundle(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/capture") {
    await handleCapture(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/capture-render-pdf") {
    await handleCaptureRenderPdf(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/capture-render-markdown") {
    await handleCaptureRenderMarkdown(request, response);
    return;
  }

  sendJson(response, 404, {
    ok: false,
    error: "Not found"
  });
}

function handleShutdown(response) {
  sendJson(response, 200, {
    ok: true,
    shuttingDown: true
  });

  console.log("[advanced-pdf-server] Shutdown requested.");
  setTimeout(() => {
    server.close(() => {
      process.exit(0);
    });
  }, 150);
}

async function handleCapture(request, response) {
  const body = await readJsonBody(request);
  const payload = await capturePayloadFromRequest(body);
  sendJson(response, 200, {
    ok: true,
    payload
  });
}

async function handleCaptureRenderPdf(request, response) {
  const body = await readJsonBody(request);
  const captureResult = await capturePayloadFromRequest(body, {
    fallbackPayload: normalizePayload(body)
  });
  await renderPdfPayload(captureResult.payload || captureResult, body, response, captureResult.warning || "");
}

async function handleCaptureRenderMarkdown(request, response) {
  const body = await readJsonBody(request);
  const captureResult = await capturePayloadFromRequest(body, {
    fallbackPayload: normalizePayload(body)
  });
  await renderMarkdownPayload(captureResult.payload || captureResult, body, response, captureResult.warning || "");
}

async function handleRenderPdf(request, response) {
  const body = await readJsonBody(request);
  const payload = normalizePayload(body);

  if (!payload.messages.length) {
    sendJson(response, 400, {
      ok: false,
      error: "No messages were provided."
    });
    return;
  }

  await renderPdfPayload(payload, body, response);
}

async function renderPdfPayload(payload, body, response, captureWarning = "") {
  if (!payload.messages.length) {
    sendJson(response, 400, {
      ok: false,
      error: "No messages were provided."
    });
    return;
  }

  const baseName = sanitizeFilename(
    stripPdfExtension(body.fileName)
      || payload.title
      || "chatgpt-conversation"
  );
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const requestDir = path.join(WORK_DIR, id);
  fs.mkdirSync(requestDir, { recursive: true });

  const jsonPath = path.join(requestDir, `${baseName}.json`);
  const htmlPath = path.join(requestDir, `${baseName}.html`);
  const pdfPath = path.join(requestDir, `${baseName}.pdf`);

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");
  const dataFiles = writeDataSidecars(requestDir, baseName, payload);

  const result = await runRenderer({
    jsonPath,
    htmlPath,
    pdfPath,
    baseName
  });

  if (!result.ok) {
    sendJson(response, 500, {
      ok: false,
      error: "Renderer failed.",
      stdout: result.stdout.slice(-4000),
      stderr: result.stderr.slice(-4000)
    });
    return;
  }

  const pdfBytes = fs.readFileSync(pdfPath);
  const filename = `${baseName}.pdf`;

  response.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Length": pdfBytes.length,
    "Content-Disposition": makeContentDisposition(filename),
    "X-PDF-Engine": "advanced-local-chrome",
    "X-Renderer-HTML": encodeHeaderValue(htmlPath.replace(/\\/g, "/")),
    "X-Data-Dir": encodeHeaderValue(requestDir.replace(/\\/g, "/")),
    "X-Data-Files": encodeHeaderValue(dataFiles.map((file) => path.basename(file)).join(",")),
    ...(captureWarning ? { "X-Capture-Warning": encodeHeaderValue(captureWarning) } : {})
  });
  response.end(pdfBytes);
}

async function handleRenderMarkdown(request, response) {
  const body = await readJsonBody(request);
  const payload = normalizePayload(body);

  if (!payload.messages.length) {
    sendJson(response, 400, {
      ok: false,
      error: "No messages were provided."
    });
    return;
  }

  await renderMarkdownPayload(payload, body, response);
}

async function handleRenderData(request, response) {
  const body = await readJsonBody(request);
  const payload = normalizePayload(body);

  if (!payload.messages.length) {
    sendJson(response, 400, {
      ok: false,
      error: "No messages were provided."
    });
    return;
  }

  const baseName = sanitizeFilename(
    stripExtension(body.fileName, "json")
      || payload.title
      || "chatgpt-conversation"
  );
  const bundle = buildDataBundle(payload);
  const bytes = Buffer.from(JSON.stringify(bundle, null, 2), "utf8");

  response.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": bytes.length,
    "Content-Disposition": makeContentDisposition(`${baseName}.data.json`),
    "X-Data-Engine": "advanced-local-data"
  });
  response.end(bytes);
}

async function handleRenderBundle(request, response) {
  const timings = createTimings();
  const body = await readJsonBody(request);
  const payload = normalizePayload(body);
  timings.mark("payloadNormalized");

  if (!payload.messages.length) {
    sendJson(response, 400, {
      ok: false,
      error: "No messages were provided."
    });
    return;
  }

  const baseName = sanitizeFilename(
    stripExtension(body.fileName, "zip")
      || payload.title
      || "chatgpt-conversation"
  );
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const requestDir = path.join(WORK_DIR, id);
  fs.mkdirSync(requestDir, { recursive: true });

  const jsonPath = path.join(requestDir, `${baseName}.payload.json`);
  const htmlPath = path.join(requestDir, `${baseName}.html`);
  const pdfPath = path.join(requestDir, `${baseName}.pdf`);
  const markdownPath = path.join(requestDir, `${baseName}.md`);
  const assetManifestPath = path.join(requestDir, `${baseName}.assets.manifest.json`);

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(markdownPath, buildMarkdownDocument(payload), "utf8");
  timings.mark("documentsWritten");
  const assetManifest = buildAssetManifest(payload, { cacheRoot: getCacheRoot() });
  fs.writeFileSync(assetManifestPath, JSON.stringify(assetManifest, null, 2), "utf8");
  timings.mark("assetManifestWritten");
  const dataFiles = writeDataSidecars(requestDir, baseName, payload);
  timings.mark("dataSidecarsWritten");

  const result = await runRenderer({
    jsonPath,
    htmlPath,
    pdfPath,
    baseName
  });
  timings.mark("pdfRendered");

  if (!result.ok) {
    sendJson(response, 500, {
      ok: false,
      error: "Renderer failed.",
      stdout: result.stdout.slice(-4000),
      stderr: result.stderr.slice(-4000)
    });
    return;
  }

  const bundleEntries = [
    {
      name: `${baseName}.md`,
      data: fs.readFileSync(markdownPath)
    },
    {
      name: `${baseName}.pdf`,
      data: fs.readFileSync(pdfPath)
    },
    {
      name: `${baseName}.payload.json`,
      data: fs.readFileSync(jsonPath)
    },
    {
      name: `${baseName}.assets.manifest.json`,
      data: fs.readFileSync(assetManifestPath)
    },
    ...dataFiles.map((filePath) => ({
      name: path.basename(filePath),
      data: fs.readFileSync(filePath)
    }))
  ];
  const zipBytes = createZipArchive(bundleEntries);
  timings.mark("zipCreated");
  const filename = `${baseName}.zip`;

  response.writeHead(200, {
    "Content-Type": "application/zip",
    "Content-Length": zipBytes.length,
    "Content-Disposition": makeContentDisposition(filename),
    "X-Bundle-Engine": "advanced-local-bundle",
    "X-Bundle-Files": encodeHeaderValue(bundleEntries.map((entry) => entry.name).join(",")),
    "X-Asset-Count": String(assetManifest.counts.total),
    "X-Renderer-HTML": encodeHeaderValue(htmlPath.replace(/\\/g, "/")),
    "X-Data-Dir": encodeHeaderValue(requestDir.replace(/\\/g, "/")),
    "X-Bundle-Timings": encodeHeaderValue(JSON.stringify(timings.toJSON()))
  });
  response.end(zipBytes);
}

async function renderMarkdownPayload(payload, body, response, captureWarning = "") {
  if (!payload.messages.length) {
    sendJson(response, 400, {
      ok: false,
      error: "No messages were provided."
    });
    return;
  }

  const baseName = sanitizeFilename(
    stripExtension(body.fileName, "md")
      || payload.title
      || "chatgpt-conversation"
  );
  const markdown = buildMarkdownDocument(payload);
  const bytes = Buffer.from(markdown, "utf8");
  const filename = `${baseName}.md`;

  response.writeHead(200, {
    "Content-Type": "text/markdown; charset=utf-8",
    "Content-Length": bytes.length,
    "Content-Disposition": makeContentDisposition(filename),
    "X-Markdown-Engine": "advanced-local",
    ...(captureWarning ? { "X-Capture-Warning": encodeHeaderValue(captureWarning) } : {})
  });
  response.end(bytes);
}

async function capturePayloadFromRequest(body, options = {}) {
  const capture = body.capture || {};

  if (!capture.url) {
    if (options.fallbackPayload) {
      return {
        payload: options.fallbackPayload,
        warning: "No capture URL was provided; used extension payload."
      };
    }
    throw new Error("No capture URL was provided.");
  }

  try {
    const payload = await captureConversationWithEdge({
      url: capture.url,
      title: capture.title,
      exporterVersion: capture.exporterVersion,
      selectedOrders: capture.selectedOrders
    });
    return {
      payload,
      warning: ""
    };
  } catch (error) {
    if (!options.fallbackPayload?.messages?.length) {
      throw error;
    }

    return {
      payload: options.fallbackPayload,
      warning: `Backend Edge capture failed; used extension payload. ${error.message || error}`.slice(0, 900)
    };
  }
}

function normalizePayload(body) {
  const payload = body.exportPayload || body.payload || body;
  const messages = Array.isArray(payload.messages)
    ? payload.messages.map((message, index) => normalizePayloadMessage(message, index))
    : [];

  return {
    schemaVersion: payload.schemaVersion || 1,
    exporterVersion: payload.exporterVersion || "",
    title: payload.title || "ChatGPT Conversation",
    source: payload.source || "",
    exportedAt: payload.exportedAt || new Date().toISOString(),
    captureMode: payload.captureMode || "",
    messageCount: payload.messageCount || messages.length,
    messages
  };
}

function normalizePayloadMessage(message, index) {
  const turnNumber = normalizeTurnNumber(message?.turnNumber, index);

  return {
    ...message,
    id: message?.id || `message-${turnNumber}`,
    role: String(message?.role || "unknown").toLowerCase(),
    turnNumber,
    order: message?.order ?? message?.conversationOrder ?? index,
    conversationOrder: message?.conversationOrder ?? message?.order ?? index,
    timestamp: message?.timestamp || "",
    preview: message?.preview || "",
    markdown: String(message?.markdown || ""),
    thinkingMarkdown: String(message?.thinkingMarkdown || ""),
    sourceMessageId: message?.sourceMessageId || "",
    codeBlockCount: message?.codeBlockCount || 0,
    fileCount: message?.fileCount || 0,
    imageCount: message?.imageCount || 0,
    imagesEmbedded: message?.imagesEmbedded || 0,
    imagesFailed: message?.imagesFailed || 0
  };
}

function normalizeTurnNumber(value, index) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : index + 1;
}

function writeDataSidecars(directory, baseName, payload) {
  const bundle = buildDataBundle(payload);
  const dataJson = JSON.stringify({
    ok: bundle.ok,
    conversation: bundle.conversation,
    messages: bundle.messages,
    qaPairs: bundle.qaPairs,
    topics: bundle.topics,
    entities: bundle.entities
  }, null, 2);
  const files = [
    [`${baseName}.data.json`, dataJson],
    [`${baseName}.conversation.json`, JSON.stringify(bundle.conversation, null, 2)],
    [`${baseName}.messages.jsonl`, bundle.messagesJsonl],
    [`${baseName}.qa-pairs.json`, JSON.stringify(bundle.qaPairs, null, 2)],
    [`${baseName}.topics.json`, JSON.stringify(bundle.topics, null, 2)],
    [`${baseName}.entities.json`, JSON.stringify(bundle.entities, null, 2)],
    [`${baseName}.summary.md`, bundle.summaryMarkdown]
  ];

  return files.map(([name, content]) => {
    const filePath = path.join(directory, name);
    fs.writeFileSync(filePath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
    return filePath;
  });
}

function buildDataBundle(payload) {
  const messages = payload.messages.map((message, index) => buildDataMessage(message, index));
  const conversation = {
    schemaVersion: 1,
    exporterVersion: payload.exporterVersion || "",
    title: payload.title || "ChatGPT Conversation",
    source: payload.source || "",
    exportedAt: payload.exportedAt || new Date().toISOString(),
    generatedAt: new Date().toISOString(),
    captureMode: payload.captureMode || "",
    messageCount: messages.length,
    roles: countBy(messages, (message) => message.role),
    thinkingCount: messages.filter((message) => message.thinkingMarkdown).length,
    imageCount: messages.reduce((sum, message) => sum + (message.counts?.images || 0), 0),
    fileCount: messages.reduce((sum, message) => sum + (message.counts?.files || 0), 0)
  };
  const qaPairs = buildQaPairs(messages);
  const topics = buildTopics(messages);
  const entities = buildEntities(messages);

  return {
    ok: true,
    conversation,
    messages,
    qaPairs,
    topics,
    entities,
    messagesJsonl: messages.map((message) => JSON.stringify(message)).join("\n") + "\n",
    summaryMarkdown: buildSummaryMarkdown(conversation, qaPairs, topics, entities)
  };
}

function buildDataMessage(message, index) {
  const markdown = normalizeMarkdown(message.markdown || "");
  const thinkingMarkdown = normalizeMarkdown(message.thinkingMarkdown || "");
  const plainText = stripMarkdown(`${markdown}\n${thinkingMarkdown}`);

  return {
    id: message.id || `message-${index + 1}`,
    turnNumber: normalizeTurnNumber(message.turnNumber, index),
    role: message.role || "unknown",
    timestamp: message.timestamp || "",
    sourceMessageId: message.sourceMessageId || "",
    conversationOrder: message.conversationOrder ?? message.order ?? index,
    preview: cleanPreview(message.preview || plainText),
    text: plainText,
    markdown,
    thinkingMarkdown,
    counts: {
      codeBlocks: message.codeBlockCount || countCodeBlocks(markdown, thinkingMarkdown),
      files: message.fileCount || extractFiles(markdown).length,
      images: message.imageCount || extractImages(markdown).length,
      links: extractLinks(`${markdown}\n${thinkingMarkdown}`).length
    }
  };
}

function buildQaPairs(messages) {
  const pairs = [];

  for (let index = 0; index < messages.length; index += 1) {
    const question = messages[index];
    const answer = messages[index + 1];

    if (question?.role !== "user" || answer?.role !== "assistant") {
      continue;
    }

    pairs.push({
      id: `qa-${pairs.length + 1}`,
      questionTurnNumber: question.turnNumber,
      answerTurnNumber: answer.turnNumber,
      questionPreview: cleanPreview(question.text),
      answerPreview: cleanPreview(answer.text),
      questionMessageId: question.id,
      answerMessageId: answer.id,
      timestamp: question.timestamp || answer.timestamp || ""
    });
  }

  return pairs;
}

function buildTopics(messages) {
  return messages.map((message) => ({
    id: `topic-turn-${message.turnNumber}`,
    turnNumber: message.turnNumber,
    role: message.role,
    title: cleanPreview(message.text, 72) || formatRole(message.role),
    hasThinking: Boolean(message.thinkingMarkdown),
    counts: message.counts
  }));
}

function buildEntities(messages) {
  const combined = messages.map((message) => `${message.markdown}\n${message.thinkingMarkdown}`).join("\n");
  return {
    urls: uniqueStrings(extractLinks(combined).map((link) => link.url)),
    files: uniqueStrings(extractFiles(combined)),
    images: uniqueStrings(extractImages(combined).map((image) => image.alt || image.src).filter(Boolean)),
    emails: uniqueMatches(combined, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi),
    dates: uniqueMatches(combined, /\b(?:\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/g),
    organizations: uniqueStrings([
      ...uniqueMatches(combined, /\b[A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.'-]*){1,5}\b/g),
      ...uniqueMatches(combined, /[\u4e00-\u9fffA-Za-z0-9]{2,24}(?:公司|学校|大学|学院|集团|Solutions|Limited|Ltd)\b/g)
    ]).slice(0, 120)
  };
}

function buildSummaryMarkdown(conversation, qaPairs, topics, entities) {
  const lines = [
    `# ${conversation.title}`,
    "",
    `- Capture mode: ${conversation.captureMode || "unknown"}`,
    `- Messages: ${conversation.messageCount}`,
    `- QA pairs: ${qaPairs.length}`,
    `- Thinking messages: ${conversation.thinkingCount}`,
    `- Images: ${conversation.imageCount}`,
    `- Files: ${conversation.fileCount}`,
    ""
  ];

  if (conversation.source) {
    lines.push(`Source: ${conversation.source}`, "");
  }

  lines.push("## Topic Index", "");
  topics.slice(0, 80).forEach((topic) => {
    lines.push(`- Turn ${String(topic.turnNumber).padStart(2, "0")} (${topic.role}): ${topic.title}`);
  });

  lines.push("", "## Entities", "");
  for (const [key, values] of Object.entries(entities)) {
    if (values.length) {
      lines.push(`- ${key}: ${values.slice(0, 20).join(", ")}`);
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}

function countBy(items, getKey) {
  return items.reduce((result, item) => {
    const key = getKey(item) || "unknown";
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
}

function buildMarkdownDocument(payload) {
  const lines = [
    `# ${payload.title || "ChatGPT Conversation"}`,
    "",
    `**Exporter:** Convo Vault ${payload.exporterVersion || ""}`.trim(),
    `**Exported:** ${formatMarkdownDateTime(payload.exportedAt)}`,
    `**Messages:** ${payload.messages.length}`,
    ""
  ];

  if (payload.source) {
    lines.splice(lines.length - 1, 0, `**Link:** [${payload.source}](${payload.source})`);
  }

  payload.messages.forEach((message, index) => {
    const role = formatRole(message.role);
    const heading = role === "User" ? "Prompt" : role === "Assistant" ? "Response" : role;
    lines.push(`## Turn ${String(normalizeTurnNumber(message.turnNumber, index)).padStart(2, "0")} - ${heading}`, "");

    if (isDisplayableTimestamp(message.timestamp)) {
      lines.push(message.timestamp, "");
    }

    if (message.thinkingMarkdown) {
      lines.push("### Thinking", "", normalizeMarkdown(message.thinkingMarkdown), "");
    }

    lines.push(normalizeMarkdown(message.markdown || "_No text content found._"), "");
  });

  return lines.join("\n").replace(/\n{4,}/g, "\n\n\n").trimEnd() + "\n";
}

function normalizeMarkdown(markdown) {
  return String(markdown || "")
    .replace(/\r\n?/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
}

function stripMarkdown(markdown) {
  return String(markdown || "")
    .replace(/```[\s\S]*?```/g, " code ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanPreview(text, maxLength = 140) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 1))}...` : value;
}

function countCodeBlocks(...parts) {
  return parts.reduce((count, value) => {
    const fenceCount = (String(value || "").match(/```/g) || []).length;
    return count + Math.floor(fenceCount / 2);
  }, 0);
}

function extractLinks(markdown) {
  const links = [];
  const source = String(markdown || "");
  const markdownPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  const barePattern = /\bhttps?:\/\/[^\s)]+/g;
  let match;

  while ((match = markdownPattern.exec(source))) {
    links.push({ label: cleanPreview(match[1], 100), url: stripTrailingPunctuation(match[2]) });
  }

  while ((match = barePattern.exec(source))) {
    const url = stripTrailingPunctuation(match[0]);
    if (!links.some((link) => link.url === url)) {
      links.push({ label: compactUrl(url), url });
    }
  }

  return links;
}

function extractImages(markdown) {
  const images = [];
  const pattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let match;

  while ((match = pattern.exec(String(markdown || "")))) {
    images.push({
      alt: cleanPreview(match[1] || "Image", 120),
      src: match[2] || ""
    });
  }

  return images;
}

function extractFiles(markdown) {
  const files = [];
  const source = String(markdown || "");
  const attachmentPattern = /\[File:\s*([^\]]+)\]/gi;
  const filenamePattern = /[^\\/:*?"<>|\n\r]{1,140}\.(?:pdf|docx?|xlsx?|pptx?|csv|tsv|txt|md|json|zip|rar|7z|mov|mp4|mp3|wav)\b/gi;
  let match;

  while ((match = attachmentPattern.exec(source))) {
    files.push(cleanPreview(match[1], 160));
  }

  while ((match = filenamePattern.exec(source))) {
    files.push(cleanPreview(match[0], 160));
  }

  return uniqueStrings(files);
}

function uniqueMatches(text, pattern) {
  return uniqueStrings([...String(text || "").matchAll(pattern)].map((match) => cleanPreview(match[0], 160)));
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    const text = String(value || "").trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(text);
  }

  return result;
}

function stripTrailingPunctuation(value) {
  return String(value || "").replace(/[),.;!?，。；！？]+$/g, "");
}

function compactUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return cleanPreview(url, 80);
  }
}

function formatRole(role) {
  const value = String(role || "Message").toLowerCase();
  if (value === "assistant") return "Assistant";
  if (value === "user") return "User";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function yamlString(value) {
  return JSON.stringify(String(value || ""));
}

function formatMarkdownDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value || "");
  }

  return date.toLocaleString();
}

function isDisplayableTimestamp(value) {
  const text = String(value || "").trim();

  if (!text) {
    return false;
  }

  return /^\d{1,2}\/\d{1,2}\/\d{4},?\s+\d{1,2}:\d{2}(?::\d{2})?/.test(text)
    || /^\d{4}-\d{2}-\d{2}[T\s]\d{1,2}:\d{2}/.test(text)
    || /^[A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4},?\s+\d{1,2}:\d{2}/.test(text);
}

function createZipArchive(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const name = normalizeZipEntryName(entry.name);
    const nameBytes = Buffer.from(name, "utf8");
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(String(entry.data || ""), "utf8");
    const checksum = crc32(data);
    const { dosTime, dosDate } = getDosDateTime(new Date());
    const localHeader = Buffer.alloc(30 + nameBytes.length);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBytes.copy(localHeader, 30);

    const centralHeader = Buffer.alloc(46 + nameBytes.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBytes.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    nameBytes.copy(centralHeader, 46);

    localParts.push(localHeader, data);
    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const localFiles = Buffer.concat(localParts);
  const endRecord = Buffer.alloc(22);

  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(localFiles.length, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([localFiles, centralDirectory, endRecord]);
}

function normalizeZipEntryName(name) {
  return String(name || "file")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\.\.(?:\/|$)/g, "")
    || "file";
}

function getDosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  return {
    dosTime: (hours << 11) | (minutes << 5) | seconds,
    dosDate: ((year - 1980) << 9) | (month << 5) | day
  };
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (let index = 0; index < buffer.length; index += 1) {
    crc = CRC32_TABLE[(crc ^ buffer[index]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createCrc32Table() {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  return table;
}

const CRC32_TABLE = createCrc32Table();

function runRenderer({ jsonPath, htmlPath, pdfPath, baseName }) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [
      RENDER_SCRIPT,
      jsonPath,
      "--out",
      pdfPath,
      "--html",
      htmlPath,
      "--name",
      baseName
    ], {
      cwd: ROOT_DIR,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      resolve({
        ok: code === 0 && fs.existsSync(pdfPath),
        code,
        stdout,
        stderr
      });
    });
  });
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    request.on("data", (chunk) => {
      total += chunk.length;

      if (total > MAX_BODY_BYTES) {
        reject(new Error(`Request body is too large. Limit is ${MAX_BODY_BYTES} bytes.`));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });

    request.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(new Error(`Invalid JSON body: ${error.message || error}`));
      }
    });

    request.on("error", reject);
  });
}

function setCorsHeaders(request, response) {
  const origin = request.headers.origin || "*";
  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Expose-Headers", [
    "Content-Disposition",
    "X-PDF-Engine",
    "X-Markdown-Engine",
    "X-Data-Engine",
    "X-Renderer-HTML",
    "X-Data-Dir",
    "X-Data-Files",
    "X-Page-Count",
    "X-Capture-Warning",
    "X-Asset-Count",
    "X-Bundle-Timings"
  ].join(", "));
}

function sendJson(response, statusCode, payload) {
  const body = Buffer.from(JSON.stringify(payload, null, 2), "utf8");
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": body.length
  });
  response.end(body);
}

function makeContentDisposition(filename) {
  const fallback = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function encodeHeaderValue(value) {
  return encodeURIComponent(String(value || ""));
}

function createTimings() {
  const startedAt = Date.now();
  const marks = {};

  return {
    mark(name) {
      marks[name] = Date.now() - startedAt;
    },
    toJSON() {
      return {
        totalMs: Date.now() - startedAt,
        marks
      };
    }
  };
}

function stripPdfExtension(filename) {
  return String(filename || "").replace(/\.pdf$/i, "");
}

function stripExtension(filename, extension) {
  return String(filename || "").replace(new RegExp(`\\.${extension}$`, "i"), "");
}

function sanitizeFilename(value) {
  return String(value || "chatgpt-conversation")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 96) || "chatgpt-conversation";
}

function readPackageVersion() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"));
    return packageJson.version || "";
  } catch (_) {
    return "";
  }
}
