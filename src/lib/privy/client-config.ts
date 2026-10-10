import type { PrivyClientConfig } from "@privy-io/react-auth";

export const PRIVY_CLIENT_CONFIG = {
  loginMethods: ["wallet"],
  appearance: {
    theme: "#080705",
    accentColor: "#ff4f1f",
    logo: "/apegate-logo.jpg",
    landingHeader: "Ape through the gate",
    loginMessage:
      "Connect a Solana wallet. Manual signing stays in your wallet.",
    showWalletLoginFirst: true,
    walletChainType: "solana-only",
    walletList: [
      "detected_solana_wallets",
      "phantom",
      "solflare",
      "backpack",
    ],
  },
  embeddedWallets: {
    ethereum: { createOnLogin: "off" },
    solana: { createOnLogin: "off" },
    showWalletUIs: false,
  },
} satisfies PrivyClientConfig;
