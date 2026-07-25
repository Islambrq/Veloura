import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminLayout } from './AdminLayout';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { slugify } from '@/utils/slug';
import type { Category } from '@/types';

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.from('categories').select('*').order('display_order');
    setCategories((data ?? []) as Category[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSaving(true);
    const { error } = await supabase.from('categories').insert({
      name: newName.trim(),
      slug: slugify(newName),
      display_order: categories.length,
    });
    setIsSaving(false);
    if (error) showToast(`Could not create category: ${error.message}`, 'error');
    else {
      setNewName('');
      load();
    }
  }

  async function toggleActive(category: Category) {
    await supabase.from('categories').update({ is_active: !category.is_active }).eq('id', category.id);
    load();
  }

  async function handleDelete(category: Category) {
    if (!confirm(`Delete "${category.name}"? Products in this category will become uncategorized.`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', category.id);
    if (error) showToast('Could not delete category.', 'error');
    else load();
  }

  return (
    <AdminLayout>
      <h2 className="font-medium mb-5">Categories</h2>

      <form onSubmit={handleCreate} className="flex gap-2 mb-6 max-w-md">
        <input
          className="input"
          placeholder="New category name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" disabled={isSaving} className="btn-primary px-4">
          Add
        </button>
      </form>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="w-6 h-6 text-ink/40" />
        </div>
      ) : (
        <div className="card divide-y divide-line">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium text-sm">{c.name}</div>
                <div className="text-xs text-ink/50">/{c.slug}</div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleActive(c)}
                  className={`text-xs px-2 py-1 rounded-full ${
                    c.is_active ? 'bg-success/10 text-success' : 'bg-ink/10 text-ink/50'
                  }`}
                >
                  {c.is_active ? 'Active' : 'Hidden'}
                </button>
                <button onClick={() => handleDelete(c)} className="text-sm text-danger hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
