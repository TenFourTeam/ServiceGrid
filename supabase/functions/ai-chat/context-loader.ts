/**
 * AI Agent Context Loader
 * 
 * Fetches and caches context data based on the Context Map registry.
 * Used by the agent orchestrator to populate prompt templates.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

// =============================================================================
// TYPES
// =============================================================================

export interface LoaderContext {
  supabase: SupabaseClient;
  businessId: string;
  userId: string;
  currentPage?: string;
  entityId?: string;
  entityType?: string;
}

export interface LoadedContext {
  [key: string]: any;
}

// Simple in-memory cache with TTL
const contextCache: Map<string, { data: any; expiresAt: number }> = new Map();

// =============================================================================
// CACHE HELPERS
// =============================================================================

function getCacheKey(key: string, businessId: string, entityId?: string): string {
  return `${businessId}:${key}:${entityId || 'none'}`;
}

function getFromCache(cacheKey: string): any | null {
  const cached = contextCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  if (cached) {
    contextCache.delete(cacheKey);
  }
  return null;
}

function setInCache(cacheKey: string, data: any, ttlSeconds: number): void {
  contextCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

// =============================================================================
// CONTEXT LOADERS BY KEY
// =============================================================================

const contextLoaders: Record<string, (ctx: LoaderContext) => Promise<any>> = {
  // Business Context
  business_name: async (ctx) => {
    const cacheKey = getCacheKey('business_name', ctx.businessId);
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const { data } = await ctx.supabase
      .from('businesses')
      .select('name, industry, tax_rate_default')
      .eq('id', ctx.businessId)
      .single();

    if (data) {
      setInCache(cacheKey, data.name, 3600);
    }
    return data?.name || 'Unknown Business';
  },

  business_info: async (ctx) => {
    const cacheKey = getCacheKey('business_info', ctx.businessId);
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const { data } = await ctx.supabase
      .from('businesses')
      .select('name, industry, tax_rate_default, phone, description')
      .eq('id', ctx.businessId)
      .single();

    if (data) {
      setInCache(cacheKey, data, 3600);
    }
    return data;
  },

  // Team Context
  team_members: async (ctx) => {
    const cacheKey = getCacheKey('team_members', ctx.businessId);
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const { data } = await ctx.supabase
      .from('business_permissions')
      .select('user_id, profiles!business_permissions_user_id_fkey(id, full_name, email)')
      .eq('business_id', ctx.businessId);

    const members = data?.map((m) => ({
      id: m.user_id,
      name: m.profiles?.full_name || m.profiles?.email || 'Unknown',
      email: m.profiles?.email,
    })) || [];

    setInCache(cacheKey, members, 300);
    return members;
  },

  team_member_count: async (ctx) => {
    const members = await contextLoaders.team_members(ctx);
    return members.length;
  },

  // Scheduling Context
  unscheduled_jobs: async (ctx) => {
    const cacheKey = getCacheKey('unscheduled_jobs', ctx.businessId);
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const { data } = await ctx.supabase
      .from('jobs')
      .select(`
        id, title, notes, created_at, priority, estimated_duration_minutes, address,
        customers(id, name, address, preferred_days, preferred_time_window, avoid_days)
      `)
      .eq('business_id', ctx.businessId)
      .is('starts_at', null)
      .neq('status', 'Cancelled')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(50);

    const result = data || [];
    setInCache(cacheKey, result, 120); // 2 minute cache
    return result;
  },

  unscheduled_jobs_count: async (ctx) => {
    const { count } = await ctx.supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', ctx.businessId)
      .is('starts_at', null)
      .neq('status', 'Cancelled');

    return count || 0;
  },

  todays_jobs: async (ctx) => {
    const cacheKey = getCacheKey('todays_jobs', ctx.businessId);
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const { data } = await ctx.supabase
      .from('jobs')
      .select(`
        id, title, status, starts_at, ends_at, address,
        customers(id, name, address)
      `)
      .eq('business_id', ctx.businessId)
      .gte('starts_at', `${today}T00:00:00Z`)
      .lt('starts_at', `${tomorrow}T00:00:00Z`)
      .order('starts_at', { ascending: true });

    const result = data || [];
    setInCache(cacheKey, result, 60); // 1 minute cache
    return result;
  },

  todays_jobs_count: async (ctx) => {
    const jobs = await contextLoaders.todays_jobs(ctx);
    return jobs.length;
  },

  scheduled_jobs_this_week: async (ctx) => {
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const { data } = await ctx.supabase
      .from('jobs')
      .select(`
        id, title, status, starts_at, ends_at,
        customers(name, address),
        job_assignments(user_id, profiles(full_name))
      `)
      .eq('business_id', ctx.businessId)
      .gte('starts_at', startOfWeek.toISOString())
      .lt('starts_at', endOfWeek.toISOString())
      .order('starts_at', { ascending: true });

    return data || [];
  },

  // Team Availability
  team_availability: async (ctx) => {
    const { data } = await ctx.supabase
      .from('team_availability')
      .select('*')
      .eq('business_id', ctx.businessId);

    return data || [];
  },

  time_off_requests: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data } = await ctx.supabase
      .from('time_off_requests')
      .select(`
        *, 
        profiles!time_off_requests_user_id_fkey(full_name)
      `)
      .eq('business_id', ctx.businessId)
      .eq('status', 'approved')
      .gte('end_date', today);

    return data?.map((t) => ({
      ...t,
      member_name: t.profiles?.full_name || 'Unknown',
    })) || [];
  },

  // Business Constraints
  business_constraints: async (ctx) => {
    const cacheKey = getCacheKey('business_constraints', ctx.businessId);
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const { data } = await ctx.supabase
      .from('business_constraints')
      .select('*')
      .eq('business_id', ctx.businessId)
      .eq('is_active', true);

    setInCache(cacheKey, data || [], 600);
    return data || [];
  },

  // Pricing Rules
  pricing_rules: async (ctx) => {
    const cacheKey = getCacheKey('pricing_rules', ctx.businessId);
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const { data } = await ctx.supabase
      .from('pricing_rules')
      .select('*')
      .eq('business_id', ctx.businessId)
      .single();

    if (data) {
      setInCache(cacheKey, data, 3600);
    }
    return data;
  },

  // Customer Context
  customer_data: async (ctx) => {
    if (!ctx.entityId || ctx.entityType !== 'customer') return null;

    const { data } = await ctx.supabase
      .from('customers')
      .select(`
        *,
        jobs(id, title, status, starts_at, total),
        quotes(id, number, status, total),
        invoices(id, number, status, total)
      `)
      .eq('id', ctx.entityId)
      .single();

    return data;
  },

  customer_list: async (ctx) => {
    const cacheKey = getCacheKey('customer_list', ctx.businessId);
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const { data } = await ctx.supabase
      .from('customers')
      .select('id, name, email, phone, address')
      .eq('business_id', ctx.businessId)
      .order('name', { ascending: true })
      .limit(100);

    setInCache(cacheKey, data || [], 60);
    return data || [];
  },

  // Job Context
  job_data: async (ctx) => {
    if (!ctx.entityId || ctx.entityType !== 'job') return null;

    const { data } = await ctx.supabase
      .from('jobs')
      .select(`
        *,
        customers(id, name, email, phone, address),
        job_assignments(user_id, profiles(full_name)),
        quotes(id, number, status, total),
        invoices(id, number, status, total)
      `)
      .eq('id', ctx.entityId)
      .single();

    return data;
  },

  // Quote Context
  quote_data: async (ctx) => {
    if (!ctx.entityId || ctx.entityType !== 'quote') return null;

    const { data } = await ctx.supabase
      .from('quotes')
      .select(`
        *,
        customers(id, name, email, phone, address),
        quote_line_items(*)
      `)
      .eq('id', ctx.entityId)
      .single();

    return data;
  },

  pending_quotes: async (ctx) => {
    const { data } = await ctx.supabase
      .from('quotes')
      .select(`
        id, number, total, created_at, valid_until,
        customers(name, email)
      `)
      .eq('business_id', ctx.businessId)
      .eq('status', 'Sent')
      .order('created_at', { ascending: false })
      .limit(20);

    return data || [];
  },

  // Invoice Context
  invoice_data: async (ctx) => {
    if (!ctx.entityId || ctx.entityType !== 'invoice') return null;

    const { data } = await ctx.supabase
      .from('invoices')
      .select(`
        *,
        customers(id, name, email, phone, address),
        invoice_line_items(*),
        payments(*)
      `)
      .eq('id', ctx.entityId)
      .single();

    return data;
  },

  unpaid_invoices: async (ctx) => {
    const { data } = await ctx.supabase
      .from('invoices')
      .select(`
        id, number, total, due_at, created_at,
        customers(name, email)
      `)
      .eq('business_id', ctx.businessId)
      .in('status', ['Draft', 'Sent'])
      .order('due_at', { ascending: true })
      .limit(20);

    return data || [];
  },

  overdue_invoices: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data } = await ctx.supabase
      .from('invoices')
      .select(`
        id, number, total, due_at,
        customers(name, email)
      `)
      .eq('business_id', ctx.businessId)
      .eq('status', 'Sent')
      .lt('due_at', today)
      .order('due_at', { ascending: true })
      .limit(20);

    return data || [];
  },

  // Recent Activity
  recent_ai_activity: async (ctx) => {
    const { data } = await ctx.supabase
      .from('ai_activity_log')
      .select('activity_type, description, created_at, accepted')
      .eq('business_id', ctx.businessId)
      .order('created_at', { ascending: false })
      .limit(5);

    return data || [];
  },

  // Capacity Metrics
  capacity_metrics: async (ctx) => {
    const cacheKey = getCacheKey('capacity_metrics', ctx.businessId);
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const [scheduledJobsRes, teamMembersRes] = await Promise.all([
      ctx.supabase
        .from('jobs')
        .select('estimated_duration_minutes')
        .eq('business_id', ctx.businessId)
        .gte('starts_at', startDate)
        .lte('starts_at', endDate),
      ctx.supabase
        .from('business_permissions')
        .select('user_id', { count: 'exact', head: true })
        .eq('business_id', ctx.businessId),
    ]);

    const scheduledHours =
      (scheduledJobsRes.data?.reduce(
        (sum: number, j: any) => sum + (j.estimated_duration_minutes || 60) / 60,
        0
      ) || 0);

    const teamCount = teamMembersRes.count || 1;
    const availableHours = teamCount * 14 * 8; // 14 days, 8 hours/day
    const utilizationPercent = Math.round((scheduledHours / availableHours) * 100);

    const metrics = {
      scheduledHours: Math.round(scheduledHours),
      availableHours,
      teamCount,
      utilizationPercent,
      capacityStatus:
        utilizationPercent > 90 ? 'overbooked' : utilizationPercent > 70 ? 'high' : 'normal',
    };

    setInCache(cacheKey, metrics, 300);
    return metrics;
  },

  // Session/Derived Context
  current_page_domain: (ctx) => {
    const page = ctx.currentPage || '';
    const routes: Record<string, string> = {
      '/calendar': 'scheduling',
      '/work-orders': 'job_management',
      '/quotes': 'quote_lifecycle',
      '/invoices': 'invoicing',
      '/team': 'team_management',
      '/customers': 'customer_acquisition',
      '/requests': 'service_request',
      '/inventory': 'inventory',
      '/settings': 'settings',
    };

    for (const [route, domain] of Object.entries(routes)) {
      if (page.includes(route)) return domain;
    }
    return 'general';
  },

  time_of_day: () => {
    const hour = new Date().getHours();
    return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  },

  current_date: () => new Date().toISOString().split('T')[0],

  current_datetime: () => new Date().toISOString(),

  // ============================================
  // NEW LOADERS - Phase 3 additions
  // ============================================

  // Recent jobs (last 10 touched)
  recent_jobs: async (ctx) => {
    const cacheKey = getCacheKey('recent_jobs', ctx.businessId);
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const { data } = await ctx.supabase
      .from('jobs')
      .select(`
        id, title, status, starts_at, address,
        customers(id, name)
      `)
      .eq('business_id', ctx.businessId)
      .order('updated_at', { ascending: false })
      .limit(10);

    const result = data || [];
    setInCache(cacheKey, result, 60);
    return result;
  },

  // Active clock-ins
  active_clockins: async (ctx) => {
    const { data } = await ctx.supabase
      .from('timesheet_entries')
      .select(`
        id, user_id, job_id, clock_in,
        profiles!timesheet_entries_user_id_fkey(full_name),
        jobs(id, title)
      `)
      .eq('business_id', ctx.businessId)
      .is('clock_out', null);

    return data || [];
  },

  // Recurring schedules
  recurring_schedules: async (ctx) => {
    const cacheKey = getCacheKey('recurring_schedules', ctx.businessId);
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const { data } = await ctx.supabase
      .from('recurring_schedules')
      .select(`
        id, quote_id, status, frequency, next_billing_date,
        customers(id, name)
      `)
      .eq('business_id', ctx.businessId)
      .eq('status', 'active')
      .limit(20);

    const result = data || [];
    setInCache(cacheKey, result, 300);
    return result;
  },

  // Checklist templates
  checklist_templates: async (ctx) => {
    const cacheKey = getCacheKey('checklist_templates', ctx.businessId);
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const { data } = await ctx.supabase
      .from('sg_checklist_templates')
      .select('id, name, description')
      .or(`business_id.eq.${ctx.businessId},is_system_template.eq.true`)
      .eq('is_archived', false)
      .limit(20);

    const result = data || [];
    setInCache(cacheKey, result, 600);
    return result;
  },

  // Service requests pending (appointment change requests)
  service_requests_pending: async (ctx) => {
    const { data } = await ctx.supabase
      .from('appointment_change_requests')
      .select(`
        id, job_id, request_type, status, preferred_date, created_at,
        customers(id, name)
      `)
      .eq('business_id', ctx.businessId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20);

    return data || [];
  },

  // Recent payments
  recent_payments: async (ctx) => {
    const cacheKey = getCacheKey('recent_payments', ctx.businessId);
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const { data } = await ctx.supabase
      .from('payments')
      .select(`
        id, amount, method, received_at, status,
        invoices(id, number, customers(name))
      `)
      .eq('business_id', ctx.businessId)
      .order('received_at', { ascending: false })
      .limit(10);

    const result = data || [];
    setInCache(cacheKey, result, 120);
    return result;
  },
};

// =============================================================================
// MAIN LOADER FUNCTION
// =============================================================================

/**
 * Load multiple context keys in parallel
 */
export async function loadContext(
  keys: string[],
  ctx: LoaderContext
): Promise<LoadedContext> {
  console.info(`[context-loader] Loading ${keys.length} keys:`, keys);
  const startTime = Date.now();
  const results: LoadedContext = {};

  // Load all keys in parallel
  const loadPromises = keys.map(async (key) => {
    const loader = contextLoaders[key];
    if (loader) {
      try {
        const value = await loader(ctx);
        return { key, value, success: true };
      } catch (error) {
        console.error(`[context-loader] Error loading key "${key}":`, error);
        return { key, value: null, success: false };
      }
    } else {
      console.warn(`[context-loader] Unknown context key: ${key}`);
      return { key, value: null, success: false };
    }
  });

  const loaded = await Promise.all(loadPromises);
  
  const successKeys: string[] = [];
  const failedKeys: string[] = [];
  
  for (const { key, value, success } of loaded) {
    results[key] = value;
    if (success && value !== null) {
      successKeys.push(key);
    } else {
      failedKeys.push(key);
    }
  }

  const elapsed = Date.now() - startTime;
  console.info(`[context-loader] Loaded ${successKeys.length}/${keys.length} in ${elapsed}ms`);
  if (failedKeys.length > 0) {
    console.warn(`[context-loader] Failed to load:`, failedKeys);
  }

  return results;
}

/**
 * Load context for a specific intent based on its required/optional keys
 */
export async function loadContextForIntent(
  intentId: string,
  ctx: LoaderContext,
  requiredKeys: string[],
  optionalKeys: string[] = []
): Promise<{ context: LoadedContext; missing: string[] }> {
  const allKeys = [...new Set([...requiredKeys, ...optionalKeys])];
  const loaded = await loadContext(allKeys, ctx);

  const missing = requiredKeys.filter((key) => loaded[key] === null || loaded[key] === undefined);

  return { context: loaded, missing };
}

/**
 * Get all available context loaders
 */
export function getAvailableContextKeys(): string[] {
  return Object.keys(contextLoaders);
}
