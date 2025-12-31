/**
 * Intent Verification Module
 * 
 * Exports for intent pattern verification and coverage analysis.
 */

export { IntentValidator } from './validator';
export { 
  analyzeCoverage, 
  formatCoverageReport, 
  quickCoverageCheck,
  matchPatterns,
  type CoverageReport,
  type MatchResult,
} from './coverage-analyzer';
export { 
  TEST_CORPUS, 
  getCorpusStats,
  getPhrasesForProcess,
  getPhrasesBySource,
  type TestPhrase,
  type PhraseSource,
  type ProcessCategory,
} from './test-corpus';
export {
  ALL_PROCESS_PATTERNS,
  LEAD_GENERATION_PATTERNS,
  CUSTOMER_COMMUNICATION_PATTERNS,
  SITE_ASSESSMENT_PATTERNS,
  TRANSITION_PATTERNS,
  getPatternsForProcess,
  getKeywordsForProcess,
  getPatternCounts,
  findOverlappingPatterns,
  type ProcessPatterns,
  type PatternCategory,
  type TransitionPattern,
} from './pattern-registry';
