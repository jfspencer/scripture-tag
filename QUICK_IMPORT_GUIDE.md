# Quick Import Guide

## 🚀 Ready to Import All Standard Works!

The import system is **fully implemented and tested** for all LDS standard works.

## One-Command Import

```bash
# Import everything (takes ~35 minutes)
bun run import:all
```

This will import:
- ✅ Book of Mormon (239 chapters, ~6,604 verses)
- ✅ Old Testament (929 chapters, ~23,145 verses)
- ✅ New Testament (260 chapters, ~7,957 verses)
- ✅ Doctrine & Covenants (138 sections, ~3,409 verses)
- ✅ Pearl of Great Price (15 chapters, ~339 verses)

**Total**: 1,581 chapters, ~41,454 verses

## Individual Volume Imports

```bash
# Start with the smallest to test
bun run import:pgp        # Pearl of Great Price (~1 min)

# Then the standard works
bun run import:bofm       # Book of Mormon (~5 min)
bun run import:nt         # New Testament (~6 min)
bun run import:dc         # Doctrine & Covenants (~3 min)
bun run import:ot         # Old Testament (~20 min)
```

## Test First

```bash
# Test Book of Mormon (1 Nephi 1)
bun run import:test

# Test Old Testament (Genesis 1)
bun scripts/test-import-ot.ts
```

## What Gets Imported

### Book of Mormon
- 15 books from 1 Nephi through Moroni
- Full word-level tokenization
- Chapter headings and summaries
- Proper nouns and divine names detected

### Old Testament (KJV)
- 39 books from Genesis through Malachi
- Law (5), History (12), Wisdom (5), Prophets (17)
- Public domain text
- Full tokenization with semantic markup

### New Testament (KJV)
- 27 books from Matthew through Revelation
- Gospels (4), Acts (1), Epistles (21), Revelation (1)
- Red-letter words of Christ (via semantic detection)
- Public domain text

### Doctrine & Covenants
- 138 sections of modern revelation
- Church history and doctrine
- Full tokenization

### Pearl of Great Price
- Moses, Abraham, Joseph Smith writings
- Articles of Faith
- Ancient and modern scripture

## Output Location

All scripture data saves to:
```
public/scripture/
├── manifest.json                    # Master index
└── translations/
    ├── bofm/                        # Book of Mormon
    │   ├── 1-ne/
    │   │   ├── chapter-1.json
    │   │   └── ...
    │   └── ...
    ├── kjv/                         # Bible (OT + NT)
    │   ├── gen/
    │   │   ├── chapter-1.json
    │   │   └── ...
    │   └── ...
    ├── dc/                          # Doctrine & Covenants
    │   └── dc/
    │       ├── chapter-1.json
    │       └── ...
    └── pgp/                         # Pearl of Great Price
        ├── moses/
        ├── abr/
        └── ...
```

## Recommended Import Order

1. **Test first**: `bun run import:test`
2. **Start small**: `bun run import:pgp` (fastest)
3. **Book of Mormon**: `bun run import:bofm` (core text)
4. **New Testament**: `bun run import:nt` (frequently referenced)
5. **Doctrine & Covenants**: `bun run import:dc`
6. **Old Testament**: `bun run import:ot` (largest, do last or overnight)

## Or Just Do It All

```bash
# Go get coffee ☕, takes ~35 minutes
bun run import:all
```

## Data Quality

Each verse includes:
- ✅ Unique ID (`book.chapter.verse`)
- ✅ Word-level tokens with positions
- ✅ Punctuation preservation
- ✅ Divine name detection (LORD, God)
- ✅ Proper noun detection (Nephi, Jerusalem)
- ✅ Chapter headings and summaries
- ✅ Presentation metadata (prose, poetry, etc.)

## After Import

Verify the import:
```bash
# Check file count
find public/scripture -name "*.json" | wc -l
# Should show ~1,582 files (1,581 chapters + 1 manifest)

# Check a sample file
cat public/scripture/translations/bofm/1-ne/chapter-1.json | jq '.verses | length'
# Should show 20 (verses in 1 Nephi 1)
```

## Need Help?

- See `scripts/README.md` for detailed documentation
- See `IMPORT_COMPLETE.md` for technical details
- Each test script verifies the importer works

---

**Ready?** Just run: `bun run import:all` 🎉

