import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { Product } from '@/types';

interface WishlistContextValue {
  productIds: Set<string>;
  products: Product[];
  isLoading: boolean;
  toggle: (productId: string) => Promise<void>;
  isSaved: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [productIds, setProductIds] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('wishlist_items')
      .select('product_id, products(*, product_images(*))')
      .eq('user_id', userId);

    const rows = data ?? [];
    setProductIds(new Set(rows.map((r) => r.product_id)));
    setProducts(rows.map((r) => r.products as unknown as Product).filter(Boolean));
  }, []);

  useEffect(() => {
    if (!user) {
      setProductIds(new Set());
      setProducts([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    load(user.id).then(() => setIsLoading(false));
  }, [user, load]);

  const toggle = async (productId: string) => {
    if (!user) return;

    if (productIds.has(productId)) {
      await supabase
        .from('wishlist_items')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);
    } else {
      await supabase.from('wishlist_items').insert({ user_id: user.id, product_id: productId });
    }
    await load(user.id);
  };

  const isSaved = (productId: string) => productIds.has(productId);

  return (
    <WishlistContext.Provider value={{ productIds, products, isLoading, toggle, isSaved }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within a WishlistProvider');
  return ctx;
}
