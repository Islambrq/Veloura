// Hand-written types mirroring the Postgres schema in supabase/migrations.
// If you evolve the schema, run `supabase gen types typescript` for a
// generated version and reconcile it with the domain types in index.ts.

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus =
  | 'unpaid'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  recipient_name: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  position: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  price_offset: number;
  stock_quantity: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  category_id: string | null;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  currency: string;
  stock_quantity: number;
  weight_grams: number;
  is_active: boolean;
  avg_rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
  product_images?: ProductImage[];
  product_variants?: ProductVariant[];
  categories?: Category | null;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
  products?: Product;
  product_variants?: ProductVariant | null;
}

export interface Cart {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  sku: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string | null;
  subtotal: number;
  tax: number;
  shipping_fee: number;
  discount: number;
  total: number;
  currency: string;
  shipping_address: Record<string, string>;
  billing_address: Record<string, string> | null;
  notes: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  guest_email: string | null;
  placed_at: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  refunds?: Refund[];
  profiles?: { full_name: string | null };
}

export type AppRole = 'admin';

export interface UserRole {
  user_id: string;
  role: AppRole;
  granted_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  products?: Product;
}

export type DiscountType = 'percentage' | 'fixed_amount';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_subtotal: number;
  max_redemptions: number | null;
  max_redemptions_per_user: number;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Refund {
  id: string;
  order_id: string;
  stripe_refund_id: string | null;
  amount: number;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  profiles?: { full_name: string | null };
}
