import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AdminLayout } from './AdminLayout';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { formatPrice, formatDate } from '@/utils/format';
import type { Order, OrderStatus } from '@/types';

const STATUS_OPTIONS: OrderStatus[] = [
  'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded',
];

export function AdminOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*), refunds(*)')
      .eq('id', orderId)
      .single();
    setOrder(data as Order | null);
    setIsLoading(false);
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(status: OrderStatus) {
    if (!order) return;
    setIsSaving(true);
    const { error } = await supabase.from('orders').update({ status }).eq('id', order.id);
    setIsSaving(false);
    if (error) {
      showToast(`Could not update status: ${error.message}`, 'error');
    } else {
      showToast('Order status updated. The customer will be notified by email.', 'success');
      load();
    }
  }

  async function handleRefund() {
    if (!order) return;
    const remaining = order.total - (order.refunds ?? []).reduce((s, r) => s + Number(r.amount), 0);
    if (!confirm(`Refund ${formatPrice(remaining, order.currency)} to the customer via Stripe? This cannot be undone.`)) {
      return;
    }
    setIsRefunding(true);
    const { data, error } = await supabase.functions.invoke('admin-refund-order', {
      body: { order_id: order.id },
    });
    setIsRefunding(false);
    if (error || data?.error) {
      showToast(`Refund failed: ${data?.error ?? error?.message}`, 'error');
    } else {
      showToast(`Refunded ${formatPrice(data.refunded)}.`, 'success');
      load();
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-16">
          <Spinner className="w-6 h-6 text-ink/40" />
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <p className="text-sm text-ink/60">Order not found.</p>
        <Link to="/admin/orders" className="text-cobalt hover:underline text-sm">Back to orders</Link>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Link to="/admin/orders" className="text-sm text-ink/50 hover:text-cobalt">← All orders</Link>
      <h2 className="font-medium text-lg mt-2 mb-1">{order.order_number}</h2>
      <p className="text-sm text-ink/50 mb-6">
        Placed {formatDate(order.placed_at)} · Payment: {order.payment_status}
      </p>

      <div className="grid sm:grid-cols-3 gap-8">
        <div className="sm:col-span-2 space-y-6">
          <div className="card p-5">
            <h3 className="font-medium mb-3">Items</h3>
            <ul className="space-y-2 text-sm">
              {order.order_items?.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span className="text-ink/70">{item.product_name} ({item.sku}) × {item.quantity}</span>
                  <span className="font-mono">{formatPrice(item.subtotal, order.currency)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-line mt-4 pt-4 flex justify-between font-medium">
              <span>Total</span>
              <span className="font-mono">{formatPrice(order.total, order.currency)}</span>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-medium mb-2">Shipping address</h3>
            <p className="text-sm text-ink/70">
              {order.shipping_address.recipient_name}<br />
              {order.shipping_address.line1}
              {order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ''}<br />
              {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="font-medium mb-3">Status</h3>
            <select
              className="input"
              value={order.status}
              disabled={isSaving}
              onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <p className="text-xs text-ink/50 mt-2">
              Changing status logs a status history entry and (if email notifications are configured) emails the customer.
            </p>
          </div>

          <div className="card p-5">
            <h3 className="font-medium mb-3">Refunds</h3>
            {(order.refunds ?? []).length > 0 ? (
              <ul className="space-y-2 text-sm mb-4">
                {order.refunds!.map((r) => (
                  <li key={r.id} className="flex justify-between text-ink/70">
                    <span>{formatDate(r.created_at)}</span>
                    <span className="font-mono">{formatPrice(r.amount, order.currency)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink/50 mb-4">No refunds issued.</p>
            )}
            {order.payment_status === 'paid' || order.payment_status === 'partially_refunded' ? (
              <button
                onClick={handleRefund}
                disabled={isRefunding}
                className="btn-secondary w-full text-sm"
              >
                {isRefunding ? <Spinner className="w-4 h-4" /> : 'Refund remaining balance'}
              </button>
            ) : (
              <p className="text-xs text-ink/40">
                {order.payment_status === 'refunded' ? 'Fully refunded.' : 'Nothing to refund yet — order is unpaid.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
