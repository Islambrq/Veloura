import { Link } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { ProductGrid } from '@/components/product/ProductGrid';

export function HomePage() {
  const { products, isLoading } = useProducts({ sort: 'newest', pageSize: 8 });
  const { categories } = useCategories();

  return (
    <div>
      <section className="border-b border-line bg-porcelain">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid sm:grid-cols-2 gap-10 items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-ink/50 mb-4">
              New arrivals, every season
            </p>
            <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] mb-5">
              Goods worth keeping,
              <br />
              not replacing.
            </h1>
            <p className="text-ink/70 max-w-md mb-7">
              A small, considered catalog of audio, bags, home, and outdoor
              gear — chosen for materials and construction, not trend cycles.
            </p>
            <Link to="/products" className="btn-primary">
              Shop the catalog
            </Link>
          </div>
          <div className="aspect-[4/3] rounded-md overflow-hidden bg-porcelain-dim">
            <img
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200"
              alt="A considered still life of everyday carry goods"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-display text-2xl">Recently added</h2>
          <Link to="/products" className="text-sm font-medium hover:text-cobalt">
            View all →
          </Link>
        </div>
        <ProductGrid products={products} isLoading={isLoading} />
      </section>

      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 border-t border-line">
          <h2 className="font-display text-2xl mb-6">Shop by category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/products?category=${c.slug}`}
                className="card p-5 hover:border-ink transition-colors"
              >
                <div className="font-medium">{c.name}</div>
                {c.description && (
                  <div className="text-xs text-ink/50 mt-1">{c.description}</div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
