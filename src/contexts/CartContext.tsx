import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { CartLine, Product, ProductVariant } from '@/types';

const GUEST_CART_KEY = 'fernweh_guest_cart_v1';

interface GuestLine {
  productId: string;
  variantId: string | null;
  quantity: number;
}

function readGuestCart(): GuestLine[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? (JSON.parse(raw) as GuestLine[]) : [];
  } catch {
    return [];
  }
}

function writeGuestCart(lines: GuestLine[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(lines));
}

interface CartContextValue {
  items: CartLine[];
  isLoading: boolean;
  itemCount: number;
  subtotal: number;
  addItem: (product: Product, variant: ProductVariant | null, quantity: number) => Promise<void>;
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => Promise<void>;
  removeItem: (productId: string, variantId: string | null) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serverCartId, setServerCartId] = useState<string | null>(null);

  const hydrateFromProductIds = useCallback(async (lines: GuestLine[]): Promise<CartLine[]> => {
    if (lines.length === 0) return [];
    const ids = [...new Set(lines.map((l) => l.productId))];
    const { data: products } = await supabase
      .from('products')
      .select('*, product_images(*), product_variants(*)')
      .in('id', ids);

    const byId = new Map((products ?? []).map((p) => [p.id, p as Product]));

    return lines
      .map((line) => {
        const product = byId.get(line.productId);
        if (!product) return null;
        const variant = line.variantId
          ? product.product_variants?.find((v) => v.id === line.variantId) ?? null
          : null;
        const unitPrice = product.price + (variant?.price_offset ?? 0);
        return {
          productId: product.id,
          variantId: variant?.id ?? null,
          quantity: line.quantity,
          unitPrice,
          name: product.name + (variant ? ` — ${variant.name}` : ''),
          slug: product.slug,
          imageUrl: product.product_images?.[0]?.url ?? null,
          stockQuantity: variant ? variant.stock_quantity : product.stock_quantity,
        } as CartLine;
      })
      .filter((l): l is CartLine => l !== null);
  }, []);

  const loadServerCart = useCallback(async (userId: string) => {
    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let cartId = cart?.id ?? null;
    if (!cartId) {
      const { data: created } = await supabase
        .from('carts')
        .insert({ user_id: userId })
        .select('id')
        .single();
      cartId = created?.id ?? null;
    }
    setServerCartId(cartId);

    if (!cartId) return [];

    const { data: cartItems } = await supabase
      .from('cart_items')
      .select('*, products(*, product_images(*)), product_variants(*)')
      .eq('cart_id', cartId);

    return (cartItems ?? []).map((ci) => ({
      productId: ci.product_id,
      variantId: ci.variant_id,
      quantity: ci.quantity,
      unitPrice: ci.unit_price,
      name: ci.products.name + (ci.product_variants ? ` — ${ci.product_variants.name}` : ''),
      slug: ci.products.slug,
      imageUrl: ci.products.product_images?.[0]?.url ?? null,
      stockQuantity: ci.product_variants ? ci.product_variants.stock_quantity : ci.products.stock_quantity,
    })) as CartLine[];
  }, []);

  // Initial load + merge guest cart into server cart exactly once on login.
  useEffect(() => {
    let active = true;

    (async () => {
      setIsLoading(true);
      if (user) {
        const guestLines = readGuestCart();
        if (guestLines.length > 0) {
          await mergeGuestIntoServer(user.id, guestLines);
          localStorage.removeItem(GUEST_CART_KEY);
        }
        const serverItems = await loadServerCart(user.id);
        if (active) setItems(serverItems);
      } else {
        const guestLines = readGuestCart();
        const hydrated = await hydrateFromProductIds(guestLines);
        if (active) setItems(hydrated);
        setServerCartId(null);
      }
      if (active) setIsLoading(false);
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function mergeGuestIntoServer(userId: string, guestLines: GuestLine[]) {
    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let cartId = cart?.id;
    if (!cartId) {
      const { data: created } = await supabase
        .from('carts')
        .insert({ user_id: userId })
        .select('id')
        .single();
      cartId = created?.id;
    }
    if (!cartId) return;

    const hydrated = await hydrateFromProductIds(guestLines);
    for (const line of hydrated) {
      await supabase.from('cart_items').upsert(
        {
          cart_id: cartId,
          product_id: line.productId,
          variant_id: line.variantId,
          quantity: line.quantity,
          unit_price: line.unitPrice,
        },
        { onConflict: 'cart_id,product_id,variant_id' }
      );
    }
  }

  const addItem = async (product: Product, variant: ProductVariant | null, quantity: number) => {
    const unitPrice = product.price + (variant?.price_offset ?? 0);

    if (user && serverCartId) {
      const existing = items.find(
        (i) => i.productId === product.id && i.variantId === (variant?.id ?? null)
      );
      const newQty = (existing?.quantity ?? 0) + quantity;

      await supabase.from('cart_items').upsert(
        {
          cart_id: serverCartId,
          product_id: product.id,
          variant_id: variant?.id ?? null,
          quantity: newQty,
          unit_price: unitPrice,
        },
        { onConflict: 'cart_id,product_id,variant_id' }
      );
      setItems(await loadServerCart(user.id));
    } else {
      const guestLines = readGuestCart();
      const idx = guestLines.findIndex(
        (l) => l.productId === product.id && l.variantId === (variant?.id ?? null)
      );
      if (idx >= 0) guestLines[idx].quantity += quantity;
      else guestLines.push({ productId: product.id, variantId: variant?.id ?? null, quantity });
      writeGuestCart(guestLines);
      setItems(await hydrateFromProductIds(guestLines));
    }
  };

  const updateQuantity = async (productId: string, variantId: string | null, quantity: number) => {
    if (quantity <= 0) return removeItem(productId, variantId);

    if (user && serverCartId) {
      await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('cart_id', serverCartId)
        .eq('product_id', productId)
        .eq('variant_id', variantId as string);
      setItems(await loadServerCart(user.id));
    } else {
      const guestLines = readGuestCart().map((l) =>
        l.productId === productId && l.variantId === variantId ? { ...l, quantity } : l
      );
      writeGuestCart(guestLines);
      setItems(await hydrateFromProductIds(guestLines));
    }
  };

  const removeItem = async (productId: string, variantId: string | null) => {
    if (user && serverCartId) {
      let query = supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', serverCartId)
        .eq('product_id', productId);
      query = variantId ? query.eq('variant_id', variantId) : query.is('variant_id', null);
      await query;
      setItems(await loadServerCart(user.id));
    } else {
      const guestLines = readGuestCart().filter(
        (l) => !(l.productId === productId && l.variantId === variantId)
      );
      writeGuestCart(guestLines);
      setItems(await hydrateFromProductIds(guestLines));
    }
  };

  const clearCart = async () => {
    if (user && serverCartId) {
      await supabase.from('cart_items').delete().eq('cart_id', serverCartId);
    } else {
      localStorage.removeItem(GUEST_CART_KEY);
    }
    setItems([]);
  };

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0), [items]);

  return (
    <CartContext.Provider
      value={{ items, isLoading, itemCount, subtotal, addItem, updateQuantity, removeItem, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
