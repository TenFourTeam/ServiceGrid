/**
 * MECE Intent Pattern Registry
 * 
 * Mutually Exclusive, Collectively Exhaustive patterns for:
 * - Lead Generation
 * - Customer Communication
 * - Site Assessment
 * 
 * Each category is designed to be non-overlapping and comprehensive.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface PatternCategory {
  id: string;
  name: string;
  description: string;
  patterns: RegExp[];
  keywords: string[];
}

export interface ProcessPatterns {
  processId: string;
  patternId: string;
  name: string;
  description: string;
  categories: PatternCategory[];
  transitionPatterns: RegExp[];
}

// =============================================================================
// LEAD GENERATION PATTERNS
// =============================================================================

export const LEAD_GENERATION_PATTERNS: ProcessPatterns = {
  processId: 'lead_generation',
  patternId: 'complete_lead_generation',
  name: 'Lead Generation',
  description: 'Capturing, qualifying, and initiating contact with new leads',
  categories: [
    {
      id: 'direct_action',
      name: 'Direct Action',
      description: 'Explicit commands to add/create leads',
      patterns: [
        /new\s+lead\s+(from|via|through)/i,
        /add\s+(a\s+)?(new\s+)?customer/i,
        /create\s+(a\s+)?(new\s+)?lead/i,
        /capture\s+(a\s+)?(new\s+)?lead/i,
        /log\s+(a\s+)?(new\s+)?(customer|lead)/i,
        /register\s+(a\s+)?(new\s+)?(customer|lead)/i,
        /enter\s+(a\s+)?(new\s+)?(customer|lead)/i,
      ],
      keywords: ['new', 'add', 'create', 'capture', 'log', 'register'],
    },
    {
      id: 'inquiry_source',
      name: 'Inquiry Source',
      description: 'Referencing where the lead came from',
      patterns: [
        /customer\s+inquiry\s+(from|about)/i,
        /got\s+(a\s+)?(new\s+)?(call|inquiry|request|lead)/i,
        /received\s+(a\s+)?(new\s+)?(call|inquiry|request)/i,
        /website\s+(form|submission|inquiry|lead)/i,
        /referral\s+from/i,
        /came\s+in\s+(from|via|through)/i,
        /lead\s+(from|via)\s+(website|google|facebook|referral|yelp|thumbtack)/i,
      ],
      keywords: ['inquiry', 'call', 'website', 'referral', 'form', 'submission'],
    },
    {
      id: 'service_need',
      name: 'Service Need Expression',
      description: 'Customer expressing need for services',
      patterns: [
        /wants?\s+(a\s+)?(quote|estimate|service|help)/i,
        /needs?\s+(landscaping|lawn|tree|service|help|work\s+done)/i,
        /interested\s+in\s+(our|my|the)?\s*services?/i,
        /looking\s+for\s+(a\s+)?(landscaper|contractor|service)/i,
        /asking\s+(about|for)\s+(a\s+)?(quote|service|help)/i,
        /requested\s+(a\s+)?(quote|estimate|service)/i,
      ],
      keywords: ['wants', 'needs', 'interested', 'looking for', 'asking', 'requested'],
    },
    {
      id: 'contact_based',
      name: 'Contact-Based',
      description: 'Someone reached out via contact method',
      patterns: [
        /someone\s+(just\s+)?(called|emailed|contacted|texted)/i,
        /(phone\s+)?call\s+from/i,
        /email\s+from\s+.+\s*(about|regarding|for)?/i,
        /text\s+(message\s+)?from/i,
        /voicemail\s+from/i,
        /reached\s+out\s+(to\s+us|via)/i,
        /contacted\s+us\s+(about|via|through)/i,
      ],
      keywords: ['called', 'emailed', 'contacted', 'texted', 'voicemail', 'reached out'],
    },
    {
      id: 'prospect_language',
      name: 'Potential/Prospect',
      description: 'Referring to potential future customers',
      patterns: [
        /potential\s+(customer|client)/i,
        /new\s+prospect/i,
        /prospective\s+(customer|client)/i,
        /possible\s+(new\s+)?(customer|client|lead)/i,
        /hot\s+lead/i,
        /warm\s+lead/i,
        /qualified\s+lead/i,
      ],
      keywords: ['potential', 'prospect', 'prospective', 'possible', 'hot lead', 'warm lead'],
    },
  ],
  transitionPatterns: [
    /contact\s+(this|the)\s+(new\s+)?lead/i,
    /reach\s+out\s+to\s+(this|the)\s+(new\s+)?customer/i,
    /follow\s+up\s+on\s+(this|the)\s+lead/i,
    /let\s+(them|him|her)\s+know/i,
    /call\s+(them|him|her|the\s+customer)\s+back/i,
  ],
};

// =============================================================================
// CUSTOMER COMMUNICATION PATTERNS
// =============================================================================

export const CUSTOMER_COMMUNICATION_PATTERNS: ProcessPatterns = {
  processId: 'communication',
  patternId: 'complete_customer_communication',
  name: 'Customer Communication',
  description: 'Contacting, messaging, and following up with customers',
  categories: [
    {
      id: 'direct_contact',
      name: 'Direct Contact',
      description: 'Explicit commands to contact/message',
      patterns: [
        /contact\s+(the\s+)?customer/i,
        /message\s+(the\s+)?customer/i,
        /send\s+(a\s+)?message\s+to/i,
        /email\s+(the\s+)?customer/i,
        /text\s+(the\s+)?customer/i,
        /call\s+(the\s+)?customer/i,
      ],
      keywords: ['contact', 'message', 'send', 'email', 'text', 'call'],
    },
    {
      id: 'follow_up',
      name: 'Follow-Up',
      description: 'Continuing previous communication',
      patterns: [
        /follow\s+up\s+with/i,
        /check\s+in\s+(with|on)/i,
        /touch\s+base\s+with/i,
        /get\s+(back\s+)?to\s+(them|him|her)/i,
        /circle\s+back\s+(with|to)/i,
        /reconnect\s+with/i,
      ],
      keywords: ['follow up', 'check in', 'touch base', 'get back', 'circle back'],
    },
    {
      id: 'communication_verbs',
      name: 'Communication Verbs',
      description: 'Generic communication action words',
      patterns: [
        /reach\s+out\s+to/i,
        /communicate\s+with/i,
        /respond\s+to/i,
        /reply\s+to/i,
        /get\s+in\s+touch\s+with/i,
        /start\s+(a\s+)?conversation\s+(with|for)/i,
        /open\s+(a\s+)?conversation\s+(with|for)/i,
      ],
      keywords: ['reach out', 'communicate', 'respond', 'reply', 'get in touch'],
    },
    {
      id: 'informal_conversational',
      name: 'Informal/Conversational',
      description: 'Casual ways to express contact intent',
      patterns: [
        /let\s+(them|him|her)\s+know/i,
        /give\s+(them|him|her)\s+a\s+(call|message|ring)/i,
        /drop\s+(them|him|her)\s+a\s+(line|message|note)/i,
        /shoot\s+(them|him|her)\s+a\s+(message|email|text)/i,
        /hit\s+(them|him|her)\s+up/i,
        /ping\s+(the\s+)?(customer|them|him|her)/i,
      ],
      keywords: ['let know', 'give a call', 'drop a line', 'shoot a message'],
    },
    {
      id: 'update_based',
      name: 'Update-Based',
      description: 'Providing status updates to customer',
      patterns: [
        /update\s+(the\s+)?customer/i,
        /notify\s+(the\s+)?customer/i,
        /inform\s+(them|the\s+customer)/i,
        /tell\s+(them|the\s+customer)/i,
        /keep\s+(them|the\s+customer)\s+posted/i,
        /give\s+(them|an?\s+)?update/i,
        /send\s+(them\s+)?(an?\s+)?update/i,
      ],
      keywords: ['update', 'notify', 'inform', 'tell', 'keep posted'],
    },
  ],
  transitionPatterns: [
    /schedule\s+(an?\s+)?assessment/i,
    /book\s+(a\s+)?site\s+visit/i,
    /set\s+up\s+(a\s+)?(site\s+)?visit/i,
    /give\s+(them|him|her)\s+a\s+(price|quote|estimate)/i,
    /quote\s+(them|this)/i,
  ],
};

// =============================================================================
// SITE ASSESSMENT PATTERNS
// =============================================================================

export const SITE_ASSESSMENT_PATTERNS: ProcessPatterns = {
  processId: 'site_assessment',
  patternId: 'complete_site_assessment',
  name: 'Site Assessment',
  description: 'Scheduling and conducting property assessments',
  categories: [
    {
      id: 'formal_assessment',
      name: 'Formal Assessment',
      description: 'Formal assessment terminology',
      patterns: [
        /site\s+assessment\s+(for|at)/i,
        /property\s+assessment/i,
        /on-?site\s+(evaluation|inspection|assessment)/i,
        /property\s+inspection/i,
        /site\s+inspection/i,
        /formal\s+assessment/i,
        /property\s+evaluation/i,
      ],
      keywords: ['site assessment', 'property assessment', 'inspection', 'evaluation'],
    },
    {
      id: 'scheduling_focused',
      name: 'Scheduling Focused',
      description: 'Emphasis on scheduling the visit',
      patterns: [
        /schedule\s+(a\s+)?(site\s+)?(visit|assessment|inspection)/i,
        /book\s+(a\s+)?(site\s+)?(visit|assessment|appointment)/i,
        /set\s+up\s+(a\s+)?(site\s+)?(visit|assessment|meeting)/i,
        /arrange\s+(a\s+)?(site\s+)?(visit|assessment)/i,
        /plan\s+(a\s+)?(site\s+)?(visit|assessment)/i,
      ],
      keywords: ['schedule', 'book', 'set up', 'arrange', 'plan'],
    },
    {
      id: 'action_oriented',
      name: 'Action-Oriented',
      description: 'Active verbs for conducting assessments',
      patterns: [
        /conduct\s+(a\s+)?(site\s+)?(visit|assessment|inspection)/i,
        /perform\s+(an?\s+)?assessment/i,
        /do\s+(an?\s+)?(assessment|walkthrough|inspection)/i,
        /run\s+(an?\s+)?assessment/i,
        /complete\s+(an?\s+)?assessment/i,
        /carry\s+out\s+(an?\s+)?assessment/i,
      ],
      keywords: ['conduct', 'perform', 'do', 'run', 'complete', 'carry out'],
    },
    {
      id: 'industry_vernacular',
      name: 'Industry Vernacular',
      description: 'Casual/industry-specific language',
      patterns: [
        /go\s+(out\s+)?(and\s+)?look\s+at\s+(the\s+)?(property|site|job|yard|lawn)/i,
        /check\s+out\s+(the\s+)?(property|site|job|place|yard)/i,
        /take\s+a\s+look\s+at/i,
        /measure\s+(the\s+)?(property|site|yard|lawn|area)/i,
        /scope\s+(out\s+)?(the\s+)?(property|site|job)/i,
        /survey\s+(the\s+)?(property|site|yard|land)/i,
        /walk\s+(the\s+)?(property|site|yard|lot)/i,
        /property\s+walkthrough/i,
      ],
      keywords: ['go look at', 'check out', 'take a look', 'measure', 'scope out', 'survey', 'walk'],
    },
    {
      id: 'team_dispatch',
      name: 'Team Dispatch',
      description: 'Sending someone to assess',
      patterns: [
        /send\s+someone\s+(out\s+)?to\s+(look|check|assess|measure|inspect)/i,
        /have\s+someone\s+(go\s+out|check|look|assess)/i,
        /dispatch\s+(someone|a\s+team)\s+to/i,
        /get\s+someone\s+(out\s+)?there\s+to/i,
        /need\s+someone\s+to\s+(go\s+)?(look|check|assess)/i,
        /assign\s+(someone|an?\s+assessor)\s+to/i,
      ],
      keywords: ['send someone', 'have someone', 'dispatch', 'get someone', 'assign'],
    },
  ],
  transitionPatterns: [
    /give\s+(them|him|her)\s+a\s+(price|quote|estimate)/i,
    /create\s+(a\s+)?quote\s+(for|based\s+on)/i,
    /price\s+(this|it)\s+(out|up)/i,
    /quote\s+(this|the\s+job)/i,
    /how\s+much\s+(for|to|would)/i,
  ],
};

// =============================================================================
// CROSS-PROCESS TRANSITION PATTERNS
// =============================================================================

export interface TransitionPattern {
  pattern: RegExp;
  fromProcess: string | '*';
  targetProcess: string;
  description: string;
}

export const TRANSITION_PATTERNS: TransitionPattern[] = [
  // Lead Generation → Communication
  { pattern: /contact\s+(this|the)\s+(new\s+)?lead/i, fromProcess: 'lead_generation', targetProcess: 'communication', description: 'Contact new lead' },
  { pattern: /reach\s+out\s+to\s+(this|the)\s+(new\s+)?customer/i, fromProcess: 'lead_generation', targetProcess: 'communication', description: 'Reach out to new customer' },
  { pattern: /let\s+(them|him|her)\s+know/i, fromProcess: '*', targetProcess: 'communication', description: 'Inform customer' },
  { pattern: /call\s+(them|him|her|the\s+customer)/i, fromProcess: '*', targetProcess: 'communication', description: 'Call customer' },
  { pattern: /get\s+back\s+to\s+(them|him|her)/i, fromProcess: '*', targetProcess: 'communication', description: 'Get back to customer' },
  { pattern: /update\s+(them|the\s+customer)/i, fromProcess: '*', targetProcess: 'communication', description: 'Update customer' },
  
  // Any → Site Assessment
  { pattern: /go\s+(out\s+)?(and\s+)?look\s+at\s+(the\s+)?(property|site)/i, fromProcess: '*', targetProcess: 'site_assessment', description: 'Go look at property' },
  { pattern: /send\s+someone\s+(out\s+)?to\s+(look|check|assess)/i, fromProcess: '*', targetProcess: 'site_assessment', description: 'Send someone to assess' },
  { pattern: /check\s+out\s+(the\s+)?(property|site)/i, fromProcess: '*', targetProcess: 'site_assessment', description: 'Check out property' },
  { pattern: /schedule\s+(an?\s+)?assessment\s+for/i, fromProcess: '*', targetProcess: 'site_assessment', description: 'Schedule assessment' },
  { pattern: /book\s+(a\s+)?site\s+visit/i, fromProcess: '*', targetProcess: 'site_assessment', description: 'Book site visit' },
  
  // Any → Quoting
  { pattern: /give\s+(them|him|her)\s+a\s+(price|quote|estimate)/i, fromProcess: '*', targetProcess: 'quoting', description: 'Give price' },
  { pattern: /price\s+(this|it)\s+(out|up)/i, fromProcess: '*', targetProcess: 'quoting', description: 'Price it out' },
  { pattern: /how\s+much\s+(for|to|would)/i, fromProcess: '*', targetProcess: 'quoting', description: 'How much question' },
  { pattern: /quote\s+(them|this)/i, fromProcess: '*', targetProcess: 'quoting', description: 'Quote them' },
];

// =============================================================================
// REGISTRY AGGREGATION
// =============================================================================

export const ALL_PROCESS_PATTERNS: ProcessPatterns[] = [
  LEAD_GENERATION_PATTERNS,
  CUSTOMER_COMMUNICATION_PATTERNS,
  SITE_ASSESSMENT_PATTERNS,
];

/**
 * Get all patterns for a specific process
 */
export function getPatternsForProcess(processId: string): RegExp[] {
  const process = ALL_PROCESS_PATTERNS.find(p => p.processId === processId);
  if (!process) return [];
  
  return process.categories.flatMap(cat => cat.patterns);
}

/**
 * Get all keywords for a specific process
 */
export function getKeywordsForProcess(processId: string): string[] {
  const process = ALL_PROCESS_PATTERNS.find(p => p.processId === processId);
  if (!process) return [];
  
  return [...new Set(process.categories.flatMap(cat => cat.keywords))];
}

/**
 * Get all patterns across all processes
 */
export function getAllPatterns(): { processId: string; patternId: string; patterns: RegExp[] }[] {
  return ALL_PROCESS_PATTERNS.map(p => ({
    processId: p.processId,
    patternId: p.patternId,
    patterns: p.categories.flatMap(cat => cat.patterns),
  }));
}

/**
 * Get pattern count by process
 */
export function getPatternCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  
  for (const process of ALL_PROCESS_PATTERNS) {
    counts[process.processId] = process.categories.reduce(
      (sum, cat) => sum + cat.patterns.length, 0
    );
  }
  
  return counts;
}

/**
 * Check for overlapping patterns (mutual exclusivity violation)
 */
export function findOverlappingPatterns(): { phrase: string; matches: string[] }[] {
  const overlaps: { phrase: string; matches: string[] }[] = [];
  
  // Test phrases that might match multiple processes
  const testPhrases = [
    'contact the new lead',
    'follow up with customer',
    'schedule site assessment',
    'send someone to look',
  ];
  
  for (const phrase of testPhrases) {
    const matches: string[] = [];
    
    for (const process of ALL_PROCESS_PATTERNS) {
      for (const category of process.categories) {
        if (category.patterns.some(p => p.test(phrase))) {
          matches.push(process.processId);
          break;
        }
      }
    }
    
    if (matches.length > 1) {
      overlaps.push({ phrase, matches });
    }
  }
  
  return overlaps;
}
