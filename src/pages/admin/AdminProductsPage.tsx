import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AdminLayout } from './AdminLayout';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { formatPrice } from '@/utils/format';
import type { Product } from '@/types';

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*, categories(*)')
      .order('created_at', { ascending: false });
    setProducts((data ?? []) as Product[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(product: Product) {
    const { error } = await supabase
      .from('products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id);
    if (error) showToast('Could not update product.', 'error');
    else load();
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('products').delete().eq('id', product.id);
    if (error) showToast('Could not delete product — it may be referenced by existing orders.', 'error');
    else {
      showToast('Product deleted.', 'success');
      load();
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-medium">Products</h2>
        <Link to="/admin/products/new" className="btn-primary text-sm px-4 py-2">
          New product
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="w-6 h-6 text-ink/40" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-porcelain-dim text-left text-xs uppercase tracking-wide text-ink/50">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-ink/60">{p.categories?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-mono">{formatPrice(p.price, p.currency)}</td>
                  <td className="px-4 py-3">
                    <span className={p.stock_quantity <= 10 ? 'text-danger font-medium' : ''}>
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(p)}
                      className={`text-xs px-2 py-1 rounded-full ${
                        p.is_active ? 'bg-success/10 text-success' : 'bg-ink/10 text-ink/50'
                      }`}
                    >
                      {p.is_active ? 'Active' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link to={`/admin/products/${p.id}`} className="text-cobalt hover:underline mr-4">
                      Edit
                    </Link>
                    <button onClick={() => handleDelete(p)} className="text-danger hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
