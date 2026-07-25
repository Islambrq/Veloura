// supabase/functions/create-checkout-session/index.ts
//
// Called by the frontend right after place_order() creates a pending order.
// Builds a Stripe Checkout Session from that order's line items and returns
// the session URL for the browser to redirect to. Runs with the *caller's*
// JWT (not the service role), so RLS still applies — a user can only create
// a session for an order they actually own.
//
// Required secrets (set with `supabase secrets set`):
//   STRIPE_SECRET_KEY
//   SITE_URL   e.g. https://your-app.vercel.app or http://localhost:5173
//
// Deploy: supabase functions deploy create-checkout-session

import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    // A client scoped to the calling user — every query below is subject to
    // that user's RLS policies, so this function can never touch someone
    // else's order.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { order_id } = await req.json();
    if (!order_id) return json({ error: 'order_id is required' }, 400);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return json({ error: 'Order not found' }, 404);
    }
    if (order.payment_status === 'paid') {
      return json({ error: 'Order has already been paid' }, 400);
    }

    const { data: userData } = await supabase.auth.getUser();
    const customerEmail = order.guest_email ?? userData?.user?.email ?? undefined;

    const lineItems = order.order_items.map((item: { product_name: string; unit_price: number; quantity: number }) => ({
      price_data: {
        currency: order.currency.toLowerCase(),
        product_data: { name: item.product_name },
        unit_amount: Math.round(item.unit_price * 100),
      },
      quantity: item.quantity,
    }));

    if (order.tax > 0) {
      lineItems.push({
        price_data: {
          currency: order.currency.toLowerCase(),
          product_data: { name: 'Tax' },
          unit_amount: Math.round(order.tax * 100),
        },
        quantity: 1,
      });
    }
    if (order.shipping_fee > 0) {
      lineItems.push({
        price_data: {
          currency: order.currency.toLowerCase(),
          product_data: { name: 'Shipping' },
          unit_amount: Math.round(order.shipping_fee * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      // Discounts are applied as a one-time Stripe coupon rather than a
      // negative line item (Stripe doesn't allow negative unit_amount).
      // The discount amount itself was already computed and validated
      // server-side in place_order() — this just makes Stripe charge the
      // matching amount.
      discounts:
        order.discount > 0
          ? [
              {
                coupon: (
                  await stripe.coupons.create({
                    amount_off: Math.round(order.discount * 100),
                    currency: order.currency.toLowerCase(),
                    duration: 'once',
                    name: 'Discount',
                  })
                ).id,
              },
            ]
          : undefined,
      success_url: `${SITE_URL}/checkout/success?order_id=${order.id}`,
      cancel_url: `${SITE_URL}/checkout`,
      metadata: { order_id: order.id },
      customer_email: customerEmail,
    });

    const { error: attachError } = await supabase.rpc('attach_stripe_session', {
      p_order_id: order.id,
      p_session_id: session.id,
    });
    if (attachError) {
      return json({ error: `Could not attach session: ${attachError.message}` }, 500);
    }

    return json({ url: session.url });
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
