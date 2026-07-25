import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login form rejects an invalid email', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('whatever123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/enter a valid email/i)).toBeVisible();
  });

  test('register form requires a password of at least 8 characters', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Full name').fill('Test User');
    await page.getByLabel('Email').fill('newuser@example.com');
    await page.getByLabel('Password').fill('short');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test('checkout redirects an unauthenticated visitor to login', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page offers a guest checkout option when heading to checkout', async ({ page }) => {
    await page.goto('/login?next=%2Fcheckout');
    await expect(page.getByRole('button', { name: /continue as guest/i })).toBeVisible();
  });

  test('login page does not offer guest checkout for a normal sign-in', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /continue as guest/i })).not.toBeVisible();
  });

  test('admin routes redirect an unauthenticated visitor to login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe('signed in', () => {
    test.skip(
      !process.env.E2E_TEST_EMAIL,
      'Set E2E_TEST_EMAIL / E2E_TEST_PASSWORD to run authenticated flows — see e2e/README.md'
    );

    test('an existing user can sign in and reach their account page', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email').fill(process.env.E2E_TEST_EMAIL!);
      await page.getByLabel('Password').fill(process.env.E2E_TEST_PASSWORD!);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.goto('/account');
      await expect(page.getByRole('heading', { name: /your account/i })).toBeVisible();
    });
  });
});
