import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  // Step 1: Add function accessibility test with comprehensive logging
  console.log(`[customers-crud] ===== Function Entry =====`);
  console.log(`[customers-crud] ${req.method} request to ${req.url}`);
  console.log(`[customers-crud] Function is accessible and responding!`);

  if (req.method === 'OPTIONS') {
    console.log('[customers-crud] Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Step 2: Authentication context validation with detailed logging
    console.log('[customers-crud] Starting authentication context resolution...');
    const ctx = await requireCtx(req);
    console.log('[customers-crud] Raw context resolved:', JSON.stringify(ctx, null, 2));
    
    // Validate authentication context
    if (!ctx.userId || !ctx.businessId) {
      console.error('[customers-crud] Authentication context validation failed:', {
        hasUserId: !!ctx.userId,
        hasBusinessId: !!ctx.businessId,
        userId: ctx.userId,
        businessId: ctx.businessId
      });
      return json(
        { error: 'Authentication required: Missing user or business context' },
        { status: 401 }
      );
    }
    
    console.log('[customers-crud] Authentication validated successfully:', {
      userId: ctx.userId,
      businessId: ctx.businessId
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      // Check if user can access customer contact information
      const { data: userRole } = await supabase
        .rpc('user_business_role', { p_business_id: ctx.businessId });
      
      const canAccessContactInfo = userRole === 'owner';
      
      const { data, error, count } = await supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('business_id', ctx.businessId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[customers-crud] GET error:', error);
        throw new Error(`Failed to fetch customers: ${error.message}`);
      }

      // Filter out contact information for workers
      const customers = data?.map(customer => ({
        id: customer.id,
        businessId: customer.business_id,
        ownerId: customer.owner_id,
        name: customer.name,
        email: canAccessContactInfo ? customer.email : null,
        phone: canAccessContactInfo ? customer.phone : null,
        address: customer.address,
        notes: customer.notes,
        createdAt: customer.created_at,
        updatedAt: customer.updated_at,
      })) || [];

      console.log('[customers-crud] Fetched', customers.length, 'customers, contact info access:', canAccessContactInfo);
      return json({ customers, count: count || 0 });
    }

    if (req.method === 'POST') {
      console.log('[customers-crud] Processing POST request for customer creation');
      
      // Step 3: Enhanced request body validation
      let body;
      try {
        const rawBody = await req.text();
        console.log('[customers-crud] Raw request body length:', rawBody.length);
        console.log('[customers-crud] Raw request body:', rawBody);
        
        if (!rawBody || rawBody.trim() === '') {
          console.error('[customers-crud] Empty request body received');
          return json({ error: 'Request body is required' }, { status: 400 });
        }
        
        body = JSON.parse(rawBody);
        console.log('[customers-crud] Parsed request body:', JSON.stringify(body, null, 2));
      } catch (jsonError) {
        console.error('[customers-crud] JSON parsing error:', jsonError);
        return json({ error: 'Invalid JSON in request body' }, { status: 400 });
      }
      
      const { name, email, phone, address, notes } = body;
      console.log('[customers-crud] Extracted fields:', { name, email, phone, address, notes });
      
      // Validate required fields
      if (!name || typeof name !== 'string' || name.trim() === '') {
        console.error('[customers-crud] Validation failed: name is required');
        return json({ error: 'Customer name is required and must be a non-empty string' }, { status: 400 });
      }
      
      if (!email || typeof email !== 'string' || email.trim() === '') {
        console.error('[customers-crud] Validation failed: email is required');
        return json({ error: 'Customer email is required and must be a non-empty string' }, { status: 400 });
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        console.error('[customers-crud] Validation failed: invalid email format');
        return json({ error: 'Customer email must be a valid email address' }, { status: 400 });
      }
      
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();
      
      console.log('[customers-crud] Validation passed, creating customer with:', {
        name: trimmedName,
        email: trimmedEmail,
        phone: phone || null,
        address: address || null,
        notes: notes || null
      });

      // Step 4: Enhanced database operation with specific error handling
      try {
        const { data, error } = await supabase
          .from('customers')
          .insert([{
            business_id: ctx.businessId,
            owner_id: ctx.userId,
            name: trimmedName,
            email: trimmedEmail,
            phone: phone || null,
            address: address || null,
            notes: notes || null
          }])
          .select()
          .single();

        if (error) {
          console.error('[customers-crud] Database error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          
          // Handle specific database constraints
          if (error.code === '23505') { // Unique constraint violation
            return json({ error: 'A customer with this email already exists' }, { status: 409 });
          }
          if (error.code === '23502') { // Not null constraint violation
            return json({ error: 'Missing required customer information' }, { status: 400 });
          }
          if (error.code === '23503') { // Foreign key constraint violation
            return json({ error: 'Invalid business context' }, { status: 400 });
          }
          
          throw new Error(`Database error: ${error.message}`);
        }

        if (!data) {
          console.error('[customers-crud] No data returned from insert operation');
          return json({ error: 'Failed to create customer - no data returned' }, { status: 500 });
        }

        console.log('[customers-crud] Database insert successful:', {
          customerId: data.id,
          customerName: data.name,
          customerEmail: data.email
        });

        const transformedCustomer = {
          id: data.id,
          businessId: data.business_id,
          ownerId: data.owner_id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          notes: data.notes,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        console.log('[customers-crud] Customer created successfully:', data.id);
        return json({ customer: transformedCustomer });
        
      } catch (dbError: any) {
        console.error('[customers-crud] Database operation failed:', dbError);
        return json(
          { error: `Failed to create customer: ${dbError.message}` },
          { status: 500 }
        );
      }
    }

    if (req.method === 'PUT') {
      console.log('[customers-crud] Processing PUT request for customer update');
      
      let body;
      try {
        const rawBody = await req.text();
        console.log('[customers-crud] PUT raw body:', rawBody);
        
        if (!rawBody || rawBody.trim() === '') {
          return json({ error: 'Request body is required for update' }, { status: 400 });
        }
        
        body = JSON.parse(rawBody);
        console.log('[customers-crud] PUT parsed body:', JSON.stringify(body, null, 2));
      } catch (jsonError) {
        console.error('[customers-crud] PUT JSON parsing error:', jsonError);
        return json({ error: 'Invalid JSON in request body' }, { status: 400 });
      }
      
      const { id, name, email, phone, address, notes } = body;
      
      if (!id) {
        console.error('[customers-crud] PUT validation failed: id is required');
        return json({ error: 'Customer ID is required for update' }, { status: 400 });
      }
      
      if (!name || typeof name !== 'string' || name.trim() === '') {
        console.error('[customers-crud] PUT validation failed: name is required');
        return json({ error: 'Customer name is required and must be a non-empty string' }, { status: 400 });
      }
      
      if (!email || typeof email !== 'string' || email.trim() === '') {
        console.error('[customers-crud] PUT validation failed: email is required');
        return json({ error: 'Customer email is required and must be a non-empty string' }, { status: 400 });
      }

      try {
        const { data, error } = await supabase
          .from('customers')
          .update({ 
            name: name.trim(), 
            email: email.trim(), 
            phone: phone || null, 
            address: address || null, 
            notes: notes || null 
          })
          .eq('id', id)
          .eq('business_id', ctx.businessId)
          .select()
          .single();

        if (error) {
          console.error('[customers-crud] PUT database error:', {
            code: error.code,
            message: error.message,
            details: error.details
          });
          
          if (error.code === '23505') {
            return json({ error: 'A customer with this email already exists' }, { status: 409 });
          }
          
          return json({ error: `Failed to update customer: ${error.message}` }, { status: 500 });
        }

        if (!data) {
          console.log('[customers-crud] PUT: No customer found with ID:', id);
          return json({ error: 'Customer not found or access denied' }, { status: 404 });
        }

        const transformedCustomer = {
          id: data.id,
          businessId: data.business_id,
          ownerId: data.owner_id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          notes: data.notes,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        console.log('[customers-crud] Customer updated successfully:', data.id);
        return json({ customer: transformedCustomer });
        
      } catch (dbError: any) {
        console.error('[customers-crud] PUT database operation failed:', dbError);
        return json({ error: `Failed to update customer: ${dbError.message}` }, { status: 500 });
      }
    }

    if (req.method === 'DELETE') {
      console.log('[customers-crud] Processing DELETE request for customer removal');
      
      let body;
      try {
        const rawBody = await req.text();
        console.log('[customers-crud] DELETE raw body:', rawBody);
        
        if (!rawBody || rawBody.trim() === '') {
          return json({ error: 'Request body with customer ID is required for deletion' }, { status: 400 });
        }
        
        body = JSON.parse(rawBody);
        console.log('[customers-crud] DELETE parsed body:', JSON.stringify(body, null, 2));
      } catch (jsonError) {
        console.error('[customers-crud] DELETE JSON parsing error:', jsonError);
        return json({ error: 'Invalid JSON in request body' }, { status: 400 });
      }
      
      const { id } = body;
      
      if (!id) {
        console.error('[customers-crud] DELETE validation failed: id is required');
        return json({ error: 'Customer ID is required for deletion' }, { status: 400 });
      }

      try {
        const { error } = await supabase
          .from('customers')
          .delete()
          .eq('id', id)
          .eq('business_id', ctx.businessId);

        if (error) {
          console.error('[customers-crud] DELETE database error:', {
            code: error.code,
            message: error.message,
            details: error.details
          });
          
          return json({ error: `Failed to delete customer: ${error.message}` }, { status: 500 });
        }

        console.log('[customers-crud] Customer deleted successfully:', id);
        return json({ success: true });
        
      } catch (dbError: any) {
        console.error('[customers-crud] DELETE database operation failed:', dbError);
        return json({ error: `Failed to delete customer: ${dbError.message}` }, { status: 500 });
      }
    }

    return json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error: any) {
    console.error('[customers-crud] Error:', error);
    return json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
});