const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const DEFAULT_CACHE_ROOT = path.join(
  process.env.LOCALAPPDATA || process.env.HOME || process.cwd(),
  "ChatGPTConversationExporter"
);

async function captureConversationWithEdge(options = {}) {
  const url = String(options.url || "").trim();

  if (!/^https:\/\/(?:chatgpt\.com|chat\.openai\.com)\//i.test(url)) {
    throw new Error("A ChatGPT conversation URL is required for backend capture.");
  }

  const edgePath = options.edgePath || findEdgeExecutable();

  if (!edgePath) {
    throw new Error("Microsoft Edge was not found. Set CGCE_EDGE_PATH to msedge.exe.");
  }

  const cacheRoot = getCacheRoot();
  const profileDir = path.join(cacheRoot, "edge-profile");
  fs.mkdirSync(profileDir, { recursive: true });

  const context = await chromium.launchPersistentContext(profileDir, {
    executablePath: edgePath,
    headless: process.env.CGCE_CAPTURE_HEADLESS === "1",
    viewport: { width: 1440, height: 1100 },
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-first-run",
      "--no-default-browser-check"
    ]
  });

  try {
    const page = context.pages()[0] || await context.newPage();
    page.setDefaultTimeout(Number(process.env.CGCE_CAPTURE_TIMEOUT_MS || 90_000));
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForSelector("main, [data-testid^='conversation-turn-'], [data-turn-id]", { timeout: 90_000 });
    await hydrateConversation(page);
    const payload = await extractConversationPayload(page, options);
    return {
      ...payload,
      capture: {
        engine: "local-edge",
        edgePath,
        cacheRoot,
        capturedAt: new Date().toISOString()
      }
    };
  } finally {
    await context.close();
  }
}

async function hydrateConversation(page) {
  const maxMs = Number(process.env.CGCE_CAPTURE_SCAN_MS || 90_000);
  const started = Date.now();
  let previousSignature = "";
  let stablePasses = 0;

  await page.evaluate(() => {
    const scrollTarget = document.scrollingElement || document.documentElement;
    scrollTarget.scrollTo(0, 0);
  });
  await page.waitForTimeout(700);

  while (Date.now() - started < maxMs && stablePasses < 4) {
    const signature = await page.evaluate(() => {
      const scrollTarget = document.scrollingElement || document.documentElement;
      const turns = [...document.querySelectorAll('[data-testid^="conversation-turn-"], [data-turn-id]')];
      const last = turns.at(-1);
      scrollTarget.scrollBy(0, Math.max(500, window.innerHeight * 0.82));
      return [
        turns.length,
        scrollTarget.scrollTop,
        scrollTarget.scrollHeight,
        last?.getAttribute("data-testid") || last?.getAttribute("data-turn-id") || ""
      ].join("|");
    });
    stablePasses = signature === previousSignature ? stablePasses + 1 : 0;
    previousSignature = signature;
    await page.waitForTimeout(420);
  }

  await page.evaluate(() => {
    const scrollTarget = document.scrollingElement || document.documentElement;
    scrollTarget.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
}

async function extractConversationPayload(page, options = {}) {
  const selectedOrders = new Set((options.selectedOrders || [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value)));

  const extracted = await page.evaluate(() => {
    const turnSelector = '[data-testid^="conversation-turn-"], [data-turn-id]';
    const turnNodes = uniqueElements([...document.querySelectorAll(turnSelector)].map(normalizeTurnNode));
    const title = document.title.replace(/\s*[|-]\s*ChatGPT\s*$/i, "").trim() || "ChatGPT Conversation";

    return {
      title,
      source: location.href,
      exportedAt: new Date().toISOString(),
      messages: turnNodes
        .map((turn, index) => extractTurn(turn, index))
        .filter((message) => message && (message.markdown || message.thinkingMarkdown || message.attachments.length))
    };

    function normalizeTurnNode(node) {
      return node?.closest?.('[data-testid^="conversation-turn-"], [data-turn-id]') || node;
    }

    function uniqueElements(nodes) {
      return [...new Set(nodes.filter(Boolean))];
    }

    function extractTurn(turn, index) {
      const testId = turn.getAttribute("data-testid") || "";
      const orderMatch = testId.match(/conversation-turn-(\d+)/i);
      const order = orderMatch ? Number(orderMatch[1]) : index + 1;
      const role = detectRole(turn, index);
      const body = findBody(turn, role);
      const thinking = extractThinking(turn, body);
      const attachments = extractAttachments(turn);
      const markdown = serializeNodeToMarkdown(body || turn, { excludeThinking: true }).trim();

      return {
        id: turn.getAttribute("data-turn-id") || turn.getAttribute("data-turn-id-container") || `turn-${order}`,
        role,
        order,
        sourceMessageId: turn.querySelector("[data-message-id]")?.getAttribute("data-message-id") || "",
        timestamp: extractTimestamp(turn),
        preview: toText(body || turn).slice(0, 180),
        markdown,
        thinkingMarkdown: thinking,
        attachments,
        imageCount: attachments.filter((item) => item.kind === "image").length,
        fileCount: attachments.filter((item) => item.kind === "file").length,
        codeBlockCount: (markdown.match(/```/g) || []).length / 2
      };
    }

    function detectRole(turn, index) {
      const roleElement = turn.querySelector("[data-message-author-role]");
      const role = roleElement?.getAttribute("data-message-author-role");
      if (role === "user" || role === "assistant") return role;
      if (turn.getAttribute("data-turn") === "user") return "user";
      if (turn.getAttribute("data-turn") === "assistant") return "assistant";
      if (turn.querySelector(".markdown, [class*='markdown'], [class*='prose']")) return "assistant";
      if (turn.querySelector("[class*='user-message'], [data-testid*='user-message' i]")) return "user";
      return index % 2 === 0 ? "user" : "assistant";
    }

    function findBody(turn, role) {
      const roleRoot = turn.querySelector(`[data-message-author-role="${role}"]`) || turn;
      const selectors = role === "assistant"
        ? [".markdown", "[class*='markdown']", "[class*='prose']", "[data-start]", "[dir='auto']"]
        : ["[class*='whitespace-pre-wrap']", "[data-testid*='user-message' i]", "[dir='auto']"];

      for (const selector of selectors) {
        const nodes = [...roleRoot.querySelectorAll(selector)]
          .filter((node) => toText(node).trim().length || node.querySelector("img, pre, code, table"));
        if (nodes.length) {
          return nodes.sort((a, b) => scoreBody(b) - scoreBody(a))[0];
        }
      }
      return roleRoot;
    }

    function scoreBody(node) {
      return toText(node).length
        + node.querySelectorAll("p, li, pre, table, blockquote, img").length * 120
        - node.querySelectorAll("button, nav, menu").length * 80;
    }

    function extractThinking(turn, body) {
      const candidates = [...turn.querySelectorAll("section, aside, div, details")]
        .filter((node) => node !== body && !body?.contains(node))
        .filter((node) => /thinking|reasoning|thought|思考|推理|已思考/i.test([
          node.getAttribute("aria-label") || "",
          node.getAttribute("data-testid") || "",
          node.className || "",
          toText(node).slice(0, 80)
        ].join(" ")));

      const best = candidates.sort((a, b) => scoreBody(b) - scoreBody(a))[0];
      return best ? serializeNodeToMarkdown(best).trim() : "";
    }

    function extractAttachments(turn) {
      const attachments = [];
      for (const image of turn.querySelectorAll("img")) {
        const src = image.currentSrc || image.src || "";
        if (!src || /avatar|sprite|favicon/i.test(src)) continue;
        attachments.push({
          kind: "image",
          name: image.alt || image.getAttribute("aria-label") || "image",
          url: src,
          width: image.naturalWidth || image.width || null,
          height: image.naturalHeight || image.height || null
        });
      }
      for (const link of turn.querySelectorAll("a[href], button[aria-label]")) {
        const href = link.href || link.querySelector("a[href]")?.href || "";
        const label = (link.getAttribute("aria-label") || toText(link)).trim();
        if (!href && !/\.(pdf|docx?|xlsx?|pptx?|txt|md|zip|json)\b/i.test(label)) continue;
        if (!/file|attachment|download|\.pdf|\.md|\.txt|\.doc|\.xls|文件|附件/i.test(`${href} ${label}`)) continue;
        attachments.push({
          kind: "file",
          name: label.replace(/^打开图片[:：]?\s*/i, "").slice(0, 160) || "Attachment",
          url: href
        });
      }
      return dedupeAttachments(attachments).slice(0, 12);
    }

    function dedupeAttachments(items) {
      const seen = new Set();
      return items.filter((item) => {
        const key = `${item.kind}|${item.url}|${item.name}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    function extractTimestamp(turn) {
      const text = [...turn.querySelectorAll("time, span, div")]
        .map((node) => toText(node).trim())
        .filter((value) => value.length <= 80)
        .find((value) => /\d{1,2}\/\d{1,2}\/\d{4}.*\d{1,2}:\d{2}|\d{4}-\d{2}-\d{2}.*\d{1,2}:\d{2}/.test(value));
      return text || "";
    }

    function serializeNodeToMarkdown(node, options = {}) {
      if (!node) return "";
      const clone = node.cloneNode(true);
      clone.querySelectorAll("script, style, nav, menu, button, svg").forEach((item) => item.remove());
      if (options.excludeThinking) {
        clone.querySelectorAll('[aria-label*="thinking" i], [aria-label*="思考"], [class*="thinking" i], [class*="reasoning" i]').forEach((item) => item.remove());
      }
      return serializeChildren(clone).replace(/\n{3,}/g, "\n\n").trim();
    }

    function serializeChildren(node) {
      return [...node.childNodes].map(serializeNode).join("").replace(/[ \t]+\n/g, "\n");
    }

    function serializeNode(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent.replace(/\s+/g, " ");
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      const tag = node.tagName.toLowerCase();
      if (tag === "br") return "\n";
      if (tag === "p") return `${serializeChildren(node).trim()}\n\n`;
      if (/^h[1-6]$/.test(tag)) return `${"#".repeat(Number(tag[1]))} ${serializeChildren(node).trim()}\n\n`;
      if (tag === "strong" || tag === "b") return `**${serializeChildren(node).trim()}**`;
      if (tag === "em" || tag === "i") return `_${serializeChildren(node).trim()}_`;
      if (tag === "code" && node.closest("pre")) return node.textContent;
      if (tag === "code") return `\`${node.textContent.trim()}\``;
      if (tag === "pre") return `\n\`\`\`\n${node.textContent.replace(/\n+$/g, "")}\n\`\`\`\n\n`;
      if (tag === "blockquote") return serializeChildren(node).trim().split(/\n/).map((line) => `> ${line}`).join("\n") + "\n\n";
      if (tag === "li") return `- ${serializeChildren(node).trim()}\n`;
      if (tag === "ul" || tag === "ol") return `\n${serializeChildren(node)}\n`;
      if (tag === "a") {
        const href = node.getAttribute("href") || "";
        const label = serializeChildren(node).trim() || href;
        return href ? `[${label}](${href})` : label;
      }
      if (tag === "img") {
        const src = node.currentSrc || node.getAttribute("src") || "";
        const alt = node.getAttribute("alt") || "image";
        return src ? `![${alt}](${src})\n\n` : "";
      }
      if (tag === "table") return `${toText(node)}\n\n`;
      if (["div", "section", "article"].includes(tag)) return `${serializeChildren(node)}\n`;
      return serializeChildren(node);
    }

    function toText(node) {
      return (node?.innerText || node?.textContent || "").replace(/\s+/g, " ").trim();
    }
  });

  let messages = extracted.messages || [];
  if (selectedOrders.size) {
    messages = messages.filter((message) => selectedOrders.has(Number(message.order)));
  }

  return {
    schemaVersion: 2,
    exporterVersion: options.exporterVersion || "",
    title: options.title || extracted.title || "ChatGPT Conversation",
    source: extracted.source,
    exportedAt: new Date().toISOString(),
    messageCount: messages.length,
    messages
  };
}

function getCacheRoot() {
  const cacheRoot = process.env.CGCE_CACHE_DIR || DEFAULT_CACHE_ROOT;
  fs.mkdirSync(cacheRoot, { recursive: true });
  return cacheRoot;
}

function findEdgeExecutable() {
  const candidates = [
    process.env.CGCE_EDGE_PATH,
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

module.exports = {
  captureConversationWithEdge,
  findEdgeExecutable,
  getCacheRoot
};
