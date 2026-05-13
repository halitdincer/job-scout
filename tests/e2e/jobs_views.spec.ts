import { expect, test } from "@playwright/test";
import { captureJobsResponse, login, waitForRows } from "./fixtures";

/**
 * Saved-view round-trip against the SPA. The legacy `<select id="views-select">`
 * + Modified badge UI was replaced by:
 *   - a shadcn `DropdownMenu` toggled by the "Saved views" button,
 *   - a shadcn `Dialog` for save / save-as,
 *   - a shadcn `Dialog` for delete confirmation.
 *
 * The Modified ("dirty") badge has no equivalent in the SPA — there is no
 * client-side dirty tracking — so the corresponding legacy spec is dropped.
 * The remaining invariants are:
 *   1. Save → reload → load by name persists filter + sort + page_size.
 *   2. Loading a view with a Title filter restores the rule value in the
 *      filter Sheet (regression escape: the legacy header-filter input
 *      used to drift out of sync with store state).
 */
test.describe("Jobs saved views", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await waitForRows(page);

    // A previous failed run may have leaked a named view — start clean.
    await page.evaluate(async () => {
      const resp = await fetch("/api/views/", { method: "GET" });
      const views = await resp.json();
      for (const v of views) {
        await fetch(`/api/views/${v.id}/`, {
          method: "DELETE",
          headers: {
            "X-CSRFToken":
              document.cookie
                .split("; ")
                .find((c) => c.startsWith("csrftoken="))
                ?.split("=")[1] ?? "",
          },
          credentials: "same-origin",
        });
      }
    });
  });

  async function openSavedViewsMenu(page: import("@playwright/test").Page) {
    await page.getByRole("button", { name: "Saved views" }).click();
  }

  async function saveAsNewView(
    page: import("@playwright/test").Page,
    name: string,
  ) {
    await openSavedViewsMenu(page);
    await page.getByRole("menuitem", { name: "Save as new view…" }).click();
    await page.getByLabel("Name").fill(name);
    await page.getByRole("button", { name: "Save view" }).click();
    // Dialog dismisses on success.
    await expect(page.getByRole("dialog")).toBeHidden();
  }

  test("save-as-new round-trips filter, sort, and page_size", async ({
    page,
  }) => {
    const viewName = `e2e view ${Date.now()}`;

    // Page size 100 (default 50) and sort by title ascending via the
    // Tabulator column header.
    await captureJobsResponse(
      page,
      async () => {
        await page.getByLabel("Page size").selectOption("100");
      },
      (url) => url.includes("page_size=100"),
    );
    await waitForRows(page);

    await captureJobsResponse(
      page,
      async () => {
        await page
          .locator(
            '.tabulator-col[tabulator-field="title"] .tabulator-col-title',
          )
          .click();
      },
      (url) => url.includes("sort=title%3Aasc"),
    );
    await waitForRows(page);

    await saveAsNewView(page, viewName);

    // Hard reload — TanStack Query cache is wiped, view must come from server.
    await page.reload();
    await waitForRows(page);

    // Load by name from the dropdown and confirm the saved sort + page_size
    // arrive on the wire.
    const reloaded = await captureJobsResponse(
      page,
      async () => {
        await openSavedViewsMenu(page);
        await page.getByRole("menuitem", { name: viewName }).click();
      },
      (url) =>
        url.includes("sort=title%3Aasc") && url.includes("page_size=100"),
    );

    expect(reloaded.page_size).toBe(100);
    expect(reloaded.sort[0]).toEqual({ field: "title", dir: "asc" });
    // 300 seeded rows / 100 page size = 3 pages.
    expect(reloaded.total_pages).toBe(3);
    await expect(page.locator("#page-info")).toContainText("Page 1 of 3");
  });

  test("loading a view with a Title filter restores the rule in the Sheet", async ({
    page,
  }) => {
    const viewName = `title view ${Date.now()}`;

    // Apply a Title contains rule via the Sheet.
    await page.getByRole("button", { name: "Open filters" }).click();
    await page.getByLabel("Add filter rule").selectOption("title");
    await page.getByLabel("Value for Title").fill("Listing 001");
    await captureJobsResponse(
      page,
      async () => {
        await page.getByRole("button", { name: "Apply filters" }).click();
      },
      (url) => url.includes("filter="),
    );

    // Save under a name.
    await saveAsNewView(page, viewName);

    // Hard reload, then load the view from the menu.
    await page.reload();
    await waitForRows(page);

    await captureJobsResponse(
      page,
      async () => {
        await openSavedViewsMenu(page);
        await page.getByRole("menuitem", { name: viewName }).click();
      },
      (url) => url.includes("/api/jobs/") && url.includes("filter="),
    );

    // The rule's value input in the Sheet should reflect the persisted value
    // — this is the regression class the SPA migration was designed to fix
    // (legacy header inputs used to drift out of sync with store state).
    await page.getByRole("button", { name: "Open filters" }).click();
    await expect(page.getByLabel("Value for Title")).toHaveValue("Listing 001");
  });
});
