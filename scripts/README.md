# Scripture Import Scripts

This directory contains standalone scripts for importing scripture data from external sources into the static JSON format used by the application.

## All Standard Works Import ✅

Import all standard works from churchofjesuschrist.org API.

### Quick Start

```bash
# Test imports
bun run import:test                    # Test Book of Mormon (1 Nephi 1)
bun scripts/test-import-ot.ts          # Test Old Testament (Genesis 1)

# Import individual volumes (sequential)
bun run import:bofm                    # Book of Mormon (239 chapters)
bun run import:ot                      # Old Testament (929 chapters)
bun run import:nt                      # New Testament (260 chapters)
bun run import:dc                      # Doctrine & Covenants (138 sections)
bun run import:pgp                     # Pearl of Great Price (15 chapters)

# Import everything (sequential)
bun run import:all                     # All 5 volumes (~1,581 chapters)

# ⚡ PARALLEL IMPORT (3-5x faster!)
bun run parallel:import                # All volumes with default settings
bun run parallel:import:all            # All volumes (explicit)
bun run parallel:import:bofm           # Book of Mormon only
bun run parallel:import:ot             # Old Testament only
bun run parallel:import:nt             # New Testament only
bun run parallel:import:dc             # D&C only
bun run parallel:import:pgp            # Pearl of Great Price only

# Parallel import with performance profiles
bun run parallel:import:conservative   # Slower but safer (1 volume, 3 books, 5 chapters)
bun run parallel:import                # Balanced (3 volumes, 5 books, 10 chapters)
bun run parallel:import:aggressive     # Faster but riskier (5 volumes, 10 books, 20 chapters)

# Regenerate manifests (from volume configs)
bun scripts/generate-manifests.ts      # Regenerate all volume and root manifests

# Validate imports against source
bun run validate:bofm                  # Validate Book of Mormon
bun run validate:ot                    # Validate Old Testament
bun run validate:nt                    # Validate New Testament
bun run validate:dc                    # Validate Doctrine & Covenants
bun run validate:pgp                   # Validate Pearl of Great Price
bun run validate:all                   # Validate all volumes

# Validate single chapter
bun scripts/validate.ts --book=1-ne --chapter=1
bun scripts/validate.ts --book=gen --chapter=1
bun scripts/validate.ts --book=matt --chapter=5
```

### Directory Structure

```
scripts/
├── import.ts                          # Main import script (sequential)
├── parallel-import-orchestrator.ts    # ⚡ Parallel import orchestrator
├── generate-manifests.ts              # Generate/regenerate all manifests
├── validate.ts                        # Validation script
├── test-import.ts                     # Test import (single chapter)
├── PARALLEL_IMPORT.md                 # Parallel import documentation
└── importer/
    ├── types.ts                       # TypeScript data structures
    ├── utils/
    │   ├── tokenization.ts            # Word-level tokenization
    │   └── presentationInference.ts   # Presentation metadata inference
    └── services/
        ├── genericImporter.ts         # Generic API fetcher and parser
        ├── importPipeline.ts          # Import orchestration
        └── validator.ts               # Validation service
```

### What It Does

#### Import Process
1. **Fetches** scripture text from churchofjesuschrist.org API
2. **Parses** HTML content to extract verses and metadata
3. **Tokenizes** each verse into individual words with punctuation
4. **Infers** presentation metadata (paragraphs, poetry, quotations, etc.)
5. **Saves** each chapter as a separate JSON file in `public/scripture/translations/`
6. **Generates** volume-specific manifest in the translation directory
7. **Updates** root manifest by aggregating all volume manifests

#### Manifest System
Each volume maintains its own `manifest.json` file:
- `public/scripture/translations/bofm/manifest.json` - Book of Mormon
- `public/scripture/translations/kjv/manifest.json` - King James Version (OT+NT)
- `public/scripture/translations/dc/manifest.json` - Doctrine and Covenants
- `public/scripture/translations/pgp/manifest.json` - Pearl of Great Price

The root manifest (`public/scripture/manifest.json`) automatically aggregates all volume
manifests. This ensures that importing one volume doesn't overwrite the metadata for others.

#### Validation Process
1. **Fetches** original HTML source from churchofjesuschrist.org API
2. **Parses** verses using the same logic as the importer
3. **Loads** imported JSON files from the file system
4. **Reconstructs** verse text from tokens (including punctuation)
5. **Compares** source text with imported text
6. **Reports** any discrepancies in verse numbers, counts, or text content

### Output Format

Scripture data is saved to:
```
public/scripture/
├── manifest.json                      # Root manifest (aggregates all volumes)
└── translations/
    ├── bofm/
    │   ├── manifest.json              # BoM-specific manifest
    │   ├── 1-ne/
    │   │   ├── chapter-1.json
    │   │   ├── chapter-2.json
    │   │   └── ...
    │   ├── 2-ne/
    │   └── ...
    ├── kjv/
    │   ├── manifest.json              # KJV-specific manifest
    │   ├── gen/
    │   └── ...
    ├── dc/
    │   ├── manifest.json              # D&C-specific manifest
    │   └── ...
    └── pgp/
        ├── manifest.json              # PGP-specific manifest
        └── ...
```

### Features

- ✅ Word-level tokenization (68 tokens in 1 Nephi 1:1)
- ✅ Presentation metadata (paragraphs, indentation, layout types)
- ✅ Chapter headings and summaries extracted from HTML
- ✅ HTML parsing with cheerio (study notes stripped, text preserved)
- ✅ Proper noun detection (Nephi, Jerusalem, etc.)
- ✅ Divine name detection (Lord, God, etc.)
- ✅ Punctuation preservation (commas, periods, semicolons)
- ✅ **Validation against source HTML** - Ensures import accuracy
- ⏳ Section headings within chapters - Phase 1.1
- ⏳ Original language data (Hebrew/Greek) - Phase 3

### Volumes Available

| Volume | Books | Chapters | Sequential | Parallel (Default) | Command |
|--------|-------|----------|------------|-------------------|---------|
| Book of Mormon | 15 | 239 | ~5 min | ~1-2 min | `parallel:import:bofm` |
| Old Testament | 39 | 929 | ~20 min | ~4-6 min | `parallel:import:ot` |
| New Testament | 27 | 260 | ~6 min | ~2-3 min | `parallel:import:nt` |
| D&C | 1 | 138 | ~3 min | ~1 min | `parallel:import:dc` |
| Pearl of Great Price | 5 | 15 | ~1 min | ~20 sec | `parallel:import:pgp` |
| **ALL VOLUMES** | **87** | **1,581** | **~35 min** | **~8-12 min** | `parallel:import` |

**Performance Profiles:**
- **Conservative**: ~15-20 minutes (safer, lower API load)
- **Default**: ~8-12 minutes (balanced, recommended)
- **Aggressive**: ~5-8 minutes (faster, higher API load)

## Parallel Import Orchestrator ⚡

The parallel import orchestrator is a high-performance wrapper around the existing import pipeline that enables concurrent processing at multiple levels.

### Key Features

- **Multi-level Parallelization**: Concurrent processing of volumes, books, and chapters
- **Intelligent Concurrency Control**: Configurable limits to respect API rate limits
- **Automatic Retry Logic**: Failed requests are automatically retried (up to 3 times)
- **Real-time Progress Tracking**: Live statistics on import progress, speed, and ETA
- **Respectful API Usage**: Built-in delays and rate limiting
- **Non-invasive Design**: Works on top of existing code without modifications

### Architecture

```
┌─────────────────────────────────────────┐
│   Volume Pool (3 concurrent)            │
│  ┌─────────────────────────────────────┐│
│  │ Book Pool (5 concurrent per volume) ││
│  │ ┌──────────────────────────────────┐││
│  │ │ Chapter Pool (10 concurrent)     │││
│  │ │  - Fetch from API                │││
│  │ │  - Parse data                    │││
│  │ │  - Save to file                  │││
│  │ │  - Track progress                │││
│  │ └──────────────────────────────────┘││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### Usage Examples

```bash
# Import all volumes with default settings (recommended)
bun run parallel:import

# Import specific volume
bun run parallel:import:bofm

# Use conservative profile (slower connection)
bun run parallel:import:conservative

# Use aggressive profile (fast connection, use with caution)
bun run parallel:import:aggressive
```

### Progress Display

```
======================================================================
📊 PROGRESS: 45.2%
======================================================================
Volumes: 2/5
Books:   15/239
Chapters: 542/1200 (3 failed)
Speed:    12.5 chapters/sec
Elapsed:  43s
Remaining: 52s
======================================================================
```

For detailed documentation, see [PARALLEL_IMPORT.md](./PARALLEL_IMPORT.md).

### Next Steps

1. **Phase 2 Complete!** ✅ All standard works now supported
2. **Phase 3**: Add modern translations (ESV, NIV, etc.) with proper licensing
3. **Phase 4**: Add cross-references and footnotes

### Notes

- The import scripts are completely separate from the SolidJS application code
- They run at build time to generate static JSON files
- No dependencies are needed at runtime in the app
- API rate limiting: 100ms delay between requests to be respectful

## API Response Structure (Book of Mormon)

The Church API returns HTML in `content.body` with:
- Chapter headings in `<header>`
- Verses in `<p class="verse">` tags with `data-aid` attributes
- Verse numbers in `<span class="verse-number">`
- Study notes as `<a class="study-note-ref">` links (need to be stripped)

See `debug-api-response.json` for full example response.

