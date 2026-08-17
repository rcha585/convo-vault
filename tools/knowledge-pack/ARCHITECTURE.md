# Knowledge pipeline boundaries

## Implemented

1. **Raw file import (v0.1)** preserves mixed files, hashes them, detects duplicates, builds Obsidian notes, and optionally renders PDF page previews.
2. **Conversation bundle import (v0.2)** safely expands extension ZIPs, derives the ChatGPT conversation ID, preserves message/source-message IDs and order, maps asset references, and reports missing or reference-only assets.

## Next backend stages

1. **Asset recovery (v0.3 baseline shipped)** inventories Markdown links and creates explicit recovery jobs for missing cache paths. PDF page images must be labeled `derived`, never `original`.
2. **Format adapters (v0.3 baseline shipped)** extract searchable text and metadata from DOCX, XLSX, legacy TXT, Markdown, PDF, and JSON into `derived/`. Source files remain unchanged. OpenDataLoader PDF is the planned rich-layout engine.
3. **Review queue (v0.3 baseline shipped)** exposes raw, derived, missing-asset, and inbox states through Dataview dashboards.
4. **Codex-assisted compiler** reads raw evidence and writes summaries, topics, entities, decisions, and questions only under `inbox/<item-id>/`, with message-level citations.
5. **Promotion** moves reviewed drafts into `wiki/`, `playbooks/`, or `skills/`. It never overwrites raw evidence.

## Deferred until rules are stable

- Model API batch processing and cost controls.
- Obsidian MCP operations.
- Automatic wiki promotion.
- Source deletion.

API automation should implement the same compiler contract proven through supervised Codex runs; it is not a separate knowledge model.
