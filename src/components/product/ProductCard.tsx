import { Link } from 'react-router-dom';
import type { Product } from '@/types';
import { PriceTag } from '@/components/ui/PriceTag';
import { StarRating } from '@/components/ui/StarRating';
import { WishlistButton } from './WishlistButton';

export function ProductCard({ product }: { product: Product }) {
  const image = product.product_images?.[0]?.url;
  const outOfStock = product.stock_quantity <= 0;

  return (
    <Link to={`/products/${product.slug}`} className="group block">
      <div className="aspect-square bg-porcelain-dim rounded-md overflow-hidden mb-3 relative">
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
        {outOfStock && (
          <span className="absolute top-2 left-2 bg-ink text-porcelain text-[11px] font-medium px-2 py-1 rounded-sm">
            Out of stock
          </span>
        )}
      </div>
      <h3 className="font-medium text-sm leading-snug mb-1 group-hover:text-cobalt transition-colors">
        {product.name}
      </h3>
      {product.review_count > 0 && (
        <div className="mb-1.5">
          <StarRating rating={product.avg_rating} reviewCount={product.review_count} />
        </div>
      )}
      <PriceTag price={product.price} compareAtPrice={product.compare_at_price} currency={product.currency} size="sm" />
    </Link>
  );
}
