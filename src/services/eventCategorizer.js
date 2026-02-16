// ---------------------------------------------------------------------------
// Rule-based F1 event categorizer with confidence scoring
//
// Each keyword carries a weight. Title matches get a 2x multiplier since
// titles are more signal-dense than body text. The category with the highest
// total score wins, and the score is normalized to a 0-100 confidence value.
// If the best confidence is below CONFIDENCE_THRESHOLD the event is marked
// "Uncategorized".
// ---------------------------------------------------------------------------

const CONFIDENCE_THRESHOLD = 60;

// Weights: higher = stronger signal for that category
const CATEGORY_RULES = [
  {
    category: 'Race Result',
    keywords: [
      { term: 'wins', weight: 15 },
      { term: 'podium', weight: 15 },
      { term: 'p1', weight: 12 },
      { term: 'victory', weight: 15 },
      { term: 'grand prix results', weight: 20 },
      { term: 'grand prix result', weight: 20 },
      { term: 'race result', weight: 20 },
      { term: 'race winner', weight: 18 },
      { term: 'wins the', weight: 16 },
      { term: 'finished first', weight: 14 },
      { term: 'checkered flag', weight: 12 },
      { term: 'on the podium', weight: 14 },
    ],
  },
  {
    category: 'Penalty',
    keywords: [
      { term: 'penalty', weight: 18 },
      { term: 'time penalty', weight: 20 },
      { term: 'grid penalty', weight: 20 },
      { term: 'disqualified', weight: 20 },
      { term: 'stewards', weight: 12 },
      { term: 'black flag', weight: 15 },
      { term: 'investigation', weight: 10 },
      { term: 'infringement', weight: 14 },
      { term: 'reprimand', weight: 12 },
    ],
  },
  {
    category: 'Driver Transfer',
    keywords: [
      { term: 'signs with', weight: 18 },
      { term: 'signs for', weight: 18 },
      { term: 'moves to', weight: 16 },
      { term: 'joins', weight: 14 },
      { term: 'leaves', weight: 14 },
      { term: 'transfer', weight: 12 },
      { term: 'driver lineup', weight: 15 },
      { term: 'seat', weight: 8 },
      { term: 'replaces', weight: 14 },
      { term: 'contract', weight: 8 },
    ],
  },
  {
    category: 'Contract News',
    keywords: [
      { term: 'extends', weight: 16 },
      { term: 'extension', weight: 16 },
      { term: 'renewed', weight: 16 },
      { term: 'renewal', weight: 16 },
      { term: 'multi-year', weight: 18 },
      { term: 'deal', weight: 10 },
      { term: 'agreement', weight: 12 },
      { term: 'signs new', weight: 14 },
      { term: 'contract', weight: 10 },
    ],
  },
  {
    category: 'Technical Update',
    keywords: [
      { term: 'upgrade', weight: 16 },
      { term: 'development', weight: 12 },
      { term: 'regulation', weight: 14 },
      { term: 'technical directive', weight: 20 },
      { term: 'floor', weight: 8 },
      { term: 'wing', weight: 8 },
      { term: 'aerodynamic', weight: 14 },
      { term: 'power unit', weight: 14 },
      { term: 'engine', weight: 8 },
      { term: 'sidepod', weight: 12 },
    ],
  },
  {
    category: 'Official Statement',
    keywords: [
      { term: 'fia announces', weight: 20 },
      { term: 'statement', weight: 14 },
      { term: 'clarification', weight: 16 },
      { term: 'press release', weight: 16 },
      { term: 'official', weight: 10 },
      { term: 'communiqué', weight: 14 },
      { term: 'bulletin', weight: 12 },
    ],
  },
];

// Max possible score per category — used to normalize confidence to 0-100.
// We use the sum of the top-3 keyword weights as the "perfect match" baseline
// so that articles don't need to hit every keyword to reach 100.
const maxScores = {};
for (const rule of CATEGORY_RULES) {
  const sorted = rule.keywords.map((k) => k.weight).sort((a, b) => b - a);
  // Top-2 title matches (2x) represents a realistic strong-match baseline
  maxScores[rule.category] = sorted.slice(0, 2).reduce((sum, w) => sum + w * 2, 0);
}

/**
 * Score an article against all categories.
 *
 * @param {string} title   - Article title
 * @param {string} content - Article body / snippet
 * @returns {{ category: string, confidence: number, scores: Object }}
 */
function categorizeWithScore(title, content = '') {
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();

  const scores = {};

  for (const rule of CATEGORY_RULES) {
    let score = 0;

    for (const { term, weight } of rule.keywords) {
      // Title matches are worth 2x — titles carry stronger signal
      if (titleLower.includes(term)) {
        score += weight * 2;
      } else if (contentLower.includes(term)) {
        score += weight;
      }
    }

    scores[rule.category] = score;
  }

  // Find the winning category
  let bestCategory = 'Uncategorized';
  let bestScore = 0;

  for (const [category, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  // Normalize to 0-100 confidence
  const maxScore = maxScores[bestCategory] || 1;
  const confidence = Math.min(100, Math.round((bestScore / maxScore) * 100));

  if (confidence < CONFIDENCE_THRESHOLD) {
    return { category: 'Uncategorized', confidence, scores };
  }

  return { category: bestCategory, confidence, scores };
}

/**
 * Backward-compatible wrapper — returns just the category string.
 * Used by rssIngestion.js and routes/events.js.
 */
function categorize(title, content = '') {
  const { category } = categorizeWithScore(title, content);
  return category;
}

module.exports = { categorize, categorizeWithScore, CATEGORY_RULES, CONFIDENCE_THRESHOLD };
