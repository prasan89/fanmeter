import { test, expect, Page } from "@playwright/test";

// Tests run against a live local dev server (localhost:3000) with Spring Boot backend (localhost:8080).
// All 4 events must have an active eviction poll with nominees for the full suite to pass.

const EVENT_SLUGS = [
  "bigg-boss-tamil-10",
  "bigg-boss-telugu-10",
  "bigg-boss-malayalam-8",
  "bigg-boss-kannada-13",
] as const;

async function goToEvictionTab(page: Page, slug: string) {
  await page.goto(`/events/${slug}`);
  // Click the eviction tab
  await page.getByRole("button", { name: /This Week.*Eviction/i }).click();
  // Wait for nominees to load (heart buttons appear)
  await page.waitForSelector('[aria-label^="Give one favourite"]', { timeout: 10_000 });
}

test.describe("Eviction tab — no Save/Saved controls", () => {
  for (const slug of EVENT_SLUGS) {
    test(`${slug}: no Save or Saved buttons`, async ({ page }) => {
      await page.goto(`/events/${slug}`);
      await page.getByRole("button", { name: /This Week.*Eviction/i }).click();
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

      // Heart buttons are aria-labeled "Give one favourite to <name>"
      const heartButtons = page.locator('[aria-label^="Give one favourite"]');
      const count = await heartButtons.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  }
});

test.describe("Eviction tab — heart click increments count", () => {
  test("bigg-boss-telugu-10: one click increments count by 1", async ({ page }) => {
    await goToEvictionTab(page, "bigg-boss-telugu-10");

    const firstHeart = page.locator('[aria-label^="Give one favourite"]').first();
    const countEl    = firstHeart.locator("..").locator("span.tabular-nums");

    const before = parseInt((await countEl.textContent()) ?? "0");
    await firstHeart.click();
    // Optimistic update fires immediately
    await page.waitForTimeout(100);
    const after = parseInt((await countEl.textContent()) ?? "0");
    // At minimum 1 more than before (optimistic); background refresh may add more
    expect(after).toBeGreaterThanOrEqual(before + 1);
  });

  test("bigg-boss-telugu-10: three clicks increment count by 3", async ({ page }) => {
    await goToEvictionTab(page, "bigg-boss-telugu-10");

    const firstHeart = page.locator('[aria-label^="Give one favourite"]').first();
    const countEl    = firstHeart.locator("..").locator("span.tabular-nums");

    const before = parseInt((await countEl.textContent()) ?? "0");

    // Click 3 times, waiting for pending to clear between each
    for (let i = 0; i < 3; i++) {
      await firstHeart.click();
      // Wait for the pending state to clear (opacity returns to 1)
      await firstHeart.waitFor({ state: "visible" });
      await page.waitForTimeout(300);
    }

    const after = parseInt((await countEl.textContent()) ?? "0");
    expect(after).toBeGreaterThanOrEqual(before + 3);
  });
});

test.describe("Eviction tab — +1 animation", () => {
  test("bigg-boss-tamil-10: floating +1 element appears after heart click", async ({ page }) => {
    // Ensure reduced motion is NOT set for this test
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await goToEvictionTab(page, "bigg-boss-tamil-10");

    const firstHeart = page.locator('[aria-label^="Give one favourite"]').first();
    await firstHeart.click();

    // The floating +1 span should briefly appear in the DOM
    const plusOne = page.locator("span").filter({ hasText: "+1" }).first();
    await expect(plusOne).toBeVisible({ timeout: 1000 });
  });
});

test.describe("Eviction tab — counts persist across tab switches", () => {
  test("bigg-boss-telugu-10: count visible after switching to rankings and back", async ({ page }) => {
    await goToEvictionTab(page, "bigg-boss-telugu-10");

    const firstHeart = page.locator('[aria-label^="Give one favourite"]').first();
    await firstHeart.click();
    await page.waitForTimeout(500);

    // Switch to rankings tab
    await page.getByRole("button", { name: /Fan Rankings/i }).click();
    await page.waitForTimeout(500);

    // Switch back to eviction
    await page.getByRole("button", { name: /This Week.*Eviction/i }).click();
    await page.waitForSelector('[aria-label^="Give one favourite"]', { timeout: 8000 });

    // Heart buttons still present — counts loaded from server
    const heartButtons = page.locator('[aria-label^="Give one favourite"]');
    await expect(heartButtons.first()).toBeVisible();
  });
});

test.describe("Fan Rankings — unchanged after eviction tab changes", () => {
  test("bigg-boss-tamil-10: rankings tab still has working heart buttons", async ({ page }) => {
    await page.goto("/events/bigg-boss-tamil-10");
    await page.waitForSelector('[aria-label^="Give one favourite"]', { timeout: 10_000 });

    const heartButtons = page.locator('[aria-label^="Give one favourite"]');
    const count = await heartButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const firstHeart = heartButtons.first();
    const countEl    = firstHeart.locator("..").locator("span.tabular-nums");
    const before = parseInt((await countEl.textContent()) ?? "0");

    await firstHeart.click();
    await page.waitForTimeout(150);
    const after = parseInt((await countEl.textContent()) ?? "0");
    expect(after).toBe(before + 1);
  });
});

test.describe("Cross-event isolation", () => {
  test("heart click on Tamil does not change Telugu nominee count", async ({ page }) => {
    // Get Telugu count before
    await goToEvictionTab(page, "bigg-boss-telugu-10");
    const teluguHeart = page.locator('[aria-label^="Give one favourite"]').first();
    const teluguCountEl = teluguHeart.locator("..").locator("span.tabular-nums");
    const teluguBefore = parseInt((await teluguCountEl.textContent()) ?? "0");

    // Click heart on Tamil
    await goToEvictionTab(page, "bigg-boss-tamil-10");
    const tamilHeart = page.locator('[aria-label^="Give one favourite"]').first();
    await tamilHeart.click();
    await page.waitForTimeout(600);

    // Navigate back to Telugu and check count unchanged
    await goToEvictionTab(page, "bigg-boss-telugu-10");
    const teluguHeartAfter = page.locator('[aria-label^="Give one favourite"]').first();
    const teluguCountAfter = parseInt(
      (await teluguHeartAfter.locator("..").locator("span.tabular-nums").textContent()) ?? "0"
    );
    expect(teluguCountAfter).toBe(teluguBefore);
  });
});
