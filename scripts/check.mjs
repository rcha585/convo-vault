#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildContentScript } from "./lib/content-build.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirs = new Set([
  ".git",
  ".convo-vault",
  "dist",
  "node_modules",
  "output",
  "tmp"
]);

const sourceFiles = await collectSourceFiles(repoRoot);
const scriptFiles = sourceFiles.filter((file) => /\.(?:js|mjs)$/i.test(file));
const jsonFiles = sourceFiles.filter((file) => /\.json$/i.test(file));
const expectedContent = await buildContentScript(repoRoot, { write: false });
const actualContent = await fs.readFile(path.join(repoRoot, "content.js"), "utf8");

if (actualContent.replace(/\r\n/g, "\n") !== expectedContent) {
  console.error("content.js is stale. Run npm run build:extension to regenerate it from src/content.");
  process.exit(1);
}

for (const file of jsonFiles) {
  JSON.parse(await fs.readFile(file, "utf8"));
}

for (const file of scriptFiles) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    process.stderr.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    process.exit(result.status || 1);
  }
}

console.log(`Checked ${scriptFiles.length} JavaScript files and ${jsonFiles.length} JSON files.`);

async function collectSourceFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...await collectSourceFiles(path.join(dir, entry.name)));
      }
      continue;
    }

    if (entry.isFile()) {
      files.push(path.join(dir, entry.name));
    }
  }

  return files;
}
