import { GeistMono } from "geist/font/mono";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

import { SITE, SITE_URL } from "@/constants/site";

import "./globals.css";

// The system font comes first (SF on Apple devices, the island's own face);
// Inter is the fallback everywhere else. Geist Mono sets real code only.
const inter = localFont({
  src: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE.name, template: `%s | ${SITE.name}` },
  description: SITE.tagline,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfd" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

// suppressHydrationWarning: the site's theme provider sets the dark class on
// <html> before React hydrates.
const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en" className={`${inter.variable} ${GeistMono.variable}`} suppressHydrationWarning>
    <body>{children}</body>
  </html>
);

export default RootLayout;
