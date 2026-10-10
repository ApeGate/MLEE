import { expect, test } from "@playwright/test";

test("home exposes the Gate-first paths", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /ape through the gate/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /open the live gate/i })).toHaveAttribute(
    "href",
    "/feed",
  );
  await expect(page.getByText("Official Apegate token", { exact: true })).toBeVisible();
});

test("official token registry never fabricates a CA", async ({ page }) => {
  await page.goto("/token");
  await expect(
    page.getByRole("heading", { name: /verify before you ape/i }),
  ).toBeVisible();
  await expect(page.getByText("Official contract address")).toBeVisible();
  await expect(page.getByText(/buy (route|official)/i)).toBeVisible();
});

test("crew page publishes permissions and boundaries", async ({ page }) => {
  await page.goto("/crew");
  await expect(
    page.getByRole("heading", { name: /every ape has a hard stop/i }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kong" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rafiki" })).toBeVisible();
  await expect(page.getByText(/trade, size, approve, or change exits/i)).toBeVisible();
});

test("coin dossier has an honest unavailable state", async ({ page }) => {
  await page.goto("/coin/not-a-solana-mint");
  await expect(page.getByText("Public coin dossier")).toBeVisible();
  await expect(page.getByText("Live dossier unavailable.")).toBeVisible();
  await expect(page.getByText(/will not turn missing reads into a PASS/i)).toBeVisible();
});
