# Experimental vault migration plan v0.2

Status: **compatibility migration executed; legacy paths retained**

Inventory date: 2026-07-17. Source: local read-only scan of `vault-private-experiment`.

## Baseline

| Area | Files | Bytes |
| --- | ---: | ---: |
| Entire vault | 824 | 173,996,135 |
| `raw/` | 343 | 157,476,182 |
| `derived/` | 432 | 5,053,053 |
| `.obsidian/` | 26 | 11,417,861 |
| `logs/` | 10 | 32,332 |
| Other notes/templates/config | 13 | 16,707 |

`raw/imports` contains 106 item directories: 42 from 2021, 45 from 2022, 12 from 2023, 1 from 2025 and 6 from 2026. `raw/conversations` contains one structured conversation directory. Counts describe files, not semantic completeness.

## Path mapping

| Current path | Target path | Action | Verification |
| --- | --- | --- | --- |
| `raw/conversations/` | `sources/raw/conversations/` | Copy in migration staging; preserve bundle IDs | item count, hashes, message/attachment links |
| `raw/imports/` | `sources/raw/selected-files/` | Copy in staging; preserve item directory names and manifests | item count, bytes, SHA-256 |
| `derived/` | `derived/` with later domain subfolders | Keep initially; classify by source ID after schema adapter exists | source references and file counts |
| `HOME.md` | `system/HOME.md` | Copy and update links only after paths exist | open links and dashboard queries |
| `Needs Review.md` | `system/dashboards/Needs Review.md` | Regenerate from status fields | query results match baseline |
| `Missing Assets.md` | `system/dashboards/Source Coverage.md` | Replace recovery framing with neutral coverage states | present/reference-only/not-in-snapshot totals |
| `templates/` | `system/templates/` | Copy and update Properties to v0.2 | template creation test |
| `Collections/原创文章.md` | `applications/writing/Published Writing.md` | Copy; replace folder-name inference with configured collection metadata | 99 imported writing records remain discoverable |
| `inbox/` | `inbox/` | Keep; add schema/status on next compiler pass | no draft promoted automatically |
| `playbooks/` | `methods/playbooks/` | Create target; current source is empty | directory exists |
| `skills/` | `methods/skills/` | Create target; current source is empty | directory exists |
| `outputs/` | `outputs/` | Keep; current source is empty | no-op |
| `logs/` | `logs/` | Keep private; rotate only under separate policy | count and retention check |
| `wiki/` | `knowledge/` | Replace empty legacy path with typed knowledge folders | schema/template check |
| `Excalidraw/` | `assets/diagrams/` or configured Excalidraw folder | Copy after plugin setting is updated | drawing opens correctly |
| `.obsidian/` | `.obsidian/` | Preserve in place; change settings only after content migration | plugins, CSS and links load |
| `.claudian/`, `.claude/` | private legacy configuration | Do not migrate into knowledge areas | remain disabled/excluded |
| `.raw-pack.json` | `system/configuration/raw-pack.json` | Keep compatibility copy until importer supports v0.2 | importer init/import regression tests |
| `README.md` | `system/README.md` | Rewrite as private vault operating guide | links and policies reviewed |

## Migration sequence

1. Create the empty v0.2 directory tree alongside current folders.
2. Produce a machine-readable pre-migration inventory with relative path, size and SHA-256.
3. Copy raw items into staging targets without deleting current paths.
4. Validate counts, byte totals, hashes and manifest references.
5. Add schema-compatible metadata adapters; do not rewrite immutable source files.
6. Copy/regenerate dashboards and templates, then test Obsidian links and Dataview queries.
7. Switch importer output paths only after automated tests cover both old and new layouts.
8. Keep legacy paths during a defined compatibility period.
9. Propose legacy cleanup separately. Cleanup is never part of migration approval.

## Compatibility migration completed

- Removed personal folder-name inference; new imports receive explicit classification options.
- Replaced recovery framing with `system/dashboards/Source Coverage.md` while retaining a legacy redirect.
- New imports write to `sources/raw/selected-files` and `sources/raw/conversations`.
- The processor reads both v0.2 and legacy Raw paths and deduplicates by item ID.
- Legacy Raw was copied to v0.2 Raw and verified by file count, byte total and SHA-256; legacy paths were not deleted.
- Added a JSONL external-catalog implementation and a synthetic regression test.

## Acceptance criteria

- No original external file or current raw file is deleted, renamed or modified.
- Every migrated source retains its ID, byte size and SHA-256.
- All structured conversations retain message order, message IDs and attachment availability.
- The 99 previously imported writing documents remain discoverable without relying on a personal folder-name rule.
- Dashboards show equivalent or better status coverage.
- Private paths and content remain ignored by Git.
- Full project tests pass before any path switch.

## Rollback

Until acceptance is complete, rollback means changing configuration back to the current paths. Because the migration stage only copies and generates new indexes, rollback does not require restoring deleted data.
