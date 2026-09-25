import { expect, test } from '@playwright/test';

test.describe('Firefly remote', () => {
  test('renders inside the host at /portfolio/firefly', async ({ page }) => {
    await page.goto('/portfolio/firefly');

    await expect(page.getByTestId('portfolio-firefly')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Hello from portfolio-firefly' }),
    ).toBeVisible();
  });

  test('navigating away and back leaves a single instance', async ({
    page,
  }) => {
    await page.goto('/');
    for (let i = 0; i < 3; i++) {
      await page.getByRole('link', { name: 'Firefly' }).click();
      await expect(page.getByTestId('portfolio-firefly')).toHaveCount(1);
      await page.getByRole('link', { name: 'Home' }).click();
      await expect(page.getByTestId('portfolio-firefly')).toHaveCount(0);
    }
  });

  test('shows a fallback when the remote fails to load', async ({ page }) => {
    await page.route(/remoteEntry\.js|mf-manifest\.json/, (route) =>
      route.abort(),
    );
    await page.goto('/portfolio/firefly');

    await expect(page.getByRole('alert')).toContainText('portfolio-firefly');
    // The rest of the site still works.
    await expect(
      page.getByRole('link', { name: 'Theory Network' }),
    ).toBeVisible();
  });
});
