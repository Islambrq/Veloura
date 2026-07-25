// supabase/functions/admin-refund-order/index.ts
//
// Called from the admin order detail page. Runs with the CALLING ADMIN'S
// JWT (not service_role) — is_admin() and the refunds/orders RLS policies
// from migrations 006/012 are what actually authorize this, so a non-admin
// token gets rejected by Postgres itself even if this function had a bug.
//
// Body: { order_id: string, amount?: number, reason?: string }
//   amount omitted => refund the full remaining (unrefunded) balance.
//
// Required secrets:
//   STRIPE_SECRET_KEY
//
// Deploy: supabase functions deploy admin-refund-order

import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) return json({ error: 'Admin access required' }, 403);

    const { order_id, amount, reason } = await req.json();
    if (!order_id) return json({ error: 'order_id is required' }, 400);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, refunds(amount)')
      .eq('id', order_id)
      .single();

    if (orderError || !order) return json({ error: 'Order not found' }, 404);
    if (!order.stripe_payment_intent_id) {
      return json({ error: 'This order has no associated Stripe payment to refund' }, 400);
    }

    const alreadyRefunded = (order.refunds ?? []).reduce(
      (sum: number, r: { amount: number }) => sum + Number(r.amount),
      0
    );
    const remaining = Number(order.total) - alreadyRefunded;
    const refundAmount = amount ? Math.min(amount, remaining) : remaining;

    if (refundAmount <= 0) {
      return json({ error: 'This order has already been fully refunded' }, 400);
    }

    const stripeRefund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      amount: Math.round(refundAmount * 100),
      reason: 'requested_by_customer',
    });

    // RLS (refunds_admin_all, from migration 012) permits this insert
    // because the caller is an admin; the guard_refund_amount /
    // apply_refund_status triggers handle validation and syncing
    // orders.payment_status.
    const { error: insertError } = await supabase.from('refunds').insert({
      order_id,
      stripe_refund_id: stripeRefund.id,
      amount: refundAmount,
      reason: reason ?? null,
    });

    if (insertError) {
      // The Stripe refund already succeeded at this point — surface this
      // clearly rather than silently losing track of it.
      return json(
        {
          error: `Refund succeeded on Stripe (${stripeRefund.id}) but failed to record locally: ${insertError.message}. Reconcile manually.`,
        },
        500
      );
    }

    return json({ refunded: refundAmount, stripe_refund_id: stripeRefund.id });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
