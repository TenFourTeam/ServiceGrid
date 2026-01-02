/**
 * Test Corpus for Intent Pattern Verification
 * 
 * A comprehensive set of 100+ test phrases with expected mappings
 * for validating pattern coverage and accuracy.
 */

// =============================================================================
// TYPES
// =============================================================================

export type PhraseSource = 'formal' | 'conversational' | 'industry' | 'transitional' | 'edge_case';
export type ProcessCategory = 'lead_generation' | 'communication' | 'site_assessment' | 'quoting' | 'scheduling' | 'none';

export interface TestPhrase {
  input: string;
  expectedPattern: string | null;
  expectedProcess: ProcessCategory;
  source: PhraseSource;
  category?: string;
  notes?: string;
}

// =============================================================================
// LEAD GENERATION TEST PHRASES (30+)
// =============================================================================

export const LEAD_GENERATION_PHRASES: TestPhrase[] = [
  // Direct Action
  { input: 'new lead from John Smith', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'formal', category: 'direct_action' },
  { input: 'add a new customer', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'formal', category: 'direct_action' },
  { input: 'create lead for Sarah', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'formal', category: 'direct_action' },
  { input: 'capture new lead', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'formal', category: 'direct_action' },
  { input: 'log a customer request', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'formal', category: 'direct_action' },
  { input: 'register new customer Mike', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'formal', category: 'direct_action' },
  
  // Inquiry Source
  { input: 'got a call from someone interested in lawn care', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'conversational', category: 'inquiry_source' },
  { input: 'received a new inquiry about tree removal', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'conversational', category: 'inquiry_source' },
  { input: 'website form submission from Jane', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'formal', category: 'inquiry_source' },
  { input: 'referral from Bob Johnson', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'formal', category: 'inquiry_source' },
  { input: 'customer inquiry about landscaping', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'formal', category: 'inquiry_source' },
  { input: 'lead from google', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'conversational', category: 'inquiry_source' },
  { input: 'came in from yelp', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'conversational', category: 'inquiry_source' },
  
  // Service Need Expression
  { input: 'customer wants a quote for lawn maintenance', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'conversational', category: 'service_need' },
  { input: 'someone needs landscaping help', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'conversational', category: 'service_need' },
  { input: 'homeowner interested in our services', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'conversational', category: 'service_need' },
  { input: 'looking for a landscaper for their backyard', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'conversational', category: 'service_need' },
  { input: 'they requested an estimate', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'conversational', category: 'service_need' },
  
  // Contact-Based
  { input: 'someone just called about mulching', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'conversational', category: 'contact_based' },
  { input: 'email from Tom about hedge trimming', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'conversational', category: 'contact_based' },
  { input: 'got a voicemail from potential client', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'conversational', category: 'contact_based' },
  { input: 'text from customer about spring cleanup', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'conversational', category: 'contact_based' },
  { input: 'they contacted us through facebook', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'conversational', category: 'contact_based' },
  
  // Prospect Language
  { input: 'potential customer for weekly mowing', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'formal', category: 'prospect_language' },
  { input: 'new prospect interested in irrigation', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'formal', category: 'prospect_language' },
  { input: 'hot lead from neighbor referral', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'conversational', category: 'prospect_language' },
  { input: 'qualified lead for commercial property', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'formal', category: 'prospect_language' },
];

// =============================================================================
// CUSTOMER COMMUNICATION TEST PHRASES (30+)
// =============================================================================

export const COMMUNICATION_PHRASES: TestPhrase[] = [
  // Direct Contact
  { input: 'contact the customer', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'formal', category: 'direct_contact' },
  { input: 'message the customer about their quote', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'formal', category: 'direct_contact' },
  { input: 'send a message to Mrs. Johnson', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'formal', category: 'direct_contact' },
  { input: 'email the customer about scheduling', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'formal', category: 'direct_contact' },
  { input: 'text the customer the estimate', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'formal', category: 'direct_contact' },
  { input: 'call the customer back', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'formal', category: 'direct_contact' },
  
  // Follow-Up
  { input: 'follow up with the homeowner', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'formal', category: 'follow_up' },
  { input: 'check in with them about the project', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'conversational', category: 'follow_up' },
  { input: 'touch base with the client', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'conversational', category: 'follow_up' },
  { input: 'get back to them today', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'conversational', category: 'follow_up' },
  { input: 'circle back with the customer', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'conversational', category: 'follow_up' },
  { input: 'reconnect with the lead from last week', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'conversational', category: 'follow_up' },
  
  // Communication Verbs
  { input: 'reach out to the customer about availability', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'formal', category: 'communication_verbs' },
  { input: 'communicate with them about changes', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'formal', category: 'communication_verbs' },
  { input: 'respond to their inquiry', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'formal', category: 'communication_verbs' },
  { input: 'reply to the customer email', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'formal', category: 'communication_verbs' },
  { input: 'get in touch with them this afternoon', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'conversational', category: 'communication_verbs' },
  { input: 'start a conversation with the new lead', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'formal', category: 'communication_verbs' },
  
  // Informal/Conversational
  { input: 'let them know we can do it', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'conversational', category: 'informal_conversational' },
  { input: 'give them a call about the proposal', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'conversational', category: 'informal_conversational' },
  { input: 'drop them a line about timing', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'conversational', category: 'informal_conversational' },
  { input: 'shoot them a message about tomorrow', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'conversational', category: 'informal_conversational' },
  { input: 'ping the customer about the job', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'conversational', category: 'informal_conversational' },
  
  // Update-Based
  { input: 'update the customer on job status', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'formal', category: 'update_based' },
  { input: 'notify them about the delay', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'formal', category: 'update_based' },
  { input: 'inform them the crew is on the way', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'formal', category: 'update_based' },
  { input: 'keep them posted on progress', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'conversational', category: 'update_based' },
  { input: 'give them an update on the timeline', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'conversational', category: 'update_based' },
];

// =============================================================================
// SITE ASSESSMENT TEST PHRASES (30+)
// =============================================================================

export const SITE_ASSESSMENT_PHRASES: TestPhrase[] = [
  // Formal Assessment
  { input: 'site assessment for 123 Main St', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'formal', category: 'formal_assessment' },
  { input: 'property assessment needed', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'formal', category: 'formal_assessment' },
  { input: 'on-site evaluation for the Johnson property', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'formal', category: 'formal_assessment' },
  { input: 'property inspection at the commercial lot', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'formal', category: 'formal_assessment' },
  { input: 'site inspection required', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'formal', category: 'formal_assessment' },
  { input: 'formal assessment of the backyard', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'formal', category: 'formal_assessment' },
  
  // Scheduling Focused
  { input: 'schedule a site visit', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'formal', category: 'scheduling_focused' },
  { input: 'book a site assessment for tomorrow', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'formal', category: 'scheduling_focused' },
  { input: 'set up a site visit with the customer', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'formal', category: 'scheduling_focused' },
  { input: 'arrange a property assessment', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'formal', category: 'scheduling_focused' },
  { input: 'plan a site assessment for next week', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'formal', category: 'scheduling_focused' },
  { input: 'schedule an inspection', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'formal', category: 'scheduling_focused' },
  
  // Action-Oriented
  { input: 'conduct a site visit', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'formal', category: 'action_oriented' },
  { input: 'perform an assessment of the property', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'formal', category: 'action_oriented' },
  { input: 'do a walkthrough of the yard', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'conversational', category: 'action_oriented' },
  { input: 'run an assessment this afternoon', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'conversational', category: 'action_oriented' },
  { input: 'complete an assessment before quoting', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'formal', category: 'action_oriented' },
  
  // Industry Vernacular
  { input: 'go out and look at the property', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'industry', category: 'industry_vernacular' },
  { input: 'check out the site', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'industry', category: 'industry_vernacular' },
  { input: 'take a look at their yard', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'industry', category: 'industry_vernacular' },
  { input: 'measure the property', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'industry', category: 'industry_vernacular' },
  { input: 'scope out the job site', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'industry', category: 'industry_vernacular' },
  { input: 'survey the yard before estimating', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'industry', category: 'industry_vernacular' },
  { input: 'walk the property', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'industry', category: 'industry_vernacular' },
  { input: 'property walkthrough', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'industry', category: 'industry_vernacular' },
  
  // Team Dispatch
  { input: 'send someone out to look at the property', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'conversational', category: 'team_dispatch' },
  { input: 'have someone check out the site', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'conversational', category: 'team_dispatch' },
  { input: 'dispatch someone to assess the yard', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'formal', category: 'team_dispatch' },
  { input: 'get someone out there to measure', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'conversational', category: 'team_dispatch' },
  { input: 'need someone to go look at the job', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'conversational', category: 'team_dispatch' },
  { input: 'assign an assessor to the property', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'formal', category: 'team_dispatch' },
];

// =============================================================================
// TRANSITION PHRASES (15+)
// =============================================================================

export const TRANSITION_PHRASES: TestPhrase[] = [
  // Lead → Communication
  { input: 'contact this new lead', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'transitional', notes: 'After lead capture' },
  { input: 'reach out to the customer we just added', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'transitional', notes: 'After lead capture' },
  { input: 'now call them back', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'transitional', notes: 'After lead capture' },
  
  // Communication → Assessment
  { input: 'schedule an assessment for this customer', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'transitional', notes: 'After communication' },
  { input: 'book a site visit for them', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'transitional', notes: 'After communication' },
  { input: 'go check out their property', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'transitional', notes: 'After communication' },
  
  // Assessment → Quoting
  { input: 'give them a quote based on the assessment', expectedPattern: 'quote_to_job_complete', expectedProcess: 'quoting', source: 'transitional', notes: 'After assessment' },
  { input: 'price this out', expectedPattern: 'quote_to_job_complete', expectedProcess: 'quoting', source: 'transitional', notes: 'After assessment' },
  { input: 'quote the job', expectedPattern: 'quote_to_job_complete', expectedProcess: 'quoting', source: 'transitional', notes: 'After assessment' },
  { input: 'how much would this cost', expectedPattern: 'quote_to_job_complete', expectedProcess: 'quoting', source: 'transitional', notes: 'After assessment' },
  
  // General Transitions
  { input: 'now contact them', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'transitional' },
  { input: 'let them know the price', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'transitional' },
  { input: 'send someone to check it out', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'transitional' },
  { input: 'update the customer', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'transitional' },
];

// =============================================================================
// EDGE CASES AND NEGATIVE TESTS (15+)
// =============================================================================

export const EDGE_CASE_PHRASES: TestPhrase[] = [
  // Should NOT match (ambiguous or unrelated)
  { input: 'whats the weather like', expectedPattern: null, expectedProcess: 'none', source: 'edge_case', notes: 'Should not match any pattern' },
  { input: 'hello', expectedPattern: null, expectedProcess: 'none', source: 'edge_case', notes: 'Greeting only' },
  { input: 'thanks', expectedPattern: null, expectedProcess: 'none', source: 'edge_case', notes: 'Thank you only' },
  { input: 'how do I use this', expectedPattern: null, expectedProcess: 'none', source: 'edge_case', notes: 'Help request' },
  
  // Partial/Typos that should still match
  { input: 'new lede from John', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'edge_case', notes: 'Typo: lede' },
  { input: 'schdule a site visit', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'edge_case', notes: 'Typo: schdule' },
  { input: 'contct the customer', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'edge_case', notes: 'Typo: contct' },
  
  // Compound requests (first intent should win)
  { input: 'add a new customer and schedule a site visit', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'edge_case', notes: 'First intent' },
  { input: 'contact them and set up an assessment', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'edge_case', notes: 'First intent' },
  
  // Very short inputs
  { input: 'new lead', expectedPattern: 'complete_lead_generation', expectedProcess: 'lead_generation', source: 'edge_case', notes: 'Minimal input' },
  { input: 'site visit', expectedPattern: 'complete_site_assessment', expectedProcess: 'site_assessment', source: 'edge_case', notes: 'Minimal input' },
  { input: 'call them', expectedPattern: 'complete_customer_communication', expectedProcess: 'communication', source: 'edge_case', notes: 'Minimal input' },
];

// =============================================================================
// COMPLETE TEST CORPUS
// =============================================================================

export const TEST_CORPUS: TestPhrase[] = [
  ...LEAD_GENERATION_PHRASES,
  ...COMMUNICATION_PHRASES,
  ...SITE_ASSESSMENT_PHRASES,
  ...TRANSITION_PHRASES,
  ...EDGE_CASE_PHRASES,
];

/**
 * Get test phrases for a specific process
 */
export function getPhrasesForProcess(processId: ProcessCategory): TestPhrase[] {
  return TEST_CORPUS.filter(p => p.expectedProcess === processId);
}

/**
 * Get test phrases by source type
 */
export function getPhrasesBySource(source: PhraseSource): TestPhrase[] {
  return TEST_CORPUS.filter(p => p.source === source);
}

/**
 * Get test phrases that should match a pattern
 */
export function getPhrasesExpectingMatch(): TestPhrase[] {
  return TEST_CORPUS.filter(p => p.expectedPattern !== null);
}

/**
 * Get test phrases that should NOT match any pattern
 */
export function getPhrasesExpectingNoMatch(): TestPhrase[] {
  return TEST_CORPUS.filter(p => p.expectedPattern === null);
}

/**
 * Get statistics about the test corpus
 */
export function getCorpusStats(): {
  total: number;
  byProcess: Record<string, number>;
  bySource: Record<string, number>;
  expectingMatch: number;
  expectingNoMatch: number;
} {
  const byProcess: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  
  for (const phrase of TEST_CORPUS) {
    byProcess[phrase.expectedProcess] = (byProcess[phrase.expectedProcess] || 0) + 1;
    bySource[phrase.source] = (bySource[phrase.source] || 0) + 1;
  }
  
  return {
    total: TEST_CORPUS.length,
    byProcess,
    bySource,
    expectingMatch: getPhrasesExpectingMatch().length,
    expectingNoMatch: getPhrasesExpectingNoMatch().length,
  };
}
