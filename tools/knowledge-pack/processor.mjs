#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { readZip } from "./lib/zip-reader.mjs";

const VERSION = "knowledge-processor/0.3";

function writeJson(path, value) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
function walk(path, predicate = () => true) {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? walk(child, predicate) : predicate(child) ? [child] : [];
  });
}
function xmlText(value) {
  return value.replace(/<w:tab\/?\s*>/g, "\t").replace(/<w:br\/?\s*>/g, "\n")
    .replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function zipEntry(zip, name) { return zip.entries.find((entry) => entry.name === name); }
function docxExtract(path) {
  const zip = readZip(path); const entry = zipEntry(zip, "word/document.xml");
  if (!entry) throw new Error("word/document.xml missing");
  const xml = zip.data(entry).toString("utf8");
  const paragraphs = [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((match) => xmlText(match[0]).trim()).filter(Boolean);
  return { markdown: paragraphs.join("\n\n"), metadata: { paragraphs: paragraphs.length } };
}
function xlsxExtract(path) {
  const zip = readZip(path); const sharedEntry = zipEntry(zip, "xl/sharedStrings.xml");
  const shared = sharedEntry ? [...zip.data(sharedEntry).toString("utf8").matchAll(/<si\b[\s\S]*?<\/si>/g)].map((m) => xmlText(m[0])) : [];
  const sheets = zip.entries.filter((entry) => /^xl\/worksheets\/sheet\d+\.xml$/.test(entry.name));
  const sections = []; const records = [];
  for (const sheet of sheets) {
    const xml = zip.data(sheet).toString("utf8"); const rows = [];
    for (const row of xml.matchAll(/<row\b[\s\S]*?<\/row>/g)) {
      const cells = [...row[0].matchAll(/<c\b([^>]*)>[\s\S]*?<\/c>/g)].map((cell) => {
        const type = /\bt="([^"]+)"/.exec(cell[1])?.[1]; const raw = /<v>([\s\S]*?)<\/v>/.exec(cell[0])?.[1] ?? "";
        return type === "s" ? (shared[Number(raw)] ?? raw) : xmlText(raw);
      });
      rows.push(cells);
    }
    records.push({ sheet: basename(sheet.name, ".xml"), rows });
    sections.push(`## ${basename(sheet.name, ".xml")}\n\n${rows.map((row) => `| ${row.join(" | ")} |`).join("\n")}`);
  }
  return { markdown: sections.join("\n\n"), metadata: { sheets: records.length, records } };
}
function pdfExtract(path, outputDir) {
  const python = process.env.RAW_PACK_PYTHON || "python";
  const script = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1")), "scripts", "extract_pdf.py");
  const result = spawnSync(python, [script, path, outputDir], { encoding: "utf8", windowsHide: true });
  if (result.error || result.status !== 0) throw new Error((result.error?.message || result.stderr || `PDF extractor exited ${result.status}`).trim());
  const parsed = JSON.parse(readFileSync(join(outputDir, "document.json"), "utf8"));
  const characters = (parsed.pages || []).reduce((sum, page) => sum + (page.characters || 0), 0);
  if (characters === 0) throw new Error("No extractable PDF text; OCR or OpenDataLoader PDF is required.");
  return { external: true, pages: parsed.pages.length, characters };
}
function scanMarkdown(path, root) {
  const text = readFileSync(path, "utf8"); const links = [];
  for (const match of text.matchAll(/!\[([^\]]*)\]\(([^)]+)\)|!\[\[([^\]|#]+)(?:\|[^\]]+)?\]\]/g)) {
    const target = (match[2] || match[3] || "").replace(/^<|>$/g, "");
    if (/^(https?:|data:|sediment:)/i.test(target)) { links.push({ source: relative(root, path), target, status: "remote-or-reference" }); continue; }
    const absolute = resolve(dirname(path), decodeURIComponent(target));
    links.push({ source: relative(root, path), target, status: existsSync(absolute) ? "present" : "missing" });
  }
  return links;
}
function findSource(itemDir, manifest) {
  if (manifest.kind === "conversation-bundle") return walk(join(itemDir, "package"), (p) => [".md", ".pdf", ".json", ".jsonl"].includes(extname(p).toLowerCase()));
  return walk(join(itemDir, "source"), () => true);
}
function classifyManifest(manifest) {
  if (manifest.classification) return manifest.classification;
  const sourcePath = String(manifest.source?.absolutePath || "").replaceAll("/", "\\").toLowerCase();
  if (sourcePath.includes("100. femorning\\2. 原创\\")) {
    return {
      collection: "published-originals",
      sourceClass: "published-writing",
      ownership: "user-work",
      privacy: "private",
      trainingPolicy: "allowed-private",
    };
  }
  return {};
}
function processItem(vault, manifestPath) {
  const itemDir = dirname(manifestPath); const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const itemId = manifest.itemId || manifest.conversationId; const output = join(vault, "derived", itemId); mkdirSync(output, { recursive: true });
  const sources = findSource(itemDir, manifest); const results = []; const links = [];
  for (const source of sources) {
    const extension = extname(source).toLowerCase(); const stem = basename(source, extension); const target = join(output, "content", stem);
    try {
      if (extension === ".md" || extension === ".txt") {
        mkdirSync(dirname(`${target}.md`), { recursive: true }); writeFileSync(`${target}.md`, readFileSync(source, "utf8"), "utf8");
        if (extension === ".md") links.push(...scanMarkdown(source, itemDir));
        results.push({ source: relative(itemDir, source), format: extension.slice(1), status: "extracted", output: relative(output, `${target}.md`) });
      } else if (extension === ".json" || extension === ".jsonl") {
        const text = readFileSync(source, "utf8"); const records = extension === ".jsonl" ? text.split(/\r?\n/).filter(Boolean).map(JSON.parse) : JSON.parse(text);
        writeJson(`${target}.json`, records); results.push({ source: relative(itemDir, source), format: extension.slice(1), status: "extracted", output: relative(output, `${target}.json`) });
      } else if (extension === ".docx") {
        const value = docxExtract(source); mkdirSync(dirname(`${target}.md`), { recursive: true }); writeFileSync(`${target}.md`, `# ${stem}\n\n${value.markdown}\n`, "utf8"); writeJson(`${target}.structure.json`, value.metadata);
        results.push({ source: relative(itemDir, source), format: "docx", status: "extracted", output: relative(output, `${target}.md`) });
      } else if (extension === ".xlsx") {
        const value = xlsxExtract(source); mkdirSync(dirname(`${target}.md`), { recursive: true }); writeFileSync(`${target}.md`, `# ${stem}\n\n${value.markdown}\n`, "utf8"); writeJson(`${target}.structure.json`, value.metadata);
        results.push({ source: relative(itemDir, source), format: "xlsx", status: "extracted", output: relative(output, `${target}.md`) });
      } else if (extension === ".pdf") {
        pdfExtract(source, join(output, "content", `${stem}-pdf`)); results.push({ source: relative(itemDir, source), format: "pdf", status: "extracted", output: `content/${stem}-pdf/document.md` });
      }
    } catch (error) { results.push({ source: relative(itemDir, source), format: extension.slice(1), status: "failed", error: error.message }); }
  }
  const declared = manifest.assets?.records || []; const missingDeclared = declared.filter((asset) => !asset.presentInBundle).map((asset) => ({ itemId, source: "manifest", assetId: asset.assetId, target: asset.expectedPath, status: asset.storage === "reference-only" ? "reference-only" : "missing" }));
  const missingLinks = links.filter((link) => link.status === "missing").map((link) => ({ itemId, source: link.source, target: link.target, status: "missing" }));
  const failures = results.filter((result) => result.status === "failed"); const extractionStatus = failures.length ? "needs-review" : "processed";
  const report = { version: VERSION, itemId, sourceSha256: manifest.sha256, processedAt: new Date().toISOString(), status: extractionStatus, derived: true, results, assetLinks: links, missingAssets: [...missingDeclared, ...missingLinks] };
  writeJson(join(output, "extraction-manifest.json"), report);
  const displayTitle = manifest.title || manifest.originalName || itemId;
  const classification = classifyManifest(manifest);
  const sourceDate = manifest.modifiedAt || manifest.exportedAt || manifest.importedAt;
  const sourceFormat = manifest.extension?.replace(/^\./, "") || (manifest.kind === "conversation-bundle" ? "conversation-bundle" : "unknown");
  const index = `---\ntype: derived-extraction\nitem_id: ${itemId}\ntitle: ${JSON.stringify(displayTitle.replace(/\.docx$/i, ""))}\ncollection: ${classification.collection || "general-corpus"}\nsource_class: ${classification.sourceClass || "unclassified"}\nownership: ${classification.ownership || "unknown"}\nprivacy: ${classification.privacy || "private"}\ntraining_policy: ${classification.trainingPolicy || "review-required"}\nsource_format: ${sourceFormat}\nsource_date: ${sourceDate}\nstatus: ${extractionStatus}\nsource_sha256: ${manifest.sha256}\ncoverage_gaps: ${report.missingAssets.length}\nextracted_files: ${results.filter((r) => r.status === "extracted").length}\nfailed_files: ${failures.length}\nprocessed_at: ${report.processedAt}\n---\n\n# Derived extraction - ${displayTitle}\n\n> [!info] Derived content\n> This searchable content is generated from Raw evidence. It can be regenerated and never replaces the source.\n\n## Results\n\n${results.map((r) => `- ${r.status === "extracted" ? "OK" : "REVIEW"} ${r.format}: ${r.source}${r.output ? ` -> [[${r.output}]]` : ` - ${r.error}`}`).join("\n")}\n\n## Source coverage\n\n${report.missingAssets.length ? report.missingAssets.map((a) => `- ${a.status}: ${a.target || a.assetId}`).join("\n") : "- Local snapshot is sufficient for corpus processing."}\n`;
  writeFileSync(join(output, "index.md"), index, "utf8"); return report;
}
function main(argv) {
  const [command, vaultArg] = argv; if (command !== "process" || !vaultArg) throw new Error("Usage: processor.mjs process <vault>");
  const vault = resolve(vaultArg);
  const candidates = [
    ...walk(join(vault, "sources", "raw"), (p) => basename(p) === "manifest.json"),
    ...walk(join(vault, "raw"), (p) => basename(p) === "manifest.json"),
  ];
  const byItemId = new Map();
  for (const path of candidates) {
    const manifest = JSON.parse(readFileSync(path, "utf8"));
    const itemId = manifest.itemId || manifest.conversationId;
    if (!byItemId.has(itemId)) byItemId.set(itemId, path);
  }
  const manifests = [...byItemId.values()];
  const reports = manifests.map((path) => processItem(vault, path)); const missing = reports.flatMap((report) => report.missingAssets);
  writeJson(join(vault, "derived", "source-coverage.json"), { generatedAt: new Date().toISOString(), count: missing.length, items: missing });
  const queue = `---\ntype: source-coverage\nupdated: ${new Date().toISOString()}\ncount: ${missing.length}\n---\n\n# Source Coverage\n\n> A historical reference that is absent from the local snapshot is a coverage fact, not an automatic recovery task.\n\n${missing.length ? missing.map((a) => `- **${a.status}** - ${a.target || a.assetId} ([[derived/${a.itemId}/index|extraction]])`).join("\n") : "No coverage gaps recorded."}\n`;
  mkdirSync(join(vault, "system", "dashboards"), { recursive: true });
  writeFileSync(join(vault, "system", "dashboards", "Source Coverage.md"), queue, "utf8");
  writeFileSync(join(vault, "Missing Assets.md"), `# Deprecated: Missing Assets\n\nSee [[system/dashboards/Source Coverage|Source Coverage]].\n\n${missing.map((a) => `- ${a.target || a.assetId}`).join("\n")}\n`, "utf8");
  console.log(JSON.stringify({ version: VERSION, processed: reports.length, coverageGaps: missing.length, missingAssets: missing.length, reports: reports.map((r) => ({ itemId: r.itemId, status: r.status })) }, null, 2));
}
main(process.argv.slice(2));
