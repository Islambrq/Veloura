import { Link, useLocation } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';

const icons = {
  home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 11.5 12 4l8 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9.5h12V10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  grid: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  ),
  cart: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M3 3h2l.4 2M7 13h10l3-8H5.4M7 13l-1.6 8h13.2M7 13l-2.6-8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="21" r="1" fill="currentColor" />
      <circle cx="17" cy="21" r="1" fill="currentColor" />
    </svg>
  ),
  heart: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 20.5s-7.6-4.6-10-9.4C.5 7.7 2.4 4 6 4c2.2 0 3.7 1.2 4.6 2.4C11.5 5.2 13 4 15.2 4c3.6 0 5.5 3.7 4 7.1-2.4 4.8-10 9.4-10 9.4z" strokeLinejoin="round" />
    </svg>
  ),
  user: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.6-3.6 4.4-5.5 7.5-5.5s5.9 1.9 7.5 5.5" strokeLinecap="round" />
    </svg>
  ),
};

export function BottomNav() {
  const location = useLocation();
  const { itemCount } = useCart();

  const tabs = [
    { to: '/', label: 'Shop', icon: icons.home, match: (p: string) => p === '/' },
    { to: '/products', label: 'Categories', icon: icons.grid, match: (p: string) => p.startsWith('/products') },
    { to: '/cart', label: 'Cart', icon: icons.cart, match: (p: string) => p.startsWith('/cart'), badge: itemCount },
    { to: '/wishlist', label: 'Wishlist', icon: icons.heart, match: (p: string) => p.startsWith('/wishlist') },
    { to: '/account', label: 'Me', icon: icons.user, match: (p: string) => p.startsWith('/account') || p.startsWith('/orders') },
  ];

  return (
    <nav className="bottom-nav" aria-label="Primary">
      <div className="max-w-6xl mx-auto flex">
        {tabs.map((tab) => {
          const active = tab.match(location.pathname);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`bottom-nav-item relative ${active ? 'bottom-nav-item--active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="relative">
                {tab.icon}
                {!!tab.badge && (
                  <span className="absolute -top-1 -right-1.5 bg-cobalt text-white text-[9px] font-semibold rounded-full min-w-[15px] h-[15px] px-0.5 flex items-center justify-center">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
