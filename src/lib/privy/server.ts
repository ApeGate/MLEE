import "server-only";

import {
  PrivyClient,
  type AuthorizationContext,
} from "@privy-io/node";
import {
  readPrivyVaultConfig,
  type PrivyVaultEnvironment,
} from "./config";

export { readPrivyVaultConfig } from "./config";

function requireValue(
  env: PrivyVaultEnvironment,
  name:
    | "PRIVY_APP_ID"
    | "PRIVY_APP_SECRET"
    | "PRIVY_AUTHORIZATION_PRIVATE_KEY",
): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Privy Vault is missing ${name}`);
  }
  return value;
}

function requireServerClientCredentials(env: PrivyVaultEnvironment) {
  const readiness = readPrivyVaultConfig(env);
  if (!readiness.clientConfigured) {
    throw new Error("Privy server client credentials are incomplete");
  }

  return {
    appId: requireValue(env, "PRIVY_APP_ID"),
    appSecret: requireValue(env, "PRIVY_APP_SECRET"),
  };
}

export function getPrivyClient(
  env: PrivyVaultEnvironment = process.env,
): PrivyClient {
  const credentials = requireServerClientCredentials(env);
  return new PrivyClient({
    appId: credentials.appId,
    appSecret: credentials.appSecret,
  });
}

export function getPrivyAuthorizationContext(
  env: PrivyVaultEnvironment = process.env,
): AuthorizationContext {
  const readiness = readPrivyVaultConfig(env);
  if (!readiness.authorizationKeyConfigured) {
    throw new Error("Privy Vault authorization key is not configured");
  }
  return {
    authorization_private_keys: [
      requireValue(env, "PRIVY_AUTHORIZATION_PRIVATE_KEY"),
    ],
  };
}
