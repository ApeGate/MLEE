import { expect, test } from "@playwright/test";

test("home exposes the Gate-first paths", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  await expect(
    page.getByRole("heading", { name: /ape through the gate/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /open the live gate/i })).toHaveAttribute(
    "href",
    "/feed",
  );
  await expect(page.getByText("Official Apegate token", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /launch bay|prepare a launch/i })).toHaveCount(0);
  expect((await page.goto("/launch"))?.status()).toBe(404);
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

test("manual trade APIs reject malformed identifiers", async ({ page }) => {
  const prepare = await page.request.post("/api/trade/prepare", {
    data: {
      publicKey: "not-a-wallet",
      mint: "not-a-mint",
      amountSol: 0.01,
      slippagePct: 8,
    },
  });
  expect(prepare.status()).toBe(400);

  const status = await page.request.get(
    "/api/trade/status?signature=not-a-signature",
  );
  expect(status.status()).toBe(400);
});

test("live Gate exposes guarded entries, exits, receipts, and outcome tape", async ({
  page,
}) => {
  await page.route("**/api/live-fills", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        verified: true,
        source: "Helius mainnet RPC",
        wallet: "6hwUCrUfQwVNNUScKshSvksJK7rNC2JphioJztjdEEcr",
        checkedAt: Date.now(),
        fills: [
          {
            signature:
              "ciaZk9YFsrb34vadVU7itnnqFMTdCVwbDQBHquDDsNhFDZ6bADeCoxqEdWMiy7mQxLJKLAeUy7oGnwBLsahq3AT",
            mint: "BQAeeSowpwEx8Km8GcporcbuLKq4a7EQceH3F2qZpump",
            symbol: "BQA",
            side: "SELL",
            wallet: "6hwUCrUfQwVNNUScKshSvksJK7rNC2JphioJztjdEEcr",
            slot: 455149851,
            blockTime: 1760000000,
            solDelta: 0.004821792,
            tokenDelta: -122.964775,
            feeSol: 0.001005,
            receiptHash:
              "bb768c382b0ad9cd283a831f4bf78fe4ef9263c6157c9333ca1c9b22d5ecfb63",
            confirmed: true,
            solscan:
              "https://solscan.io/tx/ciaZk9YFsrb34vadVU7itnnqFMTdCVwbDQBHquDDsNhFDZ6bADeCoxqEdWMiy7mQxLJKLAeUy7oGnwBLsahq3AT",
          },
        ],
      }),
    });
  });
  await page.goto("/feed");
  await expect(
    page.getByRole("heading", { name: /new launches at the gate/i }),
  ).toBeVisible();
  await expect(page.getByText("Outcome tape", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sell 50%" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Exit 100%" })).toBeVisible();
  await expect(page.getByText(/exits never require a PASS/i)).toBeVisible();
  await expect(page.getByText("Mainnet fill receipts")).toBeVisible();
  await expect(page.getByText("1 confirmed")).toBeVisible();
  await expect(page.getByRole("link", { name: /open on solscan/i })).toBeVisible();
  await expect(page.getByText(/decision receipts · local tape/i)).toBeVisible();
});

test("paper desk writes an explicitly simulated fill", async ({ page }) => {
  await page.goto("/paper");
  await expect(page.getByText("Caesar's paper desk")).toBeVisible();
  await expect(page.getByText("Simulation is not execution.")).toBeVisible();
  const acknowledgement = page.getByRole("checkbox");
  await acknowledgement.waitFor({ state: "visible" });
  await acknowledgement.check();
  await page.getByRole("button", { name: /PAPER buy 0\.1 SOL/i }).click();
  await expect(page.getByText(/PAPER fill/i).first()).toBeVisible();
});

test("plan builder keeps rehearsed versions inactive", async ({ page }) => {
  await page.goto("/plans");
  await expect(
    page.getByRole("heading", { name: /rehearse\. then lock\./i }),
  ).toBeVisible();
  await expect(
    page.getByText(/PlanRunner and Privy signing remain locked/i),
  ).toBeVisible();
  await expect(page.getByText(/Eligibility only/i)).toHaveCount(0);
});

test("Vault creates only a disabled policy preview", async ({ page }) => {
  const statusResponse = await page.request.get("/api/vault/status");
  expect(statusResponse.ok()).toBe(true);
  expect(statusResponse.headers()["cache-control"]).toContain("no-store");
  const status = (await statusResponse.json()) as Record<string, unknown>;
  expect(status.sdkInstalled).toBe(true);
  expect(status.executionEnabled).toBe(false);
  expect(status.externalSecurityReviewComplete).toBe(false);
  expect(status.clientInitialized).toBe(status.clientConfigured);
  expect(status).not.toHaveProperty("appSecret");
  expect(status).not.toHaveProperty("authorizationPrivateKey");

  await page.goto("/vault");
  await page
    .getByPlaceholder("Paste your Solana address")
    .fill("So11111111111111111111111111111111111111112");
  await page.getByRole("button", { name: "Hash policy preview" }).click();
  await expect(page.getByText("Policy hash")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create Vault locked" }),
  ).toBeDisabled();
});

test("Lab replay leaves unsupported accuracy metrics blank", async ({ page }) => {
  await page.goto("/lab");
  await expect(
    page.getByRole("heading", { name: /show the gaps\. not a fake score\./i }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Run deterministic replay" })
    .click();
  await expect(page.getByText("Replay hash", { exact: true })).toBeVisible();
  await expect(page.getByText("Unavailable").first()).toBeVisible();
});

test("Rafiki requires a verified receipt and stays explain-only", async ({
  page,
}) => {
  await page.goto("/rafiki");
  await expect(
    page.getByRole("heading", { name: /ask why\. never what to buy\./i }),
  ).toBeVisible();
  await expect(page.getByText("No receipt to explain.")).toBeVisible();
  await expect(
    page.getByText(/Cannot trade, size, approve, or change exits/i),
  ).toBeVisible();
});
