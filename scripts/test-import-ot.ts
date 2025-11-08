#!/usr/bin/env bun
// Test Import - imports Genesis 1 to verify the OT importer works

import * as GenericImporter from "./importer/services/genericImporter";
import * as ImportPipeline from "./importer/services/importPipeline";

async function main() {
  console.log('🧪 TEST IMPORT: Genesis Chapter 1 (Old Testament)');
  console.log('='.repeat(60));
  
  try {
    // Test fetching one chapter
    console.log('\n📖 Fetching Genesis Chapter 1...');
    const rawData = await GenericImporter.fetchChapter('ot', 'gen', 1);
    console.log('✅ Data fetched successfully');
    
    // Test parsing
    console.log('\n🔧 Parsing chapter data...');
    const chapter = GenericImporter.parseChurchData(rawData, 'gen', 1, 'kjv');
    console.log('✅ Chapter parsed successfully');
    console.log(`   Verses: ${chapter.verses.length}`);
    console.log(`   First verse tokens: ${chapter.verses[0]?.tokens.length || 0}`);
    
    // Test saving
    console.log('\n💾 Saving to file...');
    await ImportPipeline.saveChapterToFile(chapter);
    console.log('✅ File saved successfully');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST PASSED!');
    console.log('\nSample verse:');
    if (chapter.verses[0]) {
      const verse = chapter.verses[0];
      const text = verse.tokens.map(t => t.text).join(' ');
      console.log(`   ${verse.id}: ${text.substring(0, 100)}...`);
    }
    console.log('\nFile location:');
    console.log('   public/scripture/translations/kjv/gen/chapter-1.json');
    
    console.log('\n🎉 Ready to run full OT import with: bun run import:ot\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error);
    process.exit(1);
  }
}

main();

