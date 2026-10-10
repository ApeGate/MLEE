import { describe, expect, it } from "vitest";
import { readPrivyVaultConfig } from "./config";

const COMPLETE_ENV = {
  NEXT_PUBLIC_PRIVY_APP_ID: "app_test",
  PRIVY_APP_ID: "app_test",
  PRIVY_APP_SECRET: "secret_test",
  PRIVY_AUTHORIZATION_PRIVATE_KEY: "private_key_test",
};

describe("readPrivyVaultConfig", () => {
  it("reports incomplete setup without exposing credential values", () => {
    const readiness = readPrivyVaultConfig({
      NEXT_PUBLIC_PRIVY_APP_ID: "app_browser",
      PRIVY_APP_ID: "app_server",
      PRIVY_APP_SECRET: "secret_should_not_escape",
    });

    expect(readiness).toMatchObject({
      sdkInstalled: true,
      browserAppIdConfigured: true,
      appIdConfigured: true,
      appIdsMatch: false,
      appSecretConfigured: true,
      authorizationKeyConfigured: false,
      clientConfigured: true,
      credentialsConfigured: false,
      readyForIntegration: false,
      readyForVaultAuthorization: false,
    });
    expect(JSON.stringify(readiness)).not.toContain("secret_should_not_escape");
    expect(JSON.stringify(readiness)).not.toContain("app_browser");
  });

  it("recognizes a complete matching setup but never enables execution", () => {
    expect(readPrivyVaultConfig(COMPLETE_ENV)).toEqual({
      sdkInstalled: true,
      browserAppIdConfigured: true,
      appIdConfigured: true,
      appIdsMatch: true,
      appSecretConfigured: true,
      authorizationKeyConfigured: true,
      clientConfigured: true,
      credentialsConfigured: true,
      readyForIntegration: true,
      readyForVaultAuthorization: true,
      executionEnabled: false,
      externalSecurityReviewComplete: false,
    });
  });

  it("separates client readiness from Vault authorization readiness", () => {
    const readiness = readPrivyVaultConfig({
      NEXT_PUBLIC_PRIVY_APP_ID: "app_test",
      PRIVY_APP_ID: "app_test",
      PRIVY_APP_SECRET: "secret_test",
    });

    expect(readiness.clientConfigured).toBe(true);
    expect(readiness.readyForIntegration).toBe(true);
    expect(readiness.readyForVaultAuthorization).toBe(false);
    expect(readiness.executionEnabled).toBe(false);
  });

  it("treats whitespace-only values as missing", () => {
    expect(
      readPrivyVaultConfig({
        ...COMPLETE_ENV,
        PRIVY_APP_SECRET: "   ",
      }).credentialsConfigured,
    ).toBe(false);
  });
});
