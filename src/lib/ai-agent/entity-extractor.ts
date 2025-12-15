/**
 * Entity Extractor - Extracts structured entities from natural language
 * Handles dates, times, amounts, IDs, names, and more
 */

import { EntityType, ExtractedEntity, Domain } from './intent-taxonomy';

// ============================================================================
// EXTRACTION PATTERNS
// ============================================================================

interface ExtractionPattern {
  type: EntityType;
  patterns: RegExp[];
  transform: (match: RegExpMatchArray, input: string) => Partial<ExtractedEntity>;
}

const EXTRACTION_PATTERNS: ExtractionPattern[] = [
  // -------------------------------------------------------------------------
  // UUID PATTERNS (for IDs)
  // -------------------------------------------------------------------------
  {
    type: 'job_id',
    patterns: [
      /job\s*#?\s*([a-f0-9-]{36})/i,
      /job\s+id[:\s]+([a-f0-9-]{36})/i,
      /work\s*order\s*#?\s*([a-f0-9-]{36})/i,
    ],
    transform: (match) => ({
      value: match[1],
      confidence: 0.95,
    }),
  },
  {
    type: 'quote_id',
    patterns: [
      /quote\s*#?\s*([a-f0-9-]{36})/i,
      /quote\s+id[:\s]+([a-f0-9-]{36})/i,
      /estimate\s*#?\s*([a-f0-9-]{36})/i,
    ],
    transform: (match) => ({
      value: match[1],
      confidence: 0.95,
    }),
  },
  {
    type: 'invoice_id',
    patterns: [
      /invoice\s*#?\s*([a-f0-9-]{36})/i,
      /invoice\s+id[:\s]+([a-f0-9-]{36})/i,
      /inv[:\s]+([a-f0-9-]{36})/i,
    ],
    transform: (match) => ({
      value: match[1],
      confidence: 0.95,
    }),
  },
  {
    type: 'customer_id',
    patterns: [
      /customer\s+id[:\s]+([a-f0-9-]{36})/i,
      /client\s+id[:\s]+([a-f0-9-]{36})/i,
    ],
    transform: (match) => ({
      value: match[1],
      confidence: 0.95,
    }),
  },

  // -------------------------------------------------------------------------
  // READABLE ID PATTERNS (e.g., INV-001, QUO-123)
  // -------------------------------------------------------------------------
  {
    type: 'invoice_id',
    patterns: [
      /invoice\s*#?\s*(INV-?\d+)/i,
      /inv[:\s]+(INV-?\d+)/i,
    ],
    transform: (match) => ({
      value: match[1].toUpperCase(),
      confidence: 0.9,
    }),
  },
  {
    type: 'quote_id',
    patterns: [
      /quote\s*#?\s*((?:QUO|EST)-?\d+)/i,
      /estimate\s*#?\s*((?:QUO|EST)-?\d+)/i,
    ],
    transform: (match) => ({
      value: match[1].toUpperCase(),
      confidence: 0.9,
    }),
  },
  {
    type: 'job_id',
    patterns: [
      /job\s*#?\s*(\d{3,6})/i,
      /work\s*order\s*#?\s*(\d{3,6})/i,
    ],
    transform: (match) => ({
      value: match[1],
      confidence: 0.85,
    }),
  },

  // -------------------------------------------------------------------------
  // DATE PATTERNS
  // -------------------------------------------------------------------------
  {
    type: 'datetime',
    patterns: [
      // \"tomorrow at 9am\", \"tomorrow morning\"
      /\b(tomorrow)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|morning|afternoon|evening)\b/i,
      // \"next Monday at 2pm\"
      /\b(next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i,
      // \"January 15 at 3pm\"
      /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i,
      // \"1/15/2024 at 9:00am\"
      /\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i,
    ],
    transform: (match, input) => ({
      value: {
        dateText: match[1],
        timeText: match[2],
        resolved: resolveDateTime(match[1], match[2]),
      },
      confidence: 0.85,
    }),
  },
  {
    type: 'date',
    patterns: [
      // Relative dates
      /\b(today|tomorrow|yesterday)\b/i,
      /\b(next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month))\b/i,
      /\b(this\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month))\b/i,
      // Absolute dates
      /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?)\b/i,
      /\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/,
      /\b(\d{4}-\d{2}-\d{2})\b/, // ISO format
    ],
    transform: (match) => ({
      value: {
        text: match[1],
        resolved: resolveDate(match[1]),
      },
      confidence: 0.9,
    }),
  },
  {
    type: 'date_range',
    patterns: [
      // \"Dec 23-27\", \"December 23 to 27\"
      /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:-|to|through)\s*(\d{1,2})(?:st|nd|rd|th)?\b/i,
      // \"next week\", \"this month\"
      /\b(this|next)\s+(week|month)\b/i,
      // \"from Monday to Friday\"
      /\bfrom\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+to\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    ],
    transform: (match) => ({
      value: {
        text: match[0],
        resolved: resolveDateRange(match),
      },
      confidence: 0.85,
    }),
  },
  {
    type: 'time',
    patterns: [
      /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
      /\b(morning|afternoon|evening|noon|midnight)\b/i,
      /\bat\s+(\d{1,2}(?::\d{2})?)\b/i,
    ],
    transform: (match) => ({
      value: {
        text: match[1],
        resolved: resolveTime(match[1]),
      },
      confidence: 0.9,
    }),
  },

  // -------------------------------------------------------------------------
  // DURATION PATTERNS
  // -------------------------------------------------------------------------
  {
    type: 'duration',
    patterns: [
      /\b(\d+(?:\.\d+)?)\s*(hours?|hrs?|h)\b/i,
      /\b(\d+(?:\.\d+)?)\s*(minutes?|mins?|m)\b/i,
      /\b(\d+)\s*(?:hours?|hrs?)\s*(?:and\s*)?(\d+)\s*(?:minutes?|mins?)\b/i,
    ],
    transform: (match) => {
      let minutes = 0;
      if (match[2]?.match(/hour|hr|h/i)) {
        minutes = parseFloat(match[1]) * 60;
      } else if (match[2]?.match(/min|m/i)) {
        minutes = parseFloat(match[1]);
      } else if (match[2]) {
        // hours and minutes pattern
        minutes = parseInt(match[1]) * 60 + parseInt(match[2]);
      }
      return {
        value: { minutes, text: match[0] },
        confidence: 0.95,
      };
    },
  },

  // -------------------------------------------------------------------------
  // AMOUNT/MONEY PATTERNS
  // -------------------------------------------------------------------------
  {
    type: 'amount',
    patterns: [
      /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\b/,
      /\b(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*dollars?\b/i,
      /\b(\d+(?:\.\d{2})?)\s*(?:usd|USD)\b/,
    ],
    transform: (match) => ({
      value: parseFloat(match[1].replace(/,/g, '')),
      confidence: 0.95,
    }),
  },
  {
    type: 'percentage',
    patterns: [
      /\b(\d+(?:\.\d+)?)\s*%/,
      /\b(\d+(?:\.\d+)?)\s*percent\b/i,
    ],
    transform: (match) => ({
      value: parseFloat(match[1]),
      confidence: 0.95,
    }),
  },

  // -------------------------------------------------------------------------
  // CONTACT PATTERNS
  // -------------------------------------------------------------------------
  {
    type: 'email',
    patterns: [
      /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/,
    ],
    transform: (match) => ({
      value: match[1].toLowerCase(),
      confidence: 0.99,
    }),
  },
  {
    type: 'phone',
    patterns: [
      /\b(\+?1?\s*[-.]?\s*\(\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b/,
      /\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b/,
    ],
    transform: (match) => ({
      value: match[1].replace(/[^+\d]/g, ''),
      confidence: 0.9,
    }),
  },

  // -------------------------------------------------------------------------
  // STATUS PATTERNS
  // -------------------------------------------------------------------------
  {
    type: 'status',
    patterns: [
      /\b(pending|in\s*progress|completed?|cancelled?|scheduled|draft|sent|paid|overdue)\b/i,
    ],
    transform: (match) => ({
      value: match[1].toLowerCase().replace(/\s+/g, '_'),
      confidence: 0.9,
    }),
  },

  // -------------------------------------------------------------------------
  // PRIORITY PATTERNS
  // -------------------------------------------------------------------------
  {
    type: 'priority',
    patterns: [
      /\b(urgent|high\s*priority|priority\s*1|asap)\b/i,
      /\b(normal|medium\s*priority|priority\s*2)\b/i,
      /\b(low\s*priority|priority\s*3|when\s*possible)\b/i,
    ],
    transform: (match) => {
      const text = match[1].toLowerCase();
      let priority = 2; // default medium
      if (text.match(/urgent|high|1|asap/)) priority = 1;
      if (text.match(/low|3|when/)) priority = 3;
      return {
        value: priority,
        confidence: 0.9,
      };
    },
  },

  // -------------------------------------------------------------------------
  // FREQUENCY PATTERNS
  // -------------------------------------------------------------------------
  {
    type: 'frequency',
    patterns: [
      /\b(weekly|bi-?weekly|monthly|quarterly|yearly|annually|daily)\b/i,
      /\bevery\s+(week|month|day|year)\b/i,
    ],
    transform: (match) => ({
      value: normalizeFrequency(match[1] || match[2]),
      confidence: 0.95,
    }),
  },

  // -------------------------------------------------------------------------
  // PAYMENT METHOD PATTERNS
  // -------------------------------------------------------------------------
  {
    type: 'payment_method',
    patterns: [
      /\b(cash|check|cheque|card|credit\s*card|debit\s*card|stripe|venmo|zelle|paypal)\b/i,
    ],
    transform: (match) => ({
      value: normalizePaymentMethod(match[1]),
      confidence: 0.95,
    }),
  },

  // -------------------------------------------------------------------------
  // CUSTOMER NAME PATTERNS (heuristic - proper nouns near customer keywords)
  // -------------------------------------------------------------------------
  {
    type: 'customer_name',
    patterns: [
      /\b(?:customer|client|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:account|job|quote|invoice)/,
      /\bthe\s+([A-Z][a-z]+)\s+(?:job|quote|account)/,
    ],
    transform: (match) => ({
      value: match[1],
      confidence: 0.7, // Lower confidence - may need verification
    }),
  },
];

// ============================================================================
// DATE/TIME RESOLUTION HELPERS
// ============================================================================

function resolveDate(text: string): Date | null {
  const now = new Date();
  const lowered = text.toLowerCase().trim();

  // Relative dates
  if (lowered === 'today') return now;
  if (lowered === 'tomorrow') {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (lowered === 'yesterday') {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d;
  }

  // Day of week
  const dayMatch = lowered.match(/(next|this)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
  if (dayMatch) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayMatch[2]);
    const currentDay = now.getDay();
    let daysUntil = targetDay - currentDay;
    
    if (dayMatch[1] === 'next' || daysUntil <= 0) {
      daysUntil += 7;
    }
    
    const result = new Date(now);
    result.setDate(result.getDate() + daysUntil);
    return result;
  }

  // Week/month
  if (lowered === 'next week') {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return d;
  }
  if (lowered === 'next month') {
    const d = new Date(now);
    d.setMonth(d.getMonth() + 1);
    return d;
  }

  // Try parsing as date
  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

function resolveTime(text: string): { hours: number; minutes: number } | null {
  const lowered = text.toLowerCase().trim();

  // Named times
  const namedTimes: Record<string, { hours: number; minutes: number }> = {
    'morning': { hours: 9, minutes: 0 },
    'afternoon': { hours: 14, minutes: 0 },
    'evening': { hours: 18, minutes: 0 },
    'noon': { hours: 12, minutes: 0 },
    'midnight': { hours: 0, minutes: 0 },
  };

  if (namedTimes[lowered]) {
    return namedTimes[lowered];
  }

  // Parse time string
  const match = lowered.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const period = match[3];

    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;

    return { hours, minutes };
  }

  return null;
}

function resolveDateTime(dateText: string, timeText: string): Date | null {
  const date = resolveDate(dateText);
  if (!date) return null;

  const time = resolveTime(timeText);
  if (time) {
    date.setHours(time.hours, time.minutes, 0, 0);
  }

  return date;
}

function resolveDateRange(match: RegExpMatchArray): { start: Date; end: Date } | null {
  const text = match[0].toLowerCase();

  // This/next week
  const now = new Date();
  if (text.includes('this week')) {
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  }
  if (text.includes('next week')) {
    const start = new Date(now);
    start.setDate(start.getDate() + (7 - start.getDay()));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  }

  // Month range like \"Dec 23-27\"
  if (match[1] && match[2] && match[3]) {
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIndex = monthNames.findIndex(m => match[1].toLowerCase().startsWith(m));
    if (monthIndex >= 0) {
      const year = now.getFullYear();
      const start = new Date(year, monthIndex, parseInt(match[2]));
      const end = new Date(year, monthIndex, parseInt(match[3]));
      return { start, end };
    }
  }

  return null;
}

function normalizeFrequency(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('week')) return 'weekly';
  if (lower.includes('bi') || lower.includes('every other')) return 'biweekly';
  if (lower.includes('month')) return 'monthly';
  if (lower.includes('quarter')) return 'quarterly';
  if (lower.includes('year') || lower.includes('annual')) return 'yearly';
  if (lower.includes('day')) return 'daily';
  return lower;
}

function normalizePaymentMethod(text: string): string {
  const lower = text.toLowerCase().replace(/\s+/g, '_');
  if (lower.includes('credit') || lower.includes('debit') || lower === 'card') {
    return 'card';
  }
  if (lower === 'cheque') return 'check';
  return lower;
}

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

export interface ExtractionResult {
  entities: Map<EntityType, ExtractedEntity[]>;
  allEntities: ExtractedEntity[];
  highConfidence: ExtractedEntity[];
  needsVerification: ExtractedEntity[];
}

export function extractEntities(
  input: string,
  domain?: Domain,
  knownData?: {
    customerNames?: string[];
    jobTitles?: string[];
    teamMemberNames?: string[];
  }
): ExtractionResult {
  const entities = new Map<EntityType, ExtractedEntity[]>();
  const allEntities: ExtractedEntity[] = [];

  for (const pattern of EXTRACTION_PATTERNS) {
    for (const regex of pattern.patterns) {
      const matches = input.matchAll(new RegExp(regex, 'gi'));
      
      for (const match of matches) {
        const transformed = pattern.transform(match, input);
        
        const entity: ExtractedEntity = {
          type: pattern.type,
          value: transformed.value ?? match[1],
          confidence: transformed.confidence ?? 0.5,
          rawText: match[0],
          position: {
            start: match.index ?? 0,
            end: (match.index ?? 0) + match[0].length,
          },
        };

        // Add to map
        if (!entities.has(pattern.type)) {
          entities.set(pattern.type, []);
        }
        entities.get(pattern.type)!.push(entity);
        allEntities.push(entity);
      }
    }
  }

  // Boost confidence for known data matches
  if (knownData?.customerNames) {
    for (const name of knownData.customerNames) {
      if (input.toLowerCase().includes(name.toLowerCase())) {
        const existing = entities.get('customer_name');
        if (existing) {
          for (const e of existing) {
            if ((e.value as string).toLowerCase() === name.toLowerCase()) {
              e.confidence = 0.95;
            }
          }
        } else {
          const index = input.toLowerCase().indexOf(name.toLowerCase());
          const entity: ExtractedEntity = {
            type: 'customer_name',
            value: name,
            confidence: 0.95,
            rawText: name,
            position: { start: index, end: index + name.length },
          };
          entities.set('customer_name', [entity]);
          allEntities.push(entity);
        }
      }
    }
  }

  // Deduplicate overlapping entities (prefer higher confidence)
  const deduplicated = deduplicateEntities(allEntities);

  return {
    entities,
    allEntities: deduplicated,
    highConfidence: deduplicated.filter(e => e.confidence >= 0.8),
    needsVerification: deduplicated.filter(e => e.confidence < 0.8 && e.confidence >= 0.5),
  };
}

function deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
  // Sort by position, then by confidence (descending)
  const sorted = [...entities].sort((a, b) => {
    if (a.position.start !== b.position.start) {
      return a.position.start - b.position.start;
    }
    return b.confidence - a.confidence;
  });

  const result: ExtractedEntity[] = [];
  let lastEnd = -1;

  for (const entity of sorted) {
    // Skip if overlaps with previous entity (keep higher confidence one)
    if (entity.position.start < lastEnd) {
      continue;
    }
    result.push(entity);
    lastEnd = entity.position.end;
  }

  return result;
}

// ============================================================================
// ENTITY VALIDATION
// ============================================================================

export function validateRequiredEntities(
  extracted: ExtractionResult,
  required: EntityType[]
): { valid: boolean; missing: EntityType[] } {
  const missing: EntityType[] = [];

  for (const type of required) {
    const found = extracted.entities.get(type);
    if (!found || found.length === 0) {
      missing.push(type);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

export function getEntityValue<T = string>(
  extracted: ExtractionResult,
  type: EntityType
): T | undefined {
  const entities = extracted.entities.get(type);
  if (!entities || entities.length === 0) return undefined;
  
  // Return highest confidence match
  const best = entities.reduce((a, b) => a.confidence > b.confidence ? a : b);
  return best.value as T;
}

export function getAllEntityValues<T = string>(
  extracted: ExtractionResult,
  type: EntityType
): T[] {
  const entities = extracted.entities.get(type);
  if (!entities) return [];
  return entities.map(e => e.value as T);
}
