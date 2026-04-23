import { expect, test } from "@playwright/test";
import { captureJobsResponse, login, waitForRows } from "./fixtures";

// Locks in that the custom pagination bar drives the server — the page size
// selector and Prev/Next buttons each trigger a new /api/jobs/ request with
// the right query params, and the Page X of Y label updates from the envelope
// response.
test.describe("Jobs table server-side pagination", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await waitForRows(page);
  });

  test("default page_size=50 returns a 6-page envelope", async ({ page }) => {
    // Read the most recent /api/jobs/ response (the one that rendered the
    // initial grid) by requesting it again via a no-op trigger.
    const initial = await captureJobsResponse(
      page,
      async () => {
        await page.reload();
        await waitForRows(page);
      },
    );

    expect(initial.page).toBe(1);
    expect(initial.page_size).toBe(50);
    expect(initial.count).toBe(300);
    expect(initial.total_pages).toBe(6);
    expect(initial.results).toHaveLength(50);
    await expect(page.locator("#page-info")).toContainText("Page 1 of 6");
  });

  test("page size 100 re-queries the server and shrinks total pages", async ({
    page,
  }) => {
    const envelope = await captureJobsResponse(
      page,
      async () => {
        await page.locator("#page-size-select").selectOption("100");
      },
      (url) => url.includes("page_size=100"),
    );

    expect(envelope.page_size).toBe(100);
    expect(envelope.total_pages).toBe(3);
    expect(envelope.results).toHaveLength(100);
    await expect(page.locator("#page-info")).toContainText("Page 1 of 3");
  });

  test("Next and Prev move across server pages", async ({ page }) => {
    const page2 = await captureJobsResponse(
      page,
      async () => {
        await page.locator("#page-next").click();
      },
      (url) => url.includes("page=2"),
    );
    expect(page2.page).toBe(2);
    await expect(page.locator("#page-info")).toContainText("Page 2 of 6");

    const page1 = await captureJobsResponse(
      page,
      async () => {
        await page.locator("#page-prev").click();
      },
      (url) => url.includes("page=1"),
    );
    expect(page1.page).toBe(1);
    await expect(page.locator("#page-info")).toContainText("Page 1 of 6");
  });
});
