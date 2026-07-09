#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createZipFromDirectory } from "./lib/simple-zip.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const options = parseArgs(process.argv.slice(2));
const outRoot = path.resolve(repoRoot, options.outDir || "dist");
const extensionDir = path.join(outRoot, "convo-vault-extension");
const zipPath = path.join(outRoot, "convo-vault-extension.zip");

const extensionFiles = [
  "manifest.json",
  "background.js",
  "content.js",
  "popup.html",
  "popup.css",
  "popup.js"
];

const iconFiles = [
  "icon-16.png",
  "icon-32.png",
  "icon-48.png",
  "icon-128.png"
];

await fs.rm(extensionDir, { recursive: true, force: true });
await fs.mkdir(extensionDir, { recursive: true });

for (const file of extensionFiles) {
  await copyRequired(path.join(repoRoot, file), path.join(extensionDir, file));
}

const iconOutputDir = path.join(extensionDir, "assets", "icons");
await fs.mkdir(iconOutputDir, { recursive: true });

for (const file of iconFiles) {
  await copyRequired(path.join(repoRoot, "assets", "icons", file), path.join(iconOutputDir, file));
}

await fs.rm(zipPath, { force: true });
await createZipFromDirectory(extensionDir, zipPath);

console.log(`Extension folder: ${extensionDir}`);
console.log(`Extension zip:    ${zipPath}`);
console.log("");
console.log("Chrome development mode still uses Load unpacked with the extension folder.");
console.log("Use the zip for sharing or archiving; unzip it before Load unpacked if needed.");

async function copyRequired(source, destination) {
  try {
    await fs.copyFile(source, destination);
  } catch (error) {
    throw new Error(`Missing or unreadable extension file: ${source}`);
  }
}

function parseArgs(args) {
  const parsed = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--out-dir" || arg === "--outDir") {
      parsed.outDir = args[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}
