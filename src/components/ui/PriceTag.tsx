import { formatPrice } from '@/utils/format';

interface PriceTagProps {
  price: number;
  compareAtPrice?: number | null;
  currency?: string;
  size?: 'sm' | 'md';
}

export function PriceTag({ price, compareAtPrice, currency = 'USD', size = 'md' }: PriceTagProps) {
  const onSale = !!compareAtPrice && compareAtPrice > price;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`price-tag ${onSale ? 'price-tag--sale' : ''} ${
          size === 'sm' ? 'text-xs py-0.5' : ''
        }`}
      >
        {formatPrice(price, currency)}
      </span>
      {onSale && (
        <span className="text-xs text-ink/40 line-through font-mono">
          {formatPrice(compareAtPrice!, currency)}
        </span>
      )}
    </span>
  );
}
