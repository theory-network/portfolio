import { expect, test } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect h1 to contain a substring.
  expect(await page.locator('h1').innerText()).toContain('Theory Network');
});

test('renders a styled shadcn button', async ({ page }) => {
  await page.goto('/');

  const button = page.getByRole('button', { name: 'shadcn Button' });
  await expect(button).toBeVisible();

  // Tailwind and the shadcn theme are applied: the default variant has a
  // solid background and padding, not the browser's unstyled button.
  const styles = await button.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      backgroundColor: s.backgroundColor,
      paddingLeft: s.paddingLeft,
      borderRadius: s.borderRadius,
    };
  });
  expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(styles.paddingLeft).toBe('16px');
  expect(styles.borderRadius).not.toBe('0px');
});
