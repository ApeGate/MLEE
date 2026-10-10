import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getPrivyAuthorizationContext,
  getPrivyClient,
} from "./server";

const COMPLETE_ENV = {
  NEXT_PUBLIC_PRIVY_APP_ID: "app_test",
  PRIVY_APP_ID: "app_test",
  PRIVY_APP_SECRET: "secret_test",
  PRIVY_AUTHORIZATION_PRIVATE_KEY: "private_key_test",
};

describe("Privy server adapter", () => {
  it("builds the SDK client without a Vault authorization key or network request", () => {
    expect(
      getPrivyClient({
        PRIVY_APP_ID: "app_test",
        PRIVY_APP_SECRET: "secret_test",
      }),
    ).toBeDefined();
  });

  it("keeps the authorization key in the server authorization context", () => {
    expect(getPrivyAuthorizationContext(COMPLETE_ENV)).toEqual({
      authorization_private_keys: ["private_key_test"],
    });
  });

  it("rejects incomplete server credentials", () => {
    expect(() =>
      getPrivyClient({
        PRIVY_APP_ID: "app_test",
      }),
    ).toThrow("Privy server client credentials are incomplete");
  });

  it("requires the separate authorization key only for Vault signatures", () => {
    expect(() =>
      getPrivyAuthorizationContext({
        PRIVY_APP_ID: "app_test",
        PRIVY_APP_SECRET: "secret_test",
      }),
    ).toThrow("Privy Vault authorization key is not configured");
  });
});
