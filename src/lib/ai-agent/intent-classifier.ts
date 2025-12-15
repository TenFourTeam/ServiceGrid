/**
 * Intent Classifier - Main classification engine for ServiceGrid AI Agent
 * Combines pattern matching, page context, and entity extraction to classify user intents
 */

import {
  Domain,
  DOMAINS,
  DOMAIN_METADATA,
  IntentDefinition,
  INTENT_REGISTRY,
  ClassifiedIntent,
  EntityType,
  ExtractedEntity,
  getDomainFromRoute,
  getIntentsByDomain,
} from './intent-taxonomy';
import { extractEntities, ExtractionResult } from './entity-extractor';

// ============================================================================
// CLASSIFIER CONFIGURATION
// ============================================================================

export interface ClassifierConfig {
  minConfidenceThreshold: number;
  maxAlternativeIntents: number;
  boostFactors: {
    pageContext: number;
    recentAction: number;
    entityMatch: number;
    patternMatch: number;
  };
}

const DEFAULT_CONFIG: ClassifierConfig = {
  minConfidenceThreshold: 0.3,
  maxAlternativeIntents: 3,
  boostFactors: {
    pageContext: 0.15,     // Boost if on relevant page
    recentAction: 0.1,     // Boost if follows related action
    entityMatch: 0.2,      // Boost if required entities found
    patternMatch: 0.25,    // Base pattern match score
  },
};

// ============================================================================
// CLASSIFIER INPUT
// ============================================================================

export interface ClassifierInput {
  message: string;
  currentPage?: string;
  recentActions?: string[];
  sessionContext?: {
    businessId?: string;
    userId?: string;
    activeJobId?: string;
    activeCustomerId?: string;
    activeQuoteId?: string;
    activeInvoiceId?: string;
  };
  knownData?: {
    customerNames?: string[];
    jobTitles?: string[];
    teamMemberNames?: string[];
  };
}

// ============================================================================
// MAIN CLASSIFIER
// ============================================================================

export class IntentClassifier {
  private config: ClassifierConfig;

  constructor(config: Partial<ClassifierConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Main classification method
   */
  classify(input: ClassifierInput): ClassifiedIntent {
    const startTime = Date.now();

    // 1. Extract entities from the message
    const extractedEntities = extractEntities(
      input.message,
      undefined,
      input.knownData
    );

    // 2. Score all intents
    const scoredIntents = this.scoreAllIntents(input, extractedEntities);

    // 3. Get top intent and alternatives
    const sortedIntents = scoredIntents.sort((a, b) => b.score - a.score);
    const topIntent = sortedIntents[0];

    // 4. Build entity map for the result
    const entityMap = this.buildEntityMap(extractedEntities, topIntent?.intent);

    // 5. Determine required context from context-map
    const requiredContext = this.getRequiredContext(topIntent?.intent);

    // 6. Build the result
    const result: ClassifiedIntent = {
      domain: topIntent?.intent.domain ?? 'job_management',
      intent: topIntent?.intent.id ?? 'unknown',
      intentDef: topIntent?.intent ?? this.getDefaultIntent(),
      confidence: topIntent?.score ?? 0,
      entities: entityMap,
      possibleIntents: sortedIntents
        .slice(0, this.config.maxAlternativeIntents)
        .filter(s => s.score >= this.config.minConfidenceThreshold)
        .map(s => ({
          intent: s.intent,
          confidence: s.score,
          label: s.intent.label,
          description: s.intent.description,
        })),
      requiredContext,
      rawInput: input.message,
      timestamp: new Date(),
    };

    console.log(`[IntentClassifier] Classified in ${Date.now() - startTime}ms:`, {
      intent: result.intent,
      confidence: result.confidence.toFixed(2),
      domain: result.domain,
      entities: Object.keys(entityMap).length,
    });

    return result;
  }

  /**
   * Score all intents against the input
   */
  private scoreAllIntents(
    input: ClassifierInput,
    extractedEntities: ExtractionResult
  ): Array<{ intent: IntentDefinition; score: number; breakdown: ScoreBreakdown }> {
    const results: Array<{ intent: IntentDefinition; score: number; breakdown: ScoreBreakdown }> = [];

    // Determine domain hint from page context
    const pageDomain = input.currentPage ? getDomainFromRoute(input.currentPage) : undefined;

    for (const intent of INTENT_REGISTRY) {
      const breakdown = this.scoreIntent(intent, input, extractedEntities, pageDomain);
      const score = this.calculateFinalScore(breakdown);

      results.push({ intent, score, breakdown });
    }

    return results;
  }

  /**
   * Score a single intent
   */
  private scoreIntent(
    intent: IntentDefinition,
    input: ClassifierInput,
    extractedEntities: ExtractionResult,
    pageDomain?: Domain
  ): ScoreBreakdown {
    const breakdown: ScoreBreakdown = {
      patternScore: 0,
      keywordScore: 0,
      pageContextScore: 0,
      recentActionScore: 0,
      entityScore: 0,
      exampleSimilarity: 0,
    };

    const messageLower = input.message.toLowerCase();

    // 1. Pattern matching
    for (const pattern of intent.patterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(input.message)) {
        breakdown.patternScore = Math.max(breakdown.patternScore, this.config.boostFactors.patternMatch);
      }
    }

    // 2. Keyword matching from domain
    const domainMeta = DOMAIN_METADATA[intent.domain];
    for (const keyword of domainMeta.keywords) {
      if (messageLower.includes(keyword.toLowerCase())) {
        breakdown.keywordScore += 0.05;
      }
    }
    breakdown.keywordScore = Math.min(breakdown.keywordScore, 0.15);

    // 3. Page context boost
    if (pageDomain === intent.domain) {
      breakdown.pageContextScore = this.config.boostFactors.pageContext;
    }

    // 4. Recent action boost
    if (input.recentActions?.length) {
      const relatedIntents = getIntentsByDomain(intent.domain).map(i => i.id);
      for (const action of input.recentActions) {
        if (relatedIntents.includes(action)) {
          breakdown.recentActionScore = this.config.boostFactors.recentAction;
          break;
        }
      }
    }

    // 5. Entity match score
    const requiredMatched = intent.requiredEntities.filter(
      type => extractedEntities.entities.has(type)
    ).length;
    const requiredTotal = intent.requiredEntities.length;
    
    if (requiredTotal > 0) {
      breakdown.entityScore = (requiredMatched / requiredTotal) * this.config.boostFactors.entityMatch;
    } else {
      // No required entities - give partial score if any relevant entities found
      const optionalMatched = intent.optionalEntities.filter(
        type => extractedEntities.entities.has(type)
      ).length;
      if (optionalMatched > 0) {
        breakdown.entityScore = 0.05;
      }
    }

    // 6. Example similarity (simple overlap check)
    for (const example of intent.examples) {
      const similarity = this.calculateStringSimilarity(messageLower, example.toLowerCase());
      breakdown.exampleSimilarity = Math.max(breakdown.exampleSimilarity, similarity * 0.15);
    }

    return breakdown;
  }

  /**
   * Calculate final score from breakdown
   */
  private calculateFinalScore(breakdown: ScoreBreakdown): number {
    const score =
      breakdown.patternScore +
      breakdown.keywordScore +
      breakdown.pageContextScore +
      breakdown.recentActionScore +
      breakdown.entityScore +
      breakdown.exampleSimilarity;

    // Normalize to 0-1 range
    return Math.min(score, 1);
  }

  /**
   * Simple string similarity (Jaccard on words)
   */
  private calculateStringSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2));
    const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 2));

    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;

    return intersection / union;
  }

  /**
   * Build entity map from extraction result
   */
  private buildEntityMap(
    extracted: ExtractionResult,
    intent?: IntentDefinition
  ): Record<EntityType, ExtractedEntity> {
    const map: Record<EntityType, ExtractedEntity> = {} as any;

    // Add all extracted entities (highest confidence per type)
    for (const [type, entities] of extracted.entities) {
      if (entities.length > 0) {
        const best = entities.reduce((a, b) => a.confidence > b.confidence ? a : b);
        map[type] = best;
      }
    }

    return map;
  }

  /**
   * Get required context keys for an intent
   */
  private getRequiredContext(intent?: IntentDefinition): string[] {
    if (!intent) return [];

    // Map intent to context requirements
    const contextRequirements: Record<string, string[]> = {
      // Scheduling
      batch_schedule: ['unscheduled_jobs', 'team_availability', 'time_off_requests', 'business_constraints', 'date_range'],
      schedule_job: ['job_details', 'team_availability', 'existing_schedule'],
      reschedule_job: ['job_details', 'team_availability', 'existing_schedule'],
      optimize_route: ['scheduled_jobs_for_date', 'job_locations'],
      check_availability: ['team_availability', 'time_off_requests'],

      // Jobs
      create_job: ['customer_list', 'quote_context'],
      view_job_details: ['job_details', 'customer_details', 'job_assignments'],
      assign_job: ['job_details', 'team_members'],
      update_job_status: ['job_details'],

      // Quotes
      create_quote: ['customer_details', 'pricing_rules', 'line_item_templates'],
      send_quote: ['quote_details', 'customer_details'],
      convert_quote_to_job: ['quote_details', 'team_availability'],

      // Invoicing
      create_invoice: ['customer_details', 'job_or_quote_details', 'business_tax_rate'],
      send_invoice: ['invoice_details', 'customer_details'],

      // Team
      check_team_availability: ['team_members', 'team_availability', 'time_off_requests'],
      view_utilization: ['team_members', 'timesheet_entries', 'scheduled_jobs'],

      // Default
      default: ['business_context', 'user_context'],
    };

    return contextRequirements[intent.id] ?? contextRequirements.default;
  }

  /**
   * Get default fallback intent
   */
  private getDefaultIntent(): IntentDefinition {
    return {
      id: 'unknown',
      domain: 'job_management',
      label: 'Unknown',
      description: 'Could not determine intent',
      category: 'query',
      patterns: [],
      examples: [],
      requiredEntities: [],
      optionalEntities: [],
      toolsUsed: [],
      riskLevel: 'low',
      requiresConfirmation: false,
    };
  }
}

interface ScoreBreakdown {
  patternScore: number;
  keywordScore: number;
  pageContextScore: number;
  recentActionScore: number;
  entityScore: number;
  exampleSimilarity: number;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

// Singleton instance
let classifierInstance: IntentClassifier | null = null;

export function getClassifier(config?: Partial<ClassifierConfig>): IntentClassifier {
  if (!classifierInstance || config) {
    classifierInstance = new IntentClassifier(config);
  }
  return classifierInstance;
}

export function classifyIntent(input: ClassifierInput): ClassifiedIntent {
  return getClassifier().classify(input);
}

/**
 * Quick check if a message likely needs clarification
 */
export function needsClarification(result: ClassifiedIntent): boolean {
  // Low confidence
  if (result.confidence < 0.5) return true;

  // Multiple equally likely intents
  if (
    result.possibleIntents.length > 1 &&
    result.possibleIntents[1].confidence > result.confidence * 0.8
  ) {
    return true;
  }

  // Missing required entities
  const missing = result.intentDef.requiredEntities.filter(
    type => !result.entities[type]
  );
  if (missing.length > 0) return true;

  return false;
}

/**
 * Generate a clarification question based on what's missing
 */
export function generateClarificationQuestion(result: ClassifiedIntent): string {
  // Ambiguous intent
  if (
    result.possibleIntents.length > 1 &&
    result.possibleIntents[1].confidence > result.confidence * 0.8
  ) {
    const options = result.possibleIntents.slice(0, 3).map(p => p.label);
    return `I want to make sure I understand. Did you want to: ${options.join(', or ')}?`;
  }

  // Missing entities
  const missing = result.intentDef.requiredEntities.filter(
    type => !result.entities[type]
  );

  if (missing.length > 0) {
    const entityQuestions: Record<string, string> = {
      customer_id: 'Which customer is this for?',
      customer_name: 'What is the customer name?',
      job_id: 'Which job are you referring to?',
      quote_id: 'Which quote do you mean?',
      invoice_id: 'Which invoice?',
      datetime: 'When would you like to schedule this?',
      date: 'What date?',
      date_range: 'What date range?',
      amount: 'What is the amount?',
      user_id: 'Which team member?',
      duration: 'How long?',
    };

    const question = entityQuestions[missing[0]] ?? `What ${missing[0].replace(/_/g, ' ')} do you mean?`;
    return question;
  }

  // Low confidence fallback
  return 'Could you tell me more about what you\'d like to do?';
}

// Re-export types for convenience
export type { ScoreBreakdown };
