/**
 * Conversation Summarizer - Summarizes long conversations to maintain context
 */
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { MemoryContext, updateConversationSummary, getConversationSummary } from './memory-manager.ts';

// ============================================================================
// Types
// ============================================================================

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: any[];
  createdAt?: string;
}

interface SummarizationResult {
  shouldSummarize: boolean;
  summary: string | null;
  keyEntities: string[];
  keyDecisions: string[];
  openItems: string[];
}

// ============================================================================
// Configuration
// ============================================================================

const SUMMARIZATION_CONFIG = {
  // Summarize when message count exceeds this
  MESSAGE_THRESHOLD: 20,
  // Re-summarize after this many new messages
  RESUMMARY_INTERVAL: 10,
  // Maximum messages to include in full (most recent)
  RECENT_MESSAGES_TO_KEEP: 8,
  // Maximum summary length in characters
  MAX_SUMMARY_LENGTH: 1500,
};

// ============================================================================
// Summarization Functions
// ============================================================================

/**
 * Check if conversation needs summarization
 */
export async function shouldSummarize(
  ctx: MemoryContext,
  messageCount: number,
  lastSummarizedAt: string | null
): Promise<boolean> {
  if (messageCount < SUMMARIZATION_CONFIG.MESSAGE_THRESHOLD) {
    return false;
  }

  // Check if we've summarized recently
  if (lastSummarizedAt) {
    const lastSummary = new Date(lastSummarizedAt);
    const now = new Date();
    const hoursSinceSummary = (now.getTime() - lastSummary.getTime()) / (1000 * 60 * 60);
    
    // Don't re-summarize within 1 hour unless significantly more messages
    if (hoursSinceSummary < 1) {
      return false;
    }
  }

  return true;
}

/**
 * Generate a summary of the conversation
 * This is called by the main AI handler and uses OpenAI
 */
export function buildSummarizationPrompt(messages: Message[]): string {
  const messageText = messages
    .filter(m => m.role !== 'system')
    .map(m => `${m.role.toUpperCase()}: ${m.content.substring(0, 500)}`)
    .join('\n');

  return `Summarize this conversation concisely, focusing on:
1. Key entities discussed (jobs, customers, quotes, invoices)
2. Important decisions made
3. Actions taken or requested
4. Any open items or pending tasks

CONVERSATION:
${messageText}

Provide a structured summary in this format:
SUMMARY: [2-3 sentence overview]
ENTITIES: [comma-separated list of entity types and IDs/names mentioned]
DECISIONS: [bullet list of key decisions]
OPEN ITEMS: [bullet list of pending items]`;
}

/**
 * Parse AI-generated summary into structured format
 */
export function parseSummaryResponse(response: string): SummarizationResult {
  const summaryMatch = response.match(/SUMMARY:\s*([^\n]+(?:\n(?!ENTITIES:|DECISIONS:|OPEN ITEMS:)[^\n]+)*)/i);
  const entitiesMatch = response.match(/ENTITIES:\s*([^\n]+)/i);
  const decisionsMatch = response.match(/DECISIONS:\s*([\s\S]*?)(?=OPEN ITEMS:|$)/i);
  const openItemsMatch = response.match(/OPEN ITEMS:\s*([\s\S]*?)$/i);

  const summary = summaryMatch?.[1]?.trim() || response.substring(0, SUMMARIZATION_CONFIG.MAX_SUMMARY_LENGTH);
  
  const keyEntities = entitiesMatch?.[1]
    ?.split(',')
    .map(e => e.trim())
    .filter(Boolean) || [];

  const keyDecisions = decisionsMatch?.[1]
    ?.split(/[-•]\s*/)
    .map(d => d.trim())
    .filter(Boolean) || [];

  const openItems = openItemsMatch?.[1]
    ?.split(/[-•]\s*/)
    .map(i => i.trim())
    .filter(Boolean) || [];

  return {
    shouldSummarize: true,
    summary,
    keyEntities,
    keyDecisions,
    openItems,
  };
}

/**
 * Store summarization result
 */
export async function storeSummary(
  ctx: MemoryContext,
  result: SummarizationResult
): Promise<void> {
  if (!ctx.conversationId || !result.summary) return;

  // Build full summary with structured data
  const fullSummary = [
    result.summary,
    '',
    result.keyEntities.length > 0 ? `Entities: ${result.keyEntities.join(', ')}` : '',
    result.keyDecisions.length > 0 ? `Decisions: ${result.keyDecisions.join('; ')}` : '',
    result.openItems.length > 0 ? `Open: ${result.openItems.join('; ')}` : '',
  ].filter(Boolean).join('\n');

  await updateConversationSummary(ctx, fullSummary);
  console.log('[Summarizer] Stored conversation summary');
}

/**
 * Build context string with previous summary
 */
export async function buildSummaryContext(ctx: MemoryContext): Promise<string> {
  const summary = await getConversationSummary(ctx);
  
  if (!summary) return '';

  return `PREVIOUS CONVERSATION SUMMARY:
${summary}

(The above summarizes earlier messages in this conversation. Refer to it for context about what was previously discussed.)`;
}

/**
 * Get messages for summarization (excluding most recent)
 */
export async function getMessagesForSummarization(
  supabase: SupabaseClient,
  conversationId: string
): Promise<{ toSummarize: Message[]; toKeep: Message[] }> {
  const { data: allMessages, error } = await supabase
    .from('ai_chat_messages')
    .select('role, content, tool_calls, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error || !allMessages) {
    return { toSummarize: [], toKeep: [] };
  }

  const messages: Message[] = allMessages.map(m => ({
    role: m.role as Message['role'],
    content: m.content,
    toolCalls: m.tool_calls,
    createdAt: m.created_at,
  }));

  const keepCount = SUMMARIZATION_CONFIG.RECENT_MESSAGES_TO_KEEP;
  
  if (messages.length <= keepCount) {
    return { toSummarize: [], toKeep: messages };
  }

  return {
    toSummarize: messages.slice(0, -keepCount),
    toKeep: messages.slice(-keepCount),
  };
}

/**
 * Build messages array with summary injected
 */
export function buildMessagesWithSummary(
  recentMessages: Message[],
  summary: string | null
): { role: string; content: string }[] {
  const result: { role: string; content: string }[] = [];

  // Inject summary as a system message at the start
  if (summary) {
    result.push({
      role: 'system',
      content: `CONVERSATION CONTEXT (from earlier messages):\n${summary}`,
    });
  }

  // Add recent messages
  for (const msg of recentMessages) {
    result.push({
      role: msg.role,
      content: msg.content,
    });
  }

  return result;
}
