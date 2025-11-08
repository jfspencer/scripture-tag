# Annotations Data Directory

This directory contains git-versioned scripture annotations. The app auto-loads annotation files listed in `manifest.json` on startup.

## Structure

```
annotations/
├── manifest.json          # Required: Lists which annotation files to load
├── your-name.json         # Your exported annotations
├── team-member.json       # Shared annotation sets
└── example-annotations.json # Example structure (for reference)
```

## Getting Started

### 1. Create Manifest File

Copy the example manifest:

```bash
cp manifest.json.example manifest.json
```

Edit `manifest.json` to list your annotation files:

```json
{
  "version": "1.0.0",
  "files": [
    "my-annotations.json"
  ]
}
```

### 2. Export Your Annotations

1. Open the scripture-tag app
2. Create tags and annotate scripture
3. Click "Export to Repository" button
4. Save the downloaded file as `my-annotations.json` in this directory
5. Update `manifest.json` to include your file

### 3. Commit to Git

```bash
git add public/data/annotations/
git commit -m "Add my scripture annotations"
git push origin main
```

### 4. Import on Other Devices

1. Pull the latest changes: `git pull origin main`
2. Open the app
3. Annotations automatically import on startup
4. Continue working with merged data

## Collaboration

### Multiple Users

Each person exports their own annotation file:

```json
{
  "files": [
    "alice-annotations.json",
    "bob-annotations.json",
    "charlie-annotations.json"
  ]
}
```

Everyone's annotations will merge in the app. The `userId` field identifies who created each annotation.

### Merge Strategies

The app supports three merge strategies:

- **`merge`** (default): Adds new data, updates existing based on version number
- **`replace`**: Clears all local data and imports fresh from files
- **`skip-existing`**: Only imports annotations with new IDs (doesn't update existing)

### Handling Conflicts

If two people modify the same annotation:

1. **Automatic**: App keeps the version with higher `version` number
2. **Manual**: Resolve conflicts in git before committing
3. **Best Practice**: Assign different books/chapters to different team members

## File Format

Each annotation file is a JSON document with this structure:

```typescript
{
  version: string;           // File format version (e.g., "1.0.0")
  userId: string;            // Identifier for this user/set
  exportDate: string;        // ISO 8601 timestamp
  tags: Tag[];               // Tag definitions
  annotations: TagAnnotation[]; // Word-level annotations
  tagStyles: TagStyle[];     // Presentation styles
}
```

See `example-annotations.json` for a complete example.

## Version Control Benefits

✅ **Full history**: See how your annotations evolved over time  
✅ **Revert changes**: Roll back to previous versions with `git revert`  
✅ **Branching**: Experiment with different annotation approaches  
✅ **Pull requests**: Review team members' annotations before merging  
✅ **Backup**: Your annotations are safely stored in git history  

## Best Practices

1. **Descriptive commits**: `git commit -m "Add covenant theme tags to Genesis"`
2. **Regular exports**: Export your work periodically, not just at the end
3. **Pull before export**: `git pull` to get latest changes before exporting
4. **One file per user**: Keeps git diffs clean and reduces conflicts
5. **Semantic versioning**: Update the `version` field if changing the file format

## Troubleshooting

### Annotations not loading

- Check that `manifest.json` exists and is valid JSON
- Verify your annotation file is listed in `manifest.files`
- Open browser console for error messages

### Merge conflicts in git

```bash
# Accept their version
git checkout --theirs public/data/annotations/conflict-file.json

# Or accept your version
git checkout --ours public/data/annotations/conflict-file.json

# Then mark as resolved
git add public/data/annotations/conflict-file.json
git commit
```

### Version conflicts in app

If you see duplicate annotations with different content, the app kept the newer version (higher `version` number). To force a specific version, manually edit the JSON file before importing.

## Privacy Note

Annotations committed to a public git repository are **publicly visible**. Use private repositories if your annotations contain sensitive notes or personal reflections.

---

**See also**: [Main Architecture Documentation](../../../ARCHITECTURE.md)

