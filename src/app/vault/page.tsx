import type { Metadata } from "next";
import { VaultPreview } from "@/components/vault/vault-preview";
import { readPrivyVaultConfig } from "@/lib/privy/server";

export const metadata: Metadata = {
  title: "Privy Vault preview",
  description:
    "Preview Apegate's bounded Privy Vault policy without creating a signer or moving funds.",
};

export const dynamic = "force-dynamic";

export default function VaultPage() {
  return <VaultPreview readiness={readPrivyVaultConfig()} />;
}
