# Scripture Validation

This document describes how to validate imported scripture data against the original HTML source from churchofjesuschrist.org.

## Overview

The validation system ensures that imported JSON files accurately represent the source HTML by:

1. Fetching the original HTML from the Church API
2. Parsing verses from the HTML using the same logic as the importer
3. Comparing the parsed source verses with the imported JSON data
4. Reporting any discrepancies in verse numbers, text, or structure

## Usage

### Validate All Scripture

```bash
bun run validate:all
# or
npm run validate:all
```

### Validate Specific Volumes

```bash
# Book of Mormon
bun run validate:bofm

# Old Testament
bun run validate:ot

# New Testament
bun run validate:nt

# Doctrine and Covenants
bun run validate:dc

# Pearl of Great Price
bun run validate:pgp
```

### Validate Single Chapter

```bash
# Format: --book=<book-id> --chapter=<chapter-number>
bun scripts/validate.ts --book=1-ne --chapter=1
bun scripts/validate.ts --book=gen --chapter=1
bun scripts/validate.ts --book=matt --chapter=5
```

## What Gets Validated

### Verse Count
- Ensures the number of verses in the JSON matches the source HTML

### Verse Numbers
- Verifies verse numbers are sequential and match the source

### Verse Text
- Compares the reconstructed text from tokens with the source text
- Normalizes whitespace, apostrophes, and quotes for comparison
- Reports exact differences when mismatches occur

### Token Integrity
- Warns if verses have no tokens
- Validates that tokens can be reconstructed into the original text

## Validation Results

### Success (✅)
All verses match the source exactly. The imported data is accurate.

### Failure (❌)
One or more verses don't match the source. Review the error messages for specifics.

### Warnings (⚠️)
Non-critical issues that should be reviewed but don't indicate incorrect data.

## Example Output

```
📖 Scripture Validation Process Starting...

============================================================

📚 VALIDATING THE BOOK OF MORMON
============================================================

📖 1 Nephi...
  Validating 1-ne 1...
  ✅ Passed
  Validating 1-ne 2...
  ✅ Passed
  ...

============================================================
VALIDATION SUMMARY
============================================================
Total Chapters: 239
✅ Passed: 239
❌ Failed: 0

============================================================
✅ ALL VALIDATIONS PASSED!
============================================================
```

## Troubleshooting

### "Failed to fetch source"
- Check your internet connection
- Verify the Church API is accessible
- The API might be temporarily unavailable

### "Imported chapter file not found"
- Run the import script first: `bun run import:all`
- Verify the book ID and chapter number are correct
- Check that files exist in `public/scripture/translations/`

### "Text mismatch"
- This indicates the imported text differs from the source
- Review the specific verse in the error message
- May need to re-import that chapter

## Integration with CI/CD

You can add validation to your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Validate Scripture Data
  run: bun run validate:all
```

This ensures imported data remains accurate after updates.

## Architecture

### Files

- `scripts/validate.ts` - Main validation script with CLI interface
- `scripts/importer/services/validator.ts` - Validation logic and comparison functions

### Key Functions

- `validateChapter()` - Validates a single chapter
- `validateBook()` - Validates all chapters in a book
- `validateVolume()` - Validates all books in a volume
- `parseSourceVerses()` - Extracts verses from HTML source
- `reconstructVerseText()` - Rebuilds text from JSON tokens
- `normalizeText()` - Normalizes text for comparison

## Future Enhancements

Potential improvements to the validation system:

- [ ] Validate chapter headings and summaries
- [ ] Validate section markers and divisions
- [ ] Validate presentation metadata (paragraphs, indentation, etc.)
- [ ] Cache source HTML to reduce API calls
- [ ] Generate validation reports in JSON/HTML format
- [ ] Automated validation on import completion
- [ ] Fuzzy matching for minor formatting differences

