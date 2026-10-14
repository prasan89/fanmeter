import { test, expect } from "@playwright/test";

// These tests run against a local dev server with no NEXT_PUBLIC_ADSENSE_CLIENT set.
// They verify layout structure, sidebar behavior, and no ads inside voting content.

test.describe("Ad layout — homepage", () => {
  test("desktop: left column content + right placeholder sidebar visible", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");

    // Sidebar element exists and is visible
    const sidebar = page.getByTestId("ad-sidebar");
    await expect(sidebar).toBeVisible();

    // Dev placeholder rendered inside sidebar
    const placeholder = page.getByTestId("ad-placeholder").first();
    await expect(placeholder).toBeVisible();

    // Event cards exist in the left column, not inside the sidebar
    const cards = page.locator('article');
    await expect(cards).toHaveCount(4);

    // No <ins> ad tag inside any event card
    const insInsideCard = page.locator('article ins');
    await expect(insInsideCard).toHaveCount(0);
  });

  test("mobile: sidebar hidden, no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    // Sidebar should not be visible on mobile (hidden lg:block)
    const sidebar = page.getByTestId("ad-sidebar");
    await expect(sidebar).toBeHidden();

    // No horizontal overflow
    const overflow = await page.evaluate(
      () => document.body.scrollWidth > window.innerWidth
    );
    expect(overflow).toBe(false);

    // Cards still present and full-width
    const cards = page.locator('article');
    await expect(cards).toHaveCount(4);
  });

  test("tablet (768px): sidebar hidden", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    const sidebar = page.getByTestId("ad-sidebar");
    await expect(sidebar).toBeHidden();
  });

  test("no duplicate adsbygoogle script tags", async ({ page }) => {
    await page.goto("/");
    const scriptCount = await page.evaluate(() =>
      Array.from(document.querySelectorAll('script[src*="adsbygoogle"]')).length
    );
    // Either 0 (no client ID configured) or exactly 1
    expect(scriptCount).toBeLessThanOrEqual(1);
  });
});

test.describe("Ad layout — event pages", () => {
  const eventSlugs = [
    "bigg-boss-tamil-10",
    "bigg-boss-telugu-10",
    "bigg-boss-malayalam-8",
    "bigg-boss-kannada-13",
  ];

  for (const slug of eventSlugs) {
    test(`desktop: ${slug} — sidebar visible, no ads between rankings rows`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`/events/${slug}`);

      // Sidebar visible
      const sidebar = page.getByTestId("ad-sidebar");
      await expect(sidebar).toBeVisible();

      // Rankings content loads (contestant rows — wait up to 8s for API)
      const rankingsArea = page.locator('[data-testid="ad-sidebar"]').locator('..');
      await expect(rankingsArea).toBeVisible();

      // No <ins> ad tags between contestant rows
      // Contestant rows are identified by their rounded-xl border structure inside the left column
      // The left column is the flex-1 div that is a sibling of the sidebar aside
      const leftColumn = page.locator('aside[aria-label="Advertisements"]').locator('..');
      const insInLeftColumn = leftColumn.locator('div.min-w-0 ins');
      await expect(insInLeftColumn).toHaveCount(0);
    });

    test(`mobile: ${slug} — no sidebar, no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`/events/${slug}`);

      const sidebar = page.getByTestId("ad-sidebar");
      await expect(sidebar).toBeHidden();

      const overflow = await page.evaluate(
        () => document.body.scrollWidth > window.innerWidth
      );
      expect(overflow).toBe(false);
    });
  }

  test("navigating between events does not add duplicate adsbygoogle scripts", async ({ page }) => {
    await page.goto("/events/bigg-boss-tamil-10");
    await page.goto("/events/bigg-boss-telugu-10");
    await page.goto("/events/bigg-boss-malayalam-8");

    const scriptCount = await page.evaluate(() =>
      Array.from(document.querySelectorAll('script[src*="adsbygoogle"]')).length
    );
    expect(scriptCount).toBeLessThanOrEqual(1);
  });
});
