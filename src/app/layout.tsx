import type { Metadata } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

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
  title: {
    default: "Apegate — Your ape crew for Pump.fun",
    template: "%s · Apegate",
  },
  description:
    "Apegate puts four ape agents on your Pump.fun plan: scout launches, watch entries, line up trades, and guard every exit.",
  icons: {
    icon: "/apegate-logo.jpg",
    apple: "/apegate-logo.jpg",
  },
  openGraph: {
    title: "Apegate — Your ape crew for Pump.fun",
    description:
      "Scout launches, watch entries, line up trades, and guard every exit with a readable decision tape.",
    images: ["/apegate-logo.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
