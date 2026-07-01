#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");
const { captureConversationWithEdge, findEdgeExecutable, getCacheRoot } = require("./capture");

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
  console.log("[advanced-pdf-server] Endpoints: GET /health, POST /render-pdf, POST /render-markdown, POST /capture-render-pdf, POST /capture-render-markdown");
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

  if (request.method === "POST" && url.pathname === "/render-pdf") {
    await handleRenderPdf(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/render-markdown") {
    await handleRenderMarkdown(request, response);
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
  const messages = Array.isArray(payload.messages) ? payload.messages : [];

  return {
    schemaVersion: payload.schemaVersion || 1,
    exporterVersion: payload.exporterVersion || "",
    title: payload.title || "ChatGPT Conversation",
    source: payload.source || "",
    exportedAt: payload.exportedAt || new Date().toISOString(),
    messageCount: payload.messageCount || messages.length,
    messages
  };
}

function buildMarkdownDocument(payload) {
  const lines = [
    `# ${payload.title || "ChatGPT Conversation"}`,
    "",
    `**Exporter:** ChatGPT Conversation Exporter ${payload.exporterVersion || ""}`.trim(),
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
    lines.push(`## ${heading}:`, "");

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
    "X-Renderer-HTML",
    "X-Page-Count",
    "X-Capture-Warning"
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
