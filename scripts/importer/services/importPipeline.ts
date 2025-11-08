// Scripture Import Pipeline - orchestrates the import process

import { promises as fs } from "fs";
import * as path from "path";
import type { Book, Chapter, ScriptureManifest, TranslationManifest } from "../types";
import * as GenericImporter from "./genericImporter";
import type { VolumeConfig } from "../data/scriptureVolumes";
import {
  ALL_VOLUMES,
  BOOK_OF_MORMON,
  OLD_TESTAMENT,
  NEW_TESTAMENT,
  DOCTRINE_AND_COVENANTS,
  PEARL_OF_GREAT_PRICE,
} from "../data/scriptureVolumes";

export async function saveChapterToFile(chapter: Chapter): Promise<void> {
  const dirPath = path.join(
    process.cwd(),
    'public',
    'scripture',
    'translations',
    chapter.translation,
    chapter.book
  );
  const filePath = path.join(dirPath, `chapter-${chapter.chapter}.json`);
  const content = JSON.stringify(chapter, null, 2);

  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
  console.log(`✅ Saved: ${chapter.book} ${chapter.chapter}`);
}

export async function importVolume(volume: VolumeConfig): Promise<Book[]> {
  const books: Book[] = [];

  console.log(`\n📚 Importing ${volume.name}`);
  console.log(`   Books: ${volume.books.length}`);
  console.log(`   Total chapters: ${volume.books.reduce((sum, b) => sum + b.chapters, 0)}\n`);

  for (const bookInfo of volume.books) {
    console.log(`\n📖 ${bookInfo.name}...`);
    const chapters: Chapter[] = [];

    for (let ch = 1; ch <= bookInfo.chapters; ch++) {
      try {
        const rawData = await GenericImporter.fetchChapter(volume.apiPath, bookInfo.id, ch);
        const chapter = GenericImporter.parseChurchData(
          rawData, 
          bookInfo.id, 
          ch,
          volume.translation
        );
        chapters.push(chapter);

        // Save to static JSON for distribution
        await saveChapterToFile(chapter);

        // Small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Error importing ${bookInfo.id} chapter ${ch}:`, error);
        // Continue with next chapter
      }
    }

    books.push({
      id: bookInfo.id,
      name: bookInfo.name,
      fullName: bookInfo.fullName,
      abbreviation: bookInfo.name,
      category: bookInfo.category as any,
      chapters,
      metadata: {
        themes: [],
        chapterCount: bookInfo.chapters,
        verseCount: chapters.reduce((sum, ch) => sum + ch.verses.length, 0),
      },
    });

    const verseCount = chapters.reduce((sum, ch) => sum + ch.verses.length, 0);
    console.log(`   ✅ ${chapters.length} chapters, ${verseCount} verses`);
  }

  return books;
}

export async function importBookOfMormon(): Promise<Book[]> {
  return importVolume(BOOK_OF_MORMON);
}

export async function importOldTestament(): Promise<Book[]> {
  return importVolume(OLD_TESTAMENT);
}

export async function importNewTestament(): Promise<Book[]> {
  return importVolume(NEW_TESTAMENT);
}

export async function importDoctrineAndCovenants(): Promise<Book[]> {
  return importVolume(DOCTRINE_AND_COVENANTS);
}

export async function importPearlOfGreatPrice(): Promise<Book[]> {
  return importVolume(PEARL_OF_GREAT_PRICE);
}

export async function generateManifest(
  translations: Array<{ id: string; books: Book[] }>
): Promise<ScriptureManifest> {
  const translationManifests: TranslationManifest[] = translations.map(({ id, books }) => {
    const isBookOfMormon = id === 'bofm';
    
    return {
      id,
      name: isBookOfMormon ? 'The Book of Mormon' : id.toUpperCase(),
      abbreviation: isBookOfMormon ? 'BoM' : id.toUpperCase(),
      language: 'en',
      copyright: isBookOfMormon 
        ? '© Intellectual Reserve, Inc.'
        : 'Public Domain',
      books: books.map(book => ({
        id: book.id,
        name: book.name,
        category: book.category,
        chapters: book.metadata.chapterCount,
      })),
    };
  });

  const manifest: ScriptureManifest = {
    version: '1.0.0',
    translations: translationManifests,
  };

  const manifestPath = path.join(
    process.cwd(),
    'public',
    'scripture',
    'manifest.json'
  );

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log('✅ Manifest generated');

  return manifest;
}

