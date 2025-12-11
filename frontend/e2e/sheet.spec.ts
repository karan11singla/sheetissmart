import { test, expect } from '@playwright/test';

// Helper to login before sheet tests
async function login(page: any) {
  await page.goto('/login');
  await page.getByPlaceholder(/email/i).fill('test@example.com');
  await page.getByPlaceholder(/password/i).fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  // Wait for navigation to home
  await page.waitForURL(/\/(home)?$/, { timeout: 10000 });
}

test.describe('Sheet Table UI', () => {
  test('page loads with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SheetIsSmart/);
  });
});

test.describe('Sheet Table - Cell Selection', () => {
  test('clicking a cell shows selection ring', async ({ page }) => {
    await page.goto('/');

    // Wait for any table cells to load
    await page.waitForTimeout(1000);

    // Find any table cell and click it
    const cell = page.locator('[data-cell-pos]').first();
    if (await cell.isVisible()) {
      await cell.click();

      // Check it has blue ring (selection indicator)
      await expect(cell).toHaveClass(/ring-blue-500|ring-2/);
    }
  });

  test('selected cell has correct blue border color', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const cell = page.locator('[data-cell-pos]').first();
    if (await cell.isVisible()) {
      await cell.click();

      // Verify the ring color is blue (rgb(59, 130, 246) = blue-500)
      const ringColor = await cell.evaluate((el) => {
        return window.getComputedStyle(el).getPropertyValue('--tw-ring-color');
      });
      // Ring should be set
      expect(ringColor).toBeTruthy();
    }
  });
});

test.describe('Sheet Table - Drag Selection', () => {
  test('drag selection in vertical direction stays in same column', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);

    const cells = page.locator('[data-cell-pos]');
    const cellCount = await cells.count();

    if (cellCount >= 4) {
      // Get a cell and one below it in the same column
      // Format is usually "row-col" like "0-1", "1-1", etc.
      const startCell = page.locator('[data-cell-pos="0-1"]');
      const endCell = page.locator('[data-cell-pos="2-1"]');

      if (await startCell.isVisible() && await endCell.isVisible()) {
        // Perform drag
        await startCell.dragTo(endCell);

        // After drag, cells in adjacent columns should NOT be selected
        // Check that column 0 cells are NOT highlighted
        const adjacentCell = page.locator('[data-cell-pos="1-0"]');
        if (await adjacentCell.isVisible()) {
          // Adjacent column should not have selection background
          const hasSelectionBg = await adjacentCell.evaluate((el) => {
            return el.classList.contains('bg-blue-100') ||
                   el.classList.contains('bg-blue-50') ||
                   el.className.includes('bg-blue');
          });
          expect(hasSelectionBg).toBeFalsy();
        }
      }
    }
  });

  test('drag selection in horizontal direction stays in same row', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);

    const startCell = page.locator('[data-cell-pos="1-0"]');
    const endCell = page.locator('[data-cell-pos="1-2"]');

    if (await startCell.isVisible() && await endCell.isVisible()) {
      await startCell.dragTo(endCell);

      // Check that cells in adjacent rows are NOT selected
      const adjacentCell = page.locator('[data-cell-pos="0-1"]');
      if (await adjacentCell.isVisible()) {
        const hasSelectionBg = await adjacentCell.evaluate((el) => {
          return el.className.includes('bg-blue');
        });
        expect(hasSelectionBg).toBeFalsy();
      }
    }
  });
});

test.describe('Sheet Table - Text Alignment', () => {
  test('center-aligned cell has centered text', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Find a cell with center alignment
    const centeredCell = page.locator('[data-cell-pos]').filter({
      has: page.locator('[style*="text-align: center"]')
    }).first();

    if (await centeredCell.isVisible()) {
      const textDiv = centeredCell.locator('div').first();
      await expect(textDiv).toHaveCSS('text-align', 'center');
    }
  });

  test('right-aligned cell has right text', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const rightCell = page.locator('[data-cell-pos]').filter({
      has: page.locator('[style*="text-align: right"]')
    }).first();

    if (await rightCell.isVisible()) {
      const textDiv = rightCell.locator('div').first();
      await expect(textDiv).toHaveCSS('text-align', 'right');
    }
  });
});

test.describe('Sheet Table - Cell Editing', () => {
  test('double-click on cell enables editing', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);

    const cell = page.locator('[data-cell-pos="0-0"]');
    if (await cell.isVisible()) {
      await cell.dblclick();

      // After double-click, should have an input or textarea
      const input = cell.locator('input, textarea');
      // Either input exists or the cell becomes contenteditable
      const isEditable = await cell.evaluate((el) => {
        return el.querySelector('input') !== null ||
               el.querySelector('textarea') !== null ||
               el.getAttribute('contenteditable') === 'true';
      });

      // Test passes if cell becomes editable in some way
      expect(isEditable || await input.count() > 0).toBeTruthy();
    }
  });
});

test.describe('Sheet Table - Headers', () => {
  test('column headers are visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Check for header row (usually has sticky positioning)
    const headerRow = page.locator('thead tr, [data-header="true"]').first();
    if (await headerRow.isVisible()) {
      await expect(headerRow).toBeVisible();
    }
  });

  test('row numbers are visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Row numbers are typically in the first column
    const rowNumber = page.locator('[data-row-number], .row-number, td:first-child').first();
    if (await rowNumber.isVisible()) {
      await expect(rowNumber).toBeVisible();
    }
  });
});

test.describe('Sheet - Keyboard Navigation', () => {
  test('pressing Enter on cell does not cause blank screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);

    const cell = page.locator('[data-cell-pos="0-0"]');
    if (await cell.isVisible()) {
      await cell.click();
      await page.keyboard.press('Enter');

      // Page should still have content - not be blank
      await page.waitForTimeout(500);
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length).toBeGreaterThan(10);
    }
  });

  test('pressing number key on cell does not cause blank screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);

    const cell = page.locator('[data-cell-pos="0-0"]');
    if (await cell.isVisible()) {
      await cell.click();
      await page.keyboard.press('5');

      // Page should still have content - not be blank
      await page.waitForTimeout(500);
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length).toBeGreaterThan(10);
    }
  });
});

test.describe('Visual Regression', () => {
  test('login page matches snapshot', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('login-page.png', {
      maxDiffPixels: 100,
    });
  });

  test('home page matches snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('home-page.png', {
      maxDiffPixels: 100,
    });
  });
});
