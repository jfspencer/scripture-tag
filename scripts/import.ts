#!/usr/bin/env bun
// Scripture Import Script - imports all standard works from churchofjesuschrist.org

import * as ImportPipeline from "./importer/services/importPipeline";

async function main() {
  console.log('📖 Scripture Import Process Starting...\n');
  console.log('='.repeat(60));
  
  // Get command line args
  const args = process.argv.slice(2);
  const sourceArg = args.find(arg => arg.startsWith('--source='));
  const source = sourceArg ? sourceArg.split('=')[1] : 'all';
  
  const translations: Array<{ id: string; books: any[] }> = [];
  
  try {
    if (source === 'bofm' || source === 'all') {
      console.log('\n📖 IMPORTING BOOK OF MORMON');
      console.log('='.repeat(60));
      
      const bofmBooks = await ImportPipeline.importBookOfMormon();
      translations.push({ id: 'bofm', books: bofmBooks });
      
      console.log('\n' + '='.repeat(60));
      console.log(`✅ BOOK OF MORMON COMPLETE`);
      console.log(`   Books: ${bofmBooks.length}`);
      console.log(`   Chapters: ${bofmBooks.reduce((sum, b) => sum + b.metadata.chapterCount, 0)}`);
      console.log(`   Verses: ${bofmBooks.reduce((sum, b) => sum + b.metadata.verseCount, 0)}`);
    }
    
    if (source === 'ot' || source === 'all') {
      console.log('\n📖 IMPORTING OLD TESTAMENT');
      console.log('='.repeat(60));
      
      const otBooks = await ImportPipeline.importOldTestament();
      translations.push({ id: 'kjv-ot', books: otBooks });
      
      console.log('\n' + '='.repeat(60));
      console.log(`✅ OLD TESTAMENT COMPLETE`);
      console.log(`   Books: ${otBooks.length}`);
      console.log(`   Chapters: ${otBooks.reduce((sum, b) => sum + b.metadata.chapterCount, 0)}`);
      console.log(`   Verses: ${otBooks.reduce((sum, b) => sum + b.metadata.verseCount, 0)}`);
    }
    
    if (source === 'nt' || source === 'all') {
      console.log('\n📖 IMPORTING NEW TESTAMENT');
      console.log('='.repeat(60));
      
      const ntBooks = await ImportPipeline.importNewTestament();
      translations.push({ id: 'kjv-nt', books: ntBooks });
      
      console.log('\n' + '='.repeat(60));
      console.log(`✅ NEW TESTAMENT COMPLETE`);
      console.log(`   Books: ${ntBooks.length}`);
      console.log(`   Chapters: ${ntBooks.reduce((sum, b) => sum + b.metadata.chapterCount, 0)}`);
      console.log(`   Verses: ${ntBooks.reduce((sum, b) => sum + b.metadata.verseCount, 0)}`);
    }
    
    if (source === 'dc' || source === 'all') {
      console.log('\n📖 IMPORTING DOCTRINE AND COVENANTS');
      console.log('='.repeat(60));
      
      const dcBooks = await ImportPipeline.importDoctrineAndCovenants();
      translations.push({ id: 'dc', books: dcBooks });
      
      console.log('\n' + '='.repeat(60));
      console.log(`✅ DOCTRINE AND COVENANTS COMPLETE`);
      console.log(`   Sections: ${dcBooks.reduce((sum, b) => sum + b.metadata.chapterCount, 0)}`);
      console.log(`   Verses: ${dcBooks.reduce((sum, b) => sum + b.metadata.verseCount, 0)}`);
    }
    
    if (source === 'pgp' || source === 'all') {
      console.log('\n📖 IMPORTING PEARL OF GREAT PRICE');
      console.log('='.repeat(60));
      
      const pgpBooks = await ImportPipeline.importPearlOfGreatPrice();
      translations.push({ id: 'pgp', books: pgpBooks });
      
      console.log('\n' + '='.repeat(60));
      console.log(`✅ PEARL OF GREAT PRICE COMPLETE`);
      console.log(`   Books: ${pgpBooks.length}`);
      console.log(`   Chapters: ${pgpBooks.reduce((sum, b) => sum + b.metadata.chapterCount, 0)}`);
      console.log(`   Verses: ${pgpBooks.reduce((sum, b) => sum + b.metadata.verseCount, 0)}`);
    }
    
    // Generate manifest
    if (translations.length > 0) {
      console.log('\n📝 Generating manifest...');
      const manifest = await ImportPipeline.generateManifest(translations);
      console.log('✅ Manifest generated successfully');
      console.log(`   Translations: ${manifest.translations.length}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ SCRIPTURE IMPORT COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('  1. Verify files in public/scripture/');
    console.log('  2. Check manifest.json');
    console.log('  3. Test loading in the application\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ IMPORT FAILED');
    console.error('='.repeat(60));
    console.error('Error:', error);
    console.error('\nPlease check:');
    console.error('  1. Internet connection');
    console.error('  2. API availability');
    console.error('  3. File system permissions\n');
    process.exit(1);
  }
}

main();

