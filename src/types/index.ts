export * from './database.types';

export interface ShippingAddressInput {
  recipient_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface CartLine {
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  stockQuantity: number;
}
