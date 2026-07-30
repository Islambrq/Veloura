import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useCategories } from '@/hooks/useCategories';
import { SearchAutocomplete } from './SearchAutocomplete';

export function Header() {
  const { user, signOut } = useAuth();
  const { itemCount } = useCart();
  const { isAdmin } = useIsAdmin();
  const { categories } = useCategories();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const activeCategory = searchParams.get('category');

  return (
    <header className="sticky top-0 z-40 bg-porcelain/95 backdrop-blur border-b border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6">
        <Link to="/" className="font-display text-2xl tracking-tight shrink-0">
          Veloura
        </Link>

        <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
          <Link to="/products" className="hover:text-cobalt transition-colors">
            Shop
          </Link>
          <Link to="/products?category=outdoors" className="hover:text-cobalt transition-colors">
            Outdoors
          </Link>
          <Link to="/products?category=home-desk" className="hover:text-cobalt transition-colors">
            Home &amp; Desk
          </Link>
        </nav>

        <SearchAutocomplete />

        <div className="flex items-center gap-3 shrink-0">
          {user && (
            <Link to="/wishlist" className="p-2 hover:text-cobalt transition-colors" aria-label="Wishlist">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M12 20.5s-7.6-4.6-10-9.4C.5 7.7 2.4 4 6 4c2.2 0 3.7 1.2 4.6 2.4C11.5 5.2 13 4 15.2 4c3.6 0 5.5 3.7 4 7.1-2.4 4.8-10 9.4-10 9.4z" strokeLinejoin="round" />
              </svg>
            </Link>
          )}
          <Link
            to="/cart"
            className="relative p-2 hover:text-cobalt transition-colors"
            aria-label={`Cart, ${itemCount} item${itemCount === 1 ? '' : 's'}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M3 3h2l.4 2M7 13h10l3-8H5.4M7 13l-1.6 8h13.2M7 13l-2.6-8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9" cy="21" r="1" fill="currentColor" />
              <circle cx="17" cy="21" r="1" fill="currentColor" />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-cobalt text-white text-[10px] font-semibold rounded-full w-4.5 h-4.5 flex items-center justify-center">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 hover:text-cobalt transition-colors"
              aria-label="Account menu"
              aria-expanded={menuOpen}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M4.5 20c1.6-3.6 4.4-5.5 7.5-5.5s5.9 1.9 7.5 5.5" strokeLinecap="round" />
              </svg>
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-48 card p-1.5 text-sm"
                onMouseLeave={() => setMenuOpen(false)}
              >
                {user ? (
                  <>
                    <Link to="/account" className="block px-3 py-2 rounded hover:bg-porcelain-dim" onClick={() => setMenuOpen(false)}>
                      Account
                    </Link>
                    <Link to="/orders" className="block px-3 py-2 rounded hover:bg-porcelain-dim" onClick={() => setMenuOpen(false)}>
                      Orders
                    </Link>
                    <Link to="/wishlist" className="block px-3 py-2 rounded hover:bg-porcelain-dim" onClick={() => setMenuOpen(false)}>
                      Wishlist
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" className="block px-3 py-2 rounded hover:bg-porcelain-dim" onClick={() => setMenuOpen(false)}>
                        Admin dashboard
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        signOut();
                      }}
                      className="w-full text-left px-3 py-2 rounded hover:bg-porcelain-dim"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="block px-3 py-2 rounded hover:bg-porcelain-dim" onClick={() => setMenuOpen(false)}>
                      Sign in
                    </Link>
                    <Link to="/register" className="block px-3 py-2 rounded hover:bg-porcelain-dim" onClick={() => setMenuOpen(false)}>
                      Create account
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="md:hidden border-t border-line/70 px-4">
          <nav className="scroll-row py-2.5" aria-label="Categories">
            <Link
              to="/products"
              className={`shrink-0 px-1 pb-1.5 text-sm border-b-2 transition-colors ${
                !activeCategory
                  ? 'border-ink text-ink font-semibold'
                  : 'border-transparent text-ink/55 font-medium'
              }`}
            >
              All
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/products?category=${c.slug}`}
                className={`shrink-0 px-1 pb-1.5 text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeCategory === c.slug
                    ? 'border-ink text-ink font-semibold'
                    : 'border-transparent text-ink/55 font-medium'
                }`}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
