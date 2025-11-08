# Parallel Import Orchestrator

A high-performance parallel import system that sits on top of the existing import pipeline, enabling concurrent processing of volumes, books, and chapters.

## Features

- **Multi-level Parallelization**: Concurrent processing at volume, book, and chapter levels
- **Concurrency Control**: Configurable limits to respect API rate limits
- **Automatic Retry Logic**: Failed requests are automatically retried
- **Real-time Progress Tracking**: Live statistics on import progress and speed
- **Respectful API Usage**: Built-in delays and rate limiting
- **Non-invasive**: Works on top of existing code without modifications

## Quick Start

### Basic Usage

Import all scriptures with default settings:

```bash
bun run scripts/parallel-import-orchestrator.ts
```

### Import Specific Volumes

```bash
# Import only Book of Mormon
bun run scripts/parallel-import-orchestrator.ts --source=bofm

# Import only Old Testament
bun run scripts/parallel-import-orchestrator.ts --source=ot

# Import only New Testament
bun run scripts/parallel-import-orchestrator.ts --source=nt

# Import only Doctrine and Covenants
bun run scripts/parallel-import-orchestrator.ts --source=dc

# Import only Pearl of Great Price
bun run scripts/parallel-import-orchestrator.ts --source=pgp

# Import all (default)
bun run scripts/parallel-import-orchestrator.ts --source=all
```

## Performance Profiles

The orchestrator includes three performance profiles:

### Conservative (Slower, Safer)

Best for slower connections or when being extra respectful to the API:

```bash
bun run scripts/parallel-import-orchestrator.ts --config=conservative
```

- 1 volume at a time
- 3 concurrent books per volume
- 5 concurrent chapters per book
- 100ms delay between requests

### Default (Balanced)

Recommended for most use cases:

```bash
bun run scripts/parallel-import-orchestrator.ts --config=default
# or simply:
bun run scripts/parallel-import-orchestrator.ts
```

- 3 volumes at a time
- 5 concurrent books per volume
- 10 concurrent chapters per book
- 50ms delay between requests

### Aggressive (Faster, Riskier)

Maximum speed for fast connections (use with caution):

```bash
bun run scripts/parallel-import-orchestrator.ts --config=aggressive
```

- 5 volumes at a time
- 10 concurrent books per volume
- 20 concurrent chapters per book
- 25ms delay between requests

## Architecture

### Concurrency Layers

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

### Components

1. **PromisePool**: Generic concurrency-limited promise executor
2. **ProgressTracker**: Real-time statistics and ETA calculation
3. **ParallelImporter**: Main orchestration logic with retry handling
4. **Manifest Generation**: Reuses existing manifest generation code

## Progress Display

The orchestrator displays live progress updates:

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

## Error Handling

- **Automatic Retries**: Failed requests are retried up to 3 times
- **Failure Tracking**: Failed chapters are logged and counted
- **Graceful Degradation**: Import continues even if some chapters fail
- **Detailed Logging**: All errors are logged with context

## Performance Comparison

Estimated times for full import (all volumes):

| Profile      | Estimated Time | Safety Level |
|--------------|----------------|--------------|
| Sequential   | ~40-50 minutes | Very Safe    |
| Conservative | ~15-20 minutes | Safe         |
| Default      | ~8-12 minutes  | Balanced     |
| Aggressive   | ~5-8 minutes   | Risky        |

*Times vary based on network speed and API response times*

## Customization

To create a custom configuration, modify the `ParallelConfig` object in the script:

```typescript
const customConfig: ParallelConfig = {
  maxVolumesConcurrency: 2,
  maxBooksConcurrency: 4,
  maxChaptersConcurrency: 8,
  apiDelay: 75,
  maxRetries: 5,
  retryDelay: 2000,
};
```

## API Considerations

The orchestrator is designed to be respectful to the Church API:

- Built-in delays between requests
- Configurable rate limiting
- Automatic retry with exponential backoff
- Conservative defaults

**Important**: If you experience API errors or throttling:
1. Switch to `--config=conservative`
2. Reduce concurrency limits
3. Increase `apiDelay`
4. Contact API administrators if issues persist

## Troubleshooting

### High failure rate

- Switch to conservative config
- Check internet connection
- Verify API availability

### Memory issues

- Reduce `maxChaptersConcurrency`
- Import one volume at a time using `--source=`

### API throttling

- Increase `apiDelay`
- Reduce concurrency limits
- Add longer `retryDelay`

## Examples and Testing

### Example Script

The `parallel-import-example.ts` script demonstrates various use cases:

```bash
# Run all examples
bun scripts/parallel-import-example.ts

# Run specific examples
bun scripts/parallel-import-example.ts 1  # Custom configuration
bun scripts/parallel-import-example.ts 2  # PromisePool usage
bun scripts/parallel-import-example.ts 3  # Progress tracking
bun scripts/parallel-import-example.ts 4  # Error handling
```

### Performance Benchmarking

Compare performance between sequential and parallel imports:

```bash
# Quick benchmark (sequential vs default parallel)
bun scripts/benchmark-import.ts quick

# Compare only parallel configurations
bun scripts/benchmark-import.ts parallel

# Full benchmark (all configurations)
bun scripts/benchmark-import.ts full
```

The benchmark will output a comparison table showing:
- Duration for each configuration
- Chapters per second
- Speedup compared to sequential
- Estimated time for all volumes

## Programmatic Usage

You can use the parallel orchestrator in your own scripts:

```typescript
import { ParallelImporter, type ParallelConfig } from "./parallel-import-orchestrator";
import { BOOK_OF_MORMON } from "./importer/data/scriptureVolumes";

const config: ParallelConfig = {
  maxVolumesConcurrency: 3,
  maxBooksConcurrency: 5,
  maxChaptersConcurrency: 10,
  apiDelay: 50,
  maxRetries: 3,
  retryDelay: 1000,
};

const importer = new ParallelImporter(config, [BOOK_OF_MORMON]);
const results = await importer.importAllVolumes([BOOK_OF_MORMON]);

// Access imported books
const books = results.get('bofm');
console.log(`Imported ${books?.length} books`);
```

## Future Enhancements

Potential improvements:

- [ ] Resume failed imports from checkpoint
- [ ] Dynamic concurrency adjustment based on error rates
- [ ] Distributed import across multiple machines
- [ ] Progress persistence between runs
- [ ] Web UI for monitoring imports
- [ ] Adaptive rate limiting based on API response times
- [ ] Compression of chapter files during import
- [ ] Parallel manifest generation
- [ ] Real-time metrics export (Prometheus, etc.)

## License

Part of the scripture-tag project.

