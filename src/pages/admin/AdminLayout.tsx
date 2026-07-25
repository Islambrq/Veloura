import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/analytics', label: 'Analytics' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/coupons', label: 'Coupons' },
  { to: '/admin/orders', label: 'Orders' },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="font-display text-3xl">Admin</h1>
        <NavLink to="/" className="text-sm text-ink/50 hover:text-cobalt">
          ← Back to storefront
        </NavLink>
      </div>
      <div className="grid sm:grid-cols-[180px_1fr] gap-10">
        <nav className="flex sm:flex-col gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-3 py-2 rounded text-sm font-medium whitespace-nowrap ${
                  isActive ? 'bg-ink text-porcelain' : 'hover:bg-porcelain-dim'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
