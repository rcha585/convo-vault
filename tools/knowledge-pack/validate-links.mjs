#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";

function walk(path) {
  if (!existsSync(path)) return [];
  if (statSync(path).isFile()) return extname(path).toLowerCase() === ".md" ? [path] : [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? walk(child) : entry.isFile() && extname(child).toLowerCase() === ".md" ? [child] : [];
  });
}

const [vaultArg, ...scopeArgs] = process.argv.slice(2);
if (!vaultArg) throw new Error("Usage: validate-links.mjs <vault> [relative-scope ...]");
const vault = resolve(vaultArg);
const allNotes = walk(vault);
const byBasename = new Map();
for (const path of allNotes) {
  const key = basename(path, ".md");
  if (!byBasename.has(key)) byBasename.set(key, []);
  byBasename.get(key).push(path);
}
const scope = scopeArgs.length ? scopeArgs.flatMap((item) => walk(join(vault, item))) : allNotes;
const unresolved = [];
let checked = 0;
for (const path of scope) {
  const content = readFileSync(path, "utf8");
  for (const match of content.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)) {
    const target = match[1].trim();
    checked += 1;
    if (target.includes("/") || target.includes("\\")) {
      const candidate = join(vault, `${target.replace(/\\/g, "/")}.md`);
      if (!existsSync(candidate)) unresolved.push({ source: relative(vault, path).replace(/\\/g, "/"), target });
    } else if (!byBasename.has(target)) {
      unresolved.push({ source: relative(vault, path).replace(/\\/g, "/"), target });
    }
  }
}
console.log(JSON.stringify({ vault, notes: scope.length, linksChecked: checked, unresolvedCount: unresolved.length, unresolved }, null, 2));
if (unresolved.length) process.exitCode = 1;
