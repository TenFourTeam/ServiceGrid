/**
 * Intent Validator
 * 
 * Validates the intent classification and routing system across four dimensions:
 * - Implementation: Pattern definitions exist and are properly structured
 * - Configuration: Patterns are wired into the multi-step planner
 * - Verification: Patterns match expected test phrases
 * - Validation: E2E coverage and accuracy metrics meet thresholds
 */

import { BaseValidator } from '../base-validator';
import { HealthCheck, ValidatorOptions } from '../types';
import {
  ALL_PROCESS_PATTERNS,
  getPatternsForProcess,
  getPatternCounts,
  findOverlappingPatterns,
  TRANSITION_PATTERNS,
} from './pattern-registry';
import {
  TEST_CORPUS,
  getCorpusStats,
} from './test-corpus';
import {
  analyzeCoverage,
  quickCoverageCheck,
} from './coverage-analyzer';

// =============================================================================
// CONSTANTS
// =============================================================================

const MINIMUM_PATTERNS_PER_PROCESS = 15;
const MINIMUM_CATEGORIES_PER_PROCESS = 4;
const MINIMUM_TEST_PHRASES = 100;
const MINIMUM_ACCURACY_THRESHOLD = 85;
const MINIMUM_COVERAGE_THRESHOLD = 80;

// =============================================================================
// INTENT VALIDATOR
// =============================================================================

export class IntentValidator extends BaseValidator {
  constructor(options: ValidatorOptions = {}) {
    super('intent', options);
  }

  async checkImplementation(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Check 1: Lead Generation patterns exist
    const leadGenPatterns = getPatternsForProcess('lead_generation');
    checks.push(
      leadGenPatterns.length >= MINIMUM_PATTERNS_PER_PROCESS
        ? this.pass(
            'lead_gen_patterns',
            'Lead Generation Patterns',
            'implementation',
            `${leadGenPatterns.length} patterns defined`
          )
        : this.fail(
            'lead_gen_patterns',
            'Lead Generation Patterns',
            'implementation',
            'high',
            `Only ${leadGenPatterns.length} patterns (need ${MINIMUM_PATTERNS_PER_PROCESS})`,
            'Add more patterns to cover all lead generation scenarios'
          )
    );

    // Check 2: Communication patterns exist
    const commPatterns = getPatternsForProcess('communication');
    checks.push(
      commPatterns.length >= MINIMUM_PATTERNS_PER_PROCESS
        ? this.pass(
            'comm_patterns',
            'Communication Patterns',
            'implementation',
            `${commPatterns.length} patterns defined`
          )
        : this.fail(
            'comm_patterns',
            'Communication Patterns',
            'implementation',
            'high',
            `Only ${commPatterns.length} patterns (need ${MINIMUM_PATTERNS_PER_PROCESS})`,
            'Add more patterns for customer communication scenarios'
          )
    );

    // Check 3: Site Assessment patterns exist
    const assessmentPatterns = getPatternsForProcess('site_assessment');
    checks.push(
      assessmentPatterns.length >= MINIMUM_PATTERNS_PER_PROCESS
        ? this.pass(
            'assessment_patterns',
            'Site Assessment Patterns',
            'implementation',
            `${assessmentPatterns.length} patterns defined`
          )
        : this.fail(
            'assessment_patterns',
            'Site Assessment Patterns',
            'implementation',
            'high',
            `Only ${assessmentPatterns.length} patterns (need ${MINIMUM_PATTERNS_PER_PROCESS})`,
            'Add more patterns for site assessment scenarios'
          )
    );

    // Check 4: Each process has sufficient categories
    for (const process of ALL_PROCESS_PATTERNS) {
      const categoryCount = process.categories.length;
      checks.push(
        categoryCount >= MINIMUM_CATEGORIES_PER_PROCESS
          ? this.pass(
              `${process.processId}_categories`,
              `${process.name} Categories`,
              'implementation',
              `${categoryCount} categories defined`
            )
          : this.fail(
              `${process.processId}_categories`,
              `${process.name} Categories`,
              'implementation',
              'medium',
              `Only ${categoryCount} categories (need ${MINIMUM_CATEGORIES_PER_PROCESS})`,
              'Add more pattern categories for comprehensive coverage'
            )
      );
    }

    // Check 5: Transition patterns exist
    checks.push(
      TRANSITION_PATTERNS.length >= 10
        ? this.pass(
            'transition_patterns',
            'Process Transition Patterns',
            'implementation',
            `${TRANSITION_PATTERNS.length} transition patterns defined`
          )
        : this.fail(
            'transition_patterns',
            'Process Transition Patterns',
            'implementation',
            'medium',
            `Only ${TRANSITION_PATTERNS.length} transition patterns`,
            'Add more patterns for process-to-process transitions'
          )
    );

    return checks;
  }

  async checkConfiguration(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Check 1: Pattern registry is properly structured
    const patternCounts = getPatternCounts();
    const totalPatterns = Object.values(patternCounts).reduce((a, b) => a + b, 0);
    
    checks.push(
      totalPatterns >= MINIMUM_PATTERNS_PER_PROCESS * 3
        ? this.pass(
            'total_patterns',
            'Total Pattern Count',
            'configuration',
            `${totalPatterns} patterns across all processes`
          )
        : this.fail(
            'total_patterns',
            'Total Pattern Count',
            'configuration',
            'high',
            `Only ${totalPatterns} total patterns`,
            'Add more patterns to achieve comprehensive coverage'
          )
    );

    // Check 2: All processes have keywords defined
    for (const process of ALL_PROCESS_PATTERNS) {
      const hasKeywords = process.categories.every(cat => cat.keywords.length > 0);
      checks.push(
        hasKeywords
          ? this.pass(
              `${process.processId}_keywords`,
              `${process.name} Keywords`,
              'configuration',
              'All categories have keywords'
            )
          : this.fail(
              `${process.processId}_keywords`,
              `${process.name} Keywords`,
              'configuration',
              'medium',
              'Some categories missing keywords',
              'Add keywords to all pattern categories'
            )
      );
    }

    // Check 3: Transition patterns have target processes
    const validTransitions = TRANSITION_PATTERNS.filter(t => 
      ALL_PROCESS_PATTERNS.some(p => p.processId === t.targetProcess)
    );
    
    checks.push(
      validTransitions.length === TRANSITION_PATTERNS.length
        ? this.pass(
            'valid_transitions',
            'Transition Pattern Targets',
            'configuration',
            'All transition patterns have valid target processes'
          )
        : this.fail(
            'valid_transitions',
            'Transition Pattern Targets',
            'configuration',
            'high',
            `${TRANSITION_PATTERNS.length - validTransitions.length} transitions have invalid targets`,
            'Fix target process IDs in transition patterns'
          )
    );

    return checks;
  }

  async checkVerification(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Check 1: Test corpus has sufficient phrases
    const corpusStats = getCorpusStats();
    checks.push(
      corpusStats.total >= MINIMUM_TEST_PHRASES
        ? this.pass(
            'test_corpus_size',
            'Test Corpus Size',
            'verification',
            `${corpusStats.total} test phrases defined`
          )
        : this.fail(
            'test_corpus_size',
            'Test Corpus Size',
            'verification',
            'high',
            `Only ${corpusStats.total} test phrases (need ${MINIMUM_TEST_PHRASES})`,
            'Add more test phrases to the corpus'
          )
    );

    // Check 2: Test coverage per process
    for (const [proc, count] of Object.entries(corpusStats.byProcess)) {
      if (proc === 'none') continue;
      
      checks.push(
        count >= 20
          ? this.pass(
              `${proc}_test_coverage`,
              `${proc} Test Phrases`,
              'verification',
              `${count} test phrases`
            )
          : this.fail(
              `${proc}_test_coverage`,
              `${proc} Test Phrases`,
              'verification',
              'medium',
              `Only ${count} test phrases`,
              'Add more test phrases for this process'
            )
      );
    }

    // Check 3: Mutual exclusivity
    const overlaps = findOverlappingPatterns();
    checks.push(
      overlaps.length === 0
        ? this.pass(
            'mutual_exclusivity',
            'Pattern Mutual Exclusivity',
            'verification',
            'No overlapping patterns detected'
          )
        : this.fail(
            'mutual_exclusivity',
            'Pattern Mutual Exclusivity',
            'verification',
            'high',
            `${overlaps.length} phrases match multiple patterns`,
            'Refine patterns to ensure mutual exclusivity'
          )
    );

    return checks;
  }

  async checkValidation(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Run coverage analysis
    const coverageResult = quickCoverageCheck();

    // Check 1: Overall accuracy
    checks.push(
      coverageResult.accuracy >= MINIMUM_ACCURACY_THRESHOLD
        ? this.pass(
            'pattern_accuracy',
            'Pattern Matching Accuracy',
            'validation',
            `${coverageResult.accuracy}% accuracy`
          )
        : this.fail(
            'pattern_accuracy',
            'Pattern Matching Accuracy',
            'validation',
            'critical',
            `Only ${coverageResult.accuracy}% accuracy (need ${MINIMUM_ACCURACY_THRESHOLD}%)`,
            'Review and fix failing pattern matches'
          )
    );

    // Check 2: Coverage threshold
    checks.push(
      coverageResult.coverage >= MINIMUM_COVERAGE_THRESHOLD
        ? this.pass(
            'pattern_coverage',
            'Pattern Coverage',
            'validation',
            `${coverageResult.coverage}% coverage`
          )
        : this.fail(
            'pattern_coverage',
            'Pattern Coverage',
            'validation',
            'high',
            `Only ${coverageResult.coverage}% coverage (need ${MINIMUM_COVERAGE_THRESHOLD}%)`,
            'Add patterns for unmatched test phrases'
          )
    );

    // Check 3: No critical issues
    checks.push(
      coverageResult.criticalIssues === 0
        ? this.pass(
            'no_critical_issues',
            'No Critical Issues',
            'validation',
            'No false negatives or exclusivity violations'
          )
        : this.fail(
            'no_critical_issues',
            'Critical Issues Found',
            'validation',
            'critical',
            `${coverageResult.criticalIssues} critical issues`,
            'Fix false negatives and pattern overlaps'
          )
    );

    return checks;
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export { analyzeCoverage, formatCoverageReport, quickCoverageCheck } from './coverage-analyzer';
export { TEST_CORPUS, getCorpusStats } from './test-corpus';
export { ALL_PROCESS_PATTERNS, getPatternsForProcess, getPatternCounts } from './pattern-registry';
