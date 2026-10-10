import type { Metadata } from "next";
import { VaultPreview } from "@/components/vault/vault-preview";

export const metadata: Metadata = {
  title: "Privy Vault preview",
  description:
    "Preview Apegate's bounded Privy Vault policy without creating a signer or moving funds.",
};

export default function VaultPage() {
  return (
    <VaultPreview
      appIdConfigured={Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID)}
      serverCredentialsConfigured={Boolean(
        process.env.PRIVY_APP_SECRET &&
          process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY,
      )}
    />
  );
}
