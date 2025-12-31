/**
 * Pattern Coverage Analyzer
 * 
 * Analyzes pattern matching accuracy against the test corpus
 * and generates coverage reports.
 */

import { 
  TEST_CORPUS, 
  TestPhrase,
  getCorpusStats,
  getPhrasesExpectingMatch,
  getPhrasesExpectingNoMatch,
} from './test-corpus';
import { 
  ALL_PROCESS_PATTERNS,
  getPatternsForProcess,
  TRANSITION_PATTERNS,
  findOverlappingPatterns,
} from './pattern-registry';

// =============================================================================
// TYPES
// =============================================================================

export interface MatchResult {
  phrase: TestPhrase;
  actualPattern: string | null;
  actualProcess: string | null;
  passed: boolean;
  errorType?: 'false_positive' | 'false_negative' | 'wrong_pattern' | 'wrong_process';
}

export interface CoverageReport {
  timestamp: Date;
  totalPhrases: number;
  matched: number;
  unmatched: number;
  coverage: number;
  accuracy: number;
  
  results: MatchResult[];
  falsePositives: MatchResult[];
  falseNegatives: MatchResult[];
  wrongPatterns: MatchResult[];
  
  byProcess: Record<string, {
    total: number;
    passed: number;
    failed: number;
    coverage: number;
  }>;
  
  byCategory: Record<string, {
    total: number;
    passed: number;
    failed: number;
  }>;
  
  mutualExclusivityViolations: { phrase: string; matches: string[] }[];
  
  suggestions: string[];
}

// =============================================================================
// PATTERN MATCHER (Simulates edge function behavior)
// =============================================================================

/**
 * Simulates the pattern matching logic from multi-step-planner.ts
 */
export function matchPatterns(input: string): { patternId: string | null; processId: string | null } {
  const inputLower = input.toLowerCase();
  
  // Check each process's patterns
  for (const process of ALL_PROCESS_PATTERNS) {
    for (const category of process.categories) {
      for (const pattern of category.patterns) {
        if (pattern.test(inputLower)) {
          return {
            patternId: process.patternId,
            processId: process.processId,
          };
        }
      }
    }
  }
  
  // Check transition patterns
  for (const transition of TRANSITION_PATTERNS) {
    if (transition.pattern.test(inputLower)) {
      // Find the pattern ID for the target process
      const targetProcess = ALL_PROCESS_PATTERNS.find(p => p.processId === transition.targetProcess);
      if (targetProcess) {
        return {
          patternId: targetProcess.patternId,
          processId: targetProcess.processId,
        };
      }
    }
  }
  
  return { patternId: null, processId: null };
}

// =============================================================================
// ANALYSIS FUNCTIONS
// =============================================================================

/**
 * Run the full coverage analysis
 */
export function analyzeCoverage(): CoverageReport {
  const results: MatchResult[] = [];
  const falsePositives: MatchResult[] = [];
  const falseNegatives: MatchResult[] = [];
  const wrongPatterns: MatchResult[] = [];
  
  const byProcess: CoverageReport['byProcess'] = {};
  const byCategory: CoverageReport['byCategory'] = {};
  
  // Test each phrase
  for (const phrase of TEST_CORPUS) {
    const { patternId, processId } = matchPatterns(phrase.input);
    
    let passed = false;
    let errorType: MatchResult['errorType'];
    
    if (phrase.expectedPattern === null) {
      // Should NOT match
      passed = patternId === null;
      if (!passed) {
        errorType = 'false_positive';
      }
    } else {
      // Should match
      if (patternId === null) {
        passed = false;
        errorType = 'false_negative';
      } else if (patternId !== phrase.expectedPattern) {
        passed = false;
        errorType = 'wrong_pattern';
      } else if (processId !== phrase.expectedProcess) {
        passed = false;
        errorType = 'wrong_process';
      } else {
        passed = true;
      }
    }
    
    const result: MatchResult = {
      phrase,
      actualPattern: patternId,
      actualProcess: processId,
      passed,
      errorType,
    };
    
    results.push(result);
    
    // Categorize errors
    if (!passed) {
      switch (errorType) {
        case 'false_positive':
          falsePositives.push(result);
          break;
        case 'false_negative':
          falseNegatives.push(result);
          break;
        case 'wrong_pattern':
        case 'wrong_process':
          wrongPatterns.push(result);
          break;
      }
    }
    
    // Track by process
    const proc = phrase.expectedProcess;
    if (!byProcess[proc]) {
      byProcess[proc] = { total: 0, passed: 0, failed: 0, coverage: 0 };
    }
    byProcess[proc].total++;
    if (passed) {
      byProcess[proc].passed++;
    } else {
      byProcess[proc].failed++;
    }
    
    // Track by category
    if (phrase.category) {
      if (!byCategory[phrase.category]) {
        byCategory[phrase.category] = { total: 0, passed: 0, failed: 0 };
      }
      byCategory[phrase.category].total++;
      if (passed) {
        byCategory[phrase.category].passed++;
      } else {
        byCategory[phrase.category].failed++;
      }
    }
  }
  
  // Calculate process coverage
  for (const proc of Object.keys(byProcess)) {
    byProcess[proc].coverage = Math.round((byProcess[proc].passed / byProcess[proc].total) * 100);
  }
  
  // Check mutual exclusivity
  const mutualExclusivityViolations = findOverlappingPatterns();
  
  // Generate suggestions
  const suggestions = generateSuggestions(falseNegatives, wrongPatterns);
  
  // Calculate overall metrics
  const totalPhrases = TEST_CORPUS.length;
  const matched = results.filter(r => r.actualPattern !== null).length;
  const unmatched = totalPhrases - matched;
  const passedCount = results.filter(r => r.passed).length;
  
  return {
    timestamp: new Date(),
    totalPhrases,
    matched,
    unmatched,
    coverage: Math.round((matched / getPhrasesExpectingMatch().length) * 100),
    accuracy: Math.round((passedCount / totalPhrases) * 100),
    results,
    falsePositives,
    falseNegatives,
    wrongPatterns,
    byProcess,
    byCategory,
    mutualExclusivityViolations,
    suggestions,
  };
}

/**
 * Generate suggestions for improving coverage
 */
function generateSuggestions(
  falseNegatives: MatchResult[],
  wrongPatterns: MatchResult[]
): string[] {
  const suggestions: string[] = [];
  
  // Group false negatives by process
  const fnByProcess: Record<string, string[]> = {};
  for (const fn of falseNegatives) {
    const proc = fn.phrase.expectedProcess;
    if (!fnByProcess[proc]) {
      fnByProcess[proc] = [];
    }
    fnByProcess[proc].push(fn.phrase.input);
  }
  
  for (const [proc, phrases] of Object.entries(fnByProcess)) {
    if (phrases.length > 0) {
      suggestions.push(
        `Add patterns to ${proc} for: "${phrases.slice(0, 3).join('", "')}${phrases.length > 3 ? '...' : ''}"`
      );
    }
  }
  
  // Suggest fixes for wrong patterns
  if (wrongPatterns.length > 0) {
    suggestions.push(
      `Review pattern order - ${wrongPatterns.length} phrases matched wrong patterns`
    );
  }
  
  return suggestions;
}

// =============================================================================
// REPORT FORMATTING
// =============================================================================

/**
 * Format the coverage report for console output
 */
export function formatCoverageReport(report: CoverageReport, verbose = false): string {
  const lines: string[] = [];
  
  lines.push('');
  lines.push('═'.repeat(65));
  lines.push('  🎯 INTENT PATTERN COVERAGE REPORT');
  lines.push('═'.repeat(65));
  lines.push('');
  
  // Summary metrics
  lines.push('Summary:');
  lines.push('─'.repeat(65));
  lines.push(`  Total test phrases:     ${report.totalPhrases}`);
  lines.push(`  Matched:                ${report.matched} (${report.coverage}% of expected)`);
  lines.push(`  Accuracy:               ${report.accuracy}%`);
  lines.push('');
  
  // By process breakdown
  lines.push('Coverage by Process:');
  lines.push('─'.repeat(65));
  lines.push('  Process                   Total   Passed  Failed  Coverage');
  lines.push('─'.repeat(65));
  
  for (const [proc, stats] of Object.entries(report.byProcess)) {
    const icon = stats.coverage >= 90 ? '✅' : stats.coverage >= 70 ? '⚠️' : '❌';
    const name = proc.padEnd(22);
    const total = String(stats.total).padEnd(6);
    const passed = String(stats.passed).padEnd(6);
    const failed = String(stats.failed).padEnd(6);
    lines.push(`  ${icon} ${name} ${total} ${passed} ${failed} ${stats.coverage}%`);
  }
  lines.push('');
  
  // Mutual exclusivity check
  if (report.mutualExclusivityViolations.length > 0) {
    lines.push('⚠️ Mutual Exclusivity Violations:');
    lines.push('─'.repeat(65));
    for (const v of report.mutualExclusivityViolations) {
      lines.push(`  • "${v.phrase}" matches: ${v.matches.join(', ')}`);
    }
    lines.push('');
  } else {
    lines.push('✅ Mutual Exclusivity: No violations detected');
    lines.push('');
  }
  
  // Errors
  if (report.falseNegatives.length > 0) {
    lines.push(`❌ False Negatives (${report.falseNegatives.length}):`);
    lines.push('─'.repeat(65));
    const toShow = verbose ? report.falseNegatives : report.falseNegatives.slice(0, 5);
    for (const fn of toShow) {
      lines.push(`  • "${fn.phrase.input}" → expected: ${fn.phrase.expectedPattern}`);
    }
    if (!verbose && report.falseNegatives.length > 5) {
      lines.push(`  ... and ${report.falseNegatives.length - 5} more`);
    }
    lines.push('');
  }
  
  if (report.falsePositives.length > 0) {
    lines.push(`⚠️ False Positives (${report.falsePositives.length}):`);
    lines.push('─'.repeat(65));
    const toShow = verbose ? report.falsePositives : report.falsePositives.slice(0, 5);
    for (const fp of toShow) {
      lines.push(`  • "${fp.phrase.input}" → got: ${fp.actualPattern}`);
    }
    if (!verbose && report.falsePositives.length > 5) {
      lines.push(`  ... and ${report.falsePositives.length - 5} more`);
    }
    lines.push('');
  }
  
  // Suggestions
  if (report.suggestions.length > 0) {
    lines.push('📋 Suggestions:');
    lines.push('─'.repeat(65));
    for (const s of report.suggestions) {
      lines.push(`  • ${s}`);
    }
    lines.push('');
  }
  
  lines.push('═'.repeat(65));
  lines.push(`  Generated: ${report.timestamp.toISOString()}`);
  lines.push('═'.repeat(65));
  
  return lines.join('\n');
}

/**
 * Quick coverage check - returns pass/fail
 */
export function quickCoverageCheck(): {
  passed: boolean;
  coverage: number;
  accuracy: number;
  criticalIssues: number;
} {
  const report = analyzeCoverage();
  
  const criticalIssues = report.falseNegatives.length + report.mutualExclusivityViolations.length;
  const passed = report.accuracy >= 90 && criticalIssues === 0;
  
  return {
    passed,
    coverage: report.coverage,
    accuracy: report.accuracy,
    criticalIssues,
  };
}
