import { describe, it, expect } from 'vitest';
import { 
  matchPatterns, 
  analyzeCoverage,
  quickCoverageCheck,
} from '@/lib/verification/intent/coverage-analyzer';
import { getCorpusStats } from '@/lib/verification/intent/test-corpus';
import { 
  getPatternsForProcess, 
  getPatternCounts,
  findOverlappingPatterns,
} from '@/lib/verification/intent/pattern-registry';

describe('Intent Pattern System', () => {
  describe('Pattern Registry', () => {
    it('has at least 15 patterns for lead generation', () => {
      const patterns = getPatternsForProcess('lead_generation');
      expect(patterns.length).toBeGreaterThanOrEqual(15);
    });

    it('has at least 15 patterns for communication', () => {
      const patterns = getPatternsForProcess('communication');
      expect(patterns.length).toBeGreaterThanOrEqual(15);
    });

    it('has at least 15 patterns for site assessment', () => {
      const patterns = getPatternsForProcess('site_assessment');
      expect(patterns.length).toBeGreaterThanOrEqual(15);
    });

    it('has at least 45 total patterns', () => {
      const counts = getPatternCounts();
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      expect(total).toBeGreaterThanOrEqual(45);
    });
  });

  describe('Pattern Matching', () => {
    it('matches lead generation phrases', () => {
      const result = matchPatterns('new lead from John Smith');
      expect(result.patternId).toBe('complete_lead_generation');
    });

    it('matches communication phrases', () => {
      const result = matchPatterns('contact the customer');
      expect(result.patternId).toBe('complete_customer_communication');
    });

    it('matches site assessment phrases', () => {
      const result = matchPatterns('schedule a site visit');
      expect(result.patternId).toBe('complete_site_assessment');
    });

    it('matches informal lead generation phrases', () => {
      const result = matchPatterns('got a call about landscaping');
      expect(result.patternId).toBe('complete_lead_generation');
    });

    it('matches informal communication phrases', () => {
      const result = matchPatterns('follow up with them');
      expect(result.patternId).toBe('complete_customer_communication');
    });

    it('matches informal assessment phrases', () => {
      const result = matchPatterns('go look at the property');
      expect(result.patternId).toBe('complete_site_assessment');
    });

    it('returns null for unrelated phrases', () => {
      const result = matchPatterns('hello there');
      expect(result.patternId).toBeNull();
    });

    it('returns null for generic phrases', () => {
      const result = matchPatterns('what time is it');
      expect(result.patternId).toBeNull();
    });
  });

  describe('Mutual Exclusivity', () => {
    it('has no overlapping patterns', () => {
      const overlaps = findOverlappingPatterns();
      expect(overlaps.length).toBe(0);
    });
  });

  describe('Test Corpus', () => {
    it('has at least 100 test phrases', () => {
      const stats = getCorpusStats();
      expect(stats.total).toBeGreaterThanOrEqual(100);
    });

    it('has at least 20 phrases per process', () => {
      const stats = getCorpusStats();
      expect(stats.byProcess.lead_generation).toBeGreaterThanOrEqual(20);
      expect(stats.byProcess.communication).toBeGreaterThanOrEqual(20);
      expect(stats.byProcess.site_assessment).toBeGreaterThanOrEqual(20);
    });

    it('has phrases from multiple sources', () => {
      const stats = getCorpusStats();
      expect(stats.bySource.formal).toBeGreaterThan(0);
      expect(stats.bySource.conversational).toBeGreaterThan(0);
      expect(stats.bySource.industry).toBeGreaterThan(0);
    });
  });

  describe('Coverage Analysis', () => {
    it('generates a coverage report', () => {
      const report = analyzeCoverage();
      expect(report.totalPhrases).toBeGreaterThan(0);
      expect(report.correctMatches).toBeDefined();
      expect(report.accuracy).toBeDefined();
    });

    it('achieves at least 80% accuracy', () => {
      const result = quickCoverageCheck();
      expect(result.accuracy).toBeGreaterThanOrEqual(80);
    });

    it('achieves at least 80% coverage', () => {
      const result = quickCoverageCheck();
      expect(result.coverage).toBeGreaterThanOrEqual(80);
    });
  });
});
