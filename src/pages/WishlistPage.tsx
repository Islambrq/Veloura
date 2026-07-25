import { Link } from 'react-router-dom';
import { useWishlist } from '@/contexts/WishlistContext';
import { ProductGrid } from '@/components/product/ProductGrid';
import { EmptyState } from '@/components/ui/EmptyState';

export function WishlistPage() {
  const { products, isLoading } = useWishlist();

  if (!isLoading && products.length === 0) {
    return (
      <EmptyState
        title="Your wishlist is empty"
        description="Save products you're considering and they'll show up here."
        action={<Link to="/products" className="btn-primary">Browse products</Link>}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl mb-8">Your wishlist</h1>
      <ProductGrid products={products} isLoading={isLoading} />
    </div>
  );
}
