import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";

const mono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "CLEAT — Solana strategy desk",
  description:
    "CLEAT runs a Solana strategy: Scout filters coins, Watch waits for entries, Desk buys and exits within your rules.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${mono.variable} antialiased`}>{children}</body>
    </html>
  );
}
