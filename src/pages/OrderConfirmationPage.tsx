import { useParams, Link, useLocation } from 'react-router-dom';
import { useOrder } from '@/hooks/useOrders';
import { Spinner } from '@/components/ui/Spinner';
import { formatPrice, formatDate } from '@/utils/format';

export function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { order, isLoading } = useOrder(orderId);
  const location = useLocation();
  const justPlaced = (location.state as { justPlaced?: boolean } | null)?.justPlaced;

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="w-6 h-6 text-ink/40" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-2xl mb-2">Order not found</h1>
        <Link to="/orders" className="text-cobalt hover:underline">View your orders</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
      {justPlaced && (
        <div className="mb-6 px-4 py-3 rounded bg-success/10 text-success text-sm font-medium">
          Your order has been placed.
        </div>
      )}
      <h1 className="font-display text-3xl mb-1">Order {order.order_number}</h1>
      <p className="text-sm text-ink/50 mb-8">Placed on {formatDate(order.placed_at)} · Status: {order.status}</p>

      <div className="card p-6 mb-6">
        <h2 className="font-medium mb-3">Items</h2>
        <ul className="space-y-2 text-sm">
          {order.order_items?.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span className="text-ink/70">{item.product_name} × {item.quantity}</span>
              <span className="font-mono">{formatPrice(item.subtotal)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-line mt-4 pt-4 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-ink/60">Subtotal</span><span className="font-mono">{formatPrice(order.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-ink/60">Tax</span><span className="font-mono">{formatPrice(order.tax)}</span></div>
          <div className="flex justify-between"><span className="text-ink/60">Shipping</span><span className="font-mono">{order.shipping_fee === 0 ? 'Free' : formatPrice(order.shipping_fee)}</span></div>
          <div className="flex justify-between font-medium text-base pt-2 border-t border-line mt-2"><span>Total</span><span className="font-mono">{formatPrice(order.total)}</span></div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-medium mb-2">Shipping to</h2>
        <p className="text-sm text-ink/70">
          {order.shipping_address.recipient_name}<br />
          {order.shipping_address.line1}{order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ''}<br />
          {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
        </p>
      </div>

      <Link to="/products" className="btn-secondary mt-8 inline-block">Continue shopping</Link>
    </div>
  );
}
