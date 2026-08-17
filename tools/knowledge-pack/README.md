# Knowledge Pack (Raw Pack v0.1)

This local-first importer copies evidence into an Obsidian-compatible Vault without changing the source files. AI-generated material must go to `inbox/`, never `raw/`.

## Quick start

```powershell
npm run knowledge:init -- F:\path\to\vault-private
npm run knowledge:import -- C:\path\to\source --vault F:\path\to\vault-private --render-pdf-pages
```

New imports use the v0.2 paths `sources/raw/selected-files/` and
`sources/raw/conversations/`. The processor also reads legacy `raw/` paths
during migration and deduplicates manifests by item ID.

## External catalogs

Large libraries can be indexed without copying their contents:

```powershell
npm run knowledge:catalog -- D:\path\to\library --vault D:\path\to\vault-private --collection research --source-class research-report --ownership third-party --privacy private --hash none
```

The command writes private JSONL, summary JSON, and an Obsidian index under
`sources/catalog/<collection>/`. `--hash none` is metadata-only; `small` hashes
files up to 16 MiB and `all` reads every file. Cataloging never executes Office
macros or archive contents.

Each imported file receives a stable content-derived ID, SHA-256 hash, immutable source copy, `manifest.json`, and Obsidian `index.md`. Reimporting identical content reports `unchanged`.

Extension ZIP bundles are safely unpacked into `raw/conversations/<year>/<conversation-id>/`. Raw Pack records message IDs, source message IDs, order, asset-to-message references, and whether each expected cached asset is actually present. Archive traversal, encryption, unsupported compression, excessive entry counts, and oversized expanded archives are rejected.

PDF mode preserves the PDF and renders page previews under `assets/pages/`. A zero-byte or unrenderable PDF is retained and marked `needs-review`.

If Poppler is not directly available on `PATH`, set `PDFTOPPM_PATH` to the full path of `pdftoppm.exe` before importing.

## Privacy boundary

- Commit: this tool, documentation, tests, and synthetic fixtures.
- Never commit: `vault-private/` or `vault-private-*`.
- Do not delete an inventory source until counts, byte totals, hashes, links, and a separate backup have been verified.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the implemented boundary and next backend stages.

## Process derived content

```powershell
$env:RAW_PACK_PYTHON = "C:\path\to\python.exe"
npm run knowledge:process -- F:\path\to\vault-private
```

The processor writes only to `derived/` and the generated dashboard
`system/dashboards/Source Coverage.md`. A legacy `Missing Assets.md` redirect is
kept during migration. It extracts searchable TXT/Markdown/JSON, DOCX text,
XLSX sheet structures, and PDF text through bundled or user-provided Python
with `pypdf`. It also scans Markdown asset links and reconciles bundle asset
manifests. Raw source files are never rewritten.

For richer PDF layout, tables, bounding boxes, and extracted images, OpenDataLoader PDF remains the planned optional engine; the current pypdf adapter is a deterministic baseline and Poppler page previews remain the visual fallback.
