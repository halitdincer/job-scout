import { expect, test } from "@playwright/test";
import { login } from "./fixtures";

test.describe("Runs page", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("renders the seeded ingestion run from the SPA", async ({ page }) => {
    const runsResponse = page.waitForResponse(
      (resp) => resp.url().includes("/api/runs/") && resp.status() === 200,
    );

    await page.goto("/runs/");
    await runsResponse;

    await expect(
      page.getByRole("heading", { name: "Ingestion Runs" }),
    ).toBeVisible();
    await expect(page.getByRole("cell", { name: "#1" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "completed" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "300" })).toBeVisible();
  });
});
