# Git Setup Guide

This guide explains how to configure git for managing scripture annotations.

## Repository Setup Options

You have two main options for managing your annotations with git:

### Option 1: Commit Annotations to Repository (Recommended)

**Use this if:**
- You want full version control of your annotations
- You want to collaborate with others
- You want to sync across devices
- You're comfortable with annotations being in the repository

**Setup:**

```bash
# No special setup needed!
# Simply export and commit your annotations
git add public/data/annotations/
git commit -m "Add my annotations"
git push
```

**Benefits:**
- ✅ Full version history
- ✅ Easy collaboration
- ✅ Works seamlessly with the app
- ✅ Can revert to previous versions

### Option 2: Keep Annotations Local Only

**Use this if:**
- You want annotations to stay private
- You don't need version control
- You don't want to sync across devices
- You prefer manual backups

**Setup:**

Create a `.gitignore` file in the project root:

```bash
cat >> .gitignore << 'EOF'
# Ignore personal annotations
/public/data/annotations/*.json
!/public/data/annotations/manifest.json.example
!/public/data/annotations/example-annotations.json
!/public/data/annotations/README.md
EOF
```

This will:
- ✅ Keep your annotation JSON files out of git
- ✅ Still track the manifest example and README
- ✅ Allow you to manually backup via app export

## Collaborative Workflows

### Small Team (2-5 people)

**Setup:**
- Each person has their own annotation file: `alice.json`, `bob.json`, etc.
- Everyone commits to the same repository
- Manifest lists all files

```json
{
  "files": [
    "alice.json",
    "bob.json",
    "charlie.json"
  ]
}
```

**Workflow:**
1. Pull latest: `git pull`
2. Work in app, export your file
3. Update only your file: `git add public/data/annotations/alice.json`
4. Commit: `git commit -m "Update Alice's annotations"`
5. Push: `git push`

**Merge conflicts are rare** since each person has their own file.

### Large Team or Community

**Setup:**
- Use branches for different annotation approaches
- Main branch has core shared annotations
- Feature branches for experimental tags

```bash
# Create branch for a specific study
git checkout -b genesis-creation-study
# Export and commit annotations for this study
git add public/data/annotations/creation-study.json
git commit -m "Add creation theme annotations"
git push origin genesis-creation-study
# Create pull request for review
```

**Benefits:**
- ✅ Review annotations before merging
- ✅ Experiment without affecting main branch
- ✅ Discussion via pull request comments

### Public Shared Annotations

**Setup:**
- Public GitHub repository
- Community can fork and submit annotations
- Maintainers review and merge

```bash
# Fork the repository
# Clone your fork
git clone https://github.com/your-username/scripture-annotations.git

# Create branch for your annotations
git checkout -b add-covenant-tags

# Export and commit
git add public/data/annotations/covenant-study.json
# Update manifest
git commit -m "Add covenant theme annotations across Torah"

# Push to your fork
git push origin add-covenant-tags

# Create pull request to main repository
```

## Private vs Public Repositories

### Private Repository (Recommended for Personal Use)

```bash
# Create private repo on GitHub
# Clone and set up
git clone https://github.com/your-username/my-scripture-notes.git
cd my-scripture-notes

# Your annotations are private
# Only you (and collaborators you invite) can see them
```

**Best for:**
- Personal study notes
- Private group studies
- Sensitive reflections

### Public Repository

```bash
# Create public repo on GitHub
# Anyone can view your annotations
```

**Best for:**
- Community shared annotations
- Educational resources
- Open collaboration

**⚠️ Warning:** Public annotations are visible to everyone. Don't include:
- Personal private thoughts
- Copyrighted commentary
- Sensitive information

## Advanced Git Workflows

### Selective Sync

Want to commit some annotations but not others?

```bash
# Commit only specific annotation files
git add public/data/annotations/public-study.json
git commit -m "Add public study annotations"

# Keep others untracked (add to .gitignore)
echo "personal-reflections.json" >> .gitignore
```

### Annotation Branching Strategy

```
main
├── genesis-annotations/
│   ├── creation-theme
│   ├── covenant-theme
│   └── prophecy-theme
├── exodus-annotations/
└── psalms-annotations/
```

Each book or theme gets its own branch. Merge to main when complete.

### Revert to Previous Annotations

```bash
# See annotation history
git log -- public/data/annotations/my-annotations.json

# View specific version
git show abc123:public/data/annotations/my-annotations.json

# Revert to previous version
git checkout abc123 -- public/data/annotations/my-annotations.json
git commit -m "Revert to earlier annotation version"
```

### Tag Releases

Mark significant milestones:

```bash
# After completing Genesis study
git tag -a genesis-complete -m "Finished tagging all Genesis chapters"
git push origin genesis-complete
```

Later, you can checkout this exact state:

```bash
git checkout genesis-complete
```

## Repository Structure Examples

### Personal Study Repository

```
my-scripture-study/
├── public/data/annotations/
│   ├── manifest.json
│   └── my-annotations.json          # All your annotations
├── notes/
│   └── study-journal.md             # Optional: study notes
└── README.md
```

### Team Study Repository

```
team-bible-study/
├── public/data/annotations/
│   ├── manifest.json
│   ├── alice-annotations.json
│   ├── bob-annotations.json
│   └── shared-team-tags.json        # Common tag definitions
├── docs/
│   ├── study-guide.md
│   └── tag-conventions.md           # Team tagging standards
└── README.md
```

### Community Annotation Repository

```
community-scripture-annotations/
├── public/data/annotations/
│   ├── manifest.json
│   ├── themes/
│   │   ├── creation.json
│   │   ├── covenant.json
│   │   └── prophecy.json
│   ├── languages/
│   │   ├── hebrew-roots.json
│   │   └── greek-connections.json
│   └── contributors/
│       ├── scholar1.json
│       └── scholar2.json
├── CONTRIBUTING.md                   # How to add annotations
└── CODE_OF_CONDUCT.md
```

## Backup Strategies

### Automatic Backups with Git

```bash
# Set up automatic commits (optional)
# Add to cron or use git hooks

# .git/hooks/post-commit
#!/bin/bash
git push origin main
```

### Manual Backup Without Git

If not using git for annotations:

```bash
# Export from app UI
# Save to external location
cp ~/Downloads/my-annotations.json ~/Backups/annotations-2025-11-08.json

# Or use rsync for automated backups
rsync -av public/data/annotations/ ~/Backups/annotations/
```

### Cloud Backup

```bash
# Push to multiple remotes
git remote add github https://github.com/user/repo.git
git remote add gitlab https://gitlab.com/user/repo.git

# Push to both
git push github main
git push gitlab main
```

## Security Considerations

### SSH Keys (Recommended)

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add to GitHub/GitLab
cat ~/.ssh/id_ed25519.pub
# Copy and add to GitHub Settings > SSH Keys

# Clone using SSH
git clone git@github.com:user/repo.git
```

### GPG Signing (Optional)

Sign your commits to verify authenticity:

```bash
# Generate GPG key
gpg --full-generate-key

# Configure git
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true

# Commits now signed
git commit -S -m "Add signed annotations"
```

## Troubleshooting

### Large Annotation Files

If your annotation files become very large:

```bash
# Enable Git LFS for large files
git lfs install
git lfs track "*.json"
git add .gitattributes
git commit -m "Track JSON files with LFS"
```

### Accidental Commit of Private Data

```bash
# Remove file from git history (destructive!)
git filter-branch --tree-filter 'rm -f public/data/annotations/private.json' HEAD

# Or use BFG Repo-Cleaner (easier)
bfg --delete-files private.json
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

⚠️ **Warning**: This rewrites history. Only do this if you haven't pushed, or coordinate with all collaborators.

### Sync Conflicts

```bash
# If push is rejected
git pull --rebase origin main

# Resolve conflicts in annotation files
# Usually safe to accept both versions (they'll merge in app)
git add public/data/annotations/
git rebase --continue
git push
```

## Recommended Git Configuration

```bash
# Set up your identity
git config --global user.name "Your Name"
git config --global user.email "your_email@example.com"

# Better diffs for JSON
git config --global diff.json.textconv "jq ."

# Auto-prune on fetch
git config --global fetch.prune true

# Use rebase for cleaner history
git config --global pull.rebase true
```

## Next Steps

1. **Choose your workflow** (personal, team, or community)
2. **Set up repository** (private or public)
3. **Configure .gitignore** (if keeping annotations local)
4. **Start tagging** and export regularly
5. **Commit often** with descriptive messages

---

**See also:**
- [Architecture Documentation](./ARCHITECTURE.md)
- [Annotations Directory README](./public/data/annotations/README.md)
- [Quick Reference Guide](./QUICK_REFERENCE.md)

