#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { extractZip, readZip } from "./lib/zip-reader.mjs";

const FORMAT_VERSION = "raw-pack/0.3";
const VAULT_DIRS = [
  // Legacy paths remain during the v0.2 compatibility period.
  "raw/imports", "raw/conversations", "wiki", "playbooks", "skills", "templates",
  // Canonical v0.2 paths.
  "system/dashboards", "system/templates", "system/configuration", "system/privacy",
  "sources/catalog/conversations", "sources/catalog/personal-work", "sources/catalog/career", "sources/catalog/research",
  "sources/raw/conversations", "sources/raw/selected-files",
  "derived/conversations", "derived/writing", "derived/career", "derived/research", "derived/media",
  "knowledge/concepts", "knowledge/topics", "knowledge/entities", "knowledge/timelines", "knowledge/claims", "knowledge/relationships",
  "applications/career", "applications/writing", "applications/investment", "applications/finance-accounting", "applications/family-wealth", "applications/personal-ai",
  "methods/playbooks", "methods/checklists", "methods/templates", "methods/skills",
  "datasets/rag", "datasets/training", "datasets/preference", "datasets/evaluation",
  "inbox", "outputs", "assets", "logs",
];

function usage(message) {
  if (message) console.error(message);
  console.error(`Usage:
  node tools/knowledge-pack/cli.mjs init <vault>
  node tools/knowledge-pack/cli.mjs import <source> --vault <vault> [--render-pdf-pages]`);
  process.exitCode = 2;
}

function ensureVault(vault) {
  mkdirSync(vault, { recursive: true });
  for (const dir of VAULT_DIRS) mkdirSync(join(vault, dir), { recursive: true });
  const marker = join(vault, ".raw-pack.json");
  if (!existsSync(marker)) {
    writeJson(marker, {
      format: FORMAT_VERSION,
      createdAt: new Date().toISOString(),
      policy: { rawImmutable: true, aiWritesToRaw: false },
    });
  }
  const readme = join(vault, "README.md");
  if (!existsSync(readme)) {
    writeFileSync(readme, `# Convo Vault Knowledge Base\n\n- \`raw/\`: immutable source evidence\n- \`inbox/\`: generated drafts and review notes\n- \`wiki/\`: approved knowledge\n- \`outputs/\`: generated deliverables\n`, "utf8");
  }
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function hashFile(path) {
  const hash = createHash("sha256");
  hash.update(readFileSync(path));
  return hash.digest("hex");
}

function safeSlug(name) {
  return name
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72) || "untitled";
}

function collectFiles(source) {
  const info = statSync(source);
  if (info.isFile()) return [source];
  const files = [];
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const path = join(source, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function renderPdfPages(pdf, outputDir) {
  mkdirSync(outputDir, { recursive: true });
  const prefix = join(outputDir, "page");
  const command = process.env.PDFTOPPM_PATH || "pdftoppm";
  const result = spawnSync(command, ["-png", "-r", "120", pdf, prefix], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error) return { ok: false, error: `${result.error.message} (set PDFTOPPM_PATH if Poppler is installed outside PATH)` };
  if (result.status !== 0) return { ok: false, error: (result.stderr || `pdftoppm exited ${result.status}`).trim() };
  const pages = readdirSync(outputDir).filter((name) => /^page-\d+\.png$/i.test(name)).sort();
  return { ok: true, pages };
}

function makeNote(manifest) {
  const lines = [
    "---",
    `raw_pack: ${FORMAT_VERSION}`,
    "type: raw-item",
    `item_id: ${manifest.itemId}`,
    `sha256: ${manifest.sha256}`,
    `media_type: ${manifest.mediaType}`,
    `status: ${manifest.status}`,
    "processing_status: not-processed",
    "missing_assets: 0",
    "---",
    "",
    `# ${manifest.originalName}`,
    "",
    `Original: [[source/${manifest.storedName}]]`,
    "",
  ];
  if (manifest.assets.pages.length) {
    lines.push("## PDF page previews", "");
    for (const page of manifest.assets.pages) lines.push(`![[assets/pages/${page}]]`);
    lines.push("");
  }
  if (manifest.warnings.length) {
    lines.push("## Needs review", "", ...manifest.warnings.map((warning) => `- ${warning}`), "");
  }
  return `${lines.join("\n")}\n`;
}

function mediaType(extension) {
  return ({
    ".pdf": "application/pdf", ".md": "text/markdown", ".txt": "text/plain",
    ".json": "application/json", ".jsonl": "application/x-ndjson", ".zip": "application/zip",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })[extension] || "application/octet-stream";
}

function findEntry(zip, suffix) {
  return zip.entries.find((entry) => entry.name.toLowerCase().endsWith(suffix));
}

function parseJsonEntry(zip, entry) {
  return entry ? JSON.parse(zip.data(entry).toString("utf8")) : null;
}

function conversationIdFrom(metadata, sha256) {
  const source = metadata?.source || metadata?.conversation?.source || "";
  const match = String(source).match(/\/c\/([a-zA-Z0-9-]+)/);
  return match?.[1] || `bundle-${sha256.slice(0, 16)}`;
}

function importBundle(file, vault, info, sha256) {
  let zip;
  try { zip = readZip(file); } catch (error) { return null; }
  const conversationEntry = findEntry(zip, ".conversation.json");
  const messagesEntry = findEntry(zip, ".messages.jsonl");
  if (!conversationEntry && !messagesEntry) return null;
  const conversation = parseJsonEntry(zip, conversationEntry) || {};
  const payload = parseJsonEntry(zip, findEntry(zip, ".payload.json"));
  const assetManifest = parseJsonEntry(zip, findEntry(zip, ".assets.manifest.json"));
  const conversationId = conversationIdFrom(conversation, sha256);
  const year = new Date(conversation.exportedAt || info.mtime).getFullYear().toString();
  const itemDir = join(vault, "sources", "raw", "conversations", year, safeSlug(conversationId));
  const manifestPath = join(itemDir, "manifest.json");
  if (existsSync(manifestPath)) return { itemId: conversationId, status: "unchanged", path: itemDir, kind: "conversation-bundle" };
  const archiveDir = join(itemDir, "source");
  const packageDir = join(itemDir, "package");
  mkdirSync(archiveDir, { recursive: true });
  copyFileSync(file, join(archiveDir, "original.zip"));
  extractZip(zip, packageDir);
  const messages = messagesEntry
    ? zip.data(messagesEntry).toString("utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
    : (payload?.messages || []);
  const messageRecords = messages.map((message, index) => ({
    id: message.id || message.sourceMessageId || `message-${index + 1}`,
    sourceMessageId: message.sourceMessageId || message.id || null,
    role: message.role || "unknown",
    order: message.conversationOrder ?? message.order ?? index + 1,
    turnNumber: message.turnNumber ?? null,
  }));
  const packageNames = new Set(zip.entries.map((entry) => entry.name.replace(/\\/g, "/")));
  const assets = (assetManifest?.assets || []).map((asset) => {
    const expectedPath = asset.cachePath || asset.fileName || null;
    const present = expectedPath ? packageNames.has(expectedPath.replace(/\\/g, "/")) || [...packageNames].some((name) => name.endsWith(`/${expectedPath.replace(/\\/g, "/")}`)) : false;
    return {
      assetId: asset.assetId,
      sha256: asset.sha256 || null,
      kind: asset.kind || "unknown",
      origin: asset.origin || "unknown",
      storage: asset.storage || "unknown",
      expectedPath,
      presentInBundle: present,
      references: Array.isArray(asset.references) ? asset.references : asset.references ? [asset.references] : [],
    };
  });
  const warnings = [];
  for (const asset of assets) {
    if (asset.storage === "local-cache" && !asset.presentInBundle) warnings.push(`Missing cached asset: ${asset.assetId}`);
    if (asset.storage === "reference-only") warnings.push(`Reference-only asset has no local original: ${asset.assetId}`);
  }
  const manifest = {
    format: "raw-pack/0.3",
    kind: "conversation-bundle",
    itemId: conversationId,
    conversationId,
    title: conversation.title || payload?.title || basename(file, extname(file)),
    sourceUrl: conversation.source || payload?.source || null,
    exporterVersion: conversation.exporterVersion || payload?.exporterVersion || null,
    captureMode: conversation.captureMode || payload?.captureMode || null,
    exportedAt: conversation.exportedAt || payload?.exportedAt || null,
    importedAt: new Date().toISOString(),
    originalName: basename(file),
    bytes: info.size,
    sha256,
    immutable: true,
    status: warnings.length ? "needs-review" : "imported",
    files: zip.entries.filter((entry) => !entry.directory).map((entry) => ({ path: entry.name, bytes: entry.uncompressedSize })),
    messages: { count: messageRecords.length, records: messageRecords },
    assets: { count: assets.length, records: assets, missingCount: assets.filter((asset) => !asset.presentInBundle).length },
    warnings,
    processing: { status: "not-compiled", compiler: null, outputs: [] },
  };
  writeJson(manifestPath, manifest);
  writeJson(join(itemDir, "relationships.json"), {
    conversationId,
    messages: messageRecords,
    assets,
  });
  const note = [
    "---", "raw_pack: raw-pack/0.3", "type: raw-conversation", "kind: conversation-bundle", `item_id: ${conversationId}`, `conversation_id: ${conversationId}`,
    `status: ${manifest.status}`, `processing_status: not-processed`, `message_count: ${messageRecords.length}`, `asset_count: ${assets.length}`, `missing_assets: ${assets.filter((asset) => !asset.presentInBundle).length}`, `imported_at: ${manifest.importedAt}`, "---", "", `# ${manifest.title}`, "",
    `Original bundle: [[source/original.zip]]`, "", `Messages: ${messageRecords.length}`, `Assets: ${assets.length}`,
    "", "## Package", "", ...manifest.files.map((entry) => `- [[package/${entry.path}]]`), "",
    ...(warnings.length ? ["## Needs review", "", ...warnings.map((warning) => `- ${warning}`), ""] : []),
  ].join("\n");
  writeFileSync(join(itemDir, "index.md"), `${note}\n`, "utf8");
  return { itemId: conversationId, status: manifest.status, path: itemDir, kind: "conversation-bundle" };
}

function importFile(file, sourceRoot, vault, renderPages, classification) {
  const info = statSync(file);
  const sha256 = hashFile(file);
  const extension = extname(file).toLowerCase();
  if (extension === ".zip") {
    const bundle = importBundle(file, vault, info, sha256);
    if (bundle) return bundle;
  }
  const stem = basename(file, extname(file));
  const itemId = `${safeSlug(stem)}-${sha256.slice(0, 12)}`;
  const year = new Date(info.mtimeMs).getFullYear().toString();
  const itemDir = join(vault, "sources", "raw", "selected-files", year, itemId);
  const sourceDir = join(itemDir, "source");
  const storedName = `original${extension || ".bin"}`;
  const manifestPath = join(itemDir, "manifest.json");

  if (existsSync(manifestPath)) return { itemId, status: "unchanged", path: itemDir };

  mkdirSync(sourceDir, { recursive: true });
  copyFileSync(file, join(sourceDir, storedName));
  const warnings = [];
  const pages = [];
  if (info.size === 0) warnings.push("Source file is empty.");
  if (extension === ".pdf" && renderPages && info.size > 0) {
    const rendered = renderPdfPages(join(sourceDir, storedName), join(itemDir, "assets", "pages"));
    if (rendered.ok) pages.push(...rendered.pages);
    else warnings.push(`PDF page rendering failed: ${rendered.error}`);
  }
  const manifest = {
    format: FORMAT_VERSION,
    itemId,
    importedAt: new Date().toISOString(),
    source: { absolutePath: resolve(file), relativePath: relative(sourceRoot, file) || basename(file) },
    originalName: basename(file),
    storedName,
    extension: extension || null,
    mediaType: mediaType(extension),
    bytes: info.size,
    modifiedAt: info.mtime.toISOString(),
    sha256,
    status: warnings.length ? "needs-review" : "imported",
    immutable: true,
    classification,
    assets: { pages },
    warnings,
  };
  writeJson(manifestPath, manifest);
  writeFileSync(join(itemDir, "index.md"), makeNote(manifest), "utf8");
  return { itemId, status: manifest.status, path: itemDir };
}

function main(argv) {
  const [command, target, ...rest] = argv;
  if (!command || !target) return usage();
  if (command === "init") {
    const vault = resolve(target);
    ensureVault(vault);
    console.log(JSON.stringify({ status: "initialized", vault }, null, 2));
    return;
  }
  if (command !== "import") return usage(`Unknown command: ${command}`);
  const vaultIndex = rest.indexOf("--vault");
  if (vaultIndex < 0 || !rest[vaultIndex + 1]) return usage("--vault is required");
  const source = resolve(target);
  const vault = resolve(rest[vaultIndex + 1]);
  if (!existsSync(source)) return usage(`Source does not exist: ${source}`);
  ensureVault(vault);
  const getOption = (name, fallback) => {
    const index = rest.indexOf(name);
    return index >= 0 && rest[index + 1] ? rest[index + 1] : fallback;
  };
  const classification = {
    collection: getOption("--collection", "general-corpus"),
    sourceClass: getOption("--source-class", "unclassified"),
    ownership: getOption("--ownership", "unknown"),
    privacy: getOption("--privacy", "private"),
    trainingPolicy: getOption("--training-policy", "review-required"),
  };
  const files = collectFiles(source);
  const results = files.map((file) => importFile(file, source, vault, rest.includes("--render-pdf-pages"), classification));
  const report = {
    format: FORMAT_VERSION,
    source,
    vault,
    completedAt: new Date().toISOString(),
    counts: Object.fromEntries([...new Set(results.map((item) => item.status))].map((status) => [status, results.filter((item) => item.status === status).length])),
    items: results,
  };
  const reportName = `import-${report.completedAt.replace(/[:.]/g, "-")}.json`;
  writeJson(join(vault, "logs", reportName), report);
  console.log(JSON.stringify(report, null, 2));
}

main(process.argv.slice(2));
