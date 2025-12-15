/**
 * Message Entity Extractor - Extracts entity references from user messages
 * Resolves pronouns like "that job", "the customer", "it" to actual entities
 */
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EntityRef, MemoryContext, rememberEntity, resolveReference } from './memory-manager.ts';

// ============================================================================
// Types
// ============================================================================

export interface ExtractedEntity {
  type: EntityRef['entityType'];
  id: string | null; // null if pronoun reference needs resolution
  name: string | null;
  matchedText: string;
  isPronoun: boolean;
  resolved?: boolean;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  resolvedEntities: Map<string, ExtractedEntity>; // type -> resolved entity
  hasUnresolvedPronouns: boolean;
}

// ============================================================================
// Extraction Patterns
// ============================================================================

// UUID pattern
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

// Entity-specific patterns
const ENTITY_PATTERNS: Record<EntityRef['entityType'], RegExp[]> = {
  job: [
    /\bjob\s+(?:id\s+)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi,
    /\bjob\s+#?(\d{4,6})/gi, // Job numbers
    /\bwork\s+order\s+(?:id\s+)?([0-9a-f-]{36})/gi,
    /\bwork\s+order\s+#?(\d{4,6})/gi,
  ],
  customer: [
    /\bcustomer\s+(?:id\s+)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi,
    /\bcustomer\s+["']([^"']+)["']/gi, // "John Smith"
    /\bclient\s+(?:id\s+)?([0-9a-f-]{36})/gi,
  ],
  quote: [
    /\bquote\s+(?:id\s+)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi,
    /\b(?:quo|est)-?(\d{4,6})/gi, // QUO-1234
    /\bestimate\s+(?:id\s+)?([0-9a-f-]{36})/gi,
  ],
  invoice: [
    /\binvoice\s+(?:id\s+)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi,
    /\b(?:inv)-?(\d{4,6})/gi, // INV-1234
  ],
  member: [
    /\bmember\s+(?:id\s+)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi,
    /\bteam\s+member\s+["']([^"']+)["']/gi,
    /\bassign(?:ed)?\s+(?:to\s+)?["']([^"']+)["']/gi,
  ],
  request: [
    /\brequest\s+(?:id\s+)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi,
    /\bservice\s+request\s+(?:id\s+)?([0-9a-f-]{36})/gi,
  ],
};

// Pronoun patterns that reference entities
const PRONOUN_PATTERNS: { pattern: RegExp; entityType: EntityRef['entityType'] }[] = [
  { pattern: /\b(?:that|the|this)\s+job\b/gi, entityType: 'job' },
  { pattern: /\b(?:that|the|this)\s+work\s+order\b/gi, entityType: 'job' },
  { pattern: /\b(?:that|the|this)\s+customer\b/gi, entityType: 'customer' },
  { pattern: /\b(?:that|the|this)\s+client\b/gi, entityType: 'customer' },
  { pattern: /\b(?:that|the|this)\s+quote\b/gi, entityType: 'quote' },
  { pattern: /\b(?:that|the|this)\s+estimate\b/gi, entityType: 'quote' },
  { pattern: /\b(?:that|the|this)\s+invoice\b/gi, entityType: 'invoice' },
  { pattern: /\b(?:that|the|this)\s+(?:team\s+)?member\b/gi, entityType: 'member' },
  { pattern: /\b(?:that|the|this)\s+request\b/gi, entityType: 'request' },
  // Generic "it" - requires context to resolve
  { pattern: /\breschedule\s+it\b/gi, entityType: 'job' },
  { pattern: /\bcancel\s+it\b/gi, entityType: 'job' },
  { pattern: /\bcomplete\s+it\b/gi, entityType: 'job' },
  { pattern: /\bsend\s+it\b/gi, entityType: 'invoice' }, // likely invoice/quote
  { pattern: /\bapprove\s+it\b/gi, entityType: 'quote' },
];

// ============================================================================
// Entity Resolution from Database
// ============================================================================

/**
 * Look up entity by ID in database
 */
async function lookupEntityById(
  supabase: SupabaseClient,
  businessId: string,
  entityType: EntityRef['entityType'],
  entityId: string
): Promise<{ id: string; name: string } | null> {
  try {
    let query;
    switch (entityType) {
      case 'job':
        query = supabase
          .from('jobs')
          .select('id, title')
          .eq('id', entityId)
          .eq('business_id', businessId)
          .single();
        break;
      case 'customer':
        query = supabase
          .from('customers')
          .select('id, name')
          .eq('id', entityId)
          .eq('business_id', businessId)
          .single();
        break;
      case 'quote':
        query = supabase
          .from('quotes')
          .select('id, number')
          .eq('id', entityId)
          .eq('business_id', businessId)
          .single();
        break;
      case 'invoice':
        query = supabase
          .from('invoices')
          .select('id, number')
          .eq('id', entityId)
          .eq('business_id', businessId)
          .single();
        break;
      case 'member':
        query = supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', entityId)
          .single();
        break;
      case 'request':
        query = supabase
          .from('requests')
          .select('id, description')
          .eq('id', entityId)
          .eq('business_id', businessId)
          .single();
        break;
      default:
        return null;
    }

    const { data, error } = await query;
    if (error || !data) return null;

    return {
      id: data.id,
      name: data.title || data.name || data.full_name || data.number || data.description?.substring(0, 50) || entityId,
    };
  } catch (error) {
    console.error('[EntityExtractor] Lookup failed:', error);
    return null;
  }
}

/**
 * Search for entity by name/number
 */
async function searchEntityByName(
  supabase: SupabaseClient,
  businessId: string,
  entityType: EntityRef['entityType'],
  searchTerm: string
): Promise<{ id: string; name: string } | null> {
  try {
    let query;
    const term = searchTerm.toLowerCase().trim();

    switch (entityType) {
      case 'customer':
        query = supabase
          .from('customers')
          .select('id, name')
          .eq('business_id', businessId)
          .ilike('name', `%${term}%`)
          .limit(1)
          .single();
        break;
      case 'member':
        // Search profiles that are members of this business
        const { data: memberData } = await supabase
          .from('business_permissions')
          .select('user_id, profiles!inner(id, full_name)')
          .eq('business_id', businessId)
          .ilike('profiles.full_name', `%${term}%`)
          .limit(1)
          .single();
        
        if (memberData?.profiles) {
          return {
            id: (memberData.profiles as any).id,
            name: (memberData.profiles as any).full_name,
          };
        }
        return null;
      case 'quote':
        query = supabase
          .from('quotes')
          .select('id, number')
          .eq('business_id', businessId)
          .ilike('number', `%${term}%`)
          .limit(1)
          .single();
        break;
      case 'invoice':
        query = supabase
          .from('invoices')
          .select('id, number')
          .eq('business_id', businessId)
          .ilike('number', `%${term}%`)
          .limit(1)
          .single();
        break;
      default:
        return null;
    }

    if (!query) return null;
    const { data, error } = await query;
    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name || data.full_name || data.number || searchTerm,
    };
  } catch (error) {
    console.error('[EntityExtractor] Search failed:', error);
    return null;
  }
}

// ============================================================================
// Main Extraction Functions
// ============================================================================

/**
 * Extract all entity references from a message
 */
export async function extractEntitiesFromMessage(
  message: string,
  ctx: MemoryContext
): Promise<ExtractionResult> {
  const entities: ExtractedEntity[] = [];
  const resolvedEntities = new Map<string, ExtractedEntity>();
  let hasUnresolvedPronouns = false;

  // 1. Extract explicit entity references (with IDs)
  for (const [entityType, patterns] of Object.entries(ENTITY_PATTERNS)) {
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(message)) !== null) {
        const potentialId = match[1];
        
        // Check if it's a UUID
        if (UUID_PATTERN.test(potentialId)) {
          const resolved = await lookupEntityById(
            ctx.supabase,
            ctx.businessId,
            entityType as EntityRef['entityType'],
            potentialId
          );
          
          if (resolved) {
            const entity: ExtractedEntity = {
              type: entityType as EntityRef['entityType'],
              id: resolved.id,
              name: resolved.name,
              matchedText: match[0],
              isPronoun: false,
              resolved: true,
            };
            entities.push(entity);
            resolvedEntities.set(entityType, entity);

            // Remember this entity
            await rememberEntity(ctx, {
              entityType: entityType as EntityRef['entityType'],
              entityId: resolved.id,
              entityName: resolved.name,
              contextSnippet: match[0],
            });
          }
        } else {
          // Try to search by name/number
          const resolved = await searchEntityByName(
            ctx.supabase,
            ctx.businessId,
            entityType as EntityRef['entityType'],
            potentialId
          );

          if (resolved) {
            const entity: ExtractedEntity = {
              type: entityType as EntityRef['entityType'],
              id: resolved.id,
              name: resolved.name,
              matchedText: match[0],
              isPronoun: false,
              resolved: true,
            };
            entities.push(entity);
            resolvedEntities.set(entityType, entity);

            await rememberEntity(ctx, {
              entityType: entityType as EntityRef['entityType'],
              entityId: resolved.id,
              entityName: resolved.name,
              contextSnippet: match[0],
            });
          }
        }
      }
    }
  }

  // 2. Extract pronoun references ("that job", "the customer", etc.)
  for (const { pattern, entityType } of PRONOUN_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    if (regex.test(message)) {
      // Skip if we already have an explicit reference for this type
      if (resolvedEntities.has(entityType)) continue;

      // Try to resolve from memory
      const resolved = await resolveReference(ctx, entityType);

      if (resolved) {
        const entity: ExtractedEntity = {
          type: entityType,
          id: resolved.entityId,
          name: resolved.entityName,
          matchedText: message.match(pattern)?.[0] || entityType,
          isPronoun: true,
          resolved: true,
        };
        entities.push(entity);
        resolvedEntities.set(entityType, entity);
      } else {
        // Couldn't resolve - mark as unresolved
        entities.push({
          type: entityType,
          id: null,
          name: null,
          matchedText: message.match(pattern)?.[0] || entityType,
          isPronoun: true,
          resolved: false,
        });
        hasUnresolvedPronouns = true;
      }
    }
  }

  // 3. Extract standalone UUIDs (might be entity IDs without context)
  const uuidMatches = message.match(UUID_PATTERN) || [];
  for (const uuid of uuidMatches) {
    // Skip if already captured
    if (entities.some(e => e.id === uuid)) continue;

    // Try to identify what type of entity this is
    for (const entityType of ['job', 'customer', 'quote', 'invoice'] as const) {
      const resolved = await lookupEntityById(
        ctx.supabase,
        ctx.businessId,
        entityType,
        uuid
      );

      if (resolved) {
        const entity: ExtractedEntity = {
          type: entityType,
          id: resolved.id,
          name: resolved.name,
          matchedText: uuid,
          isPronoun: false,
          resolved: true,
        };
        entities.push(entity);
        resolvedEntities.set(entityType, entity);

        await rememberEntity(ctx, {
          entityType,
          entityId: resolved.id,
          entityName: resolved.name,
          contextSnippet: `Referenced ${entityType} ${uuid}`,
        });
        break;
      }
    }
  }

  return {
    entities,
    resolvedEntities,
    hasUnresolvedPronouns,
  };
}

/**
 * Build entity context string for prompt injection
 */
export function buildEntityContextString(
  result: ExtractionResult,
  recentEntities: EntityRef[]
): string {
  const lines: string[] = [];

  // Current message entities
  if (result.entities.length > 0) {
    lines.push('ENTITIES REFERENCED IN THIS MESSAGE:');
    for (const entity of result.entities) {
      if (entity.resolved && entity.id) {
        lines.push(`- ${entity.type}: "${entity.name}" (ID: ${entity.id})`);
      } else if (entity.isPronoun) {
        lines.push(`- ${entity.type}: [UNRESOLVED - "${entity.matchedText}"]`);
      }
    }
  }

  // Recent entities from conversation
  if (recentEntities.length > 0) {
    lines.push('\nRECENTLY DISCUSSED ENTITIES:');
    const grouped = new Map<string, EntityRef[]>();
    for (const ref of recentEntities.slice(0, 10)) {
      const existing = grouped.get(ref.entityType) || [];
      existing.push(ref);
      grouped.set(ref.entityType, existing);
    }

    for (const [type, refs] of grouped) {
      const uniqueRefs = refs.filter((r, i, arr) => 
        arr.findIndex(x => x.entityId === r.entityId) === i
      ).slice(0, 3);
      
      for (const ref of uniqueRefs) {
        lines.push(`- ${type}: "${ref.entityName || 'Unknown'}" (ID: ${ref.entityId})`);
      }
    }
  }

  return lines.join('\n');
}
