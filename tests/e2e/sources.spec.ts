import { expect, test } from "@playwright/test";
import { login } from "./fixtures";

test.describe("Sources page", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("renders the seeded source from the SPA", async ({ page }) => {
    const sourcesResponse = page.waitForResponse(
      (resp) => resp.url().includes("/api/sources/") && resp.status() === 200,
    );

    await page.goto("/sources/");
    await sourcesResponse;

    await expect(page.getByRole("heading", { name: "Sources" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "E2E Source" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Greenhouse" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Active" })).toBeVisible();
  });
});
