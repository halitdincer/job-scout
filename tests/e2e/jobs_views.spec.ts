import { expect, test } from "@playwright/test";
import { login, waitForRows } from "./fixtures";

// Full saved-view round-trip: create a view with a non-default page size
// and a non-default sort, reload, load the view, and confirm the UI matches
// what was persisted. Also verifies that the Modified badge clears on load
// and reappears on drift.
test.describe("Jobs saved views", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await waitForRows(page);

    // Make absolutely sure we start from a clean slate — a previous failed
    // run may have leaked a named view.
    await page.evaluate(async () => {
      const resp = await fetch("/api/views/", { method: "GET" });
      const views = await resp.json();
      for (const v of views) {
        await fetch(`/api/views/${v.id}/`, { method: "DELETE" });
      }
    });
  });

  test("round-trip filter/columns/sort/page_size via save-as-new", async ({
    page,
  }) => {
    const viewName = `e2e view ${Date.now()}`;

    // Change page size to 100 and sort by title ascending; these are the
    // observable fields we'll assert after reload.
    const resize = page.waitForResponse((resp) =>
      resp.url().includes("/api/jobs/") && resp.url().includes("page_size=100")
    );
    await page.locator("#page-size-select").selectOption("100");
    await resize;
    await waitForRows(page);

    const sortResp = page.waitForResponse((resp) =>
      resp.url().includes("/api/jobs/") &&
      resp.url().includes("sort=title%3Aasc")
    );
    // The Title column header now carries a filter widget on the bottom
    // row; click the title label area specifically so Tabulator's sort
    // handler fires (center-clicking the whole column lands on the
    // filter input).
    await page
      .locator('.tabulator-col[tabulator-field="title"] .tabulator-col-title')
      .click();
    await sortResp;
    await waitForRows(page);

    // Open the save dropdown and choose "Save as new view".
    await page.locator("#save-trigger").click();
    await page.locator("#save-as-new").click();
    await page.locator("#save-dialog-name").fill(viewName);
    await page
      .locator("#save-dialog button[type='submit']")
      .click();

    // Modified badge should be hidden immediately after save.
    await expect(page.locator("#view-modified")).toBeHidden();
    await expect(page.locator("#views-select")).toHaveValue(/\d+/);

    // Hard reload and reapply by selecting the view from the dropdown.
    await page.reload();
    await waitForRows(page);

    const reloadFetch = page.waitForResponse((resp) =>
      resp.url().includes("/api/jobs/") &&
      resp.url().includes("sort=title%3Aasc") &&
      resp.url().includes("page_size=100")
    );
    await page.locator("#views-select").selectOption({ label: viewName });
    await reloadFetch;
    await waitForRows(page);

    // Page size + sort restored → 300 rows / 100 = 3 pages, first row 000.
    await expect(page.locator("#page-info")).toContainText("Page 1 of 3");
    await expect(page.locator("#view-modified")).toBeHidden();
    const firstTitle = await page
      .locator('#jobs-grid .tabulator-cell[tabulator-field="title"]')
      .first()
      .textContent();
    expect(firstTitle?.trim()).toBe("Listing 000");
  });

  test("dirty badge appears on drift and clears on revert", async ({ page }) => {
    const viewName = `drift view ${Date.now()}`;

    // Save a vanilla view (defaults) so we have a snapshot to drift against.
    await page.locator("#save-trigger").click();
    await page.locator("#save-as-new").click();
    await page.locator("#save-dialog-name").fill(viewName);
    await page
      .locator("#save-dialog button[type='submit']")
      .click();
    // Wait for the POST to settle AND the dialog to close — otherwise the
    // modal overlay can still block the page-size select below.
    await expect(page.locator("#save-dialog")).not.toBeVisible();
    await expect(page.locator("#view-modified")).toBeHidden();

    // Change page size → dirty.
    const resize = page.waitForResponse((resp) =>
      resp.url().includes("/api/jobs/") && resp.url().includes("page_size=100")
    );
    await page.locator("#page-size-select").selectOption("100");
    await resize;
    await waitForRows(page);
    await expect(page.locator("#view-modified")).toBeVisible();

    // Revert → clean again.
    const revert = page.waitForResponse((resp) =>
      resp.url().includes("/api/jobs/") && resp.url().includes("page_size=50")
    );
    await page.locator("#page-size-select").selectOption("50");
    await revert;
    await waitForRows(page);
    await expect(page.locator("#view-modified")).toBeHidden();
  });

  test("loading a view with a Title filter populates the Title header input", async ({
    page,
  }) => {
    const viewName = `title view ${Date.now()}`;

    // Apply a Title contains rule via the merged Columns & Filters panel.
    await page.locator("#open-filters-panel").click();
    const titleSection = page.locator('[data-filter-section="title"]');
    await titleSection.locator("button", { hasText: "+ Rule" }).click();
    await titleSection
      .locator(".filter-rule-value input")
      .first()
      .fill("Listing 001");

    const apply = page.waitForResponse((r) =>
      r.url().includes("/api/jobs/") && r.url().includes("filter=")
    );
    await page.locator("#apply-filters").click();
    await apply;

    // Close the filters panel — it overlays the toolbar, so #save-trigger
    // is not clickable while open.
    await page.keyboard.press("Escape");
    await expect(page.locator("#filters-panel")).not.toHaveClass(/open/);

    // Save it.
    await page.locator("#save-trigger").click();
    await page.locator("#save-as-new").click();
    await page.locator("#save-dialog-name").fill(viewName);
    await page.locator("#save-dialog button[type='submit']").click();
    await expect(page.locator("#view-modified")).toBeHidden();

    // Hard reload + load the view from the dropdown. The Title header
    // filter input should reflect the persisted rule value — this is
    // the regression the filter refactor was intended to fix, where
    // the header input would drift out of sync with store state.
    await page.reload();
    await waitForRows(page);
    await page.locator("#views-select").selectOption({ label: viewName });

    await expect(
      page.locator(
        '.tabulator-col[tabulator-field="title"] .tabulator-header-filter input'
      )
    ).toHaveValue("Listing 001");
  });
});
