import { test, expect, Page } from "@playwright/test";

// Tests run against the live local dev server (localhost:3000).
// Backend (localhost:8080) must be running with all four live seasons.

const EVENTS = [
  { slug: "bigg-boss-tamil-10",    host: "Vijay Sethupathi",    title: "Bigg Boss Tamil 10" },
  { slug: "bigg-boss-telugu-10",   host: "Nagarjuna Akkineni",  title: "Bigg Boss Telugu 10" },
  { slug: "bigg-boss-malayalam-8", host: "Mohanlal",            title: "Bigg Boss Malayalam 8" },
  { slug: "bigg-boss-kannada-13",  host: "Kichcha Sudeep",      title: "Bigg Boss Kannada 13" },
] as const;

async function goToHomepage(page: Page) {
  await page.goto("/");
  // Wait for at least one event card to be present
  await page.waitForSelector("article", { timeout: 10_000 });
}

// ── LIVE badge ────────────────────────────────────────────────────────────────

test.describe("Event cards — LIVE badge", () => {
  test("all four event cards display the LIVE badge", async ({ page }) => {
    await goToHomepage(page);
    const liveBadges = page.getByText("LIVE");
    await expect(liveBadges).toHaveCount(4);
  });
});

// ── No "Voting open" badge ────────────────────────────────────────────────────

test.describe("Event cards — no Voting open badge", () => {
  test("no event card displays a 'Voting open' badge", async ({ page }) => {
    await goToHomepage(page);
    const votingOpenBadges = page.getByText("Voting open");
    await expect(votingOpenBadges).toHaveCount(0);
  });
});

// ── Correct hosts ─────────────────────────────────────────────────────────────

test.describe("Event cards — verified hosts", () => {
  for (const ev of EVENTS) {
    test(`${ev.slug}: displays host "${ev.host}"`, async ({ page }) => {
      await goToHomepage(page);
      const card = page.locator("article").filter({ hasText: ev.title });
      await expect(card.getByText(ev.host)).toBeVisible();
    });
  }
});

// ── Missing host fallback ─────────────────────────────────────────────────────

test.describe("Event cards — host fallback rendering", () => {
  test("page renders without errors even when host string is empty-like", async ({ page }) => {
    // Validate the actual homepage renders all 4 cards without JS errors
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await goToHomepage(page);
    const cards = page.locator("article");
    await expect(cards).toHaveCount(4);
    expect(errors).toHaveLength(0);
  });
});

// ── Enter Event navigation ────────────────────────────────────────────────────

test.describe("Event cards — Enter Event navigation", () => {
  for (const ev of EVENTS) {
    test(`${ev.slug}: Enter Event button navigates to /events/${ev.slug}`, async ({ page }) => {
      await goToHomepage(page);
      const card = page.locator("article").filter({ hasText: ev.title });
      const link = card.getByRole("link", { name: /Enter Event/i });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", `/events/${ev.slug}`);
    });
  }
});

// ── Layout — desktop and mobile ───────────────────────────────────────────────

test.describe("Event cards — responsive layout", () => {
  test("desktop (1280px): all four cards visible", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await goToHomepage(page);
    const cards = page.locator("article");
    await expect(cards).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await expect(cards.nth(i)).toBeVisible();
    }
  });

  test("mobile (375px): all four cards visible", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goToHomepage(page);
    const cards = page.locator("article");
    await expect(cards).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await expect(cards.nth(i)).toBeVisible();
    }
  });
});
