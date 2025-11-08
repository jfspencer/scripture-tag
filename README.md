# Scripture Tag

A word-level scripture tagging and annotation system with N-cardinality support. Tag individual words or word groups with user-defined tags, filter by tags, and customize presentation styles.

## ✨ Features

- **Granular Word-Level Tagging**: Tag individual words or groups of words with precision
- **N-Cardinality**: Apply multiple tags to the same word/word group
- **Flexible Filtering**: Show/hide tags, combine filters with boolean logic
- **Custom Presentation**: User-defined tag styles (colors, underlines, icons)
- **Data-Driven Layout**: Chapter headings, verse numbers, poetry formatting, quotations
- **Multiple Translations**: Supports Book of Mormon, KJV Bible, and more
- **Offline-First**: Works entirely in the browser, no server required
- **Privacy-Focused**: All data stays on your device
- **Git-Based Version Control**: Commit annotations to git for full version history
- **Collaboration**: Share annotations via git repository
- **Export/Import**: Backup and share your annotations as JSON
- **Fast & Responsive**: Fine-grained reactivity updates only what changed

## 🏗️ Architecture

This project uses a modern, functional architecture with clear separation of concerns:

- **Frontend**: SolidJS (fine-grained reactivity)
- **State Management**: Solid Stores (built-in)
- **Business Logic**: Effect-TS (type-safe functional effects)
- **Persistence**: Dexie.js (IndexedDB wrapper)
- **UI Components**: Kobalte (accessible headless components)
- **Styling**: TailwindCSS

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## 📖 Supported Scriptures

The system is designed to work with multiple volumes of scripture:

### Currently Supported
- **The Book of Mormon** - All 15 books, imported from churchofjesuschrist.org
- **The Holy Bible (KJV)** - Old and New Testament, public domain

### Planned Support
- **The Doctrine and Covenants**
- **The Pearl of Great Price**
- **Modern Bible Translations** (ESV, NIV, NASB) - Pending licensing

Each scripture includes:
- ✅ Chapter headings and summaries
- ✅ Section headings within chapters
- ✅ Verse-level formatting (prose, poetry, quotations)
- ✅ Word-level tokenization for precise tagging
- ✅ Presentation metadata (indentation, spacing, typography)

See [SCRIPTURE_DATA.md](./SCRIPTURE_DATA.md) for data structures and import strategies.

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/scripture-tag.git
cd scripture-tag

# Install dependencies
npm install

# Create data directories
mkdir -p public/data/annotations
echo '{"files":[]}' > public/data/annotations/manifest.json

# Start development server
npm run dev

# Build for production
npm run build
```

## 📦 Git Sync Workflow

This project uses git as the version control and collaboration layer for annotations:

```bash
# 1. Work in the app (create tags and annotations)
# 2. Export from app UI → saves JSON file to downloads
# 3. Move file to repository
mv ~/Downloads/my-annotations.json public/data/annotations/

# 4. Update manifest
echo '{"files":["my-annotations.json"]}' > public/data/annotations/manifest.json

# 5. Commit and push
git add public/data/annotations/
git commit -m "Add my scripture annotations"
git push origin main

# On another device or after pulling changes:
# - Open app
# - Annotations auto-import on startup
# - Continue working with merged data
```

**Benefits:**
- ✅ Full version history via git
- ✅ Revert to previous annotation states
- ✅ Collaborate via branches and pull requests
- ✅ Share annotation sets across devices
- ✅ No backend server required

## 📖 Documentation

- [**Architecture Guide**](./ARCHITECTURE.md) - Complete technical architecture and design decisions
- [**Scripture Data**](./SCRIPTURE_DATA.md) - Data structure, presentation metadata, and import strategies
- [**Data Flow**](./DATA_FLOW.md) - Visual flow diagrams and interaction patterns
- [**Quick Reference**](./QUICK_REFERENCE.md) - Practical implementation examples
- [**Git Setup**](./GIT_SETUP.md) - Version control workflows and collaboration

## 🎯 Project Status

**Current Phase**: Initial Development (v0.1.0)

- [x] Architecture design
- [x] Git sync strategy
- [x] Scripture data model with presentation metadata
- [ ] Scripture import pipeline
  - [ ] Book of Mormon importer (churchofjesuschrist.org API)
  - [ ] Bible importer (KJV from public domain sources)
  - [ ] Tokenization engine
  - [ ] Presentation inference system
- [ ] Core data structures implementation
- [ ] Effect-TS services
  - [ ] TagService
  - [ ] AnnotationService
  - [ ] GitSyncService
  - [ ] ScriptureLoader
- [ ] SolidJS component library
  - [ ] Presentation-driven verse display
  - [ ] Chapter heading display
  - [ ] Section heading display
  - [ ] Tagged word component with emphasis
- [ ] Dexie database setup
- [ ] Scripture data loading and caching
- [ ] Tag management UI
- [ ] Annotation workflow
- [ ] Git export/import functionality

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | SolidJS | Fine-grained reactive UI |
| State | Solid Stores | Reactive state management |
| Logic | Effect-TS | Type-safe business logic |
| Database | Dexie.js | IndexedDB wrapper |
| UI Primitives | Kobalte | Accessible components |
| Styling | Tailwind CSS | Utility-first styling |
| Build | Vite | Fast development & builds |
| Language | TypeScript | Type safety |

## 📝 License

MIT (to be added)

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines (coming soon).

---

**Note**: This project is in active development. The API and architecture may change before v1.0.0.