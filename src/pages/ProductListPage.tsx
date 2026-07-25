import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProducts, type ProductFilters } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductFilters as ProductFiltersBar } from '@/components/product/ProductFilters';

const PAGE_SIZE = 12;

export function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);

  const category = searchParams.get('category');
  const search = searchParams.get('q') ?? '';
  const sort = (searchParams.get('sort') as ProductFilters['sort']) ?? 'newest';
  const minPrice = searchParams.get('min_price') ? Number(searchParams.get('min_price')) : null;
  const maxPrice = searchParams.get('max_price') ? Number(searchParams.get('max_price')) : null;
  const minRating = searchParams.get('min_rating') ? Number(searchParams.get('min_rating')) : null;
  const inStockOnly = searchParams.get('in_stock') === '1';

  const { categories } = useCategories();
  const { products, totalCount, isLoading } = useProducts({
    categorySlug: category,
    search,
    sort,
    page,
    pageSize: PAGE_SIZE,
    minPrice,
    maxPrice,
    minRating,
    inStockOnly,
  });

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);

  function updateParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next);
    setPage(1);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6">
        <h1 className="font-display text-3xl mb-1">
          {search ? `Results for "${search}"` : category ? categories.find((c) => c.slug === category)?.name ?? 'Shop' : 'All products'}
        </h1>
        <p className="text-sm text-ink/50">{totalCount} product{totalCount === 1 ? '' : 's'}</p>
      </div>

      <ProductFiltersBar
        categories={categories}
        activeCategory={category}
        onCategoryChange={(slug) => updateParams({ category: slug })}
        sort={sort}
        onSortChange={(s) => updateParams({ sort: s })}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onPriceChange={(min, max) =>
          updateParams({ min_price: min != null ? String(min) : null, max_price: max != null ? String(max) : null })
        }
        minRating={minRating}
        onMinRatingChange={(rating) => updateParams({ min_rating: rating != null ? String(rating) : null })}
        inStockOnly={inStockOnly}
        onInStockOnlyChange={(value) => updateParams({ in_stock: value ? '1' : null })}
      />

      <ProductGrid products={products} isLoading={isLoading} />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button
            className="btn-secondary px-3 py-1.5 text-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="text-sm text-ink/60">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn-secondary px-3 py-1.5 text-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
