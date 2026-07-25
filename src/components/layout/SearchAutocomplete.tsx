import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useDebounce } from '@/hooks/useDebounce';
import { formatPrice } from '@/utils/format';
import type { Product } from '@/types';

export function SearchAutocomplete() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debouncedQuery = useDebounce(query, 250);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    let active = true;
    supabase
      .from('products')
      .select('id, name, slug, price, currency, product_images(url)')
      .eq('is_active', true)
      .ilike('name', `%${debouncedQuery.trim()}%`)
      .limit(5)
      .then(({ data }) => {
        if (active) setSuggestions((data ?? []) as unknown as Product[]);
      });
    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function goToProduct(product: Product) {
    setIsOpen(false);
    setQuery('');
    navigate(`/products/${product.slug}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setIsOpen(false);
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      goToProduct(suggestions[activeIndex]);
      return;
    }
    navigate(query.trim() ? `/products?q=${encodeURIComponent(query.trim())}` : '/products');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-sm ml-auto hidden sm:block">
      <form onSubmit={handleSearch}>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search products…"
          aria-label="Search products"
          role="combobox"
          aria-expanded={isOpen && suggestions.length > 0}
          aria-autocomplete="list"
          className="input py-2"
        />
      </form>

      {isOpen && suggestions.length > 0 && (
        <ul role="listbox" className="absolute z-20 mt-1 w-full card overflow-hidden py-1">
          {suggestions.map((product, i) => (
            <li key={product.id} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                onClick={() => goToProduct(product)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm ${
                  i === activeIndex ? 'bg-porcelain-dim' : ''
                }`}
              >
                <div className="w-9 h-9 rounded bg-porcelain-dim overflow-hidden shrink-0">
                  {product.product_images?.[0]?.url && (
                    <img src={product.product_images[0].url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <span className="flex-1 truncate">{product.name}</span>
                <span className="font-mono text-xs text-ink/50">{formatPrice(product.price, product.currency)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
