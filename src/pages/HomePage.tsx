import { Link } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { ProductGrid } from '@/components/product/ProductGrid';
import { HeroCarousel, type HeroSlide } from '@/components/layout/HeroCarousel';

const heroSlides: HeroSlide[] = [
  {
    eyebrow: 'New arrivals, every season',
    title: 'Goods worth keeping, not replacing.',
    subtitle: 'A considered catalog of audio, bags, home, and outdoor gear.',
    ctaLabel: 'Shop the catalog',
    ctaTo: '/products',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',
  },
  {
    eyebrow: 'Top rated this week',
    title: 'Chosen by people who kept them.',
    subtitle: 'Real ratings from real orders — no filler, no fast fashion.',
    ctaLabel: 'See top rated',
    ctaTo: '/products?sort=rating',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200',
  },
];

export function HomePage() {
  const { products: newArrivals, isLoading: loadingNew } = useProducts({ sort: 'newest', pageSize: 8 });
  const { products: topRated, isLoading: loadingTop } = useProducts({ sort: 'rating', pageSize: 8 });
  const { categories } = useCategories();

  const collections = [
    { label: 'New In', to: '/products?sort=newest', image: heroSlides[0].image },
    { label: 'Top Rated', to: '/products?sort=rating', image: heroSlides[1].image },
    ...categories.slice(0, 3).map((c) => ({
      label: c.name,
      to: `/products?category=${c.slug}`,
      image: c.image_url ?? heroSlides[0].image,
    })),
  ];

  return (
    <div>
      <HeroCarousel slides={heroSlides} />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="scroll-row px-0.5">
          {collections.map((c) => (
            <Link key={c.label} to={c.to} className="collection-card">
              <img src={c.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
              <span className="collection-card__label">{c.label}</span>
            </Link>
          ))}
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
