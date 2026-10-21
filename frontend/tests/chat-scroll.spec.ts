import { test, expect } from "@playwright/test";

test.describe("Comments panel scroll containment", () => {
  test("keeps the panel bounded and scrolls only the message list", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/events/bigg-boss-tamil-10");
    await page.waitForLoadState("domcontentloaded");

    const panel = page.locator('[role="region"][aria-label="Comments"]').first();
    await expect(panel).toBeVisible();

    const messageList = panel.locator('[aria-live="polite"][aria-label="Comments"]');
    await expect(messageList).toBeAttached();

    const metrics = await panel.evaluate((panelElement) => {
      const list = panelElement.querySelector(
        '[aria-live="polite"][aria-label="Comments"]'
      ) as HTMLElement | null;
      const composer = panelElement.querySelector("textarea") as HTMLElement | null;
      if (!list) throw new Error("Comments message list was not found");

      const panel = panelElement as HTMLElement;
      const panelStyle = getComputedStyle(panel);
      const listStyle = getComputedStyle(list);

      return {
        panelHeight: panel.getBoundingClientRect().height,
        panelOverflowY: panelStyle.overflowY,
        listClientHeight: list.clientHeight,
        listScrollHeight: list.scrollHeight,
        listOverflowY: listStyle.overflowY,
        listMinHeight: listStyle.minHeight,
        composerBottom: composer?.getBoundingClientRect().bottom ?? null,
        panelBottom: panel.getBoundingClientRect().bottom,
      };
    });

    expect(metrics.panelHeight).toBeGreaterThan(0);
    expect(metrics.panelHeight).toBeLessThanOrEqual(720);
    expect(metrics.panelOverflowY).toBe("hidden");
    expect(metrics.listOverflowY).toBe("auto");
    expect(metrics.listMinHeight).toBe("0px");

    // The composer must remain inside the bounded panel, not be pushed below it.
    if (metrics.composerBottom !== null) {
      expect(metrics.composerBottom).toBeLessThanOrEqual(metrics.panelBottom + 1);
    }

    // When there is enough history, overflow belongs to the message list itself.
    if (metrics.listScrollHeight > metrics.listClientHeight) {
      const before = await messageList.evaluate((el) => el.scrollTop);
      await messageList.evaluate((el) => { el.scrollTop = el.scrollHeight; });
      const after = await messageList.evaluate((el) => el.scrollTop);
      expect(after).toBeGreaterThanOrEqual(before);
    }
  });
});
