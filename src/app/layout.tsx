import type { Metadata } from "next";
import { Archivo, Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["wdth"],
});

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://apegate.io",
  ),
  title: {
    default: "Apegate — Ape through the gate",
    template: "%s · Apegate",
  },
  description:
    "Fresh Pump.fun launches pass through Kong's evidence-backed risk checks, with a receipt behind every call and manual wallet signing by default.",
  alternates: {
    canonical: "https://apegate.io",
  },
  icons: {
    icon: "/apegate-logo.jpg",
    apple: "/apegate-logo.jpg",
  },
  openGraph: {
    type: "website",
    url: "https://apegate.io",
    siteName: "Apegate",
    title: "Apegate — Ape through the gate",
    description:
      "See fresh Pump.fun launches, Kong's evidence-backed verdict, and the receipt behind every call.",
    images: ["/apegate-logo.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Apegate — Ape through the gate",
    description:
      "Fresh Pump.fun launch intelligence with evidence-backed verdicts and decision receipts.",
    images: ["/apegate-logo.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${display.variable} ${sans.variable} ${mono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
