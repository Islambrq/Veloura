// supabase/functions/stripe-webhook/index.ts
//
// Stripe calls this directly (not the browser). It verifies the webhook
// signature, then — and only then — calls mark_order_paid() using the
// service_role key. This is the single source of truth for "did the
// customer actually pay"; nothing in the frontend can trigger this state.
//
// Required secrets:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SIGNING_SECRET   (from the Stripe Dashboard webhook config)
//   SUPABASE_SERVICE_ROLE_KEY       (auto-available in Supabase Edge Functions)
//
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// (--no-verify-jwt because Stripe, not a Supabase user, calls this endpoint)
//
// Then in the Stripe Dashboard: Developers > Webhooks > Add endpoint
//   URL: https://<project-ref>.functions.supabase.co/stripe-webhook
//   Events: checkout.session.completed

import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')!;

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed', err);
    return new Response('Invalid signature', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const { error } = await supabaseAdmin.rpc('mark_order_paid', {
      p_session_id: session.id,
      p_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    });

    if (error) {
      console.error('Failed to mark order paid', error);
      return new Response(`Failed to update order: ${error.message}`, { status: 500 });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
