#!/usr/bin/env bun
// Test Import - imports just 1 Nephi chapter 1 to verify the system works

import * as BofMImporter from "./importer/services/bookOfMormonImporter";
import * as ImportPipeline from "./importer/services/importPipeline";

async function main() {
  console.log('🧪 TEST IMPORT: 1 Nephi Chapter 1');
  console.log('='.repeat(60));
  
  try {
    // Test fetching one chapter
    console.log('\n📖 Fetching 1 Nephi Chapter 1...');
    const rawData = await BofMImporter.fetchChapter('1-ne', 1);
    console.log('✅ Data fetched successfully');
    console.log(`   Sections: ${rawData.content.sections?.length || 0}`);
    
    // Test parsing
    console.log('\n🔧 Parsing chapter data...');
    const chapter = BofMImporter.parseChurchData(rawData, '1-ne', 1);
    console.log('✅ Chapter parsed successfully');
    console.log(`   Verses: ${chapter.verses.length}`);
    console.log(`   Sections: ${chapter.sections.length}`);
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
      console.log(`   ${verse.id}: ${text}`);
    }
    console.log('\nFile location:');
    console.log('   public/scripture/translations/bofm/1-ne/chapter-1.json');
    
    console.log('\n🎉 Ready to run full import with: bun run import:bofm\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error);
    process.exit(1);
  }
}

main();

