import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';

interface WishlistButtonProps {
  productId: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function WishlistButton({ productId, size = 'md', className = '' }: WishlistButtonProps) {
  const { user } = useAuth();
  const { isSaved, toggle } = useWishlist();
  const navigate = useNavigate();
  const saved = isSaved(productId);
  const dim = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    toggle(productId);
  }

  return (
    <button
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      className={`${dim} flex items-center justify-center rounded-full bg-white/90 backdrop-blur border border-line hover:border-ink transition-colors ${className}`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={saved ? '#B3432E' : 'none'}
        stroke={saved ? '#B3432E' : 'currentColor'}
        strokeWidth="1.75"
      >
        <path d="M12 20.5s-7.6-4.6-10-9.4C.5 7.7 2.4 4 6 4c2.2 0 3.7 1.2 4.6 2.4C11.5 5.2 13 4 15.2 4c3.6 0 5.5 3.7 4 7.1-2.4 4.8-10 9.4-10 9.4z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
