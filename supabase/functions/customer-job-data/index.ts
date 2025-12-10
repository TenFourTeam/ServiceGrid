import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      .select('*, customer_accounts(*, customers(id, name, email, phone, address, business_id))')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerId = session.customer_accounts.customers.id;
    const businessId = session.customer_accounts.customers.business_id;

    // Fetch all customer data in parallel
    const [
      businessResult,
      jobsResult,
      quotesResult,
      invoicesResult,
      teamResult,
      paymentsResult,
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
      customer: session.customer_accounts.customers,
      
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
