const { categorize, categorizeWithScore, CATEGORY_RULES, CONFIDENCE_THRESHOLD } = require('../../src/services/eventCategorizer');

describe('eventCategorizer', () => {
  // -------------------------------------------------------------------
  // Each of the 6 categories gets correctly identified
  // -------------------------------------------------------------------
  describe('category identification', () => {
    test('identifies Race Result from title', () => {
      expect(categorize('Verstappen wins the Monaco Grand Prix')).toBe('Race Result');
    });

    test('identifies Penalty from title', () => {
      expect(categorize('Hamilton given 10-second time penalty at Silverstone')).toBe('Penalty');
    });

    test('identifies Driver Transfer from title', () => {
      expect(categorize('Sainz signs with Williams and joins the new driver lineup')).toBe('Driver Transfer');
    });

    test('identifies Contract News from title', () => {
      expect(categorize('Red Bull extends Verstappen with multi-year deal')).toBe('Contract News');
    });

    test('identifies Technical Update from title', () => {
      expect(categorize('McLaren reveals major aerodynamic upgrade package')).toBe('Technical Update');
    });

    test('identifies Official Statement from title', () => {
      expect(categorize('FIA announces new clarification on 2025 regulations')).toBe('Official Statement');
    });
  });

  // -------------------------------------------------------------------
  // Confidence scoring
  // -------------------------------------------------------------------
  describe('confidence scoring', () => {
    test('high-confidence match returns correct category', () => {
      const result = categorizeWithScore('Grand Prix results: Verstappen wins the race', 'podium celebration');
      expect(result.category).toBe('Race Result');
      expect(result.confidence).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD);
    });

    test('low-confidence match returns Uncategorized', () => {
      const result = categorizeWithScore('Weather forecast for tomorrow');
      expect(result.category).toBe('Uncategorized');
      expect(result.confidence).toBeLessThan(CONFIDENCE_THRESHOLD);
    });

    test('confidence is 0-100 range', () => {
      const result = categorizeWithScore('Verstappen wins the Grand Prix results podium victory');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    test('scores object contains all categories', () => {
      const result = categorizeWithScore('Some F1 news');
      const categoryNames = CATEGORY_RULES.map((r) => r.category);
      for (const name of categoryNames) {
        expect(result.scores).toHaveProperty(name);
      }
    });
  });

  // -------------------------------------------------------------------
  // Title vs content weighting
  // -------------------------------------------------------------------
  describe('title vs content weighting', () => {
    test('title match scores higher than content-only match', () => {
      const titleMatch = categorizeWithScore('penalty decision announced', '');
      const contentMatch = categorizeWithScore('', 'penalty decision announced');

      expect(titleMatch.scores['Penalty']).toBeGreaterThan(contentMatch.scores['Penalty']);
    });

    test('category determined by title even when content matches a different category', () => {
      // Title strongly matches Penalty, content matches Race Result
      const result = categorize(
        'Stewards hand out time penalty and disqualified driver',
        'The race winner crossed the checkered flag first on the podium'
      );
      expect(result).toBe('Penalty');
    });
  });

  // -------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------
  describe('edge cases', () => {
    test('empty strings return Uncategorized', () => {
      expect(categorize('', '')).toBe('Uncategorized');
    });

    test('empty title with empty content', () => {
      const result = categorizeWithScore('', '');
      expect(result.category).toBe('Uncategorized');
      expect(result.confidence).toBe(0);
    });

    test('no matching keywords returns Uncategorized', () => {
      expect(categorize('The quick brown fox jumps over the lazy dog')).toBe('Uncategorized');
    });

    test('content-only match still categorizes if strong enough', () => {
      const result = categorizeWithScore('Breaking news', 'FIA announces new clarification on the statement and press release');
      // Should pick up Official Statement from content
      expect(result.scores['Official Statement']).toBeGreaterThan(0);
    });

    test('overlapping keywords: "contract" appears in both Driver Transfer and Contract News', () => {
      // "contract" alone shouldn't be enough for high confidence
      const result = categorizeWithScore('contract details revealed');
      // Both categories should have some score for "contract"
      expect(result.scores['Driver Transfer']).toBeGreaterThan(0);
      expect(result.scores['Contract News']).toBeGreaterThan(0);
    });

    test('categorize defaults content to empty string', () => {
      // Should not throw when content is omitted
      expect(() => categorize('Some title')).not.toThrow();
    });
  });
});
