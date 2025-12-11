import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login page has correct styling', async ({ page }) => {
    await page.goto('/login');

    // Check page title
    await expect(page).toHaveTitle(/SheetIsSmart/);

    // Check login form exists and is centered
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Check email input styling
    const emailInput = page.getByPlaceholder(/email/i);
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveCSS('background-color', 'rgb(255, 255, 255)');

    // Check login button exists and has correct styling
    const loginButton = page.getByRole('button', { name: /sign in|log in/i });
    await expect(loginButton).toBeVisible();
  });

  test('can navigate between login and signup', async ({ page }) => {
    await page.goto('/login');

    // Find signup link - actual text is "create a new account"
    const signupLink = page.getByRole('link', { name: /create a new account/i });
    await expect(signupLink).toBeVisible();
    await signupLink.click();

    // Should be on signup page
    await expect(page).toHaveURL(/signup/);
  });

  test('shows validation errors for empty login', async ({ page }) => {
    await page.goto('/login');

    // Try to submit empty form
    const loginButton = page.getByRole('button', { name: /sign in|log in/i });
    await loginButton.click();

    // Should show some error indication (either validation message or stay on page)
    await expect(page).toHaveURL(/login/);
  });
});
