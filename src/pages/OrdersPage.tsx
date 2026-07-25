import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/hooks/useOrders';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { formatPrice, formatDate } from '@/utils/format';

export function OrdersPage() {
  const { user } = useAuth();
  const { orders, isLoading } = useOrders(user?.id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="w-6 h-6 text-ink/40" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        description="Your order history will show up here once you place an order."
        action={<Link to="/products" className="btn-primary">Shop products</Link>}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl mb-8">Order history</h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <Link
            key={order.id}
            to={`/orders/${order.id}`}
            className="card p-5 flex items-center justify-between hover:border-ink transition-colors"
          >
            <div>
              <div className="font-medium text-sm">{order.order_number}</div>
              <div className="text-xs text-ink/50">{formatDate(order.placed_at)} · {order.order_items?.length ?? 0} item(s)</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm">{formatPrice(order.total)}</div>
              <div className="text-xs text-ink/50 capitalize">{order.status}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
