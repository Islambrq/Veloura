import { test, expect } from '@playwright/test';

// These specs only need the public catalog (no auth), so they'll run
// against any Supabase project that has the seed data applied.

test.describe('Storefront browsing', () => {
  test('home page loads and shows the hero and recent products', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /goods worth keeping/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /shop the catalog/i })).toBeVisible();
  });

  test('can navigate from home to the full product list', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /shop the catalog/i }).click();
    await expect(page).toHaveURL(/\/products/);
    await expect(page.getByRole('heading', { name: /all products/i })).toBeVisible();
  });

  test('searching filters the product grid', async ({ page }) => {
    await page.goto('/products');
    const searchBox = page.getByPlaceholder('Search products…');
    await searchBox.fill('backpack');
    await searchBox.press('Enter');
    await expect(page).toHaveURL(/q=backpack/);
  });

  test('filtering by category updates the URL and heading', async ({ page }) => {
    await page.goto('/products');
    await page.getByRole('button', { name: 'Outdoors' }).click();
    await expect(page).toHaveURL(/category=outdoors/);
  });

  test('visiting a product detail page shows price and add-to-cart', async ({ page }) => {
    await page.goto('/products');
    await page.locator('a', { hasText: /./ }).first().click();
    await expect(page.getByRole('button', { name: /add to cart|out of stock/i })).toBeVisible();
  });

  test('in-stock-only filter updates the URL', async ({ page }) => {
    await page.goto('/products');
    await page.getByLabel(/in stock only/i).check();
    await expect(page).toHaveURL(/in_stock=1/);
  });

  test('minimum rating filter updates the URL', async ({ page }) => {
    await page.goto('/products');
    await page.getByLabel('Minimum rating').selectOption('4');
    await expect(page).toHaveURL(/min_rating=4/);
  });
});
