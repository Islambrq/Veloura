import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import { supabase } from '@/lib/supabase';
import { AdminLayout } from './AdminLayout';
import { Spinner } from '@/components/ui/Spinner';
import { formatPrice } from '@/utils/format';

interface RevenueDay {
  day: string;
  revenue: number;
  order_count: number;
}

interface TopProduct {
  product_id: string;
  product_name: string;
  units_sold: number;
  revenue: number;
}

const RANGE_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

export function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [revenue, setRevenue] = useState<RevenueDay[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    Promise.all([
      supabase.rpc('admin_revenue_by_day', { p_days: days }),
      supabase.rpc('admin_top_products', { p_days: days, p_limit: 8 }),
    ]).then(([revenueRes, topRes]) => {
      if (revenueRes.error || topRes.error) {
        setError(revenueRes.error?.message ?? topRes.error?.message ?? 'Could not load analytics');
      } else {
        setRevenue((revenueRes.data ?? []) as RevenueDay[]);
        setTopProducts((topRes.data ?? []) as TopProduct[]);
      }
      setIsLoading(false);
    });
  }, [days]);

  const totalRevenue = revenue.reduce((sum, d) => sum + Number(d.revenue), 0);
  const totalOrders = revenue.reduce((sum, d) => sum + d.order_count, 0);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-medium">Analytics</h2>
        <div className="flex gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs border ${
                days === opt.value ? 'bg-ink text-porcelain border-ink' : 'border-line hover:border-ink'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="w-6 h-6 text-ink/40" />
        </div>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : (
        <div className="space-y-8">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card p-5">
              <div className="text-xs uppercase tracking-wide text-ink/50 mb-1">Revenue, last {days} days</div>
              <div className="font-display text-2xl">{formatPrice(totalRevenue)}</div>
            </div>
            <div className="card p-5">
              <div className="text-xs uppercase tracking-wide text-ink/50 mb-1">Paid orders, last {days} days</div>
              <div className="font-display text-2xl">{totalOrders}</div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-medium mb-4">Revenue over time</h3>
            {revenue.length === 0 ? (
              <p className="text-sm text-ink/50">No paid orders in this range yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={revenue}>
                  <CartesianGrid stroke="#D9D4C7" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatPrice(v)} width={70} />
                  <Tooltip formatter={(value: number) => formatPrice(value)} />
                  <Line type="monotone" dataKey="revenue" stroke="#2C5CE0" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-medium mb-4">Top products by revenue</h3>
            {topProducts.length === 0 ? (
              <p className="text-sm text-ink/50">No sales in this range yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(240, topProducts.length * 40)}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid stroke="#D9D4C7" strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatPrice(v)} />
                  <YAxis dataKey="product_name" type="category" width={160} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => formatPrice(value)} />
                  <Bar dataKey="revenue" fill="#B8935B" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
