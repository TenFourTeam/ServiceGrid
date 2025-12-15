/**
 * Memory Manager - Handles entity refs, preferences, and plan persistence
 */
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Types
// ============================================================================

export interface EntityRef {
  id: string;
  conversationId: string;
  entityType: 'job' | 'customer' | 'quote' | 'invoice' | 'member' | 'request';
  entityId: string;
  entityName: string | null;
  mentionedAt: string;
  contextSnippet: string | null;
}

export interface UserPreference {
  id: string;
  preferenceType: 'assignment' | 'scheduling' | 'communication' | 'workflow';
  preferenceKey: string;
  preferenceValue: Record<string, any>;
  confidence: number;
  learnedFrom: 'explicit' | 'inferred' | 'confirmed';
  occurrenceCount: number;
  isActive: boolean;
}

export interface ConversationMemory {
  recentEntities: EntityRef[];
  preferences: UserPreference[];
  conversationSummary: string | null;
  entityContext: EntityRef[];
}

export interface MemoryContext {
  supabase: SupabaseClient;
  userId: string;
  businessId: string;
  conversationId?: string;
}

// ============================================================================
// Entity Reference Management
// ============================================================================

/**
 * Store an entity reference mentioned in conversation
 */
export async function rememberEntity(
  ctx: MemoryContext,
  entity: {
    entityType: EntityRef['entityType'];
    entityId: string;
    entityName?: string;
    contextSnippet?: string;
    messageId?: string;
  }
): Promise<void> {
  if (!ctx.conversationId) {
    console.warn('[MemoryManager] Cannot remember entity - no conversationId');
    return;
  }

  try {
    const { data, error } = await ctx.supabase
      .from('ai_memory_entity_refs')
      .insert({
        conversation_id: ctx.conversationId,
        user_id: ctx.userId,
        business_id: ctx.businessId,
        entity_type: entity.entityType,
        entity_id: entity.entityId,
        entity_name: entity.entityName || null,
        context_snippet: entity.contextSnippet || null,
        message_id: entity.messageId || null,
        mentioned_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[MemoryManager] Failed to remember entity:', error.message, error.code);
    } else {
      console.info('[MemoryManager] Remembered entity:', entity.entityType, entity.entityId, '-> id:', data?.id);
    }
  } catch (error) {
    console.error('[MemoryManager] Failed to remember entity (exception):', error);
  }
}

/**
 * Get recent entities mentioned by user across conversations
 */
export async function getRecentEntities(
  ctx: MemoryContext,
  limit: number = 10
): Promise<EntityRef[]> {
  try {
    const { data, error } = await ctx.supabase
      .from('ai_memory_entity_refs')
      .select('*')
      .eq('user_id', ctx.userId)
      .eq('business_id', ctx.businessId)
      .order('mentioned_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      entityName: row.entity_name,
      mentionedAt: row.mentioned_at,
      contextSnippet: row.context_snippet,
    }));
  } catch (error) {
    console.error('[MemoryManager] Failed to get recent entities:', error);
    return [];
  }
}

/**
 * Get entities mentioned in current conversation
 */
export async function getConversationEntities(
  ctx: MemoryContext
): Promise<EntityRef[]> {
  if (!ctx.conversationId) return [];

  try {
    const { data, error } = await ctx.supabase
      .from('ai_memory_entity_refs')
      .select('*')
      .eq('conversation_id', ctx.conversationId)
      .order('mentioned_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      entityName: row.entity_name,
      mentionedAt: row.mentioned_at,
      contextSnippet: row.context_snippet,
    }));
  } catch (error) {
    console.error('[MemoryManager] Failed to get conversation entities:', error);
    return [];
  }
}

/**
 * Resolve a pronoun reference ("that job", "the customer") to an entity
 */
export async function resolveReference(
  ctx: MemoryContext,
  entityType: EntityRef['entityType']
): Promise<EntityRef | null> {
  try {
    // First try current conversation
    if (ctx.conversationId) {
      const { data: convData } = await ctx.supabase
        .from('ai_memory_entity_refs')
        .select('*')
        .eq('conversation_id', ctx.conversationId)
        .eq('entity_type', entityType)
        .order('mentioned_at', { ascending: false })
        .limit(1)
        .single();

      if (convData) {
        return {
          id: convData.id,
          conversationId: convData.conversation_id,
          entityType: convData.entity_type,
          entityId: convData.entity_id,
          entityName: convData.entity_name,
          mentionedAt: convData.mentioned_at,
          contextSnippet: convData.context_snippet,
        };
      }
    }

    // Fall back to recent entities across all conversations
    const { data: recentData } = await ctx.supabase
      .from('ai_memory_entity_refs')
      .select('*')
      .eq('user_id', ctx.userId)
      .eq('business_id', ctx.businessId)
      .eq('entity_type', entityType)
      .order('mentioned_at', { ascending: false })
      .limit(1)
      .single();

    if (recentData) {
      return {
        id: recentData.id,
        conversationId: recentData.conversation_id,
        entityType: recentData.entity_type,
        entityId: recentData.entity_id,
        entityName: recentData.entity_name,
        mentionedAt: recentData.mentioned_at,
        contextSnippet: recentData.context_snippet,
      };
    }

    return null;
  } catch (error) {
    console.error('[MemoryManager] Failed to resolve reference:', error);
    return null;
  }
}

// ============================================================================
// Preference Management
// ============================================================================

/**
 * Get active preferences for user
 */
export async function getActivePreferences(
  ctx: MemoryContext,
  minConfidence: number = 0.6
): Promise<UserPreference[]> {
  try {
    const { data, error } = await ctx.supabase
      .from('ai_memory_preferences')
      .select('*')
      .eq('user_id', ctx.userId)
      .eq('business_id', ctx.businessId)
      .eq('is_active', true)
      .gte('confidence', minConfidence)
      .order('confidence', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      preferenceType: row.preference_type,
      preferenceKey: row.preference_key,
      preferenceValue: row.preference_value,
      confidence: parseFloat(row.confidence),
      learnedFrom: row.learned_from,
      occurrenceCount: row.occurrence_count,
      isActive: row.is_active,
    }));
  } catch (error) {
    console.error('[MemoryManager] Failed to get preferences:', error);
    return [];
  }
}

/**
 * Learn or update a preference
 */
export async function learnPreference(
  ctx: MemoryContext,
  preference: {
    type: UserPreference['preferenceType'];
    key: string;
    value: Record<string, any>;
    learnedFrom: 'explicit' | 'inferred' | 'confirmed';
    confidenceBoost?: number;
  }
): Promise<void> {
  try {
    // Check if preference already exists
    const { data: existing, error: fetchError } = await ctx.supabase
      .from('ai_memory_preferences')
      .select('*')
      .eq('user_id', ctx.userId)
      .eq('business_id', ctx.businessId)
      .eq('preference_type', preference.type)
      .eq('preference_key', preference.key)
      .maybeSingle();

    if (fetchError) {
      console.error('[MemoryManager] Failed to fetch existing preference:', fetchError.message);
      return;
    }

    if (existing) {
      // Update existing preference
      const newConfidence = Math.min(
        1.0,
        parseFloat(existing.confidence) + (preference.confidenceBoost || 0.1)
      );
      
      const { error: updateError } = await ctx.supabase
        .from('ai_memory_preferences')
        .update({
          preference_value: preference.value,
          confidence: newConfidence,
          learned_from: preference.learnedFrom === 'confirmed' ? 'confirmed' : existing.learned_from,
          occurrence_count: existing.occurrence_count + 1,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('[MemoryManager] Failed to update preference:', updateError.message);
      } else {
        console.info('[MemoryManager] Updated preference:', preference.type, preference.key);
      }
    } else {
      // Create new preference
      const initialConfidence = preference.learnedFrom === 'explicit' ? 0.8 
        : preference.learnedFrom === 'confirmed' ? 0.9 
        : 0.5;

      const { data, error: insertError } = await ctx.supabase
        .from('ai_memory_preferences')
        .insert({
          user_id: ctx.userId,
          business_id: ctx.businessId,
          preference_type: preference.type,
          preference_key: preference.key,
          preference_value: preference.value,
          confidence: initialConfidence,
          learned_from: preference.learnedFrom,
          occurrence_count: 1,
          last_used_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[MemoryManager] Failed to insert preference:', insertError.message, insertError.code);
      } else {
        console.info('[MemoryManager] Learned new preference:', preference.type, preference.key, '-> id:', data?.id);
      }
    }
  } catch (error) {
    console.error('[MemoryManager] Failed to learn preference (exception):', error);
  }
}

/**
 * Confirm a preference (boost confidence)
 */
export async function confirmPreference(
  ctx: MemoryContext,
  preferenceId: string
): Promise<void> {
  try {
    const { data: existing } = await ctx.supabase
      .from('ai_memory_preferences')
      .select('confidence')
      .eq('id', preferenceId)
      .single();

    if (existing) {
      await ctx.supabase
        .from('ai_memory_preferences')
        .update({
          confidence: Math.min(1.0, parseFloat(existing.confidence) + 0.15),
          learned_from: 'confirmed',
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', preferenceId);
    }
  } catch (error) {
    console.error('[MemoryManager] Failed to confirm preference:', error);
  }
}

/**
 * Deactivate a preference
 */
export async function deactivatePreference(
  ctx: MemoryContext,
  preferenceId: string
): Promise<void> {
  try {
    await ctx.supabase
      .from('ai_memory_preferences')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', preferenceId);
  } catch (error) {
    console.error('[MemoryManager] Failed to deactivate preference:', error);
  }
}

// ============================================================================
// Conversation Summary Management
// ============================================================================

/**
 * Get conversation summary
 */
export async function getConversationSummary(
  ctx: MemoryContext
): Promise<string | null> {
  if (!ctx.conversationId) return null;

  try {
    const { data } = await ctx.supabase
      .from('ai_chat_conversations')
      .select('summary')
      .eq('id', ctx.conversationId)
      .single();

    return data?.summary || null;
  } catch (error) {
    console.error('[MemoryManager] Failed to get conversation summary:', error);
    return null;
  }
}

/**
 * Update conversation summary
 */
export async function updateConversationSummary(
  ctx: MemoryContext,
  summary: string
): Promise<void> {
  if (!ctx.conversationId) return;

  try {
    await ctx.supabase
      .from('ai_chat_conversations')
      .update({
        summary,
        last_summarized_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', ctx.conversationId);
  } catch (error) {
    console.error('[MemoryManager] Failed to update conversation summary:', error);
  }
}

/**
 * Update conversation entity context
 */
export async function updateEntityContext(
  ctx: MemoryContext,
  entityContext: EntityRef[]
): Promise<void> {
  if (!ctx.conversationId) return;

  try {
    await ctx.supabase
      .from('ai_chat_conversations')
      .update({
        entity_context: entityContext,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ctx.conversationId);
  } catch (error) {
    console.error('[MemoryManager] Failed to update entity context:', error);
  }
}

// ============================================================================
// Persistent Plan Storage
// ============================================================================

export interface PersistentPlan {
  id: string;
  userId: string;
  businessId: string;
  conversationId: string | null;
  planData: any;
  patternId: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed';
  createdAt: string;
  expiresAt: string;
}

/**
 * Store a pending plan in database
 * @param planId - Optional: Use this ID instead of auto-generating (fixes ID mismatch bug)
 */
export async function storePendingPlan(
  ctx: MemoryContext,
  plan: any,
  patternId?: string,
  planId?: string
): Promise<string> {
  const idToUse = planId || plan?.plan?.id || crypto.randomUUID();
  
  console.info('[MemoryManager] Storing pending plan:', {
    planId: idToUse,
    patternId,
    userId: ctx.userId,
    businessId: ctx.businessId,
  });
  
  try {
    const { data, error } = await ctx.supabase
      .from('ai_pending_plans')
      .insert({
        id: idToUse, // Use provided plan ID to fix mismatch bug
        user_id: ctx.userId,
        business_id: ctx.businessId,
        conversation_id: ctx.conversationId || null,
        plan_data: plan,
        pattern_id: patternId || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) throw error;
    
    console.info('[MemoryManager] Plan stored successfully:', data.id);
    return data.id;
  } catch (error) {
    console.error('[MemoryManager] Failed to store pending plan:', error);
    throw error;
  }
}

/**
 * Get pending plan by ID
 */
export async function getPendingPlan(
  ctx: MemoryContext,
  planId: string
): Promise<PersistentPlan | null> {
  console.info('[MemoryManager] Fetching pending plan:', planId);
  
  try {
    const { data, error } = await ctx.supabase
      .from('ai_pending_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', ctx.userId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString()) // Only get non-expired plans
      .single();

    if (error || !data) {
      console.info('[MemoryManager] Plan not found or expired:', planId, error?.message);
      return null;
    }

    console.info('[MemoryManager] Plan retrieved successfully:', planId);
    return {
      id: data.id,
      userId: data.user_id,
      businessId: data.business_id,
      conversationId: data.conversation_id,
      planData: data.plan_data,
      patternId: data.pattern_id,
      status: data.status,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
    };
  } catch (error) {
    console.error('[MemoryManager] Failed to get pending plan:', error);
    return null;
  }
}

/**
 * Get most recent pending plan for user
 */
export async function getMostRecentPendingPlan(
  ctx: MemoryContext
): Promise<PersistentPlan | null> {
  try {
    const { data, error } = await ctx.supabase
      .from('ai_pending_plans')
      .select('*')
      .eq('user_id', ctx.userId)
      .eq('business_id', ctx.businessId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      businessId: data.business_id,
      conversationId: data.conversation_id,
      planData: data.plan_data,
      patternId: data.pattern_id,
      status: data.status,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
    };
  } catch (error) {
    console.error('[MemoryManager] Failed to get most recent pending plan:', error);
    return null;
  }
}

/**
 * Update plan status
 */
export async function updatePlanStatus(
  ctx: MemoryContext,
  planId: string,
  status: PersistentPlan['status'],
  result?: any
): Promise<void> {
  try {
    const updateData: any = { status };
    if (status === 'executing' || status === 'completed' || status === 'failed') {
      updateData.executed_at = new Date().toISOString();
    }
    if (result) {
      updateData.result = result;
    }

    await ctx.supabase
      .from('ai_pending_plans')
      .update(updateData)
      .eq('id', planId);
  } catch (error) {
    console.error('[MemoryManager] Failed to update plan status:', error);
  }
}

/**
 * Remove a pending plan
 */
export async function removePendingPlan(
  ctx: MemoryContext,
  planId: string
): Promise<void> {
  try {
    await ctx.supabase
      .from('ai_pending_plans')
      .delete()
      .eq('id', planId)
      .eq('user_id', ctx.userId);
  } catch (error) {
    console.error('[MemoryManager] Failed to remove pending plan:', error);
  }
}

// ============================================================================
// Conversation State Management (for multi-turn context)
// ============================================================================

export interface ConversationState {
  pendingIntent?: string;          // e.g., "customer.create"
  awaitingInput?: string;          // e.g., "customer_details", "date", "confirmation"
  lastAssistantAction?: string;    // e.g., "asked_for_details", "asked_for_confirmation"
  collectedEntities?: Record<string, any>; // Data collected so far in multi-turn
  updatedAt?: string;
}

/**
 * Get conversation state from the conversation record
 */
export async function getConversationState(
  ctx: MemoryContext
): Promise<ConversationState | null> {
  if (!ctx.conversationId) return null;

  try {
    const { data, error } = await ctx.supabase
      .from('ai_chat_conversations')
      .select('entity_context')
      .eq('id', ctx.conversationId)
      .single();

    if (error || !data) return null;

    // We store conversation state in entity_context.conversationState
    // Handle case where entity_context is an array (default) instead of object
    const entityContext = (data.entity_context && typeof data.entity_context === 'object' && !Array.isArray(data.entity_context))
      ? data.entity_context as Record<string, any>
      : null;
    return entityContext?.conversationState || null;
  } catch (error) {
    console.error('[MemoryManager] Failed to get conversation state:', error);
    return null;
  }
}

/**
 * Set conversation state for multi-turn tracking
 */
export async function setConversationState(
  ctx: MemoryContext,
  state: ConversationState
): Promise<void> {
  if (!ctx.conversationId) return;

  try {
    // Get current entity_context
    const { data: current } = await ctx.supabase
      .from('ai_chat_conversations')
      .select('entity_context')
      .eq('id', ctx.conversationId)
      .single();

    // Handle case where entity_context is an array (default) instead of object
    const rawContext = current?.entity_context;
    const entityContext: Record<string, any> = (rawContext && typeof rawContext === 'object' && !Array.isArray(rawContext))
      ? rawContext as Record<string, any>
      : {};
    entityContext.conversationState = {
      ...state,
      updatedAt: new Date().toISOString()
    };

    await ctx.supabase
      .from('ai_chat_conversations')
      .update({
        entity_context: entityContext,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ctx.conversationId);

    console.info('[MemoryManager] Conversation state updated:', state.pendingIntent, state.awaitingInput);
  } catch (error) {
    console.error('[MemoryManager] Failed to set conversation state:', error);
  }
}

/**
 * Clear conversation state (when intent is completed)
 */
export async function clearConversationState(
  ctx: MemoryContext
): Promise<void> {
  if (!ctx.conversationId) return;

  try {
    const { data: current } = await ctx.supabase
      .from('ai_chat_conversations')
      .select('entity_context')
      .eq('id', ctx.conversationId)
      .single();

    const entityContext = (current?.entity_context as any) || {};
    delete entityContext.conversationState;

    await ctx.supabase
      .from('ai_chat_conversations')
      .update({
        entity_context: entityContext,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ctx.conversationId);

    console.info('[MemoryManager] Conversation state cleared');
  } catch (error) {
    console.error('[MemoryManager] Failed to clear conversation state:', error);
  }
}

// ============================================================================
// Full Memory Loading
// ============================================================================

/**
 * Load all memory for a conversation
 */
export async function loadMemory(ctx: MemoryContext): Promise<ConversationMemory> {
  const [recentEntities, preferences, conversationSummary, entityContext] = await Promise.all([
    getRecentEntities(ctx, 15),
    getActivePreferences(ctx, 0.5),
    getConversationSummary(ctx),
    getConversationEntities(ctx),
  ]);

  return {
    recentEntities,
    preferences,
    conversationSummary,
    entityContext,
  };
}

/**
 * Clear stale memory (old entity references)
 */
export async function clearStaleMemory(
  ctx: MemoryContext,
  olderThanDays: number = 30
): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    await ctx.supabase
      .from('ai_memory_entity_refs')
      .delete()
      .eq('user_id', ctx.userId)
      .eq('business_id', ctx.businessId)
      .lt('mentioned_at', cutoffDate.toISOString());
  } catch (error) {
    console.error('[MemoryManager] Failed to clear stale memory:', error);
  }
}

/**
 * Cleanup expired pending plans
 * Should be called periodically (e.g., at start of each request)
 */
export async function cleanupExpiredPlans(ctx: MemoryContext): Promise<number> {
  try {
    const { data, error } = await ctx.supabase
      .from('ai_pending_plans')
      .delete()
      .eq('business_id', ctx.businessId)
      .lt('expires_at', new Date().toISOString())
      .eq('status', 'pending')
      .select('id');

    if (error) {
      console.error('[MemoryManager] Failed to cleanup expired plans:', error);
      return 0;
    }

    const count = data?.length || 0;
    if (count > 0) {
      console.info('[MemoryManager] Cleaned up expired plans:', count);
    }
    return count;
  } catch (error) {
    console.error('[MemoryManager] Failed to cleanup expired plans:', error);
    return 0;
  }
}
