// ---------------------------------------------------------------------------
// Rule-based F1 event categorizer with confidence scoring
//
// Each keyword carries a weight. Title matches get a 2x multiplier since
// titles are more signal-dense than body text. The category with the highest
// total score wins, and the score is normalized to a 0-100 confidence value.
// If the best confidence is below CONFIDENCE_THRESHOLD the event is marked
// "Uncategorized".
// ---------------------------------------------------------------------------

const CONFIDENCE_THRESHOLD = 30;

// Weights: higher = stronger signal for that category
const CATEGORY_RULES = [
  {
    category: 'Race Result',
    keywords: [
      { term: 'wins', weight: 15 },
      { term: 'won', weight: 14 },
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
      { term: 'race report', weight: 16 },
      { term: 'race recap', weight: 16 },
      { term: 'sprint result', weight: 16 },
      { term: 'race classification', weight: 18 },
    ],
  },
  {
    category: 'Qualifying',
    keywords: [
      { term: 'qualifying', weight: 18 },
      { term: 'pole position', weight: 20 },
      { term: 'pole', weight: 12 },
      { term: 'q1', weight: 10 },
      { term: 'q2', weight: 10 },
      { term: 'q3', weight: 12 },
      { term: 'grid position', weight: 14 },
      { term: 'starting grid', weight: 14 },
      { term: 'front row', weight: 10 },
      { term: 'sprint shootout', weight: 16 },
      { term: 'fastest in qualifying', weight: 20 },
    ],
  },
  {
    category: 'Practice & Testing',
    keywords: [
      { term: 'free practice', weight: 16 },
      { term: 'fp1', weight: 14 },
      { term: 'fp2', weight: 14 },
      { term: 'fp3', weight: 14 },
      { term: 'practice session', weight: 16 },
      { term: 'pre-season test', weight: 18 },
      { term: 'preseason test', weight: 18 },
      { term: 'testing', weight: 10 },
      { term: 'test day', weight: 14 },
      { term: 'shakedown', weight: 14 },
      { term: 'laps completed', weight: 10 },
      { term: 'fastest time', weight: 10 },
      { term: 'tops timesheets', weight: 14 },
      { term: 'timesheets', weight: 10 },
      { term: 'fastest in practice', weight: 16 },
      { term: 'bahrain test', weight: 14 },
      { term: 'barcelona test', weight: 14 },
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
      { term: 'banned', weight: 14 },
      { term: 'suspended', weight: 12 },
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
      { term: 'reserve driver', weight: 14 },
      { term: 'confirmed at', weight: 14 },
      { term: 'lineup', weight: 10 },
      { term: 'retirement', weight: 12 },
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
      { term: 'regulations', weight: 14 },
      { term: 'technical directive', weight: 20 },
      { term: 'floor', weight: 8 },
      { term: 'wing', weight: 8 },
      { term: 'aerodynamic', weight: 14 },
      { term: 'aero', weight: 10 },
      { term: 'power unit', weight: 14 },
      { term: 'engine', weight: 8 },
      { term: 'sidepod', weight: 12 },
      { term: 'new rules', weight: 14 },
      { term: 'rule change', weight: 16 },
      { term: 'loophole', weight: 12 },
      { term: 'car design', weight: 12 },
      { term: 'new car', weight: 10 },
      { term: 'launch', weight: 8 },
      { term: 'livery', weight: 8 },
      { term: 'tech', weight: 8 },
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
      { term: 'fia', weight: 8 },
      { term: 'vote', weight: 10 },
    ],
  },
  {
    category: 'Team News',
    keywords: [
      { term: 'team boss', weight: 14 },
      { term: 'team principal', weight: 14 },
      { term: 'factory', weight: 10 },
      { term: 'budget cap', weight: 14 },
      { term: 'sponsor', weight: 12 },
      { term: 'partnership', weight: 12 },
      { term: 'restructure', weight: 12 },
      { term: 'hired', weight: 10 },
      { term: 'appointed', weight: 12 },
      { term: 'rivalry', weight: 8 },
      { term: 'red bull', weight: 6 },
      { term: 'ferrari', weight: 6 },
      { term: 'mercedes', weight: 6 },
      { term: 'mclaren', weight: 6 },
      { term: 'aston martin', weight: 6 },
      { term: 'alpine', weight: 6 },
      { term: 'williams', weight: 6 },
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
