import { Link } from 'react-router-dom';
import type { Product } from '@/types';
import { PriceTag } from '@/components/ui/PriceTag';
import { StarRating } from '@/components/ui/StarRating';
import { WishlistButton } from './WishlistButton';

export function ProductCard({ product }: { product: Product }) {
  const image = product.product_images?.[0]?.url;
  const outOfStock = product.stock_quantity <= 0;
  const onSale = !!product.compare_at_price && product.compare_at_price > product.price;
  const discountPct = onSale
    ? Math.round((1 - product.price / product.compare_at_price!) * 100)
    : 0;
  const isNew =
    !onSale && Date.now() - new Date(product.created_at).getTime() < 1000 * 60 * 60 * 24 * 14;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group block rounded-xl overflow-hidden bg-white border border-line shadow-card hover:shadow-pop transition-shadow duration-200"
    >
      <div className="aspect-square bg-porcelain-dim overflow-hidden relative">
        <WishlistButton productId={product.id} size="sm" className="absolute top-2 right-2 z-10" />
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink/30 text-sm">
            No image
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {onSale && <span className="badge-discount">-{discountPct}%</span>}
          {isNew && <span className="badge-new">New</span>}
        </div>
        {outOfStock && (
          <span className="badge-out absolute bottom-2 left-2">Out of stock</span>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="font-medium text-sm leading-snug mb-1 line-clamp-2 group-hover:text-cobalt transition-colors">
          {product.name}
        </h3>
        {product.review_count > 0 && (
          <div className="mb-1.5">
            <StarRating rating={product.avg_rating} reviewCount={product.review_count} />
          </div>
        )}
        <PriceTag price={product.price} compareAtPrice={product.compare_at_price} currency={product.currency} size="sm" />
      </div>
    </Link>
  );
}
