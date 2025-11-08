// Word-level tokenization utilities

import type { TextToken, EmphasisType, SemanticType } from "../types";

export function tokenizeText(text: string, verseId: string): TextToken[] {
  const tokens: TextToken[] = [];
  
  // Split on whitespace but preserve punctuation context
  const words = text.split(/\s+/).filter(w => w.length > 0);
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Extract punctuation
    const { preceding, core, following } = extractPunctuation(word);
    
    // Skip if no core word
    if (!core) continue;
    
    // Create token
    const token: TextToken = {
      id: `${verseId}.${i + 1}`,
      text: core,
      position: i + 1,
      verseId,
      presentation: {
        precedingPunctuation: preceding || undefined,
        followingPunctuation: following || undefined,
        emphasis: detectEmphasis(core),
        semanticType: detectSemanticType(core),
      },
    };
    
    tokens.push(token);
  }
  
  return tokens;
}

function extractPunctuation(word: string): {
  preceding: string;
  core: string;
  following: string;
} {
  // Extract leading punctuation
  const leadMatch = word.match(/^([^\w]+)/);
  const preceding = leadMatch ? leadMatch[1] : '';
  
  // Extract trailing punctuation
  const trailMatch = word.match(/([^\w]+)$/);
  const following = trailMatch ? trailMatch[1] : '';
  
  // Core word
  const core = word.slice(
    preceding.length,
    word.length - following.length
  );
  
  return { preceding, core, following };
}

function detectEmphasis(word: string): EmphasisType | undefined {
  // Check for all-caps (divine name)
  if (word === word.toUpperCase() && word.length > 2) {
    return 'small-caps';
  }
  return undefined;
}

function detectSemanticType(word: string): SemanticType | undefined {
  // Detect divine names
  const divineNames = ['LORD', 'GOD', 'JEHOVAH', 'YHWH'];
  if (divineNames.includes(word.toUpperCase())) {
    return 'divine-name';
  }
  
  // Detect proper nouns (capitalized mid-sentence)
  if (word[0] === word[0].toUpperCase()) {
    return 'proper-noun';
  }
  
  return undefined;
}

