#!/usr/bin/env bun
// Generate individual volume manifests from volume configs

import { promises as fs } from "fs";
import * as path from "path";
import { ALL_VOLUMES } from "./importer/data/scriptureVolumes";
import type { TranslationManifest } from "./importer/types";

async function main() {
  console.log('📝 Generating volume manifests from configs...\n');

  // Generate Book of Mormon manifest
  const bofmVolume = ALL_VOLUMES.find(v => v.id === 'bofm')!;
  const bofmManifest: TranslationManifest = {
    id: 'bofm',
    name: bofmVolume.name,
    abbreviation: bofmVolume.abbreviation,
    language: 'en',
    copyright: bofmVolume.copyright,
    books: bofmVolume.books.map(book => ({
      id: book.id,
      name: book.name,
      category: book.category as any,
      chapters: book.chapters,
    })),
  };
  
  await saveManifest('bofm', bofmManifest);

  // Generate KJV manifest (OT + NT combined)
  const otVolume = ALL_VOLUMES.find(v => v.id === 'ot')!;
  const ntVolume = ALL_VOLUMES.find(v => v.id === 'nt')!;
  const kjvManifest: TranslationManifest = {
    id: 'kjv',
    name: 'King James Version',
    abbreviation: 'KJV',
    language: 'en',
    copyright: 'Public Domain',
    books: [
      ...otVolume.books.map(book => ({
        id: book.id,
        name: book.name,
        category: book.category as any,
        chapters: book.chapters,
      })),
      ...ntVolume.books.map(book => ({
        id: book.id,
        name: book.name,
        category: book.category as any,
        chapters: book.chapters,
      })),
    ],
  };
  
  await saveManifest('kjv', kjvManifest);

  // Generate Doctrine and Covenants manifest
  const dcVolume = ALL_VOLUMES.find(v => v.id === 'dc')!;
  const dcManifest: TranslationManifest = {
    id: 'dc',
    name: dcVolume.name,
    abbreviation: dcVolume.abbreviation,
    language: 'en',
    copyright: dcVolume.copyright,
    books: dcVolume.books.map(book => ({
      id: book.id,
      name: book.name,
      category: book.category as any,
      chapters: book.chapters,
    })),
  };
  
  await saveManifest('dc', dcManifest);

  // Generate Pearl of Great Price manifest
  const pgpVolume = ALL_VOLUMES.find(v => v.id === 'pgp')!;
  const pgpManifest: TranslationManifest = {
    id: 'pgp',
    name: pgpVolume.name,
    abbreviation: pgpVolume.abbreviation,
    language: 'en',
    copyright: pgpVolume.copyright,
    books: pgpVolume.books.map(book => ({
      id: book.id,
      name: book.name,
      category: book.category as any,
      chapters: book.chapters,
    })),
  };
  
  await saveManifest('pgp', pgpManifest);

  // Now generate root manifest from all volume manifests
  const { generateRootManifest } = await import("./importer/services/importPipeline");
  await generateRootManifest();

  console.log('\n✅ All manifests generated successfully!');
}

async function saveManifest(translationId: string, manifest: TranslationManifest) {
  const manifestPath = path.join(
    process.cwd(),
    'public',
    'scripture',
    'translations',
    translationId,
    'manifest.json'
  );

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`✅ ${manifest.name} manifest saved (${manifest.books.length} books)`);
}

main();

