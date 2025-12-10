import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Helper to get available businesses for a customer account
async function getAvailableBusinesses(supabase: any, customerAccountId: string) {
  const { data: links } = await supabase
    .from('customer_account_links')
    .select(`
      customer_id,
      business_id,
      is_primary,
      customers (id, name),
      businesses (id, name, logo_url, light_logo_url)
    `)
    .eq('customer_account_id', customerAccountId);

  return (links || []).map((link: any) => ({
    id: link.business_id,
    name: link.businesses?.name || 'Unknown',
    logo_url: link.businesses?.logo_url,
    light_logo_url: link.businesses?.light_logo_url,
    customer_id: link.customer_id,
    customer_name: link.customers?.name,
    is_primary: link.is_primary,
  }));
}

// Helper to ensure customer account links exist
async function ensureAccountLinks(supabase: any, customerAccountId: string, email: string) {
  // Find all customers with matching email across all businesses
  const { data: customers } = await supabase
    .from('customers')
    .select('id, business_id')
    .eq('email', email.toLowerCase());

  if (!customers || customers.length === 0) return;

  // Get existing links
  const { data: existingLinks } = await supabase
    .from('customer_account_links')
    .select('customer_id')
    .eq('customer_account_id', customerAccountId);

  const existingCustomerIds = new Set((existingLinks || []).map((l: any) => l.customer_id));

  // Create links for any missing customers
  const newLinks = customers
    .filter((c: any) => !existingCustomerIds.has(c.id))
    .map((c: any) => ({
      customer_account_id: customerAccountId,
      customer_id: c.id,
      business_id: c.business_id,
      is_primary: false,
    }));

  if (newLinks.length > 0) {
    await supabase
      .from('customer_account_links')
      .insert(newLinks);
    console.log(`Created ${newLinks.length} new account links for ${email}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const url = new URL(req.url);

  try {
    // Authenticate customer via session token
    const sessionToken = req.headers.get('x-session-token');
    
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate session
    const { data: session, error: sessionError } = await supabase
      .from('customer_sessions')
      .select(`
        id,
        active_customer_id,
        active_business_id,
        customer_accounts (
          id,
          email,
          customers (id, name, email, phone, address, business_id)
        )
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerAccount = session.customer_accounts;
    const defaultCustomer = customerAccount.customers;
    
    // Use active_customer_id if set, otherwise fallback to default
    const activeCustomerId = session.active_customer_id || defaultCustomer.id;
    const activeBusinessId = session.active_business_id || defaultCustomer.business_id;

    // Ensure all account links exist
    await ensureAccountLinks(supabase, customerAccount.id, customerAccount.email);

    // Get the active customer's details (may be different from default)
    let customerId = activeCustomerId;
    let businessId = activeBusinessId;
    
    // If active customer differs, fetch their details
    let customer = defaultCustomer;
    if (activeCustomerId && activeCustomerId !== defaultCustomer.id) {
      const { data: activeCustomer } = await supabase
        .from('customers')
        .select('id, name, email, phone, address, business_id')
        .eq('id', activeCustomerId)
        .single();
      
      if (activeCustomer) {
        customer = activeCustomer;
        businessId = activeCustomer.business_id;
      }
    }

    customerId = customer.id;
    businessId = customer.business_id;

    // Get business query param for filtering (optional override)
    const queryBusinessId = url.searchParams.get('businessId');
    if (queryBusinessId) {
      // Verify customer has access to this business
      const { data: link } = await supabase
        .from('customer_account_links')
        .select('customer_id')
        .eq('customer_account_id', customerAccount.id)
        .eq('business_id', queryBusinessId)
        .single();

      if (link) {
        customerId = link.customer_id;
        businessId = queryBusinessId;
        
        // Fetch customer details for this business
        const { data: businessCustomer } = await supabase
          .from('customers')
          .select('id, name, email, phone, address, business_id')
          .eq('id', link.customer_id)
          .single();
        
        if (businessCustomer) {
          customer = businessCustomer;
        }
      }
    }

    // Fetch all customer data in parallel
    const [
      businessResult,
      jobsResult,
      quotesResult,
      invoicesResult,
      teamResult,
      paymentsResult,
      availableBusinesses,
    ] = await Promise.all([
      // Business info
      supabase
        .from('businesses')
        .select('id, name, logo_url, light_logo_url, phone, reply_to_email')
        .eq('id', businessId)
        .single(),
      
      // Customer's jobs
      supabase
        .from('jobs')
        .select(`
          id, title, status, starts_at, ends_at, address, notes,
          job_assignments(user_id, profiles:user_id(full_name))
        `)
        .eq('customer_id', customerId)
        .order('starts_at', { ascending: false })
        .limit(20),
      
      // Customer's quotes
      supabase
        .from('quotes')
        .select(`
          id, number, status, total, created_at, sent_at, approved_at,
          public_token, deposit_required, deposit_percent, signature_data_url
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(20),
      
      // Customer's invoices
      supabase
        .from('invoices')
        .select(`
          id, number, status, total, created_at, due_at, paid_at,
          public_token, deposit_required, deposit_percent
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(20),
      
      // Team members assigned to customer's jobs
      supabase
        .from('job_assignments')
        .select(`
          job_id,
          profiles:user_id(id, full_name, email)
        `)
        .in('job_id', 
          (await supabase
            .from('jobs')
            .select('id')
            .eq('customer_id', customerId)
          ).data?.map(j => j.id) || []
        ),

      // Customer's payments with invoice info
      supabase
        .from('payments')
        .select(`
          id, invoice_id, amount, method, last4, received_at, status,
          invoices!inner(number, customer_id)
        `)
        .eq('invoices.customer_id', customerId)
        .order('received_at', { ascending: false })
        .limit(50),

      // Available businesses for this account
      getAvailableBusinesses(supabase, customerAccount.id),
    ]);

    // Calculate financial summary
    const invoices = invoicesResult.data || [];
    const totalOwed = invoices
      .filter(inv => inv.status !== 'Paid' && inv.status !== 'Draft')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalPaid = invoices
      .filter(inv => inv.status === 'Paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Calculate action items
    const pendingQuotes = (quotesResult.data || []).filter(q => q.status === 'Sent');
    const unpaidInvoices = invoices.filter(inv => 
      inv.status === 'Sent' || inv.status === 'Overdue'
    );
    const upcomingJobs = (jobsResult.data || []).filter(job => 
      job.status === 'Scheduled' && 
      job.starts_at && 
      new Date(job.starts_at) > new Date()
    );

    // Get unique team members
    const teamMembers = new Map();
    (teamResult.data || []).forEach(assignment => {
      if (assignment.profiles) {
        teamMembers.set(assignment.profiles.id, assignment.profiles);
      }
    });

    // Format payments with invoice number
    const payments = (paymentsResult.data || []).map(p => ({
      id: p.id,
      invoice_id: p.invoice_id,
      invoice_number: p.invoices?.number || 'Unknown',
      amount: p.amount,
      method: p.method,
      last4: p.last4,
      received_at: p.received_at,
      status: p.status,
    }));

    const response = {
      business: businessResult.data,
      customer: customer,
      
      // Multi-business context
      availableBusinesses,
      activeBusinessId: businessId,
      activeCustomerId: customerId,
      
      // Jobs
      jobs: jobsResult.data || [],
      upcomingJobs: upcomingJobs.slice(0, 5),
      
      // Documents
      quotes: quotesResult.data || [],
      invoices: invoices,
      payments,
      
      // Financial summary
      financialSummary: {
        totalOwed,
        totalPaid,
        unpaidCount: unpaidInvoices.length,
        overdueCount: invoices.filter(i => i.status === 'Overdue').length,
      },
      
      // Action items
      actionItems: {
        pendingQuotes: pendingQuotes.length,
        unpaidInvoices: unpaidInvoices.length,
        upcomingAppointments: upcomingJobs.length,
      },
      
      // Team
      teamMembers: Array.from(teamMembers.values()),
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Customer job data error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
