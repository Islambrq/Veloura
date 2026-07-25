import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AdminLayout } from './AdminLayout';
import { FormField } from '@/components/ui/FormField';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { slugify } from '@/utils/slug';
import type { Category, ProductImage, ProductVariant } from '@/types';

interface ImageRow {
  id?: string;
  url: string;
  alt_text: string;
  uploading?: boolean;
}

interface VariantRow {
  id?: string;
  sku: string;
  name: string;
  attributes: string; // simple "size:M, color:Black" text, parsed on save
  price_offset: string;
  stock_quantity: string;
  is_active: boolean;
}

function attributesToText(attrs: Record<string, string>) {
  return Object.entries(attrs).map(([k, v]) => `${k}:${v}`).join(', ');
}

function textToAttributes(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  text.split(',').forEach((pair) => {
    const [k, v] = pair.split(':').map((s) => s.trim());
    if (k && v) result[k] = v;
  });
  return result;
}

export function AdminProductFormPage() {
  const { productId } = useParams<{ productId: string }>();
  const isNew = !productId || productId === 'new';
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [weightGrams, setWeightGrams] = useState('200');
  const [isActive, setIsActive] = useState(true);
  const [images, setImages] = useState<ImageRow[]>([{ url: '', alt_text: '' }]);
  const [variants, setVariants] = useState<VariantRow[]>([]);

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('display_order')
      .then(({ data }) => setCategories((data ?? []) as Category[]));
  }, []);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data: product } = await supabase
        .from('products')
        .select('*, product_images(*), product_variants(*)')
        .eq('id', productId)
        .single();

      if (product) {
        setName(product.name);
        setSlug(product.slug);
        setSku(product.sku);
        setCategoryId(product.category_id ?? '');
        setDescription(product.description ?? '');
        setPrice(String(product.price));
        setCompareAtPrice(product.compare_at_price ? String(product.compare_at_price) : '');
        setStockQuantity(String(product.stock_quantity));
        setWeightGrams(String(product.weight_grams ?? 200));
        setIsActive(product.is_active);
        const imgs = (product.product_images ?? []) as ProductImage[];
        setImages(
          imgs.length > 0
            ? imgs.map((img) => ({ id: img.id, url: img.url, alt_text: img.alt_text ?? '' }))
            : [{ url: '', alt_text: '' }]
        );
        const vars = (product.product_variants ?? []) as ProductVariant[];
        setVariants(
          vars.map((v) => ({
            id: v.id,
            sku: v.sku,
            name: v.name,
            attributes: attributesToText(v.attributes),
            price_offset: String(v.price_offset),
            stock_quantity: String(v.stock_quantity),
            is_active: v.is_active,
          }))
        );
      }
      setIsLoading(false);
    })();
  }, [productId, isNew]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleFileUpload(index: number, file: File) {
    const next = [...images];
    next[index] = { ...next[index], uploading: true };
    setImages(next);

    const ext = file.name.split('.').pop();
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from('product-images').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      showToast(`Upload failed: ${error.message}`, 'error');
      const reverted = [...images];
      reverted[index] = { ...reverted[index], uploading: false };
      setImages(reverted);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(path);
    setImages((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], url: publicUrlData.publicUrl, uploading: false };
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    const payload = {
      name,
      slug: slug || slugify(name),
      sku,
      category_id: categoryId || null,
      description: description || null,
      price: Number(price) || 0,
      compare_at_price: compareAtPrice ? Number(compareAtPrice) : null,
      stock_quantity: Number(stockQuantity) || 0,
      weight_grams: Number(weightGrams) || 200,
      is_active: isActive,
    };

    let savedProductId = productId;

    if (isNew) {
      const { data, error } = await supabase.from('products').insert(payload).select('id').single();
      if (error) {
        showToast(`Could not create product: ${error.message}`, 'error');
        setIsSaving(false);
        return;
      }
      savedProductId = data.id;
    } else {
      const { error } = await supabase.from('products').update(payload).eq('id', productId);
      if (error) {
        showToast(`Could not save product: ${error.message}`, 'error');
        setIsSaving(false);
        return;
      }
    }

    // Replace image rows wholesale — simplest correct approach for a small
    // admin form; fine at catalog sizes where a product has a handful of images.
    await supabase.from('product_images').delete().eq('product_id', savedProductId);
    const validImages = images.filter((img) => img.url.trim());
    if (validImages.length > 0) {
      await supabase.from('product_images').insert(
        validImages.map((img, i) => ({
          product_id: savedProductId,
          url: img.url.trim(),
          alt_text: img.alt_text.trim() || null,
          position: i,
        }))
      );
    }

    // Variants: update existing rows (have an id) and insert new ones (no id
    // yet). Deliberately never deleted here — a variant may be referenced by
    // past order_items, so removing one that shouldn't be sold anymore is
    // done via "Deactivate" rather than a hard delete.
    for (const v of variants) {
      if (!v.sku.trim() || !v.name.trim()) continue;
      const payload = {
        product_id: savedProductId,
        sku: v.sku.trim(),
        name: v.name.trim(),
        attributes: textToAttributes(v.attributes),
        price_offset: Number(v.price_offset) || 0,
        stock_quantity: Number(v.stock_quantity) || 0,
        is_active: v.is_active,
      };
      if (v.id) {
        const { error: variantError } = await supabase.from('product_variants').update(payload).eq('id', v.id);
        if (variantError) showToast(`Could not save variant ${v.sku}: ${variantError.message}`, 'error');
      } else {
        const { error: variantError } = await supabase.from('product_variants').insert(payload);
        if (variantError) showToast(`Could not create variant ${v.sku}: ${variantError.message}`, 'error');
      }
    }

    setIsSaving(false);
    showToast(isNew ? 'Product created.' : 'Product saved.', 'success');
    navigate('/admin/products');
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-16">
          <Spinner className="w-6 h-6 text-ink/40" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h2 className="font-medium mb-5">{isNew ? 'New product' : 'Edit product'}</h2>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        <FormField label="Name" value={name} onChange={(e) => handleNameChange(e.target.value)} required />
        <FormField
          label="Slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          required
        />
        <FormField label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} required />

        <div>
          <label className="label" htmlFor="category">Category</label>
          <select
            id="category"
            className="input"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea
            id="description"
            className="input min-h-28"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-4 gap-3">
          <FormField label="Price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
          <FormField label="Compare-at price" type="number" step="0.01" min="0" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} />
          <FormField label="Stock quantity" type="number" min="0" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} />
          <FormField label="Weight (grams)" type="number" min="1" value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Visible in storefront
        </label>

        <div>
          <label className="label">Images</label>
          <div className="space-y-2">
            {images.map((img, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  className="input"
                  placeholder="Image URL, or upload →"
                  value={img.url}
                  onChange={(e) => {
                    const next = [...images];
                    next[i] = { ...next[i], url: e.target.value };
                    setImages(next);
                  }}
                />
                <input
                  className="input"
                  placeholder="Alt text"
                  value={img.alt_text}
                  onChange={(e) => {
                    const next = [...images];
                    next[i] = { ...next[i], alt_text: e.target.value };
                    setImages(next);
                  }}
                />
                <label className="btn-ghost px-3 text-sm cursor-pointer whitespace-nowrap">
                  {img.uploading ? <Spinner className="w-4 h-4" /> : 'Upload'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(i, file);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                  className="btn-ghost px-3"
                  aria-label="Remove image"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setImages([...images, { url: '', alt_text: '' }])}
            className="text-sm text-cobalt hover:underline mt-2"
          >
            + Add image
          </button>
          <p className="text-xs text-ink/40 mt-1">
            Uploads go to the public product-images Storage bucket (requires migration 013 applied).
          </p>
        </div>

        <div>
          <label className="label">Variants</label>
          <div className="space-y-3">
            {variants.map((v, i) => (
              <div key={i} className="card p-3 grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                <div className="col-span-2 sm:col-span-1">
                  <label className="label">Name</label>
                  <input
                    className="input"
                    placeholder="Medium / Black"
                    value={v.name}
                    onChange={(e) => {
                      const next = [...variants];
                      next[i] = { ...next[i], name: e.target.value };
                      setVariants(next);
                    }}
                  />
                </div>
                <div>
                  <label className="label">SKU</label>
                  <input
                    className="input"
                    value={v.sku}
                    onChange={(e) => {
                      const next = [...variants];
                      next[i] = { ...next[i], sku: e.target.value };
                      setVariants(next);
                    }}
                  />
                </div>
                <div>
                  <label className="label">Attributes</label>
                  <input
                    className="input"
                    placeholder="size:M, color:Black"
                    value={v.attributes}
                    onChange={(e) => {
                      const next = [...variants];
                      next[i] = { ...next[i], attributes: e.target.value };
                      setVariants(next);
                    }}
                  />
                </div>
                <div>
                  <label className="label">Price offset</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={v.price_offset}
                    onChange={(e) => {
                      const next = [...variants];
                      next[i] = { ...next[i], price_offset: e.target.value };
                      setVariants(next);
                    }}
                  />
                </div>
                <div>
                  <label className="label">Stock</label>
                  <input
                    type="number"
                    className="input"
                    value={v.stock_quantity}
                    onChange={(e) => {
                      const next = [...variants];
                      next[i] = { ...next[i], stock_quantity: e.target.value };
                      setVariants(next);
                    }}
                  />
                </div>
                <label className="flex items-center gap-2 text-xs col-span-2 sm:col-span-5">
                  <input
                    type="checkbox"
                    checked={v.is_active}
                    onChange={(e) => {
                      const next = [...variants];
                      next[i] = { ...next[i], is_active: e.target.checked };
                      setVariants(next);
                    }}
                  />
                  Active (deactivating hides it without deleting order history)
                </label>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setVariants([
                ...variants,
                { sku: '', name: '', attributes: '', price_offset: '0', stock_quantity: '0', is_active: true },
              ])
            }
            className="text-sm text-cobalt hover:underline mt-2"
          >
            + Add variant
          </button>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSaving} className="btn-primary">
            {isSaving ? <Spinner className="w-4 h-4" /> : isNew ? 'Create product' : 'Save changes'}
          </button>
          <button type="button" onClick={() => navigate('/admin/products')} className="btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}
