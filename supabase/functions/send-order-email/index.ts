// supabase/functions/send-order-email/index.ts
//
// Invoked by the pg_net trigger in migration 010 (notify_order_status_change)
// whenever a row is inserted into order_status_history — i.e. on every order
// status transition (placed, paid, processing, shipped, delivered, ...).
//
// Sends via Resend (https://resend.com) purely because its REST API is a
// single fetch call with no SDK/dependency weight; swap sendEmail() below
// for SES/Postmark/SendGrid if you prefer.
//
// Required secrets:
//   RESEND_API_KEY
//   EMAIL_FROM                e.g. "Fernweh <orders@yourdomain.com>"
//   EDGE_FUNCTION_SECRET       must match app_config.edge_function_secret
//   SUPABASE_SERVICE_ROLE_KEY  (auto-available)
//
// Deploy: supabase functions deploy send-order-email --no-verify-jwt
// (--no-verify-jwt because Postgres/pg_net calls this, not a logged-in user;
// the shared-secret check below is what actually authorizes the request)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const EDGE_FUNCTION_SECRET = Deno.env.get('EDGE_FUNCTION_SECRET') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'orders@example.com';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const STATUS_COPY: Record<string, { subject: string; body: string }> = {
  pending: {
    subject: 'We received your order',
    body: "We've got your order and it's being reserved for you now.",
  },
  paid: {
    subject: 'Payment confirmed',
    body: 'Your payment went through — we\'re getting your order ready.',
  },
  processing: {
    subject: 'Your order is being prepared',
    body: 'Your order is in the queue to be packed and shipped.',
  },
  shipped: {
    subject: 'Your order has shipped',
    body: "It's on its way. You'll receive delivery updates from the carrier directly.",
  },
  delivered: {
    subject: 'Your order was delivered',
    body: 'Your order has been marked delivered. We hope you love it.',
  },
  cancelled: {
    subject: 'Your order was cancelled',
    body: "This order has been cancelled and any reserved stock has been released. If you didn't expect this, reply and let us know.",
  },
  refunded: {
    subject: 'Your order was refunded',
    body: 'A refund for this order has been processed.',
  },
};

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (authHeader !== `Bearer ${EDGE_FUNCTION_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { order_id, status } = await req.json();

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('order_number, user_id, total, currency, guest_email')
      .eq('id', order_id)
      .single();

    if (error || !order) {
      return new Response('Order not found', { status: 404 });
    }

    const { data: userResult } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
    // Anonymous (guest) users have no email on auth.users, so fall back to
    // the email captured explicitly at checkout (orders.guest_email).
    const email = userResult?.user?.email ?? order.guest_email;
    if (!email) {
      return new Response('User has no email on file', { status: 200 });
    }

    const copy = STATUS_COPY[status] ?? {
      subject: 'Your order status changed',
      body: `Your order status is now: ${status}`,
    };

    if (!RESEND_API_KEY) {
      // Notifications are configured (app_config points here) but no email
      // provider key is set yet — log instead of failing the trigger chain.
      console.log(`[send-order-email] (no RESEND_API_KEY) would email ${email}: ${copy.subject}`);
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: email,
        subject: `${copy.subject} — Order ${order.order_number}`,
        html: `<p>${copy.body}</p><p>Order ${order.order_number} — total ${order.total} ${order.currency}.</p>`,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Resend send failed', text);
      return new Response(`Email provider error: ${text}`, { status: 502 });
    }

    return new Response(JSON.stringify({ sent: true }), { status: 200 });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : 'Unknown error', { status: 500 });
  }
});
