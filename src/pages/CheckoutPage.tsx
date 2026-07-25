import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { FormField } from '@/components/ui/FormField';
import { Spinner } from '@/components/ui/Spinner';
import { formatPrice } from '@/utils/format';
import type { Address, ShippingAddressInput } from '@/types';
import type { FieldErrors } from '@/utils/validators';
import { isValidEmail } from '@/utils/validators';

interface Totals {
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
}

export function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { user, isAnonymous } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState(user?.email ?? '');
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new');
  const [saveAddress, setSaveAddress] = useState(true);
  const [form, setForm] = useState<ShippingAddressInput>({
    recipient_name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const [totals, setTotals] = useState<Totals>({ subtotal, discount: 0, tax: 0, shipping: 0, total: subtotal });
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const currentStateCode =
    selectedAddressId !== 'new'
      ? savedAddresses.find((a) => a.id === selectedAddressId)?.state ?? ''
      : form.state;

  useEffect(() => {
    if (!user) return;
    supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .then(({ data }) => {
        setSavedAddresses((data ?? []) as Address[]);
        if (data && data.length > 0) setSelectedAddressId(data[0].id);
      });
  }, [user]);

  // Live tax/shipping preview: recomputed server-side (via the same
  // functions place_order() uses) whenever the destination state or applied
  // coupon changes, so what's shown here can never drift from what's charged.
  useEffect(() => {
    if (items.length === 0) return;
    let active = true;
    setIsPreviewLoading(true);

    const handle = setTimeout(async () => {
      const { data, error } = await supabase
        .rpc('preview_order_totals', {
          p_state_code: currentStateCode || null,
          p_coupon_code: appliedCoupon,
        })
        .single();

      // The Supabase client isn't given a generated Database schema type, so
      // PostgREST RPC responses come back as an untyped `{}` — cast to the
      // shape we know preview_order_totals() returns (see migration 015).
      const row = data as Totals | null;

      if (!active) return;
      setIsPreviewLoading(false);
      if (!error && row) {
        setTotals({
          subtotal: Number(row.subtotal),
          discount: Number(row.discount),
          tax: Number(row.tax),
          shipping: Number(row.shipping),
          total: Number(row.total),
        });
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [currentStateCode, appliedCoupon, items.length, subtotal]);

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError(null);
    const { error } = await supabase.rpc('validate_coupon', {
      p_code: couponCode.trim(),
      p_subtotal: subtotal,
    });
    setIsApplyingCoupon(false);
    if (error) {
      setCouponError(error.message.replace(/^.*?:\s*/, ''));
      setAppliedCoupon(null);
    } else {
      setAppliedCoupon(couponCode.trim());
    }
  }

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!isValidEmail(email)) next.email = 'Enter a valid email address';
    if (selectedAddressId === 'new') {
      if (!form.recipient_name.trim()) next.recipient_name = 'Required';
      if (!form.line1.trim()) next.line1 = 'Required';
      if (!form.city.trim()) next.city = 'Required';
      if (!form.state.trim()) next.state = 'Required';
      if (!form.postal_code.trim()) next.postal_code = 'Required';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handlePlaceOrder() {
    if (!user) {
      navigate('/login?next=/checkout');
      return;
    }
    if (!validate()) return;
    if (items.length === 0) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let shippingAddress: ShippingAddressInput;

      if (selectedAddressId !== 'new') {
        const addr = savedAddresses.find((a) => a.id === selectedAddressId)!;
        shippingAddress = {
          recipient_name: addr.recipient_name,
          phone: addr.phone ?? '',
          line1: addr.line1,
          line2: addr.line2 ?? '',
          city: addr.city,
          state: addr.state ?? '',
          postal_code: addr.postal_code,
          country: addr.country,
        };
      } else {
        shippingAddress = form;
        if (saveAddress && !isAnonymous) {
          await supabase.from('addresses').insert({ user_id: user.id, ...form });
        }
      }

      const { data: order, error } = await supabase.rpc('place_order', {
        p_shipping_address: shippingAddress,
        p_billing_address: shippingAddress,
        p_payment_method: 'stripe',
        p_coupon_code: appliedCoupon,
        p_email: email,
      });

      if (error) throw error;

      // Cart is cleared server-side by place_order(); reflect that locally
      // right away so the UI doesn't show stale items while we redirect.
      await clearCart();

      const { data: session, error: sessionError } = await supabase.functions.invoke(
        'create-checkout-session',
        { body: { order_id: order.id } }
      );

      if (sessionError || !session?.url) {
        throw new Error(
          sessionError?.message ?? 'Could not start checkout. Your order was saved as pending — contact support if this repeats.'
        );
      }

      window.location.href = session.url;
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-2xl mb-2">Your cart is empty</h1>
        <p className="text-ink/60">Add something to your cart before checking out.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl mb-8">Checkout</h1>

      <div className="grid sm:grid-cols-3 gap-10">
        <div className="sm:col-span-2 space-y-6">
          <div>
            <h2 className="font-medium mb-3">Contact</h2>
            <FormField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
            {isAnonymous && (
              <p className="text-xs text-ink/40 mt-1">
                We'll send your order confirmation here — you're checking out as a guest.
              </p>
            )}
          </div>

          <div>
            <h2 className="font-medium mb-3">Shipping address</h2>

            {savedAddresses.length > 0 && (
              <div className="space-y-2 mb-4">
                {savedAddresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex gap-3 p-3 border rounded cursor-pointer ${
                      selectedAddressId === addr.id ? 'border-ink' : 'border-line'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="mt-1"
                    />
                    <div className="text-sm">
                      <div className="font-medium">{addr.recipient_name}</div>
                      <div className="text-ink/60">
                        {addr.line1}, {addr.city}, {addr.state} {addr.postal_code}
                      </div>
                    </div>
                  </label>
                ))}
                <label
                  className={`flex gap-3 p-3 border rounded cursor-pointer ${
                    selectedAddressId === 'new' ? 'border-ink' : 'border-line'
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={selectedAddressId === 'new'}
                    onChange={() => setSelectedAddressId('new')}
                    className="mt-1"
                  />
                  <span className="text-sm font-medium">Use a new address</span>
                </label>
              </div>
            )}

            {selectedAddressId === 'new' && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <FormField
                    label="Full name"
                    value={form.recipient_name}
                    onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                    error={errors.recipient_name}
                  />
                </div>
                <div className="sm:col-span-2">
                  <FormField
                    label="Address line 1"
                    value={form.line1}
                    onChange={(e) => setForm({ ...form, line1: e.target.value })}
                    error={errors.line1}
                  />
                </div>
                <div className="sm:col-span-2">
                  <FormField
                    label="Address line 2 (optional)"
                    value={form.line2}
                    onChange={(e) => setForm({ ...form, line2: e.target.value })}
                  />
                </div>
                <FormField
                  label="City"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  error={errors.city}
                />
                <FormField
                  label="State (2-letter code)"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                  error={errors.state}
                  maxLength={2}
                  placeholder="CA"
                />
                <FormField
                  label="Postal code"
                  value={form.postal_code}
                  onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                  error={errors.postal_code}
                />
                <FormField
                  label="Phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                {!isAnonymous && (
                  <label className="sm:col-span-2 flex items-center gap-2 text-sm text-ink/60 mt-1">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                    />
                    Save this address to my account
                  </label>
                )}
              </div>
            )}
          </div>

          <div>
            <h2 className="font-medium mb-3">Payment</h2>
            <div className="card p-4 text-sm text-ink/60">
              You'll enter card details on Stripe's secure checkout page next.
              Nothing is charged until you complete payment there.
            </div>
          </div>

          {submitError && <p className="text-sm text-danger">{submitError}</p>}
        </div>

        <div className="card p-6 h-fit">
          <h2 className="font-medium mb-4">Order summary</h2>
          <ul className="space-y-2 mb-4 text-sm">
            {items.map((item) => (
              <li key={`${item.productId}-${item.variantId}`} className="flex justify-between">
                <span className="text-ink/70">
                  {item.name} × {item.quantity}
                </span>
                <span className="font-mono">{formatPrice(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-line pt-3 mb-3">
            <label className="label" htmlFor="coupon-code">Coupon code</label>
            <div className="flex gap-2">
              <input
                id="coupon-code"
                className="input"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="e.g. WELCOME10"
                disabled={!!appliedCoupon}
              />
              {appliedCoupon ? (
                <button
                  type="button"
                  className="btn-ghost px-3 text-sm"
                  onClick={() => {
                    setAppliedCoupon(null);
                    setCouponCode('');
                  }}
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-secondary px-3 text-sm"
                  onClick={handleApplyCoupon}
                  disabled={isApplyingCoupon}
                >
                  {isApplyingCoupon ? <Spinner className="w-4 h-4" /> : 'Apply'}
                </button>
              )}
            </div>
            {couponError && <p className="text-xs text-danger mt-1">{couponError}</p>}
            {appliedCoupon && (
              <p className="text-xs text-success mt-1">"{appliedCoupon}" applied</p>
            )}
          </div>

          <div className="border-t border-line pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-ink/60">Subtotal</span>
              <span className="font-mono">{formatPrice(totals.subtotal)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-success">
                <span>Discount</span>
                <span className="font-mono">−{formatPrice(totals.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-ink/60">Tax {currentStateCode ? `(${currentStateCode})` : ''}</span>
              <span className="font-mono">{isPreviewLoading ? '…' : formatPrice(totals.tax)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink/60">Shipping</span>
              <span className="font-mono">
                {isPreviewLoading ? '…' : totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping)}
              </span>
            </div>
            <div className="flex justify-between font-medium text-base pt-2 border-t border-line mt-2">
              <span>Total</span>
              <span className="font-mono">{isPreviewLoading ? '…' : formatPrice(totals.total)}</span>
            </div>
          </div>
          <p className="text-xs text-ink/40 mt-2">
            Enter a state to see accurate tax and shipping before you pay.
          </p>
          <button onClick={handlePlaceOrder} disabled={isSubmitting} className="btn-primary w-full mt-3">
            {isSubmitting ? <Spinner className="w-4 h-4" /> : 'Continue to payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
