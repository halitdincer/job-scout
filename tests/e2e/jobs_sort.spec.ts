import { expect, test } from "@playwright/test";
import { captureJobsResponse, login, waitForRows } from "./fixtures";

// The seed script plants exactly 300 rows titled "Listing 000" .. "Listing 299".
// With page_size=50 that's 6 pages. These tests lock in that sort runs on the
// server across the entire result set — the first ascending page starts at 000
// and the last ascending page ends at 299, which is only true if the server
// (not the current page of rows held by Tabulator) did the ordering.
test.describe("Jobs table server-side sort", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await waitForRows(page);
  });

  test("sort by title ascending covers the whole dataset", async ({ page }) => {
    // Trigger sort by clicking the Title header; capture the server response.
    const page1 = await captureJobsResponse(
      page,
      async () => {
        await page
          .locator('.tabulator-col[tabulator-field="title"] .tabulator-col-title')
          .click();
      },
      (url) => url.includes("sort=title%3Aasc"),
    );

    expect(page1.sort).toEqual([{ field: "title", dir: "asc" }]);
    expect(page1.page).toBe(1);
    expect(page1.total_pages).toBe(6);
    expect((page1.results[0] as { title: string }).title).toBe("Listing 000");

    // Walk to the last page via the pagination bar and verify the server
    // returns globally largest titles on page 6 — not merely the largest
    // 50 rows encountered during the initial fetch.
    await expect(page.locator("#page-info")).toContainText("Page 1 of 6");

    let latest = page1;
    for (let i = 0; i < 5; i += 1) {
      latest = await captureJobsResponse(
        page,
        async () => {
          await page.locator("#page-next").click();
        },
        (url) =>
          url.includes("sort=title%3Aasc") && url.includes(`page=${i + 2}`),
      );
    }

    expect(latest.page).toBe(6);
    expect(latest.results).toHaveLength(50);
    const titles = latest.results.map((r) => (r as { title: string }).title);
    expect(titles[0]).toBe("Listing 250");
    expect(titles[titles.length - 1]).toBe("Listing 299");
    await expect(page.locator("#page-info")).toContainText("Page 6 of 6");
  });

  test("sort descending flips the boundary rows", async ({ page }) => {
    // Click once → asc; click again → desc.
    await captureJobsResponse(
      page,
      async () => {
        await page
          .locator('.tabulator-col[tabulator-field="title"] .tabulator-col-title')
          .click();
      },
      (url) => url.includes("sort=title%3Aasc"),
    );

    const desc = await captureJobsResponse(
      page,
      async () => {
        await page
          .locator('.tabulator-col[tabulator-field="title"] .tabulator-col-title')
          .click();
      },
      (url) => url.includes("sort=title%3Adesc"),
    );

    expect(desc.sort).toEqual([{ field: "title", dir: "desc" }]);
    expect((desc.results[0] as { title: string }).title).toBe("Listing 299");
  });
});
