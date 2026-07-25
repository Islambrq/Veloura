import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';

export interface ProductFilters {
  categorySlug?: string | null;
  search?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'rating';
  page?: number;
  pageSize?: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  minRating?: number | null;
  inStockOnly?: boolean;
}

export function useProducts(filters: ProductFilters) {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    categorySlug,
    search,
    sort = 'newest',
    page = 1,
    pageSize = 12,
    minPrice,
    maxPrice,
    minRating,
    inStockOnly,
  } = filters;

  useEffect(() => {
    let active = true;

    (async () => {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('products')
        .select('*, product_images(*), categories(*)', { count: 'exact' })
        .eq('is_active', true);

      if (categorySlug) {
        const { data: category } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', categorySlug)
          .maybeSingle();
        if (category) query = query.eq('category_id', category.id);
      }

      if (search && search.trim()) {
        query = query.textSearch('search_vector', search.trim(), { type: 'websearch' });
      }

      if (minPrice != null) query = query.gte('price', minPrice);
      if (maxPrice != null) query = query.lte('price', maxPrice);
      if (minRating != null) query = query.gte('avg_rating', minRating);
      if (inStockOnly) query = query.gt('stock_quantity', 0);

      switch (sort) {
        case 'price_asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('price', { ascending: false });
          break;
        case 'rating':
          query = query.order('avg_rating', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error: queryError } = await query;

      if (!active) return;
      if (queryError) {
        setError(queryError.message);
        setProducts([]);
      } else {
        setProducts((data ?? []) as Product[]);
        setTotalCount(count ?? 0);
      }
      setIsLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [categorySlug, search, sort, page, pageSize, minPrice, maxPrice, minRating, inStockOnly]);

  return { products, totalCount, isLoading, error };
}

export function useRelatedProducts(categoryId: string | null | undefined, excludeProductId: string | undefined) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!categoryId || !excludeProductId) {
      setIsLoading(false);
      return;
    }
    let active = true;
    setIsLoading(true);

    supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .neq('id', excludeProductId)
      .limit(4)
      .then(({ data }) => {
        if (!active) return;
        setProducts((data ?? []) as Product[]);
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [categoryId, excludeProductId]);

  return { products, isLoading };
}

export function useProduct(slug: string | undefined) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let active = true;

    (async () => {
      setIsLoading(true);
      const { data, error: queryError } = await supabase
        .from('products')
        .select('*, product_images(*), product_variants(*), categories(*)')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (!active) return;
      if (queryError) setError(queryError.message);
      setProduct((data as Product) ?? null);
      setIsLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [slug]);

  return { product, isLoading, error };
}
