import { test, expect } from "@playwright/test";

/**
 * Guard against regression of official-sounding voting language.
 * These tests assert that banned phrases do NOT appear in the rendered UI,
 * and that approved fan-community language IS present where expected.
 */

const BANNED_PHRASES = [
  "vote to save",
  "vote to SAVE",
  "save your favourite",
  "Save Your Favourite",
  "show who you'd save",
  "who you'd save",
] as const;

const EVENT_SLUGS = [
  "bigg-boss-tamil-10",
  "bigg-boss-telugu-10",
  "bigg-boss-malayalam-8",
  "bigg-boss-kannada-13",
  "bigg-boss-hindi-20",
  "bigg-boss-bangla-3",
] as const;

// ── Eviction tab — no banned phrases in rendered text ─────────────────────────

test.describe("Eviction tab — fan-community language", () => {
  for (const slug of EVENT_SLUGS) {
    test(`${slug}: no official-sounding vote-to-save language in UI`, async ({ page }) => {
      await page.goto(`/events/${slug}`);
      // Wait for the page to fully render (heading is always present)
      await page.waitForSelector("h2", { timeout: 15_000 });

      const bodyText = (await page.locator("body").innerText()).toLowerCase();
      for (const phrase of BANNED_PHRASES) {
        expect(bodyText, `"${phrase}" should not appear on ${slug}`).not.toContain(
          phrase.toLowerCase()
        );
      }
    });
  }
});

// ── Eviction tab — approved language IS present ───────────────────────────────

test("bigg-boss-telugu-10: eviction tab shows 'Show Your Support' meta line", async ({ page }) => {
  await page.goto("/events/bigg-boss-telugu-10");
  // Wait for the eviction poll data to load (nominees appear)
  await page.waitForSelector('[aria-label^="Support"]', { timeout: 20_000 });

  const bodyText = await page.locator("body").innerText();
  expect(bodyText.toLowerCase()).toContain("show your support");
});

test("bigg-boss-telugu-10: eviction tab subtitle contains 'show your support'", async ({ page }) => {
  await page.goto("/events/bigg-boss-telugu-10");
  await page.waitForSelector("h2", { timeout: 15_000 });

  const subtitles = await page.locator("p").allInnerTexts();
  const hasApprovedSubtitle = subtitles.some(t =>
    t.toLowerCase().includes("show your support") ||
    t.toLowerCase().includes("support your favourite")
  );
  expect(hasApprovedSubtitle).toBe(true);
});

// ── Heart button aria-label — uses "Support" not "Give one favourite" ─────────

test("bigg-boss-tamil-10: heart button aria-label starts with 'Support'", async ({ page }) => {
  await page.goto("/events/bigg-boss-tamil-10");
  await page.waitForSelector('[aria-label^="Support"]', { timeout: 20_000 });

  const firstHeart = page.locator('[aria-label^="Support"]').first();
  const label = await firstHeart.getAttribute("aria-label");
  expect(label).toBeTruthy();
  expect(label!.toLowerCase()).toContain("support");
  expect(label!.toLowerCase()).not.toContain("give one favourite");
  expect(label!.toLowerCase()).not.toContain("save");
});

// ── Past-poll history — uses "supporters" not "saves" ────────────────────────

test("past poll rows: use 'supporters' not 'saves'", async ({ page }) => {
  // Navigate to a show that may have past poll history
  await page.goto("/events/bigg-boss-telugu-10");
  await page.waitForSelector("body", { timeout: 10_000 });

  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  // "saves" as a standalone count label should not appear
  // (the word may appear in other context like "image saves" — we match the specific pattern)
  const saveCountPattern = /\d[\d,]* saves\b/i;
  expect(saveCountPattern.test(bodyText)).toBe(false);
});
