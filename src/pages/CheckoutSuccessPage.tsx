import { useEffect, useState } from 'react';
import { useSearchParams, Link, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { formatPrice } from '@/utils/format';
import type { Order } from '@/types';

// Stripe redirects here immediately after checkout, but the webhook that
// actually marks the order "paid" arrives asynchronously (usually within a
// second or two). Rather than trust the redirect itself, this page polls
// the order until payment_status flips — so what the customer sees always
// reflects confirmed state in the database, not an optimistic guess.
const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 20;

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [order, setOrder] = useState<Order | null>(null);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (!orderId) return;
    let active = true;

    async function poll() {
      const { data } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
      if (!active) return;
      setOrder(data as Order | null);
    }

    poll();
    const interval = setInterval(() => {
      setPollCount((c) => c + 1);
      poll();
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [orderId]);

  if (!orderId) return <Navigate to="/" replace />;

  if (order?.payment_status === 'paid') {
    return <Navigate to={`/orders/${order.id}`} state={{ justPlaced: true }} replace />;
  }

  const gaveUp = pollCount >= MAX_POLLS;

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      {gaveUp ? (
        <>
          <h1 className="font-display text-2xl mb-2">Still confirming your payment</h1>
          <p className="text-ink/60 text-sm mb-6">
            This is taking longer than expected. Your payment may still be processing —
            check your order history in a moment, or contact support with order{' '}
            {order?.order_number ?? orderId}.
          </p>
          <Link to="/orders" className="btn-primary">
            View order history
          </Link>
        </>
      ) : (
        <>
          <Spinner className="w-6 h-6 text-ink/40 mx-auto mb-4" />
          <h1 className="font-display text-2xl mb-2">Confirming your payment…</h1>
          <p className="text-ink/60 text-sm">
            {order && `Order ${order.order_number} — ${formatPrice(order.total)}`}
          </p>
        </>
      )}
    </div>
  );
}
