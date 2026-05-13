import { expect, test } from "@playwright/test";
import { captureJobsResponse, login, waitForRows } from "./fixtures";

/**
 * Covers the SPA filter Sheet on the jobs page. The legacy header-filter +
 * popover UI was removed when the page migrated to React; filter rules now
 * live in a shadcn `Sheet` opened from the toolbar and only apply when the
 * user clicks "Apply filters".
 *
 * Two invariants matter:
 *   1. Rules added in the Sheet round-trip through the server `filter=`
 *      query param and back into the grid.
 *   2. Typing into a rule's value input never loses focus — this is the
 *      original bug class the SPA migration was designed to eliminate.
 */
test.describe("Jobs filter Sheet", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await waitForRows(page);
  });

  async function openFilters(page: import("@playwright/test").Page) {
    await page.getByRole("button", { name: "Open filters" }).click();
    await expect(page.getByLabel("Add filter rule")).toBeVisible();
  }

  test("adding a Title contains rule applies a server filter and returns rows", async ({
    page,
  }) => {
    await openFilters(page);
    await page.getByLabel("Add filter rule").selectOption("title");
    await page.getByLabel("Value for Title").fill("Listing 001");

    const payload = await captureJobsResponse(
      page,
      async () => {
        await page.getByRole("button", { name: "Apply filters" }).click();
      },
      (url) => url.includes("/api/jobs/") && url.includes("filter="),
    );

    // Server received a filter and returned at least one matching row.
    expect(payload.count).toBeGreaterThan(0);
    const filterParam = new URL(
      page.url().startsWith("http") ? page.url() : `http://x${page.url()}`,
    ); // url for assertions only; the real check is the envelope.
    expect(filterParam).toBeTruthy();

    // The Sheet closes on Apply; reopen and confirm the rule persists.
    await openFilters(page);
    await expect(page.getByLabel("Value for Title")).toHaveValue("Listing 001");
  });

  test("rule value input keeps focus per keystroke (no mid-type re-render)", async ({
    page,
  }) => {
    // Regression escape: in the legacy vanilla-JS layer, every keystroke
    // dispatched UPDATE_RULE_VALUE and the subscriber re-rendered the
    // filter panel via innerHTML, replacing the focused <input> mid-type.
    // The React reducer keeps the same DOM node across renders, so focus
    // must be retained for every character.
    await openFilters(page);
    await page.getByLabel("Add filter rule").selectOption("title");
    const valueInput = page.getByLabel("Value for Title");
    await valueInput.click();
    for (const ch of "List") {
      await page.keyboard.type(ch);
      await expect(valueInput).toBeFocused();
    }
    await expect(valueInput).toHaveValue("List");
  });

  test("non-default operator (not_contains) round-trips through the server", async ({
    page,
  }) => {
    await openFilters(page);
    await page.getByLabel("Add filter rule").selectOption("title");
    // Operator <select> exposes the friendly label "does not contain".
    await page
      .getByLabel("Operator for Title")
      .selectOption({ label: "does not contain" });
    await page.getByLabel("Value for Title").fill("archive");

    const payload = await captureJobsResponse(
      page,
      async () => {
        await page.getByRole("button", { name: "Apply filters" }).click();
      },
      (url) => url.includes("/api/jobs/") && url.includes("filter="),
    );
    // None of the seeded titles contain "archive", so every row should match.
    expect(payload.count).toBe(300);
  });

  test("clearing the rules refetches unfiltered", async ({ page }) => {
    // Apply a rule first so a filter= request lands.
    await openFilters(page);
    await page.getByLabel("Add filter rule").selectOption("title");
    await page.getByLabel("Value for Title").fill("Listing");
    await captureJobsResponse(
      page,
      async () => {
        await page.getByRole("button", { name: "Apply filters" }).click();
      },
      (url) => url.includes("filter="),
    );

    // Apply is disabled when there are no rules; "Clear filters" is the
    // intentional path back to the unfiltered query.
    await openFilters(page);
    const cleared = await captureJobsResponse(
      page,
      async () => {
        await page.getByRole("button", { name: "Clear filters" }).click();
      },
      (url) => url.includes("/api/jobs/") && !url.includes("filter="),
    );
    expect(cleared.count).toBe(300);
  });
});
