import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProduct, useRelatedProducts } from '@/hooks/useProducts';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { PriceTag } from '@/components/ui/PriceTag';
import { StarRating } from '@/components/ui/StarRating';
import { Spinner } from '@/components/ui/Spinner';
import { WishlistButton } from '@/components/product/WishlistButton';
import { ReviewForm } from '@/components/product/ReviewForm';
import { ProductGrid } from '@/components/product/ProductGrid';
import { formatDate } from '@/utils/format';
import type { ProductVariant, Review } from '@/types';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { product, isLoading } = useProduct(slug);
  const { products: relatedProducts, isLoading: relatedLoading } = useRelatedProducts(
    product?.category_id,
    product?.id
  );
  const { addItem } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);

  async function reloadReviews(productId: string) {
    const { data } = await supabase
      .from('reviews')
      .select('*, profiles(full_name)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    setReviews((data ?? []) as Review[]);
  }

  useEffect(() => {
    if (!product) return;
    if (product.product_variants && product.product_variants.length > 0) {
      setSelectedVariant(product.product_variants[0]);
    }
    reloadReviews(product.id);
  }, [product]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="w-6 h-6 text-ink/40" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-2xl mb-2">Product not found</h1>
        <Link to="/products" className="text-cobalt hover:underline">
          Back to shop
        </Link>
      </div>
    );
  }

  const images = product.product_images ?? [];
  const stock = selectedVariant ? selectedVariant.stock_quantity : product.stock_quantity;
  const effectivePrice = product.price + (selectedVariant?.price_offset ?? 0);

  async function handleAddToCart() {
    setIsAdding(true);
    try {
      await addItem(product!, selectedVariant, quantity);
      showToast(`Added ${quantity} × ${product!.name} to your cart`, 'success');
    } catch {
      showToast('Could not add item to cart. Please try again.', 'error');
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="grid sm:grid-cols-2 gap-10">
        <div>
          <div className="aspect-square rounded-md overflow-hidden bg-porcelain-dim mb-3">
            {images[activeImage] ? (
              <img
                src={images[activeImage].url}
                alt={images[activeImage].alt_text ?? product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-ink/30">No image</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 rounded overflow-hidden border-2 ${
                    i === activeImage ? 'border-ink' : 'border-transparent'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.categories && (
            <Link
              to={`/products?category=${product.categories.slug}`}
              className="text-xs font-mono uppercase tracking-wide text-ink/50 hover:text-cobalt"
            >
              {product.categories.name}
            </Link>
          )}
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-3xl mt-1 mb-2">{product.name}</h1>
            <WishlistButton productId={product.id} />
          </div>

          {product.review_count > 0 && (
            <div className="mb-4">
              <StarRating rating={product.avg_rating} reviewCount={product.review_count} />
            </div>
          )}

          <div className="mb-5">
            <PriceTag price={effectivePrice} compareAtPrice={product.compare_at_price} currency={product.currency} />
          </div>

          <p className="text-ink/70 leading-relaxed mb-6">{product.description}</p>

          {product.product_variants && product.product_variants.length > 0 && (
            <div className="mb-5">
              <label className="label">Variant</label>
              <div className="flex flex-wrap gap-2">
                {product.product_variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    disabled={v.stock_quantity <= 0}
                    className={`px-3 py-1.5 rounded border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      selectedVariant?.id === v.id ? 'bg-ink text-porcelain border-ink' : 'border-line hover:border-ink'
                    }`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center border border-line rounded">
              <button
                className="w-9 h-9 hover:bg-porcelain-dim"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-10 text-center text-sm">{quantity}</span>
              <button
                className="w-9 h-9 hover:bg-porcelain-dim"
                onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
                aria-label="Increase quantity"
                disabled={quantity >= stock}
              >
                +
              </button>
            </div>
            <span className="text-sm text-ink/50">
              {stock > 0 ? `${stock} in stock` : 'Out of stock'}
            </span>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={stock <= 0 || isAdding}
            className="btn-primary w-full sm:w-auto px-8"
          >
            {isAdding ? <Spinner className="w-4 h-4" /> : stock <= 0 ? 'Out of stock' : 'Add to cart'}
          </button>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-16 border-t border-line pt-10">
          <h2 className="font-display text-2xl mb-6">You might also like</h2>
          <ProductGrid products={relatedProducts} isLoading={relatedLoading} />
        </section>
      )}

      <section className="mt-16 border-t border-line pt-10 max-w-2xl">
        <h2 className="font-display text-2xl mb-6">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-ink/50 text-sm mb-8">No reviews yet.</p>
        ) : (
          <ul className="space-y-6 mb-8">
            {reviews.map((r) => (
              <li key={r.id} className="border-b border-line pb-5">
                <div className="flex items-center gap-2 mb-1">
                  <StarRating rating={r.rating} />
                  <span className="text-sm font-medium">{r.profiles?.full_name ?? 'Verified buyer'}</span>
                  {r.is_verified_purchase && (
                    <span className="text-xs text-success font-medium">Verified purchase</span>
                  )}
                </div>
                {r.title && <div className="font-medium text-sm mb-1">{r.title}</div>}
                {r.body && <p className="text-sm text-ink/70">{r.body}</p>}
                <div className="text-xs text-ink/40 mt-1">{formatDate(r.created_at)}</div>
              </li>
            ))}
          </ul>
        )}
        {user ? (
          <ReviewForm
            productId={product.id}
            userId={user.id}
            existingReview={reviews.find((r) => r.user_id === user.id) ?? null}
            onSaved={() => reloadReviews(product.id)}
          />
        ) : (
          <p className="text-sm text-ink/50">
            <Link to="/login" className="text-cobalt hover:underline">
              Sign in
            </Link>{' '}
            to leave a review.
          </p>
        )}
      </section>
    </div>
  );
}
