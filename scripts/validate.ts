#!/usr/bin/env bun
// Scripture Validation Script - validates imported JSON against HTML source

import * as Validator from './importer/services/validator';
import type { VolumeConfig } from './importer/data/scriptureVolumes';
import {
  BOOK_OF_MORMON,
  OLD_TESTAMENT,
  NEW_TESTAMENT,
  DOCTRINE_AND_COVENANTS,
  PEARL_OF_GREAT_PRICE,
} from './importer/data/scriptureVolumes';

async function validateVolume(volume: VolumeConfig): Promise<boolean> {
  console.log(`\n📚 VALIDATING ${volume.name.toUpperCase()}`);
  console.log('='.repeat(60));
  
  const allResults = [];
  
  for (const bookInfo of volume.books) {
    console.log(`\n📖 ${bookInfo.name}...`);
    const results = await Validator.validateBook(
      volume.apiPath,
      volume.translation,
      bookInfo.id,
      bookInfo.chapters
    );
    allResults.push(...results);
  }
  
  Validator.printValidationSummary(allResults);
  
  const success = allResults.every(r => r.success);
  return success;
}

async function validateSingleChapter(
  apiPath: string,
  translation: string,
  book: string,
  chapter: number
): Promise<boolean> {
  console.log(`\n📖 VALIDATING ${book} ${chapter}`);
  console.log('='.repeat(60));
  
  const result = await Validator.validateChapter(apiPath, translation, book, chapter);
  
  if (result.success) {
    console.log('✅ Validation passed');
  } else {
    console.log('❌ Validation failed:');
    for (const error of result.errors) {
      console.log(`  ${error}`);
    }
  }
  
  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    for (const warning of result.warnings) {
      console.log(`  ${warning}`);
    }
  }
  
  return result.success;
}

async function main() {
  console.log('📖 Scripture Validation Process Starting...\n');
  console.log('='.repeat(60));
  
  // Parse command line args
  const args = process.argv.slice(2);
  const sourceArg = args.find(arg => arg.startsWith('--source='));
  const bookArg = args.find(arg => arg.startsWith('--book='));
  const chapterArg = args.find(arg => arg.startsWith('--chapter='));
  
  const source = sourceArg ? sourceArg.split('=')[1] : 'all';
  const bookId = bookArg ? bookArg.split('=')[1] : null;
  const chapterNum = chapterArg ? parseInt(chapterArg.split('=')[1]) : null;
  
  try {
    let allSuccess = true;
    
    // Validate single chapter if specified
    if (bookId && chapterNum) {
      // Determine which volume the book belongs to
      let volumeConfig: VolumeConfig | null = null;
      
      for (const volume of [BOOK_OF_MORMON, OLD_TESTAMENT, NEW_TESTAMENT, DOCTRINE_AND_COVENANTS, PEARL_OF_GREAT_PRICE]) {
        if (volume.books.some(b => b.id === bookId)) {
          volumeConfig = volume;
          break;
        }
      }
      
      if (!volumeConfig) {
        console.error(`❌ Book not found: ${bookId}`);
        console.error('Available books: check scriptureVolumes.ts for valid book IDs');
        process.exit(1);
      }
      
      const success = await validateSingleChapter(
        volumeConfig.apiPath,
        volumeConfig.translation,
        bookId,
        chapterNum
      );
      
      if (!success) {
        process.exit(1);
      }
      
      process.exit(0);
    }
    
    // Validate entire volumes
    if (source === 'bofm' || source === 'all') {
      const success = await validateVolume(BOOK_OF_MORMON);
      allSuccess = allSuccess && success;
    }
    
    if (source === 'ot' || source === 'all') {
      const success = await validateVolume(OLD_TESTAMENT);
      allSuccess = allSuccess && success;
    }
    
    if (source === 'nt' || source === 'all') {
      const success = await validateVolume(NEW_TESTAMENT);
      allSuccess = allSuccess && success;
    }
    
    if (source === 'dc' || source === 'all') {
      const success = await validateVolume(DOCTRINE_AND_COVENANTS);
      allSuccess = allSuccess && success;
    }
    
    if (source === 'pgp' || source === 'all') {
      const success = await validateVolume(PEARL_OF_GREAT_PRICE);
      allSuccess = allSuccess && success;
    }
    
    console.log('\n' + '='.repeat(60));
    if (allSuccess) {
      console.log('✅ ALL VALIDATIONS PASSED!');
    } else {
      console.log('❌ SOME VALIDATIONS FAILED');
    }
    console.log('='.repeat(60));
    
    process.exit(allSuccess ? 0 : 1);
  } catch (error) {
    console.error('\n❌ VALIDATION FAILED');
    console.error('='.repeat(60));
    console.error('Error:', error);
    console.error('\nPlease check:');
    console.error('  1. Internet connection');
    console.error('  2. API availability');
    console.error('  3. Imported files exist\n');
    process.exit(1);
  }
}

main();

