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
    
    // If no core word but we have punctuation, treat the whole word as punctuation text
    // This handles standalone ellipses, em-dashes, etc.
    let tokenText: string;
    let tokenPreceding: string | undefined;
    let tokenFollowing: string | undefined;
    
    if (!core && word.length > 0) {
      // Pure punctuation token
      tokenText = word;
      tokenPreceding = undefined;
      tokenFollowing = undefined;
    } else if (!core) {
      // Empty token, skip
      continue;
    } else {
      // Normal word token
      tokenText = core;
      tokenPreceding = preceding || undefined;
      tokenFollowing = following || undefined;
    }
    
    // Create token
    const token: TextToken = {
      id: `${verseId}.${i + 1}`,
      text: tokenText,
      position: i + 1,
      verseId,
      presentation: {
        precedingPunctuation: tokenPreceding,
        followingPunctuation: tokenFollowing,
        emphasis: detectEmphasis(tokenText),
        semanticType: detectSemanticType(tokenText),
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

