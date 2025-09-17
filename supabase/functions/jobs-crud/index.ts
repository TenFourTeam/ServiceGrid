import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[jobs-crud] ${req.method} request received`);
    
    const ctx = await requireCtx(req);
    console.log('[jobs-crud] Context resolved:', { userId: ctx.userId, businessId: ctx.businessId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      // Check user role to determine job filtering
      const { data: userRole } = await supabase
        .rpc('user_business_role', { p_business_id: ctx.businessId });

      let jobsQuery = supabase
        .from('jobs')
        .select(`
          id, title, status, starts_at, ends_at, total, address, notes,
          job_type, photos, is_clocked_in, clock_in_time, clock_out_time,
          recurrence, created_at, updated_at,
          customer_id, quote_id,
          customers!inner(name, email, phone),
          job_assignments(
            user_id,
            assigned_at,
            profiles!job_assignments_user_id_fkey(id, email, full_name)
          )
        `, { count: 'exact' })
        .eq('business_id', ctx.businessId);

      // If user is a worker, only show jobs they're assigned to
      if (userRole === 'worker') {
        console.log('[jobs-crud] Worker role detected, fetching assigned job IDs for user:', ctx.userId);
        
        // First, get the job IDs that this worker is assigned to
        const { data: assignedJobs, error: assignmentError } = await supabase
          .from('job_assignments')
          .select('job_id')
          .eq('user_id', ctx.userId);

        if (assignmentError) {
          console.error('[jobs-crud] Error fetching job assignments:', assignmentError);
          throw new Error(`Failed to fetch job assignments: ${assignmentError.message}`);
        }

        const jobIds = assignedJobs?.map(assignment => assignment.job_id) || [];
        console.log('[jobs-crud] Found assigned job IDs:', jobIds);

        if (jobIds.length === 0) {
          console.log('[jobs-crud] No jobs assigned to worker, returning empty result');
          return json({ jobs: [], count: 0 });
        }

        // Filter jobs to only those assigned to this worker
        jobsQuery = jobsQuery.in('id', jobIds);
      }

      const { data, error, count } = await jobsQuery.order('updated_at', { ascending: false });

      if (error) {
        console.error('[jobs-crud] GET error:', error);
        throw new Error(`Failed to fetch jobs: ${error.message}`);
      }

      const jobs = data?.map((job: any) => ({
        id: job.id,
        title: job.title,
        status: job.status,
        startsAt: job.starts_at,
        endsAt: job.ends_at,
        total: job.total,
        address: job.address,
        notes: job.notes,
        jobType: job.job_type,
        photos: job.photos,
        isClockedIn: job.is_clocked_in,
        clockInTime: job.clock_in_time,
        clockOutTime: job.clock_out_time,
        recurrence: job.recurrence,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        customerId: job.customer_id,
        quoteId: job.quote_id,
        isAssessment: job.is_assessment,
        requestId: job.request_id,
        customerName: job.customers?.name,
        customerEmail: job.customers?.email,
        customerPhone: job.customers?.phone,
        // Transform assigned members
        assignedMembers: job.job_assignments?.map((assignment: any) => ({
          id: assignment.user_id,
          business_id: ctx.businessId,
          user_id: assignment.user_id,
          role: 'worker',
          invited_at: assignment.assigned_at,
          joined_at: assignment.assigned_at,
          joined_via_invite: false,
          email: assignment.profiles?.email,
          name: assignment.profiles?.full_name,
        })) || [],
      })) || [];

      console.log('[jobs-crud] Fetched', jobs.length, 'jobs');
      return json({ jobs, count: count || 0 });
    }

    if (req.method === 'POST') {
      let body;
      try {
        body = await req.json();
        if (!body) {
          throw new Error('Request body is empty');
        }
      } catch (jsonError) {
        console.error('[jobs-crud] JSON parsing error:', jsonError);
        return json({ error: 'Invalid JSON in request body' }, { status: 400 });
      }
      
      const { title, customerId, status, startsAt, endsAt, address, notes, jobType, quoteId, isAssessment, requestId } = body;

      const { data, error } = await supabase
        .from('jobs')
        .insert([{
          business_id: ctx.businessId,
          owner_id: ctx.userId,
          title,
          customer_id: customerId,
          status: status || 'Scheduled',
          starts_at: startsAt,
          ends_at: endsAt,
          address,
          notes,
          job_type: jobType || 'scheduled',
          quote_id: quoteId,
          is_assessment: isAssessment || false,
          request_id: requestId
        }])
        .select()
        .single();

      if (error) {
        console.error('[jobs-crud] POST error:', error);
        throw new Error(`Failed to create job: ${error.message}`);
      }

      console.log('[jobs-crud] Job created:', data.id);
      
      // Transform to camelCase to match GET response format
      const transformedJob = {
        id: data.id,
        title: data.title,
        status: data.status,
        startsAt: data.starts_at,
        endsAt: data.ends_at,
        total: data.total,
        address: data.address,
        notes: data.notes,
        jobType: data.job_type,
        photos: data.photos,
        isClockedIn: data.is_clocked_in,
        clockInTime: data.clock_in_time,
        clockOutTime: data.clock_out_time,
        recurrence: data.recurrence,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        customerId: data.customer_id,
        quoteId: data.quote_id,
        isAssessment: data.is_assessment,
        requestId: data.request_id,
      };
      
      return json({ job: transformedJob });
    }

    if (req.method === 'PUT') {
      let body;
      try {
        body = await req.json();
        if (!body) {
          throw new Error('Request body is empty');
        }
      } catch (jsonError) {
        console.error('[jobs-crud] JSON parsing error:', jsonError);
        return json({ error: 'Invalid JSON in request body' }, { status: 400 });
      }
      
      const { id, title, status, startsAt, endsAt, address, notes, photos, isClockedIn, clockInTime, clockOutTime, isAssessment, requestId } = body;

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (status !== undefined) updateData.status = status;
      if (startsAt !== undefined) updateData.starts_at = startsAt;
      if (endsAt !== undefined) updateData.ends_at = endsAt;
      if (address !== undefined) updateData.address = address;
      if (notes !== undefined) updateData.notes = notes;
      if (photos !== undefined) updateData.photos = photos;
      if (isClockedIn !== undefined) updateData.is_clocked_in = isClockedIn;
      if (clockInTime !== undefined) updateData.clock_in_time = clockInTime;
      if (clockOutTime !== undefined) updateData.clock_out_time = clockOutTime;
      if (isAssessment !== undefined) updateData.is_assessment = isAssessment;
      if (requestId !== undefined) updateData.request_id = requestId;

      const { data, error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', id)
        .eq('business_id', ctx.businessId)
        .select()
        .single();

      if (error) {
        console.error('[jobs-crud] PUT error:', error);
        throw new Error(`Failed to update job: ${error.message}`);
      }

      console.log('[jobs-crud] Job updated:', data.id);
      return json({ job: data });
    }

    if (req.method === 'DELETE') {
      let body;
      try {
        body = await req.json();
        if (!body) {
          throw new Error('Request body is empty');
        }
      } catch (jsonError) {
        console.error('[jobs-crud] JSON parsing error:', jsonError);
        return json({ error: 'Invalid JSON in request body' }, { status: 400 });
      }
      
      const { id } = body;

      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id)
        .eq('business_id', ctx.businessId);

      if (error) {
        console.error('[jobs-crud] DELETE error:', error);
        throw new Error(`Failed to delete job: ${error.message}`);
      }

      console.log('[jobs-crud] Job deleted:', id);
      return json({ success: true });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error: any) {
    console.error('[jobs-crud] Error:', error);
    return json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
});