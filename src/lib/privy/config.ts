export const PRIVY_VAULT_EXECUTION_ENABLED = false as const;
export const PRIVY_EXTERNAL_REVIEW_COMPLETE = false as const;

export type PrivyVaultEnvironment = Readonly<
  Record<string, string | undefined>
>;

export interface PrivyVaultReadiness {
  sdkInstalled: true;
  browserAppIdConfigured: boolean;
  appIdConfigured: boolean;
  appIdsMatch: boolean;
  appSecretConfigured: boolean;
  authorizationKeyConfigured: boolean;
  credentialsConfigured: boolean;
  readyForIntegration: boolean;
  executionEnabled: false;
  externalSecurityReviewComplete: false;
}

function configured(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function readPrivyVaultConfig(
  env: PrivyVaultEnvironment = process.env,
): PrivyVaultReadiness {
  const browserAppId = env.NEXT_PUBLIC_PRIVY_APP_ID?.trim() ?? "";
  const appId = env.PRIVY_APP_ID?.trim() ?? "";
  const browserAppIdConfigured = configured(browserAppId);
  const appIdConfigured = configured(appId);
  const appIdsMatch =
    browserAppIdConfigured && appIdConfigured && browserAppId === appId;
  const appSecretConfigured = configured(env.PRIVY_APP_SECRET);
  const authorizationKeyConfigured = configured(
    env.PRIVY_AUTHORIZATION_PRIVATE_KEY,
  );
  const credentialsConfigured =
    appIdConfigured && appSecretConfigured && authorizationKeyConfigured;

  return {
    sdkInstalled: true,
    browserAppIdConfigured,
    appIdConfigured,
    appIdsMatch,
    appSecretConfigured,
    authorizationKeyConfigured,
    credentialsConfigured,
    readyForIntegration:
      browserAppIdConfigured && appIdsMatch && credentialsConfigured,
    executionEnabled: PRIVY_VAULT_EXECUTION_ENABLED,
    externalSecurityReviewComplete: PRIVY_EXTERNAL_REVIEW_COMPLETE,
  };
}
