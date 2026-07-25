import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AdminLayout } from './AdminLayout';
import { Spinner } from '@/components/ui/Spinner';
import { formatPrice } from '@/utils/format';

interface Stats {
  totalRevenue: number;
  orderCount: number;
  pendingOrderCount: number;
  productCount: number;
  lowStockCount: number;
}

const LOW_STOCK_THRESHOLD = 10;

export function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const [paidOrders, pending, products, lowStock] = await Promise.all([
        supabase.from('orders').select('total', { count: 'exact' }).eq('payment_status', 'paid'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .lte('stock_quantity', LOW_STOCK_THRESHOLD),
      ]);

      const totalRevenue = (paidOrders.data ?? []).reduce((sum, o) => sum + Number(o.total), 0);

      setStats({
        totalRevenue,
        orderCount: paidOrders.count ?? 0,
        pendingOrderCount: pending.count ?? 0,
        productCount: products.count ?? 0,
        lowStockCount: lowStock.count ?? 0,
      });
    })();
  }, []);

  return (
    <AdminLayout>
      {!stats ? (
        <div className="flex justify-center py-16">
          <Spinner className="w-6 h-6 text-ink/40" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Revenue (paid orders)" value={formatPrice(stats.totalRevenue)} />
          <StatCard label="Paid orders" value={stats.orderCount.toString()} />
          <StatCard
            label="Pending orders"
            value={stats.pendingOrderCount.toString()}
            action={<Link to="/admin/orders" className="text-cobalt text-xs hover:underline">Review →</Link>}
          />
          <StatCard label="Active products" value={stats.productCount.toString()} />
          <StatCard
            label={`Low stock (≤ ${LOW_STOCK_THRESHOLD})`}
            value={stats.lowStockCount.toString()}
            action={<Link to="/admin/products" className="text-cobalt text-xs hover:underline">Review →</Link>}
          />
        </div>
      )}
    </AdminLayout>
  );
}

function StatCard({ label, value, action }: { label: string; value: string; action?: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wide text-ink/50 mb-1">{label}</div>
      <div className="font-display text-2xl mb-1">{value}</div>
      {action}
    </div>
  );
}
