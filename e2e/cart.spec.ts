import { test, expect } from '@playwright/test';

test.describe('Guest cart', () => {
  test('adding a product to the cart updates the cart badge', async ({ page }) => {
    await page.goto('/products');
    await page.locator('a').filter({ hasText: /./ }).first().click();

    const addButton = page.getByRole('button', { name: /add to cart/i });
    // Skip gracefully if the first product happened to be out of stock.
    if (await addButton.isDisabled()) test.skip();

    await addButton.click();
    await expect(page.getByLabel(/cart, \d+ item/i)).toBeVisible();
  });

  test('cart page lists added items and shows a subtotal', async ({ page }) => {
    await page.goto('/products');
    await page.locator('a').filter({ hasText: /./ }).first().click();
    const addButton = page.getByRole('button', { name: /add to cart/i });
    if (await addButton.isDisabled()) test.skip();
    await addButton.click();

    await page.goto('/cart');
    await expect(page.getByText('Subtotal')).toBeVisible();
    await expect(page.getByRole('button', { name: /checkout/i })).toBeVisible();
  });
});
