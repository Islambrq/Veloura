-- ============================================================================
-- seed.sql — demo catalog data for local development.
-- Run with: supabase db reset (auto-applies) or psql -f seed/seed.sql
-- ============================================================================

insert into public.categories (id, name, slug, description, display_order) values
  ('11111111-1111-1111-1111-111111111101', 'Audio',        'audio',        'Headphones, speakers, and sound gear', 1),
  ('11111111-1111-1111-1111-111111111102', 'Bags',         'bags',         'Backpacks, totes, and travel bags',    2),
  ('11111111-1111-1111-1111-111111111103', 'Home & Desk',  'home-desk',    'Objects for a considered workspace',   3),
  ('11111111-1111-1111-1111-111111111104', 'Outdoors',     'outdoors',     'Gear built for weather and distance',  4)
on conflict (id) do nothing;

insert into public.products
  (id, category_id, sku, name, slug, description, price, compare_at_price, stock_quantity)
values
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101',
   'AUD-001', 'Fieldtone Over-Ear Headphones', 'fieldtone-over-ear-headphones',
   'Closed-back over-ear headphones tuned for long listening sessions, with 40 hours of battery life and a fold-flat hinge for travel.',
   179.00, 219.00, 42),

  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111101',
   'AUD-002', 'Ridgeline Portable Speaker', 'ridgeline-portable-speaker',
   'A weatherproof speaker with a 12-hour battery and a woven strap for clipping to a pack.',
   89.00, null, 76),

  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111102',
   'BAG-001', 'Waypoint 24L Backpack', 'waypoint-24l-backpack',
   'A 24-litre daily backpack with a padded 16" laptop sleeve, YKK zippers, and a weatherproof base.',
   145.00, null, 58),

  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111102',
   'BAG-002', 'Harbor Canvas Tote', 'harbor-canvas-tote',
   'A heavyweight 16oz canvas tote with leather straps, built to carry groceries or a laptop equally well.',
   58.00, 72.00, 120),

  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111103',
   'HOM-001', 'Anchor Weighted Desk Lamp', 'anchor-weighted-desk-lamp',
   'A dimmable LED task lamp with a cast-iron base and a warm-to-cool color range.',
   96.00, null, 33),

  ('22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111103',
   'HOM-002', 'Ledger Notebook Trio', 'ledger-notebook-trio',
   'Three dot-grid notebooks with a stitched binding that lies flat at any page.',
   32.00, null, 200),

  ('22222222-2222-2222-2222-222222222207', '11111111-1111-1111-1111-111111111104',
   'OUT-001', 'Summit Shell Jacket', 'summit-shell-jacket',
   'A 3-layer waterproof shell with pit zips and a helmet-compatible hood, seam-taped throughout.',
   249.00, 299.00, 27),

  ('22222222-2222-2222-2222-222222222208', '11111111-1111-1111-1111-111111111104',
   'OUT-002', 'Basecamp Insulated Bottle', 'basecamp-insulated-bottle',
   'A 750ml double-walled steel bottle that holds a temperature for 24 hours.',
   38.00, null, 150)
on conflict (id) do nothing;

insert into public.product_images (product_id, url, alt_text, position) values
  ('22222222-2222-2222-2222-222222222201', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800', 'Fieldtone over-ear headphones', 0),
  ('22222222-2222-2222-2222-222222222202', 'https://images.unsplash.com/photo-1608043152269-423dbba4e747?w=800', 'Ridgeline portable speaker', 0),
  ('22222222-2222-2222-2222-222222222203', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800', 'Waypoint 24L backpack', 0),
  ('22222222-2222-2222-2222-222222222204', 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=800', 'Harbor canvas tote', 0),
  ('22222222-2222-2222-2222-222222222205', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800', 'Anchor weighted desk lamp', 0),
  ('22222222-2222-2222-2222-222222222206', 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800', 'Ledger notebook trio', 0),
  ('22222222-2222-2222-2222-222222222207', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800', 'Summit shell jacket', 0),
  ('22222222-2222-2222-2222-222222222208', 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800', 'Basecamp insulated bottle', 0)
on conflict do nothing;
