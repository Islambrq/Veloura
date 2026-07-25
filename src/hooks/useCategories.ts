import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .then(({ data }) => {
        setCategories((data ?? []) as Category[]);
        setIsLoading(false);
      });
  }, []);

  return { categories, isLoading };
}
