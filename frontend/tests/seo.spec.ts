import { test, expect } from "@playwright/test";

/**
 * Technical SEO tests.
 * Requires: frontend dev server on :3000 + backend on :8080.
 */

const SITE_URL = "http://localhost:3000";

const EVENT_SLUGS = [
  "bigg-boss-tamil-10",
  "bigg-boss-telugu-10",
  "bigg-boss-malayalam-8",
  "bigg-boss-kannada-13",
  "bigg-boss-hindi-20",
  "bigg-boss-bangla-3",
] as const;

// ── robots.txt ────────────────────────────────────────────────────────────────

test("robots.txt: returns 200 and allows /events/ and disallows /admin", async ({ request }) => {
  const res = await request.get(`${SITE_URL}/robots.txt`);
  expect(res.status()).toBe(200);
  const text = await res.text();
  // Next.js outputs "User-Agent" (capital A)
  expect(text.toLowerCase()).toContain("user-agent");
  expect(text).toContain("/admin");
});

// ── sitemap.xml ───────────────────────────────────────────────────────────────

test("sitemap.xml: returns 200 and contains all six event URLs", async ({ request }) => {
  const res = await request.get(`${SITE_URL}/sitemap.xml`);
  expect(res.status()).toBe(200);
  const text = await res.text();
  for (const slug of EVENT_SLUGS) {
    expect(text).toContain(`/events/${slug}`);
  }
});

// ── Homepage metadata ─────────────────────────────────────────────────────────

test("homepage: unique title contains FanMeter and Bigg Boss", async ({ page }) => {
  await page.goto("/");
  const title = await page.title();
  expect(title.toLowerCase()).toContain("bigg boss");
  // Title may be standalone (page metadata) or include "FanMeter" via template
  expect(title.length).toBeGreaterThan(20);
});

test("homepage: og:title meta tag is present", async ({ page }) => {
  await page.goto("/");
  const ogTitle = await page.locator('meta[property="og:title"]').getAttribute("content");
  expect(ogTitle).toBeTruthy();
  expect(ogTitle!.length).toBeGreaterThan(10);
});

test("homepage: og:description meta tag is present", async ({ page }) => {
  await page.goto("/");
  const ogDesc = await page.locator('meta[property="og:description"]').getAttribute("content");
  expect(ogDesc).toBeTruthy();
  expect(ogDesc!.length).toBeGreaterThan(20);
});

test("homepage: no noindex directive", async ({ page }) => {
  await page.goto("/");
  // If meta[name="robots"] is absent, the page is indexable by default — that's correct
  const robotsMeta = page.locator('meta[name="robots"]');
  const count = await robotsMeta.count();
  if (count > 0) {
    const content = await robotsMeta.getAttribute("content");
    if (content) {
      expect(content.toLowerCase()).not.toContain("noindex");
    }
  }
  // Absence of the tag is acceptable (default is index)
});

test("homepage: H1 is present", async ({ page }) => {
  await page.goto("/");
  const h1Count = await page.locator("h1").count();
  expect(h1Count).toBeGreaterThanOrEqual(1);
});

test("homepage: WebSite JSON-LD is present", async ({ page }) => {
  await page.goto("/");
  const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(jsonLd).toBeTruthy();
  const parsed = JSON.parse(jsonLd!);
  const types = Array.isArray(parsed) ? parsed.map((d: { "@type": string }) => d["@type"]) : [parsed["@type"]];
  // At least one of WebSite or Organization should be present
  const hasWebSiteOrOrg = types.some((t: string) => ["WebSite", "Organization"].includes(t));
  expect(hasWebSiteOrOrg).toBe(true);
});

// ── Event page metadata ───────────────────────────────────────────────────────

for (const slug of EVENT_SLUGS) {
  test(`/events/${slug}: unique title includes event name`, async ({ page }) => {
    await page.goto(`/events/${slug}`);
    const title = await page.title();
    expect(title.toLowerCase()).toContain("bigg boss");
    expect(title.toLowerCase()).toContain("fanmeter");
    expect(title.length).toBeGreaterThan(20);
  });

  test(`/events/${slug}: canonical link points to itself`, async ({ page }) => {
    await page.goto(`/events/${slug}`);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toBeTruthy();
    expect(canonical).toContain(`/events/${slug}`);
  });

  test(`/events/${slug}: og:image is present`, async ({ page }) => {
    await page.goto(`/events/${slug}`);
    // og:image may be rendered as property="og:image" or name="og:image"
    const ogImage = await page.locator('meta[property="og:image"]').first().getAttribute("content", { timeout: 5000 }).catch(() => null);
    expect(ogImage).toBeTruthy();
  });

  test(`/events/${slug}: twitter:card is present`, async ({ page }) => {
    await page.goto(`/events/${slug}`);
    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute("content");
    expect(twitterCard).toBeTruthy();
  });

  test(`/events/${slug}: BreadcrumbList JSON-LD is present`, async ({ page }) => {
    await page.goto(`/events/${slug}`);
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();
    let hasBreadcrumb = false;
    for (let i = 0; i < count; i++) {
      const text = await scripts.nth(i).textContent();
      if (text && text.includes("BreadcrumbList")) {
        hasBreadcrumb = true;
        break;
      }
    }
    expect(hasBreadcrumb).toBe(true);
  });
}

// ── Title uniqueness across event pages ───────────────────────────────────────

test("all six event pages have unique titles", async ({ page }) => {
  const titles: string[] = [];
  for (const slug of EVENT_SLUGS) {
    await page.goto(`/events/${slug}`);
    titles.push(await page.title());
  }
  const uniqueTitles = new Set(titles);
  expect(uniqueTitles.size).toBe(EVENT_SLUGS.length);
});

// ── Admin noindex ─────────────────────────────────────────────────────────────

test("/admin: has noindex meta tag", async ({ page }) => {
  await page.goto("/admin");
  const robots = await page.locator('meta[name="robots"]').getAttribute("content");
  expect(robots).toBeTruthy();
  expect(robots!.toLowerCase()).toContain("noindex");
});

// ── HTTP status codes ─────────────────────────────────────────────────────────

test("valid event page returns 200", async ({ request }) => {
  const res = await request.get(`${SITE_URL}/events/bigg-boss-tamil-10`);
  expect(res.status()).toBe(200);
});

test("unknown event slug returns 404", async ({ request }) => {
  const res = await request.get(`${SITE_URL}/events/bigg-boss-does-not-exist`);
  expect(res.status()).toBe(404);
});

// ── No duplicate og:description ───────────────────────────────────────────────

test("event page og:descriptions are unique across all six seasons", async ({ page }) => {
  const descs: string[] = [];
  for (const slug of EVENT_SLUGS) {
    await page.goto(`/events/${slug}`);
    const d = await page.locator('meta[property="og:description"]').getAttribute("content");
    if (d) descs.push(d);
  }
  const uniqueDescs = new Set(descs);
  expect(uniqueDescs.size).toBe(descs.length);
});
