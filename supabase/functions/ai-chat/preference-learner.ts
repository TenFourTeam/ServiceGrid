/**
 * Preference Learner - Learns user preferences from behavior and explicit statements
 */
import { MemoryContext, learnPreference, getActivePreferences, UserPreference } from './memory-manager.ts';

// ============================================================================
// Types
// ============================================================================

export interface LearnablePattern {
  id: string;
  type: UserPreference['preferenceType'];
  key: string; // Will be combined with extracted value, e.g., "assign_plumbing_to"
  description: string;
  detectFromMessage: RegExp[];
  detectFromToolExecution: {
    toolName: string;
    argExtractor: (args: Record<string, any>) => Record<string, any> | null;
  }[];
}

// ============================================================================
// Learnable Patterns
// ============================================================================

const LEARNABLE_PATTERNS: LearnablePattern[] = [
  // Assignment preferences
  {
    id: 'assign_job_type_to_member',
    type: 'assignment',
    key: 'assign_job_type',
    description: 'Preferred team member for specific job types',
    detectFromMessage: [
      /always\s+assign\s+(.+?)\s+(?:jobs?\s+)?to\s+(\w+)/gi,
      /(\w+)\s+(?:should\s+)?(?:always\s+)?handle[s]?\s+(.+?)\s+jobs?/gi,
    ],
    detectFromToolExecution: [
      {
        toolName: 'assign_job',
        argExtractor: (args) => {
          if (args.memberId && args.jobType) {
            return {
              jobType: args.jobType,
              memberId: args.memberId,
              memberName: args.memberName,
            };
          }
          return null;
        },
      },
    ],
  },

  // Scheduling preferences
  {
    id: 'preferred_schedule_time',
    type: 'scheduling',
    key: 'preferred_time_for_customer',
    description: 'Customer preferred scheduling time',
    detectFromMessage: [
      /schedule\s+(.+?)\s+(?:jobs?\s+)?(?:in\s+the\s+)?(morning|afternoon|evening)/gi,
      /(.+?)\s+prefers?\s+(morning|afternoon|evening)\s+appointments?/gi,
    ],
    detectFromToolExecution: [
      {
        toolName: 'schedule_job',
        argExtractor: (args) => {
          if (args.customerId && args.startTime) {
            const hour = new Date(args.startTime).getHours();
            const timeSlot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
            return {
              customerId: args.customerId,
              customerName: args.customerName,
              preferredTime: timeSlot,
            };
          }
          return null;
        },
      },
    ],
  },

  // Communication preferences
  {
    id: 'preferred_contact_method',
    type: 'communication',
    key: 'contact_via',
    description: 'Preferred method to contact customers',
    detectFromMessage: [
      /(?:always\s+)?(?:contact|reach|message)\s+(.+?)\s+(?:via|by|through)\s+(email|phone|sms|text)/gi,
      /(.+?)\s+prefers?\s+(?:to\s+be\s+)?contacted?\s+(?:via|by)\s+(email|phone|sms|text)/gi,
    ],
    detectFromToolExecution: [],
  },

  // Workflow preferences
  {
    id: 'auto_send_confirmation',
    type: 'workflow',
    key: 'auto_send_confirmation',
    description: 'Automatically send confirmations after scheduling',
    detectFromMessage: [
      /always\s+send\s+(?:a\s+)?confirmation/gi,
      /automatically\s+send\s+(?:job\s+)?confirmations?/gi,
    ],
    detectFromToolExecution: [
      {
        toolName: 'send_job_confirmations',
        argExtractor: (args) => {
          if (args.jobIds && args.jobIds.length > 0) {
            return { enabled: true };
          }
          return null;
        },
      },
    ],
  },

  // Default assignee preference
  {
    id: 'default_assignee',
    type: 'assignment',
    key: 'default_assignee',
    description: 'Default team member for new jobs',
    detectFromMessage: [
      /(?:by\s+)?default,?\s+assign\s+(?:jobs?\s+)?to\s+(\w+)/gi,
      /(\w+)\s+(?:is|should\s+be)\s+(?:the\s+)?default\s+assign(?:ee)?/gi,
    ],
    detectFromToolExecution: [],
  },

  // Quote follow-up preference
  {
    id: 'quote_followup_days',
    type: 'workflow',
    key: 'quote_followup_days',
    description: 'Number of days to follow up on quotes',
    detectFromMessage: [
      /follow\s*up\s+(?:on\s+)?quotes?\s+(?:after\s+)?(\d+)\s+days?/gi,
      /send\s+quote\s+reminders?\s+(?:after\s+)?(\d+)\s+days?/gi,
    ],
    detectFromToolExecution: [],
  },

  // Preferred service area
  {
    id: 'service_area',
    type: 'scheduling',
    key: 'member_service_area',
    description: 'Preferred geographic area for team member',
    detectFromMessage: [
      /(\w+)\s+(?:handles?|covers?|works?)\s+(?:the\s+)?(.+?)\s+area/gi,
      /assign\s+(.+?)\s+area\s+(?:jobs?\s+)?to\s+(\w+)/gi,
    ],
    detectFromToolExecution: [],
  },
];

// ============================================================================
// Learning Functions
// ============================================================================

/**
 * Detect and learn preferences from a user message
 */
export async function learnFromMessage(
  ctx: MemoryContext,
  message: string
): Promise<void> {
  for (const pattern of LEARNABLE_PATTERNS) {
    for (const regex of pattern.detectFromMessage) {
      const match = new RegExp(regex.source, regex.flags).exec(message);
      if (match) {
        console.log(`[PreferenceLearner] Detected explicit preference: ${pattern.id}`);
        
        // Extract preference value based on pattern
        const value = extractValueFromMatch(pattern, match);
        if (value) {
          await learnPreference(ctx, {
            type: pattern.type,
            key: pattern.key,
            value,
            learnedFrom: 'explicit',
            confidenceBoost: 0.2, // Higher boost for explicit statements
          });
        }
      }
    }
  }
}

/**
 * Learn preferences from tool execution
 */
export async function learnFromToolExecution(
  ctx: MemoryContext,
  toolName: string,
  args: Record<string, any>,
  result: any
): Promise<void> {
  for (const pattern of LEARNABLE_PATTERNS) {
    for (const detector of pattern.detectFromToolExecution) {
      if (detector.toolName === toolName) {
        const extractedValue = detector.argExtractor(args);
        if (extractedValue) {
          console.log(`[PreferenceLearner] Detected inferred preference from ${toolName}: ${pattern.id}`);
          
          await learnPreference(ctx, {
            type: pattern.type,
            key: pattern.key,
            value: extractedValue,
            learnedFrom: 'inferred',
            confidenceBoost: 0.05, // Lower boost for inferred
          });
        }
      }
    }
  }
}

/**
 * Extract structured value from regex match
 */
function extractValueFromMatch(
  pattern: LearnablePattern,
  match: RegExpExecArray
): Record<string, any> | null {
  switch (pattern.id) {
    case 'assign_job_type_to_member':
      return {
        jobType: match[1]?.trim().toLowerCase(),
        memberName: match[2]?.trim(),
      };

    case 'preferred_schedule_time':
      return {
        customerName: match[1]?.trim(),
        preferredTime: match[2]?.trim().toLowerCase(),
      };

    case 'preferred_contact_method':
      return {
        customerName: match[1]?.trim(),
        contactMethod: match[2]?.trim().toLowerCase(),
      };

    case 'auto_send_confirmation':
      return { enabled: true };

    case 'default_assignee':
      return {
        memberName: match[1]?.trim(),
      };

    case 'quote_followup_days':
      return {
        days: parseInt(match[1], 10),
      };

    case 'member_service_area':
      return {
        memberName: match[1]?.trim() || match[2]?.trim(),
        area: match[2]?.trim() || match[1]?.trim(),
      };

    default:
      return null;
  }
}

// ============================================================================
// Preference Application
// ============================================================================

/**
 * Get preferences that might apply to current context
 */
export async function getApplicablePreferences(
  ctx: MemoryContext,
  context: {
    jobType?: string;
    customerId?: string;
    customerName?: string;
    memberId?: string;
    action?: string;
  }
): Promise<UserPreference[]> {
  const allPreferences = await getActivePreferences(ctx, 0.6);
  
  return allPreferences.filter(pref => {
    // Filter by relevance to current context
    switch (pref.preferenceType) {
      case 'assignment':
        if (context.jobType && pref.preferenceValue.jobType) {
          return context.jobType.toLowerCase().includes(pref.preferenceValue.jobType.toLowerCase());
        }
        return pref.preferenceKey === 'default_assignee';

      case 'scheduling':
        if (context.customerId && pref.preferenceValue.customerId) {
          return context.customerId === pref.preferenceValue.customerId;
        }
        if (context.customerName && pref.preferenceValue.customerName) {
          return context.customerName.toLowerCase().includes(pref.preferenceValue.customerName.toLowerCase());
        }
        return false;

      case 'communication':
        if (context.customerName && pref.preferenceValue.customerName) {
          return context.customerName.toLowerCase().includes(pref.preferenceValue.customerName.toLowerCase());
        }
        return false;

      case 'workflow':
        return true; // Workflow preferences generally always apply

      default:
        return false;
    }
  });
}

/**
 * Build preference context string for prompt injection
 */
export function buildPreferenceContextString(preferences: UserPreference[]): string {
  if (preferences.length === 0) return '';

  const lines = ['LEARNED USER PREFERENCES:'];

  for (const pref of preferences) {
    const confidence = Math.round(pref.confidence * 100);
    const source = pref.learnedFrom === 'explicit' ? '(user stated)' 
      : pref.learnedFrom === 'confirmed' ? '(confirmed)' 
      : '(inferred)';

    switch (pref.preferenceType) {
      case 'assignment':
        if (pref.preferenceValue.jobType && pref.preferenceValue.memberName) {
          lines.push(`- Assign ${pref.preferenceValue.jobType} jobs to ${pref.preferenceValue.memberName} ${source} [${confidence}% confidence]`);
        } else if (pref.preferenceKey === 'default_assignee') {
          lines.push(`- Default assignee: ${pref.preferenceValue.memberName} ${source} [${confidence}% confidence]`);
        }
        break;

      case 'scheduling':
        if (pref.preferenceValue.customerName && pref.preferenceValue.preferredTime) {
          lines.push(`- ${pref.preferenceValue.customerName} prefers ${pref.preferenceValue.preferredTime} appointments ${source} [${confidence}% confidence]`);
        }
        break;

      case 'communication':
        if (pref.preferenceValue.customerName && pref.preferenceValue.contactMethod) {
          lines.push(`- Contact ${pref.preferenceValue.customerName} via ${pref.preferenceValue.contactMethod} ${source} [${confidence}% confidence]`);
        }
        break;

      case 'workflow':
        if (pref.preferenceKey === 'auto_send_confirmation' && pref.preferenceValue.enabled) {
          lines.push(`- Auto-send confirmations after scheduling ${source} [${confidence}% confidence]`);
        } else if (pref.preferenceKey === 'quote_followup_days') {
          lines.push(`- Follow up on quotes after ${pref.preferenceValue.days} days ${source} [${confidence}% confidence]`);
        }
        break;
    }
  }

  return lines.length > 1 ? lines.join('\n') : '';
}
