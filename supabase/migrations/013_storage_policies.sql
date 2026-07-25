-- ============================================================================
-- 013_storage_policies.sql
-- Creates the product-images bucket (public read, admin-only write) so the
-- admin product form can upload files directly instead of only accepting
-- external URLs.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product_images_bucket_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "product_images_bucket_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "product_images_bucket_admin_update"
  on storage.objects for update
  using (bucket_id = 'product-images' and public.is_admin());

create policy "product_images_bucket_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin());
