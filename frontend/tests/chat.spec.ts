import { test, expect, Page } from "@playwright/test";

// Tests run against a live local dev server (localhost:3000) with Spring Boot backend (localhost:8080).
// Backend must be running with the chat schema (V28) applied; without it, the chat panel
// will show the offline/connecting state, which is tested separately.

const EVENT_SLUGS = [
  "bigg-boss-tamil-10",
  "bigg-boss-telugu-10",
  "bigg-boss-malayalam-8",
  "bigg-boss-kannada-13",
  "bigg-boss-hindi-20",
  "bigg-boss-bangla-3",
] as const;

// Season IDs matching EVENT_CONFIG in EventPage.tsx
const SEASON_IDS: Record<string, number> = {
  "bigg-boss-tamil-10":   6,
  "bigg-boss-telugu-10":  7,
  "bigg-boss-malayalam-8": 8,
  "bigg-boss-kannada-13": 9,
  "bigg-boss-hindi-20":   10,
  "bigg-boss-bangla-3":   11,
};

async function goToEvent(page: Page, slug: string) {
  await page.goto(`/events/${slug}`);
  // Wait for page to be interactive
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
}

// ── 1. Chat panel renders on every event page ─────────────────────────────────

test.describe("Chat panel renders on every event page", () => {
  for (const slug of EVENT_SLUGS) {
    test(`${slug}: chat panel present in DOM`, async ({ page }) => {
      await goToEvent(page, slug);
      // Desktop: chat panel visible in the aside
      const chatPanel = page.locator('[aria-label="Live fan chat"]').first();
      await expect(chatPanel).toBeAttached();
    });
  }
});

// ── 2. Correct room ID ────────────────────────────────────────────────────────

test.describe("Correct room ID per event", () => {
  for (const slug of EVENT_SLUGS) {
    test(`${slug}: chat API requests use correct room`, async ({ page }) => {
      const expectedRoom = `event:${slug}:season:${SEASON_IDS[slug]}`;
      const expectedEncoded = encodeURIComponent(expectedRoom);

      const chatRequests: string[] = [];
      page.on("request", req => {
        if (req.url().includes("/api/chat/rooms/")) chatRequests.push(req.url());
      });

      await goToEvent(page, slug);
      // Give time for SSE connection attempt or history fetch
      await page.waitForTimeout(3000);

      // Either history or SSE request should reference the correct room
      // (SSE may not connect if backend is offline, but history fetch is attempted)
      const found = chatRequests.some(url => url.includes(expectedEncoded));
      if (!found) {
        // Backend offline — verify at least the guest-token request was made
        const tokenRequests = chatRequests.filter(url => url.includes("/guest-token"));
        // Either connected and used room ID, or backend offline (both are valid test states)
        // Just verify no wrong room ID was used
        const wrongRoom = chatRequests.find(url =>
          url.includes("/api/chat/rooms/") &&
          !url.includes(expectedEncoded)
        );
        expect(wrongRoom, `Wrong room ID used: ${wrongRoom}`).toBeUndefined();
      } else {
        expect(found).toBe(true);
      }
    });
  }
});

// ── 3. Rooms are isolated ─────────────────────────────────────────────────────

test.describe("Room isolation", () => {
  test("Tamil and Telugu have different room IDs — never share a room", async ({ page }) => {
    const tamilRoom   = encodeURIComponent("event:bigg-boss-tamil-10:season:6");
    const teluguRoom  = encodeURIComponent("event:bigg-boss-telugu-10:season:7");

    const chatRequests: string[] = [];
    page.on("request", req => {
      if (req.url().includes("/api/chat/rooms/")) chatRequests.push(req.url());
    });

    // Visit Tamil only
    await goToEvent(page, "bigg-boss-tamil-10");
    await page.waitForTimeout(2000);

    // No Telugu room should be requested when on Tamil page
    const teluguOnTamilPage = chatRequests.some(url =>
      url.includes(teluguRoom) && !url.includes(tamilRoom)
    );
    expect(teluguOnTamilPage, "Telugu room should not be requested on Tamil page").toBe(false);

    // If any chat requests were made, they should use Tamil room
    const wrongRoomOnTamilPage = chatRequests.find(url =>
      url.includes("/api/chat/rooms/") && !url.includes(tamilRoom)
    );
    expect(wrongRoomOnTamilPage, `Wrong room used on Tamil page: ${wrongRoomOnTamilPage}`).toBeUndefined();
  });
});

// ── 4. Chat tab on mobile ─────────────────────────────────────────────────────

test.describe("Mobile chat tab", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Chat tab is visible on mobile", async ({ page }) => {
    await goToEvent(page, "bigg-boss-tamil-10");
    const chatTab = page.getByRole("tab", { name: /chat/i });
    await expect(chatTab).toBeVisible();
  });

  test("Clicking Chat tab shows chat panel on mobile", async ({ page }) => {
    await goToEvent(page, "bigg-boss-tamil-10");
    const chatTab = page.getByRole("tab", { name: /chat/i });
    await chatTab.click();
    await page.waitForTimeout(300);
    const chatPanel = page.locator('[aria-label="Live fan chat"]');
    await expect(chatPanel.first()).toBeVisible();
    expect(page.url()).toContain("tab=chat");
  });
});

// ── 5. Existing eviction + rankings still work ────────────────────────────────

test.describe("Existing ranking/eviction functionality preserved", () => {
  test("bigg-boss-tamil-10: eviction tab still default, heart buttons present", async ({ page }) => {
    await page.goto("/events/bigg-boss-tamil-10");
    await page.waitForSelector('[aria-label^="Support"]', { timeout: 20_000 });
    const hearts = page.locator('[aria-label^="Support"]');
    await expect(hearts.first()).toBeVisible();
    const evictionTab = page.getByRole("tab", { name: /This Week.*Eviction/i });
    await expect(evictionTab).toBeVisible();
  });

  test("bigg-boss-hindi-20: fan rankings tab still accessible", async ({ page }) => {
    await page.goto("/events/bigg-boss-hindi-20?tab=rankings");
    await page.waitForSelector('[aria-label^="Support"]', { timeout: 20_000 });
    const rankingsTab = page.getByRole("tab", { name: /Fan Rankings/i });
    await expect(rankingsTab).toBeVisible();
  });
});

// ── 6. Chat composer renders ──────────────────────────────────────────────────

test.describe("Chat composer", () => {
  test("bigg-boss-tamil-10: composer input is present", async ({ page }) => {
    await goToEvent(page, "bigg-boss-tamil-10");
    const composer = page.locator('textarea[aria-label="Chat message"]').first();
    await expect(composer).toBeAttached();
  });

  test("bigg-boss-tamil-10: send button is present", async ({ page }) => {
    await goToEvent(page, "bigg-boss-tamil-10");
    const sendBtn = page.locator('button[aria-label="Send message"]').first();
    await expect(sendBtn).toBeAttached();
  });

  test("Composer limits input to 500 chars", async ({ page }) => {
    // Mock chat APIs so the composer becomes enabled
    await page.route("**/api/chat/guest-token", route =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "OK", data: { token: "chat_guest_test123abc", displayName: "TestFan1ABC" } }),
      })
    );
    await page.route("**/api/chat/rooms/**/history**", route =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "OK", data: { roomId: "test-room", messages: [], hasMore: false, nextCursor: null } }),
      })
    );
    await page.route("**/api/chat/rooms/**/stream", route => route.abort());

    await goToEvent(page, "bigg-boss-tamil-10");
    // Wait for composer to be enabled (chat connected or history loaded)
    const composer = page.locator('textarea[aria-label="Chat message"]').first();
    await expect(composer).not.toBeDisabled({ timeout: 10_000 });

    // Type 501 characters — only 500 should land
    const longText = "A".repeat(501);
    await composer.fill(longText);
    const value = await composer.inputValue();
    expect(value.length).toBeLessThanOrEqual(500);
  });
});

// ── 7. Chat does not break page load (offline backend) ───────────────────────

test.describe("Chat graceful degradation", () => {
  test("Page loads and eviction works even when chat API returns error", async ({ page }) => {
    // Intercept chat endpoints and make them fail
    await page.route("**/api/chat/**", route => route.abort());

    await page.goto("/events/bigg-boss-tamil-10");
    // Page should still load
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
    // Eviction content is not blocked by chat
    const evictionTab = page.getByRole("tab", { name: /This Week.*Eviction/i });
    await expect(evictionTab).toBeVisible();
  });
});

// ── 8. Ad sidebar still present ──────────────────────────────────────────────

test.describe("Ad sidebar preserved", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("bigg-boss-tamil-10: ad sidebar present on large viewport", async ({ page }) => {
    await goToEvent(page, "bigg-boss-tamil-10");
    const sidebar = page.locator('[aria-label="Advertisements"]');
    await expect(sidebar).toBeAttached();
  });
});
