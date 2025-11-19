// This file documents the changes needed to supabase/functions/quotes-crud/index.ts
// Add these handler cases after the DELETE method handler:

/*
    // PATCH: Accept or decline quote (public endpoint)
    if (req.method === 'PATCH') {
      const body = await req.json();
      const { action, token, quoteId, signature } = body;

      if (!action || !token || !quoteId) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify the quote exists and token matches
      const { data: quote, error: verifyError } = await supabase
        .from('quotes')
        .select('id, public_token, customer_id, business_id')
        .eq('id', quoteId)
        .eq('public_token', token)
        .single();

      if (verifyError || !quote) {
        return new Response(
          JSON.stringify({ error: 'Invalid quote or token' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'accept') {
        // Update quote status to Approved
        const { error: updateError } = await supabase
          .from('quotes')
          .update({
            status: 'Approved',
            approved_at: new Date().toISOString(),
            approved_by: 'Customer (E-Signature)'
          })
          .eq('id', quoteId);

        if (updateError) {
          console.error('[quotes-crud] Error approving quote:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to approve quote' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // TODO: Store signature in storage bucket or sg_media table if needed
        console.log('[quotes-crud] Quote approved with signature');

        return new Response(
          JSON.stringify({ success: true, message: 'Quote approved' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } else if (action === 'decline') {
        // Update quote status to Declined
        const { error: updateError } = await supabase
          .from('quotes')
          .update({
            status: 'Declined'
          })
          .eq('id', quoteId);

        if (updateError) {
          console.error('[quotes-crud] Error declining quote:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to decline quote' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Quote declined' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
*/
