import { useState } from 'react';
import { Dropdown } from '@/components/ui/Dropdown';
import type { Category } from '@/types';

interface ProductFiltersProps {
  categories: Category[];
  activeCategory: string | null;
  onCategoryChange: (slug: string | null) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  minPrice: number | null;
  maxPrice: number | null;
  onPriceChange: (min: number | null, max: number | null) => void;
  minRating: number | null;
  onMinRatingChange: (rating: number | null) => void;
  inStockOnly: boolean;
  onInStockOnlyChange: (value: boolean) => void;
}

const RATING_OPTIONS = [
  { value: '', label: 'Any rating' },
  { value: '4', label: '4★ & up' },
  { value: '3', label: '3★ & up' },
  { value: '2', label: '2★ & up' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
];

export function ProductFilters({
  categories,
  activeCategory,
  onCategoryChange,
  sort,
  onSortChange,
  minPrice,
  maxPrice,
  onPriceChange,
  minRating,
  onMinRatingChange,
  inStockOnly,
  onInStockOnlyChange,
}: ProductFiltersProps) {
  const [priceOpen, setPriceOpen] = useState(false);
  const [minInput, setMinInput] = useState(minPrice != null ? String(minPrice) : '');
  const [maxInput, setMaxInput] = useState(maxPrice != null ? String(maxPrice) : '');

  function applyPrice() {
    onPriceChange(minInput ? Number(minInput) : null, maxInput ? Number(maxInput) : null);
    setPriceOpen(false);
  }

  const hasPriceFilter = minPrice != null || maxPrice != null;

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => onCategoryChange(null)}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            !activeCategory ? 'bg-ink text-porcelain border-ink' : 'border-line hover:border-ink'
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => onCategoryChange(c.slug)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              activeCategory === c.slug ? 'bg-ink text-porcelain border-ink' : 'border-line hover:border-ink'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setPriceOpen((v) => !v)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                hasPriceFilter ? 'bg-ink text-porcelain border-ink' : 'border-line hover:border-ink'
              }`}
            >
              {hasPriceFilter ? `$${minPrice ?? 0}–${maxPrice ?? '∞'}` : 'Price'}
            </button>
            {priceOpen && (
              <div className="absolute z-10 mt-2 card p-3 flex items-center gap-2 w-56">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={minInput}
                  onChange={(e) => setMinInput(e.target.value)}
                  className="input py-1.5 text-sm"
                />
                <span className="text-ink/40">–</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={maxInput}
                  onChange={(e) => setMaxInput(e.target.value)}
                  className="input py-1.5 text-sm"
                />
                <button onClick={applyPrice} className="btn-primary px-3 py-1.5 text-xs whitespace-nowrap">
                  Go
                </button>
              </div>
            )}
          </div>

          <Dropdown
            value={minRating != null ? String(minRating) : ''}
            options={RATING_OPTIONS}
            onChange={(v) => onMinRatingChange(v ? Number(v) : null)}
            ariaLabel="Minimum rating"
            className="w-36"
          />

          <label className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border border-line cursor-pointer">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => onInStockOnlyChange(e.target.checked)}
            />
            In stock only
          </label>
        </div>

        <Dropdown
          value={sort}
          options={SORT_OPTIONS}
          onChange={onSortChange}
          ariaLabel="Sort products"
          className="w-44"
        />
      </div>
    </div>
  );
}
