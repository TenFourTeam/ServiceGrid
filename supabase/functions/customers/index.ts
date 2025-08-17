import { corsHeaders, requireCtx, json } from '../_lib/auth.ts';
import { z } from 'https://deno.land/x/zod@v3.20.2/mod.ts';

const CustomerCreateSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

const CustomerUpdateSchema = z.object({
  id: z.string().uuid('Valid customer ID is required'),
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[customers] ${req.method} request received`);
    
    // Get authenticated context
    const ctx = await requireCtx(req);
    console.log(`[customers] Context resolved: userId=${ctx.userId}, businessId=${ctx.businessId}`);

    // Handle different HTTP methods
    switch (req.method) {
      case 'POST':
        return await handleCreateCustomer(req, ctx);
      case 'PUT':
        return await handleUpdateCustomer(req, ctx);
      case 'DELETE':
        return await handleDeleteCustomer(req, ctx);
      default:
        return json({ error: 'Method not allowed' }, { status: 405 });
    }

  } catch (error) {
    console.error('[customers] Unexpected error:', error);
    
    // If error is already a Response (from requireCtx), return it
    if (error instanceof Response) {
      return error;
    }
    
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});

async function handleCreateCustomer(req: Request, ctx: any) {
  try {
    const body = await req.text();
    console.log('[customers] Create request body:', body);
    
    const parsedBody = JSON.parse(body);
    const input = CustomerCreateSchema.parse(parsedBody);
    
    console.log('[customers] Validated create input:', { 
      hasName: !!input.name, 
      hasEmail: !!input.email, 
      hasPhone: !!input.phone,
      hasAddress: !!input.address
    });

    // Create customer in database using service role (bypasses RLS)
    const { data: customer, error: createError } = await ctx.supaAdmin
      .from('customers')
      .insert({
        business_id: ctx.businessId,
        owner_id: ctx.userId,
        name: input.name.trim(),
        email: input.email.trim(),
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
      })
      .select('id, name, email, phone, address, created_at')
      .single();

    if (createError) {
      console.error('[customers] Database create failed:', createError);
      return json({ 
        error: 'Failed to create customer',
        details: createError.message 
      }, { status: 500 });
    }

    console.log('[customers] Customer created successfully:', customer?.id);

    return json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        createdAt: customer.created_at,
      }
    });

  } catch (parseError) {
    console.error('[customers] Create parsing/validation failed:', parseError);
    return json({ 
      error: 'Invalid request data', 
      details: parseError.message 
    }, { status: 400 });
  }
}

async function handleUpdateCustomer(req: Request, ctx: any) {
  try {
    const body = await req.text();
    console.log('[customers] Update request body:', body);
    
    const parsedBody = JSON.parse(body);
    const input = CustomerUpdateSchema.parse(parsedBody);
    
    console.log('[customers] Validated update input:', { 
      customerId: input.id,
      hasName: !!input.name, 
      hasEmail: !!input.email, 
      hasPhone: !!input.phone,
      hasAddress: !!input.address
    });

    // Update customer in database using service role (bypasses RLS)
    const { data: customer, error: updateError } = await ctx.supaAdmin
      .from('customers')
      .update({
        name: input.name.trim(),
        email: input.email.trim(),
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id)
      .eq('business_id', ctx.businessId) // Ensure user can only update their business customers
      .select('id, name, email, phone, address, updated_at')
      .single();

    if (updateError) {
      console.error('[customers] Database update failed:', updateError);
      return json({ 
        error: 'Failed to update customer',
        details: updateError.message 
      }, { status: 500 });
    }

    if (!customer) {
      return json({ 
        error: 'Customer not found or access denied' 
      }, { status: 404 });
    }

    console.log('[customers] Customer updated successfully:', customer.id);

    return json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        updatedAt: customer.updated_at,
      }
    });

  } catch (parseError) {
    console.error('[customers] Update parsing/validation failed:', parseError);
    return json({ 
      error: 'Invalid request data', 
      details: parseError.message 
    }, { status: 400 });
  }
}

async function handleDeleteCustomer(req: Request, ctx: any) {
  try {
    const url = new URL(req.url);
    const customerId = url.searchParams.get('id');
    
    if (!customerId) {
      return json({ error: 'Customer ID is required' }, { status: 400 });
    }

    console.log('[customers] Deleting customer:', customerId);

    // Delete customer from database using service role (bypasses RLS)
    const { error: deleteError } = await ctx.supaAdmin
      .from('customers')
      .delete()
      .eq('id', customerId)
      .eq('business_id', ctx.businessId); // Ensure user can only delete their business customers

    if (deleteError) {
      console.error('[customers] Database delete failed:', deleteError);
      return json({ 
        error: 'Failed to delete customer',
        details: deleteError.message 
      }, { status: 500 });
    }

    console.log('[customers] Customer deleted successfully:', customerId);

    return json({
      success: true,
      message: 'Customer deleted successfully'
    });

  } catch (error) {
    console.error('[customers] Delete operation failed:', error);
    return json({ 
      error: 'Failed to delete customer' 
    }, { status: 500 });
  }
}