#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

function walk(path) {
  if (!existsSync(path)) return [];
  if (statSync(path).isFile()) return path.toLowerCase().endsWith(".md") ? [path] : [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? walk(child) : entry.isFile() && entry.name.toLowerCase().endsWith(".md") ? [child] : [];
  });
}

const [vaultArg] = process.argv.slice(2);
if (!vaultArg) throw new Error("Usage: review-audit.mjs <vault>");
const vault = resolve(vaultArg);
const files = ["knowledge", "methods", "mind"].flatMap((area) => walk(join(vault, area)));
const notes = [];

for (const path of files) {
  const content = readFileSync(path, "utf8");
  const decisions = [...content.matchAll(/^- \[([ xX])\] `decision:([^`]+)`/gm)].map((match) => ({
    decision: match[2],
    selected: match[1].toLowerCase() === "x",
  }));
  if (!decisions.length) continue;
  const selected = decisions.filter((item) => item.selected).map((item) => item.decision);
  const property = /^review_status:\s*(.+)$/m.exec(content)?.[1]?.trim() || null;
  notes.push({
    note: relative(vault, path).replace(/\\/g, "/"),
    review_status: property,
    selected,
    valid: selected.length <= 1,
  });
}

const invalid = notes.filter((note) => !note.valid);
console.log(JSON.stringify({
  version: "review-audit/0.1",
  notesWithReview: notes.length,
  pendingDecision: notes.filter((note) => note.selected.length === 0).length,
  selectedDecision: notes.filter((note) => note.selected.length === 1).length,
  invalid: invalid.length,
  notes,
}, null, 2));
if (invalid.length) process.exitCode = 1;
