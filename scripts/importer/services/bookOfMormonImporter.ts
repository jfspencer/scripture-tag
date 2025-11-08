// Book of Mormon Importer - imports from churchofjesuschrist.org

import * as cheerio from 'cheerio';
import type {
  Chapter,
  Verse,
  Section,
  ChapterHeading,
  RawScriptureData,
  RawSectionData,
} from "../types";
import { tokenizeText } from "../utils/tokenization";
import { inferPresentation } from "../utils/presentationInference";

const CHURCH_API = {
  baseUrl: 'https://www.churchofjesuschrist.org',
  endpoint: (book: string, chapter: number) => 
    `/study/api/v3/language-pages/type/content?lang=eng&uri=/scriptures/bofm/${book}/${chapter}`
};

export async function fetchChapter(book: string, chapter: number): Promise<RawScriptureData> {
  const url = CHURCH_API.baseUrl + CHURCH_API.endpoint(book, chapter);
  console.log(`  Fetching ${book} ${chapter}...`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data as RawScriptureData;
}

export function parseChurchData(
  raw: RawScriptureData,
  book: string,
  chapterNumber: number
): Chapter {
  const verses: Verse[] = [];
  const sections: Section[] = [];
  
  // Parse HTML from content.body
  const $ = cheerio.load(raw.content.body);
  
  // Extract chapter heading from <p class="study-summary">
  let heading: ChapterHeading | undefined;
  const studySummary = $('p.study-summary').text().trim();
  if (studySummary) {
    heading = {
      summary: studySummary,
      description: undefined,
      topics: [],
    };
  }
  
  // Extract verses from <p class="verse"> tags
  $('p.verse').each((index, element) => {
    const $verse = $(element);
    
    // Get verse number
    const verseNumText = $verse.find('span.verse-number').text().trim();
    const verseNumber = parseInt(verseNumText) || (index + 1);
    const verseId = `${book}.${chapterNumber}.${verseNumber}`;
    
    // Clone the verse to manipulate it
    const $verseClone = $verse.clone();
    
    // Remove verse number
    $verseClone.find('span.verse-number').remove();
    
    // For study note refs, remove only the sup marker but keep the word
    $verseClone.find('a.study-note-ref').each((i, el) => {
      const $link = $(el);
      // Remove the superscript marker
      $link.find('sup.marker').remove();
      // Replace the entire link with just its text content (the word)
      $link.replaceWith($link.text());
    });
    
    // Get verse text and normalize whitespace
    const verseText = $verseClone.text().trim().replace(/\s+/g, ' ');
    
    if (!verseText) {
      return; // Skip empty verses
    }
    
    // Tokenize verse text
    const tokens = tokenizeText(verseText, verseId);
    
    // Create minimal raw section data for presentation inference
    const rawSection: RawSectionData = {
      title: '',
      verses: [{
        number: verseNumber.toString(),
        text: verseText,
      }],
    };
    
    // Determine presentation metadata
    const presentation = inferPresentation(
      { number: verseNumber.toString(), text: verseText },
      rawSection,
      verseNumber
    );
    
    verses.push({
      id: verseId,
      book,
      chapter: chapterNumber,
      verse: verseNumber,
      tokens,
      translation: 'bofm',
      presentation,
    });
  });
  
  return {
    id: `${book}.${chapterNumber}`,
    book,
    chapter: chapterNumber,
    translation: 'bofm',
    heading,
    sections,
    verses,
    presentation: {
      displayHeading: true,
      twoColumn: false,
      chapterNumberDisplay: 'standard',
    },
  };
}

