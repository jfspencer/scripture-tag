# Scripture Import Scripts

This directory contains standalone scripts for importing scripture data from external sources into the static JSON format used by the application.

## All Standard Works Import ✅

Import all standard works from churchofjesuschrist.org API.

### Quick Start

```bash
# Test imports
bun run import:test                    # Test Book of Mormon (1 Nephi 1)
bun scripts/test-import-ot.ts          # Test Old Testament (Genesis 1)

# Import individual volumes
bun run import:bofm                    # Book of Mormon (239 chapters)
bun run import:ot                      # Old Testament (929 chapters)
bun run import:nt                      # New Testament (260 chapters)
bun run import:dc                      # Doctrine & Covenants (138 sections)
bun run import:pgp                     # Pearl of Great Price (15 chapters)

# Import everything
bun run import:all                     # All 5 volumes (~1,581 chapters)

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
├── import.ts                          # Main import script
├── generate-manifests.ts              # Generate/regenerate all manifests
├── validate.ts                        # Validation script
├── test-import.ts                     # Test import (single chapter)
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

| Volume | Books | Chapters | Est. Time | Command |
|--------|-------|----------|-----------|---------|
| Book of Mormon | 15 | 239 | ~5 min | `import:bofm` |
| Old Testament | 39 | 929 | ~20 min | `import:ot` |
| New Testament | 27 | 260 | ~6 min | `import:nt` |
| D&C | 1 | 138 | ~3 min | `import:dc` |
| Pearl of Great Price | 5 | 15 | ~1 min | `import:pgp` |
| **ALL VOLUMES** | **87** | **1,581** | **~35 min** | `import:all` |

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

