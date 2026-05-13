import { expect, test } from "@playwright/test";

test.describe("Login page", () => {
  test("renders the SPA form and reports invalid credentials inline", async ({
    page,
  }) => {
    await page.goto("/accounts/login/");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await page.getByLabel("Username").fill("e2e");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByText("Please enter a correct username and password."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/accounts\/login\//);
  });
});
