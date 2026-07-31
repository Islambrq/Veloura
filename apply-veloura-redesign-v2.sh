#!/data/data/com.termux/files/usr/bin/bash
set -e
# Run from the root of your Veloura repo (folder with package.json).
mkdir -p src/components/layout src/pages

cat > "tailwind.config.js" << 'VELOURA_EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#14171C',
          soft: '#2A2E36',
        },
        porcelain: {
          DEFAULT: '#EEEAE2',
          dim: '#E3DED2',
        },
        cobalt: {
          DEFAULT: '#8A2846',
          dark: '#6B1D36',
          light: '#F7E9EE',
        },
        flame: {
          DEFAULT: '#E8432E',
          dark: '#C13320',
        },
        gold: {
          DEFAULT: '#B8935B',
          dark: '#93743F',
        },
        line: '#D9D4C7',
        success: '#2F6F4E',
        danger: '#B3432E',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '4px',
        md: '6px',
        lg: '10px',
        xl: '16px',
        '2xl': '22px',
      },
      boxShadow: {
        tag: '0 1px 0 0 rgba(20,23,28,0.06)',
        card: '0 1px 2px rgba(20,23,28,0.04), 0 8px 24px -12px rgba(20,23,28,0.12)',
        pop: '0 2px 4px rgba(20,23,28,0.05), 0 14px 28px -10px rgba(20,23,28,0.18)',
        nav: '0 -1px 0 0 rgba(20,23,28,0.06), 0 -8px 20px -12px rgba(20,23,28,0.1)',
      },
      spacing: {
        'safe-b': 'env(safe-area-inset-bottom, 0px)',
      },
    },
  },
  plugins: [],
}
VELOURA_EOF

cat > "src/index.css" << 'VELOURA_EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    @apply antialiased;
  }
  body {
    @apply bg-porcelain text-ink font-sans;
  }
  h1, h2, h3, h4 {
    @apply font-display;
  }
  :focus-visible {
    @apply outline outline-2 outline-offset-2 outline-cobalt;
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}

@layer components {
  /* Signature element: a price rendered like a physical retail tag, with a
     punched hole at the left edge. Used consistently on every product
     price across the storefront. */
  .price-tag {
    @apply relative inline-flex items-center gap-1.5 rounded-sm bg-ink text-porcelain
           font-mono text-sm pl-5 pr-2.5 py-1 shadow-tag;
  }
  .price-tag::before {
    content: '';
    @apply absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-porcelain;
  }
  .price-tag--sale {
    @apply bg-flame;
  }

  .btn {
    @apply inline-flex items-center justify-center gap-2 rounded font-medium
           transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .btn-primary {
    @apply btn bg-ink text-porcelain px-5 py-2.5 hover:bg-ink-soft;
  }
  .btn-secondary {
    @apply btn bg-transparent text-ink border border-ink px-5 py-2.5 hover:bg-ink hover:text-porcelain;
  }
  .btn-accent {
    @apply btn bg-cobalt text-white px-5 py-2.5 hover:bg-cobalt-dark;
  }
  .btn-ghost {
    @apply btn bg-transparent text-ink px-3 py-2 hover:bg-porcelain-dim;
  }

  .input {
    @apply w-full rounded border border-line bg-white px-3.5 py-2.5 text-sm text-ink
           placeholder:text-ink/40 focus:border-cobalt focus:outline-none;
  }
  .label {
    @apply block text-xs font-medium uppercase tracking-wide text-ink/60 mb-1.5;
  }

  .card {
    @apply bg-white rounded-md border border-line shadow-card;
  }

  /* Marketplace product badges — small stamped labels over product imagery. */
  .badge {
    @apply absolute text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-sm leading-none;
  }
  .badge-discount {
    @apply badge bg-flame text-white;
  }
  .badge-new {
    @apply badge bg-cobalt text-white;
  }
  .badge-out {
    @apply badge bg-ink/80 text-porcelain;
  }

  /* Fixed mobile tab bar; hidden at desktop widths where the header nav takes over. */
  .bottom-nav {
    @apply fixed bottom-0 inset-x-0 z-40 bg-white border-t border-line shadow-nav
           pb-safe-b md:hidden;
  }
  .bottom-nav-item {
    @apply flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-ink/50;
  }
  .bottom-nav-item--active {
    @apply text-ink;
  }

  /* Horizontally scrollable pill/tab rows (category tabs, circular icon rail) with no visible scrollbar. */
  .scroll-row {
    @apply flex gap-2 overflow-x-auto;
    scrollbar-width: none;
  }
  .scroll-row::-webkit-scrollbar {
    display: none;
  }

  /* Horizontally scroll-snapping hero carousel; slides are full-bleed children. */
  .carousel {
    @apply flex overflow-x-auto snap-x snap-mandatory;
    scrollbar-width: none;
  }
  .carousel::-webkit-scrollbar {
    display: none;
  }
  .carousel-slide {
    @apply snap-center shrink-0 w-full;
  }
  .carousel-dot {
    @apply w-1.5 h-1.5 rounded-full bg-white/50 transition-all duration-200;
  }
  .carousel-dot--active {
    @apply w-4 bg-white;
  }

  /* Dark-overlay image card used in the featured-collections rail. */
  .collection-card {
    @apply relative shrink-0 w-32 sm:w-40 aspect-[3/4] rounded-xl overflow-hidden bg-ink;
  }
  .collection-card__label {
    @apply absolute inset-x-0 bottom-0 p-3 text-white font-medium text-sm;
  }
}
VELOURA_EOF

cat > "src/pages/HomePage.tsx" << 'VELOURA_EOF'
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
VELOURA_EOF

cat > "src/components/layout/HeroCarousel.tsx" << 'VELOURA_EOF'
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export interface HeroSlide {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaTo: string;
  image: string;
}

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Auto-advance every 5s, pausing is unnecessary for a 2-3 slide banner.
  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      const next = (active + 1) % slides.length;
      track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
    }, 5000);
    return () => clearInterval(id);
  }, [active, slides.length]);

  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    setActive(index);
  }

  return (
    <div className="relative">
      <div ref={trackRef} className="carousel" onScroll={handleScroll}>
        {slides.map((slide, i) => (
          <div key={i} className="carousel-slide">
            <div className="relative aspect-[4/5] sm:aspect-[16/7] overflow-hidden">
              <img
                src={slide.image}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-10 text-porcelain">
                <p className="font-mono text-[11px] uppercase tracking-widest text-porcelain/70 mb-2">
                  {slide.eyebrow}
                </p>
                <h2 className="font-display text-2xl sm:text-4xl leading-tight mb-2 max-w-md">
                  {slide.title}
                </h2>
                <p className="text-sm text-porcelain/80 mb-4 max-w-sm">{slide.subtitle}</p>
                <Link to={slide.ctaTo} className="btn-accent rounded-full px-5 py-2 text-sm inline-flex">
                  {slide.ctaLabel}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {slides.map((_, i) => (
            <span key={i} className={`carousel-dot ${i === active ? 'carousel-dot--active' : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
}
VELOURA_EOF

echo "Files written. Now run: npm run build"
