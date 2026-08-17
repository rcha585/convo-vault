# Vault structure v0.2

Status: **approved target; migration not yet executed**

## Design goals

1. Preserve original evidence and provenance.
2. Separate machine-generated material from human-approved knowledge.
3. Keep user-authored, user-work, third-party, and AI-generated material distinguishable.
4. Support Obsidian without forcing large binaries or high-volume indexes into Markdown.
5. Export clean, policy-filtered datasets for RAG, evaluation, or training later.

## Three physical layers

| Layer | Purpose | Git policy |
| --- | --- | --- |
| Public repository | Code, schemas, empty templates, documentation, synthetic fixtures | May be committed after review |
| Private vault | Personal indexes, extracted content, reviews, knowledge and applications | Never commit |
| External originals | Existing work folders, reports, media and archives | Never move or modify automatically |

## Canonical private vault layout

```text
vault-private-*/
├── system/
│   ├── dashboards/
│   ├── templates/
│   ├── configuration/
│   └── privacy/
├── sources/
│   ├── catalog/
│   │   ├── conversations/
│   │   ├── personal-work/
│   │   ├── career/
│   │   └── research/
│   └── raw/
│       ├── conversations/
│       └── selected-files/
├── derived/
│   ├── conversations/
│   ├── writing/
│   ├── career/
│   ├── research/
│   └── media/
├── knowledge/
│   ├── concepts/
│   ├── topics/
│   ├── entities/
│   ├── timelines/
│   ├── claims/
│   └── relationships/
├── applications/
│   ├── career/
│   ├── writing/
│   ├── investment/
│   ├── finance-accounting/
│   ├── family-wealth/
│   └── personal-ai/
├── methods/
│   ├── playbooks/
│   ├── checklists/
│   ├── templates/
│   └── skills/
├── datasets/
│   ├── rag/
│   ├── training/
│   ├── preference/
│   └── evaluation/
├── inbox/
├── outputs/
├── assets/
└── logs/
```

## Directory contracts

- `sources/catalog`: metadata and links for originals that remain outside the vault. Cataloging does not imply copying or permission to train.
- `sources/raw`: immutable snapshots intentionally copied into the vault. Re-import creates a new version or reports unchanged; it never overwrites evidence.
- `derived`: deterministic or AI-assisted extraction. Every item cites a source ID and is disposable/rebuildable.
- `knowledge`: human-approved claims, concepts, timelines and relationships. Approval does not change source ownership.
- `applications`: task-specific views such as resume evidence, investment research or writing assistance. These are not new sources.
- `methods`: reusable human-readable procedures. A Skill is promoted only after its evidence and safety checks are reviewed.
- `datasets`: generated exports with explicit purpose and policy. It is not a dumping ground for vault content.
- `inbox`: unapproved drafts and compiler output.
- `assets`: derived visuals and vault UI assets, never an unlabelled substitute for missing originals.

## Storage decision table

| Information | Canonical storage | Obsidian representation |
| --- | --- | --- |
| Original PDF, Office file, archive, audio or video | Original path or immutable raw snapshot | Source card with link and provenance |
| Conversation message graph | JSON | Markdown reading view plus message anchors |
| High-volume file catalog, hashes and processing state | SQLite or JSONL | Dashboard/query result, not one note per trivial record |
| Human-reviewed concept, experience, claim or project | Markdown with Properties | Native note and links |
| Spreadsheet data and formulas | Original XLSX/XLSM/CSV; macros never executed during import | Summary and audit metadata |
| Small stable comparison | Markdown table | Native note |
| Extracted tables at scale | JSON/CSV/Parquet | Linked preview or selected table |
| Necessary diagram or relationship map | Mermaid, Excalidraw or image | Embedded visual linked to source IDs |
| RAG chunks and training records | JSONL/Parquet | Dataset manifest only |
| Executable Skill | `SKILL.md`, scripts and references | Skill overview note |

## Obsidian responsibilities

Obsidian is the human review and navigation surface. Properties, backlinks and search are foundational. Dataview/Bases render indexes; they are not the source of truth. Templater creates consistent notes. Excalidraw is reserved for relationships that are materially clearer visually. Styling plugins must never be required to interpret the data.

## Invariants

1. A source ID remains stable across views and migrations.
2. Raw evidence is never edited by a compiler.
3. Derived content always records its source IDs, method, version and timestamp.
4. External paths are never treated as portable public data.
5. Third-party material cannot silently become user-authored material.
6. Missing historical attachments are coverage facts, not automatic recovery tasks.
7. Destructive cleanup requires a separate verified backup and explicit user approval.
