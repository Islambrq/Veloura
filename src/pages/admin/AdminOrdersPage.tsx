import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AdminLayout } from './AdminLayout';
import { Spinner } from '@/components/ui/Spinner';
import { formatPrice, formatDate } from '@/utils/format';
import type { Order, OrderStatus } from '@/types';

const STATUS_FILTERS: Array<OrderStatus | 'all'> = [
  'all', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded',
];

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');

  useEffect(() => {
    setIsLoading(true);
    let query = supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('placed_at', { ascending: false })
      .limit(100);

    if (filter !== 'all') query = query.eq('status', filter);

    query.then(({ data }) => {
      setOrders((data ?? []) as Order[]);
      setIsLoading(false);
    });
  }, [filter]);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-medium">Orders</h2>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs capitalize border ${
              filter === s ? 'bg-ink text-porcelain border-ink' : 'border-line hover:border-ink'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="w-6 h-6 text-ink/40" />
        </div>
      ) : (
        <div className="card divide-y divide-line">
          {orders.map((o) => (
            <Link key={o.id} to={`/admin/orders/${o.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-porcelain-dim">
              <div>
                <div className="font-medium text-sm">{o.order_number}</div>
                <div className="text-xs text-ink/50">{formatDate(o.placed_at)} · {o.order_items?.length ?? 0} item(s)</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm">{formatPrice(o.total, o.currency)}</div>
                <div className="text-xs text-ink/50 capitalize">{o.status} · {o.payment_status}</div>
              </div>
            </Link>
          ))}
          {orders.length === 0 && <div className="px-4 py-8 text-center text-sm text-ink/50">No orders match this filter.</div>}
        </div>
      )}
    </AdminLayout>
  );
}
