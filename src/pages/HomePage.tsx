import { Link } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { ProductGrid } from '@/components/product/ProductGrid';

export function HomePage() {
  const { products: newArrivals, isLoading: loadingNew } = useProducts({ sort: 'newest', pageSize: 8 });
  const { products: topRated, isLoading: loadingTop } = useProducts({ sort: 'rating', pageSize: 8 });
  const { categories } = useCategories();

  return (
    <div>
      <section className="border-b border-line bg-porcelain">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-24 grid sm:grid-cols-2 gap-6 sm:gap-10 items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-ink/50 mb-3 sm:mb-4">
              New arrivals, every season
            </p>
            <h1 className="font-display text-3xl sm:text-5xl leading-[1.05] mb-4 sm:mb-5">
              Goods worth keeping,
              <br />
              not replacing.
            </h1>
            <p className="text-ink/70 max-w-md mb-5 sm:mb-7 text-sm sm:text-base">
              A small, considered catalog of audio, bags, home, and outdoor
              gear — chosen for materials and construction, not trend cycles.
            </p>
            <Link to="/products" className="btn-primary rounded-full px-6">
              Shop the catalog
            </Link>
          </div>
          <div className="aspect-[16/10] sm:aspect-[4/3] rounded-2xl overflow-hidden bg-porcelain-dim">
            <img
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200"
              alt="A considered still life of everyday carry goods"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2 sm:py-10">
          <div className="scroll-row px-0.5">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/products?category=${c.slug}`}
                className="shrink-0 flex flex-col items-center gap-1.5 w-16"
              >
                <div className="w-14 h-14 rounded-full overflow-hidden bg-porcelain-dim border border-line">
                  {c.image_url ? (
                    <img src={c.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-display text-lg text-ink/40">
                      {c.name.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-medium text-center leading-tight text-ink/80 line-clamp-2">
                  {c.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <div className="flex items-baseline justify-between mb-4 sm:mb-6">
          <h2 className="font-display text-xl sm:text-2xl">New arrivals</h2>
          <Link to="/products?sort=newest" className="text-sm font-medium hover:text-cobalt">
            View all →
          </Link>
        </div>
        <ProductGrid products={newArrivals} isLoading={loadingNew} />
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14 border-t border-line">
        <div className="flex items-baseline justify-between mb-4 sm:mb-6">
          <h2 className="font-display text-xl sm:text-2xl">Top rated</h2>
          <Link to="/products?sort=rating" className="text-sm font-medium hover:text-cobalt">
            View all →
          </Link>
        </div>
        <ProductGrid products={topRated} isLoading={loadingTop} />
      </section>

      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14 border-t border-line">
          <h2 className="font-display text-xl sm:text-2xl mb-4 sm:mb-6">Shop by category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/products?category=${c.slug}`}
                className="card rounded-xl p-4 sm:p-5 hover:border-ink hover:shadow-pop transition-all"
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
