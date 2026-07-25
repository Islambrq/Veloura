import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { formatPrice } from '@/utils/format';

export function CartPage() {
  const { items, isLoading, subtotal, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="w-6 h-6 text-ink/40" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Browse the catalog and add something you'll actually use."
        action={
          <Link to="/products" className="btn-primary">
            Shop products
          </Link>
        }
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl mb-8">Your cart</h1>

      <div className="grid sm:grid-cols-3 gap-10">
        <div className="sm:col-span-2 space-y-5">
          {items.map((item) => (
            <div key={`${item.productId}-${item.variantId}`} className="flex gap-4 border-b border-line pb-5">
              <div className="w-20 h-20 rounded bg-porcelain-dim overflow-hidden shrink-0">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <Link to={`/products/${item.slug}`} className="font-medium text-sm hover:text-cobalt">
                  {item.name}
                </Link>
                <div className="text-sm text-ink/50 font-mono mt-0.5">{formatPrice(item.unitPrice)}</div>

                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center border border-line rounded">
                    <button
                      className="w-7 h-7 text-sm hover:bg-porcelain-dim"
                      onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button
                      className="w-7 h-7 text-sm hover:bg-porcelain-dim"
                      onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                      disabled={item.quantity >= item.stockQuantity}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId, item.variantId)}
                    className="text-xs text-ink/50 hover:text-danger"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="font-mono text-sm">{formatPrice(item.unitPrice * item.quantity)}</div>
            </div>
          ))}
        </div>

        <div className="card p-6 h-fit">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-ink/60">Subtotal</span>
            <span className="font-mono">{formatPrice(subtotal)}</span>
          </div>
          <p className="text-xs text-ink/40 mb-4">Tax and shipping calculated at checkout.</p>
          <button onClick={() => navigate('/checkout')} className="btn-primary w-full">
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
