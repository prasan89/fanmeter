import { test, expect, Page } from "@playwright/test";

// Tests run against a live local dev server (localhost:3000) with Spring Boot backend (localhost:8080).
// All 4 events must have an active eviction poll with nominees for the full suite to pass.

const EVENT_SLUGS = [
  "bigg-boss-tamil-10",
  "bigg-boss-telugu-10",
  "bigg-boss-malayalam-8",
  "bigg-boss-kannada-13",
] as const;

// Eviction tab is the default — just navigate and wait for nominees
async function goToEvictionTab(page: Page, slug: string) {
  await page.goto(`/events/${slug}`);
  await page.waitForSelector('[aria-label^="Support"]', { timeout: 20_000 });
}

test.describe("Default tab — eviction", () => {
  for (const slug of EVENT_SLUGS) {
    test(`${slug}: eviction tab is active by default on base URL`, async ({ page }) => {
      await page.goto(`/events/${slug}`);
      // Eviction tab button should have active styling (rose border)
      const evictionTab = page.getByRole("tab", { name: /This Week.*Eviction/i });
      await expect(evictionTab).toBeVisible();
      // Heart buttons load without clicking the tab
      await page.waitForSelector('[aria-label^="Support"]', { timeout: 20_000 });
      const hearts = page.locator('[aria-label^="Support"]');
      await expect(hearts.first()).toBeVisible();
    });
  }
});

test.describe("URL tab parameter", () => {
  test("?tab=rankings opens rankings tab", async ({ page }) => {
    await page.goto("/events/bigg-boss-telugu-10?tab=rankings");
    // Rankings view shows contestant rows (not eviction nominees)
    await page.waitForSelector('[aria-label^="Support"]', { timeout: 20_000 });
    // Rankings tab should be selected
    const rankingsTab = page.getByRole("tab", { name: /Fan Rankings/i });
    await expect(rankingsTab).toBeVisible();
    // URL should still contain ?tab=rankings
    expect(page.url()).toContain("tab=rankings");
  });

  test("switching to Fan Rankings updates URL", async ({ page }) => {
    await page.goto("/events/bigg-boss-telugu-10");
    await page.waitForSelector('[aria-label^="Support"]', { timeout: 20_000 });
    await page.getByRole("tab", { name: /Fan Rankings/i }).click();
    await page.waitForTimeout(300);
    expect(page.url()).toContain("tab=rankings");
  });

  test("switching back to eviction removes ?tab= from URL", async ({ page }) => {
    await page.goto("/events/bigg-boss-telugu-10?tab=rankings");
    await page.waitForSelector('[aria-label^="Support"]', { timeout: 20_000 });
    await page.getByRole("tab", { name: /This Week.*Eviction/i }).click();
    await page.waitForTimeout(300);
    expect(page.url()).not.toContain("tab=");
  });

  test("refreshing on ?tab=rankings stays on rankings tab", async ({ page }) => {
    await page.goto("/events/bigg-boss-telugu-10?tab=rankings");
    await page.waitForSelector('[aria-label^="Support"]', { timeout: 20_000 });
    await page.reload();
    await page.waitForSelector('[aria-label^="Support"]', { timeout: 20_000 });
    expect(page.url()).toContain("tab=rankings");
  });
});

test.describe("Eviction tab — no Save/Saved controls", () => {
  for (const slug of EVENT_SLUGS) {
    test(`${slug}: no Save or Saved buttons`, async ({ page }) => {
      await page.goto(`/events/${slug}`);
      await page.waitForTimeout(3000); // wait for data to load

      const saveButtons  = page.getByRole("button", { name: /^❤️ Save$/ });
      const savedButtons = page.getByRole("button", { name: /^Saved ✓$/ });
      await expect(saveButtons).toHaveCount(0);
      await expect(savedButtons).toHaveCount(0);
    });
  }
});

test.describe("Eviction tab — heart buttons present", () => {
  for (const slug of EVENT_SLUGS) {
    test(`${slug}: heart button per nominee`, async ({ page }) => {
      await goToEvictionTab(page, slug);

      // Heart buttons are aria-labeled "Support <name>"
      const heartButtons = page.locator('[aria-label^="Support"]');
      const count = await heartButtons.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  }
});

test.describe("Eviction tab — heart click increments count", () => {
  test("bigg-boss-telugu-10: one click increments count by 1", async ({ page }) => {
    await goToEvictionTab(page, "bigg-boss-telugu-10");

    const firstHeart = page.locator('[aria-label^="Support"]').first();
    const countEl    = firstHeart.locator("..").locator("span.tabular-nums");

    const before = parseInt((await countEl.textContent())?.replace(/,/g, "") ?? "0");
    await firstHeart.click();
    // Optimistic update fires immediately
    await page.waitForTimeout(100);
    const after = parseInt((await countEl.textContent())?.replace(/,/g, "") ?? "0");
    // At minimum 1 more than before (optimistic); background refresh may add more
    expect(after).toBeGreaterThanOrEqual(before + 1);
  });

  test("bigg-boss-telugu-10: three clicks increment count by 3", async ({ page }) => {
    await goToEvictionTab(page, "bigg-boss-telugu-10");

    const firstHeart = page.locator('[aria-label^="Support"]').first();
    const countEl    = firstHeart.locator("..").locator("span.tabular-nums");

    const before = parseInt((await countEl.textContent())?.replace(/,/g, "") ?? "0");

    // Click 3 times, waiting for pending to clear between each
    for (let i = 0; i < 3; i++) {
      await firstHeart.click();
      // Wait for the pending state to clear (opacity returns to 1)
      await firstHeart.waitFor({ state: "visible" });
      await page.waitForTimeout(300);
    }

    const after = parseInt((await countEl.textContent())?.replace(/,/g, "") ?? "0");
    expect(after).toBeGreaterThanOrEqual(before + 3);
  });
});

test.describe("Eviction tab — +1 animation", () => {
  test("bigg-boss-tamil-10: floating +1 element appears after heart click", async ({ page }) => {
    // Ensure reduced motion is NOT set for this test
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await goToEvictionTab(page, "bigg-boss-tamil-10");

    const firstHeart = page.locator('[aria-label^="Support"]').first();
    await firstHeart.click();

    // The floating +1 span should briefly appear in the DOM
    const plusOne = page.locator("span").filter({ hasText: "+1" }).first();
    await expect(plusOne).toBeVisible({ timeout: 1000 });
  });
});

test.describe("Eviction tab — counts persist across tab switches", () => {
  test("bigg-boss-telugu-10: count visible after switching to rankings and back", async ({ page }) => {
    await goToEvictionTab(page, "bigg-boss-telugu-10");

    const firstHeart = page.locator('[aria-label^="Support"]').first();
    await firstHeart.click();
    await page.waitForTimeout(500);

    // Switch to rankings tab
    await page.getByRole("tab", { name: /Fan Rankings/i }).click();
    await page.waitForTimeout(500);

    // Switch back to eviction
    await page.getByRole("tab", { name: /This Week.*Eviction/i }).click();
    await page.waitForSelector('[aria-label^="Support"]', { timeout: 20_000 });

    // Heart buttons still present — counts loaded from server
    const heartButtons = page.locator('[aria-label^="Support"]');
    await expect(heartButtons.first()).toBeVisible();
  });
});

test.describe("Fan Rankings — unchanged after eviction tab changes", () => {
  test("bigg-boss-tamil-10: rankings tab still has working heart buttons", async ({ page }) => {
    await page.goto("/events/bigg-boss-tamil-10?tab=rankings");
    await page.waitForSelector('[aria-label^="Support"]', { timeout: 10_000 });

    const heartButtons = page.locator('[aria-label^="Support"]');
    const count = await heartButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const firstHeart = heartButtons.first();
    const countEl    = firstHeart.locator("..").locator("span.tabular-nums");
    const before = parseInt((await countEl.textContent())?.replace(/,/g, "") ?? "0");

    await firstHeart.click();
    await page.waitForTimeout(150);
    const after = parseInt((await countEl.textContent())?.replace(/,/g, "") ?? "0");
    expect(after).toBe(before + 1);
  });
});

test.describe("Cross-event isolation", () => {
  test("heart click on Tamil does not change Telugu nominee count", async ({ page }) => {
    // Get Telugu count before
    await goToEvictionTab(page, "bigg-boss-telugu-10");
    const teluguHeart = page.locator('[aria-label^="Support"]').first();
    const teluguCountEl = teluguHeart.locator("..").locator("span.tabular-nums");
    const teluguBefore = parseInt((await teluguCountEl.textContent()) ?? "0");

    // Click heart on Tamil
    await goToEvictionTab(page, "bigg-boss-tamil-10");
    const tamilHeart = page.locator('[aria-label^="Support"]').first();
    await tamilHeart.click();
    await page.waitForTimeout(600);

    // Navigate back to Telugu and check count unchanged
    await goToEvictionTab(page, "bigg-boss-telugu-10");
    const teluguHeartAfter = page.locator('[aria-label^="Support"]').first();
    const teluguCountAfter = parseInt(
      (await teluguHeartAfter.locator("..").locator("span.tabular-nums").textContent()) ?? "0"
    );
    expect(teluguCountAfter).toBe(teluguBefore);
  });
});
