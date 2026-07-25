import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminLayout } from './AdminLayout';
import { FormField } from '@/components/ui/FormField';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/utils/format';
import type { Coupon, DiscountType } from '@/types';

export function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState('10');
  const [minSubtotal, setMinSubtotal] = useState('0');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    setCoupons((data ?? []) as Coupon[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setIsSaving(true);

    const { error } = await supabase.from('coupons').insert({
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: Number(discountValue) || 0,
      min_subtotal: Number(minSubtotal) || 0,
      max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    });

    setIsSaving(false);
    if (error) {
      showToast(`Could not create coupon: ${error.message}`, 'error');
    } else {
      showToast('Coupon created.', 'success');
      setCode('');
      setDiscountValue('10');
      setMinSubtotal('0');
      setMaxRedemptions('');
      setExpiresAt('');
      load();
    }
  }

  async function toggleActive(coupon: Coupon) {
    await supabase.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id);
    load();
  }

  return (
    <AdminLayout>
      <h2 className="font-medium mb-5">Coupons</h2>

      <form onSubmit={handleCreate} className="card p-5 max-w-xl mb-8 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="WELCOME10" required />
          <div>
            <label className="label" htmlFor="discount-type">Type</label>
            <select
              id="discount-type"
              className="input"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as DiscountType)}
            >
              <option value="percentage">Percentage off</option>
              <option value="fixed_amount">Fixed amount off</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField
            label={discountType === 'percentage' ? 'Percent off' : 'Amount off'}
            type="number"
            min="0"
            step="0.01"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
          />
          <FormField label="Min. subtotal" type="number" min="0" step="0.01" value={minSubtotal} onChange={(e) => setMinSubtotal(e.target.value)} />
          <FormField label="Max redemptions (optional)" type="number" min="1" value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} />
        </div>
        <FormField label="Expires (optional)" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        <button type="submit" disabled={isSaving} className="btn-primary">
          {isSaving ? <Spinner className="w-4 h-4" /> : 'Create coupon'}
        </button>
      </form>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="w-6 h-6 text-ink/40" />
        </div>
      ) : (
        <div className="card divide-y divide-line">
          {coupons.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-mono text-sm font-medium">{c.code}</div>
                <div className="text-xs text-ink/50">
                  {c.discount_type === 'percentage' ? `${c.discount_value}% off` : `${c.discount_value} off`}
                  {c.expires_at && ` · expires ${formatDate(c.expires_at)}`}
                </div>
              </div>
              <button
                onClick={() => toggleActive(c)}
                className={`text-xs px-2 py-1 rounded-full ${
                  c.is_active ? 'bg-success/10 text-success' : 'bg-ink/10 text-ink/50'
                }`}
              >
                {c.is_active ? 'Active' : 'Disabled'}
              </button>
            </div>
          ))}
          {coupons.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-ink/50">No coupons yet.</div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
