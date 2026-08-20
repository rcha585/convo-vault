import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { createZipFromDirectory } from "../scripts/lib/simple-zip.mjs";

const cli = resolve("tools/knowledge-pack/cli.mjs");
const processor = resolve("tools/knowledge-pack/processor.mjs");
const catalog = resolve("tools/knowledge-pack/catalog.mjs");
const samples = resolve("tools/knowledge-pack/samples");

test("initializes a Vault and imports synthetic files idempotently", () => {
  const root = mkdtempSync(join(tmpdir(), "raw-pack-"));
  const vault = join(root, "vault");
  execFileSync(process.execPath, [cli, "init", vault]);
  const first = JSON.parse(execFileSync(process.execPath, [cli, "import", samples, "--vault", vault], { encoding: "utf8" }));
  assert.equal(first.counts.imported, 3);
  const second = JSON.parse(execFileSync(process.execPath, [cli, "import", samples, "--vault", vault], { encoding: "utf8" }));
  assert.equal(second.counts.unchanged, 3);
  const importedRoot = join(vault, "sources", "raw", "selected-files");
  const years = readdirSync(importedRoot);
  const items = years.flatMap((year) => readdirSync(join(importedRoot, year)).map((item) => join(importedRoot, year, item)));
  assert.equal(items.length, 3);
  const manifest = JSON.parse(readFileSync(join(items[0], "manifest.json"), "utf8"));
  assert.match(manifest.sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.immutable, true);
});

test("imports a conversation bundle with message and asset relationships", async () => {
  const root = mkdtempSync(join(tmpdir(), "raw-pack-bundle-"));
  const bundleDir = join(root, "bundle");
  const vault = join(root, "vault");
  mkdirSync(bundleDir, { recursive: true });
  writeFileSync(join(bundleDir, "sample.conversation.json"), JSON.stringify({
    title: "Synthetic bundle",
    source: "https://chatgpt.com/c/11111111-2222-3333-4444-555555555555",
    exportedAt: "2026-07-15T00:00:00.000Z",
    exporterVersion: "test",
    captureMode: "synthetic",
  }));
  writeFileSync(join(bundleDir, "sample.messages.jsonl"), [
    JSON.stringify({ id: "m1", sourceMessageId: "source-m1", role: "user", conversationOrder: 1 }),
    JSON.stringify({ id: "m2", sourceMessageId: "source-m2", role: "assistant", conversationOrder: 2 }),
  ].join("\n"));
  writeFileSync(join(bundleDir, "sample.assets.manifest.json"), JSON.stringify({ assets: [{
    assetId: "sha256:missing", kind: "image", origin: "user-provided", storage: "local-cache",
    cachePath: "assets/sha256/missing.png", references: [{ messageId: "m1", field: "markdown" }],
  }] }));
  const zipPath = join(root, "synthetic.zip");
  await createZipFromDirectory(bundleDir, zipPath);
  const report = JSON.parse(execFileSync(process.execPath, [cli, "import", zipPath, "--vault", vault], { encoding: "utf8" }));
  assert.equal(report.items[0].kind, "conversation-bundle");
  assert.equal(report.items[0].status, "needs-review");
  const conversationDir = join(vault, "sources", "raw", "conversations", "2026", "11111111-2222-3333-4444-555555555555");
  const manifest = JSON.parse(readFileSync(join(conversationDir, "manifest.json"), "utf8"));
  assert.equal(manifest.messages.count, 2);
  assert.equal(manifest.assets.missingCount, 1);
  assert.equal(manifest.processing.status, "not-compiled");
  assert.equal(JSON.parse(readFileSync(join(conversationDir, "relationships.json"), "utf8")).messages[0].sourceMessageId, "source-m1");
});

test("creates derived content and source coverage without changing raw sources", () => {
  const root = mkdtempSync(join(tmpdir(), "raw-pack-process-"));
  const vault = join(root, "vault");
  execFileSync(process.execPath, [cli, "import", samples, "--vault", vault]);
  const rawRoot = join(vault, "sources", "raw", "selected-files");
  const rawBefore = readdirSync(rawRoot, { recursive: true }).sort();
  const report = JSON.parse(execFileSync(process.execPath, [processor, "process", vault], { encoding: "utf8" }));
  assert.equal(report.processed, 3);
  assert.equal(report.missingAssets, 1);
  assert.deepEqual(readdirSync(rawRoot, { recursive: true }).sort(), rawBefore);
  assert.match(readFileSync(join(vault, "Missing Assets.md"), "utf8"), /missing-example\.png/);
  assert.match(readFileSync(join(vault, "system", "dashboards", "Source Coverage.md"), "utf8"), /coverage fact/);
  const extractionManifests = readdirSync(join(vault, "derived"), { recursive: true })
    .filter((name) => name.endsWith("extraction-manifest.json"));
  assert.equal(extractionManifests.length, 3);
});

test("catalogs external files without copying their contents", () => {
  const root = mkdtempSync(join(tmpdir(), "external-catalog-"));
  const source = join(root, "source");
  const vault = join(root, "vault");
  mkdirSync(join(source, "nested"), { recursive: true });
  writeFileSync(join(source, "note.txt"), "synthetic catalog fixture");
  writeFileSync(join(source, "nested", "table.csv"), "a,b\n1,2\n");
  const report = JSON.parse(execFileSync(process.execPath, [catalog, "catalog", source, "--vault", vault, "--collection", "synthetic-work", "--source-class", "career", "--ownership", "user-work", "--privacy", "confidential", "--hash", "small"], { encoding: "utf8" }));
  assert.equal(report.files, 2);
  const output = join(vault, "sources", "catalog", "synthetic-work");
  const records = readFileSync(join(output, "catalog.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(records.length, 2);
  assert.ok(records.every((record) => record.source_mode === "external-index"));
  assert.ok(records.every((record) => record.sha256));
  assert.equal(existsSync(join(output, "note.txt")), false);
});
