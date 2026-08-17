#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";

const VERSION = "external-catalog/0.1";

function usage(message) {
  if (message) console.error(message);
  console.error("Usage: catalog.mjs catalog <source> --vault <vault> --collection <slug> --source-class <class> --ownership <class> --privacy <class> [--hash none|small|all]");
  process.exitCode = 2;
}

function option(args, name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

function slug(value) {
  const result = value.normalize("NFKC").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!result) throw new Error("Collection must contain at least one portable character");
  return result;
}

function idFor(collection, relativePath) {
  return `source:${createHash("sha256").update(`${collection}\0${relativePath}`).digest("hex").slice(0, 24)}`;
}

function walk(root) {
  const result = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) result.push(path);
    }
  };
  visit(root);
  return result.sort((a, b) => a.localeCompare(b));
}

function hashFile(path) {
  return new Promise((resolveHash, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolveHash(hash.digest("hex")));
  });
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main(argv) {
  const [command, sourceArg, ...rest] = argv;
  if (command !== "catalog" || !sourceArg) return usage();
  const source = resolve(sourceArg);
  const vaultArg = option(rest, "--vault");
  const collectionArg = option(rest, "--collection");
  const sourceClass = option(rest, "--source-class");
  const ownership = option(rest, "--ownership");
  const privacy = option(rest, "--privacy");
  const hashMode = option(rest, "--hash", "none");
  if (!vaultArg || !collectionArg || !sourceClass || !ownership || !privacy) return usage("Missing required option");
  if (!existsSync(source) || !statSync(source).isDirectory()) return usage(`Source directory does not exist: ${source}`);
  if (!new Set(["none", "small", "all"]).has(hashMode)) return usage("--hash must be none, small, or all");

  const collection = slug(collectionArg);
  const vault = resolve(vaultArg);
  const output = join(vault, "sources", "catalog", collection);
  mkdirSync(output, { recursive: true });
  const files = walk(source);
  const records = [];
  for (const path of files) {
    const info = statSync(path);
    const relativePath = relative(source, path).replace(/\\/g, "/");
    const shouldHash = hashMode === "all" || (hashMode === "small" && info.size <= 16 * 1024 * 1024);
    records.push({
      schema_version: "0.2",
      id: idFor(collection, relativePath),
      type: "external-file",
      collection,
      source_class: sourceClass,
      ownership,
      source_mode: "external-index",
      privacy,
      allowed_uses: privacy === "confidential" ? ["archive", "search"] : ["archive", "search", "retrieval"],
      training_policy: ownership === "third-party" ? "retrieval-only" : "review-required",
      original_path: path,
      relative_path: relativePath,
      name: basename(path),
      extension: extname(path).toLowerCase() || null,
      size_bytes: info.size,
      created_at: info.birthtime.toISOString(),
      modified_at: info.mtime.toISOString(),
      sha256: shouldHash ? await hashFile(path) : null,
      fingerprint_status: shouldHash ? "sha256" : "metadata-only",
    });
  }

  const extensions = Object.fromEntries([...new Set(records.map((record) => record.extension || "[none]"))].sort().map((extension) => [extension, records.filter((record) => (record.extension || "[none]") === extension).length]));
  const generatedAt = new Date().toISOString();
  const summary = { version: VERSION, generated_at: generatedAt, collection, source_root: source, source_class: sourceClass, ownership, privacy, hash_mode: hashMode, files: records.length, bytes: records.reduce((sum, record) => sum + record.size_bytes, 0), extensions };
  writeFileSync(join(output, "catalog.jsonl"), `${records.map((record) => JSON.stringify(record)).join("\n")}\n`, "utf8");
  writeJson(join(output, "summary.json"), summary);
  const rows = Object.entries(extensions).map(([extension, count]) => `| ${extension} | ${count} |`).join("\n");
  writeFileSync(join(output, "index.md"), `---\ntype: external-catalog\ncollection: ${collection}\nsource_class: ${sourceClass}\nownership: ${ownership}\nprivacy: ${privacy}\nfiles: ${records.length}\nbytes: ${summary.bytes}\nupdated: ${generatedAt}\n---\n\n# ${collection}\n\n> [!info] External index\n> Originals remain at their existing location. This catalog does not copy, modify, or authorize training on them.\n\n| Extension | Files |\n| --- | ---: |\n${rows}\n`, "utf8");
  console.log(JSON.stringify({ status: "cataloged", output, ...summary }, null, 2));
}

main(process.argv.slice(2)).catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
