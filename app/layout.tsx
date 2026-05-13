import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteName = "Cyber Tokyo Runner";
const siteDescription =
  "Neon-soaked 2D cyberpunk Tokyo runner built with Next.js, TypeScript, and Phaser 3.";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const siteUrl = "https://yuki-0903.github.io/cyber-tokyo-runner/";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: siteName,
    template: `%s | ${siteName}`
  },
  description: siteDescription,
  keywords: [
    "Cyber Tokyo Runner",
    "Phaser 3",
    "Next.js game",
    "browser game",
    "cyberpunk",
    "Tokyo",
    "2D runner"
  ],
  authors: [{ name: "Yuki Ohta" }],
  creator: "Yuki Ohta",
  publisher: "Yuki Ohta",
  alternates: {
    canonical: siteUrl
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: siteUrl,
    siteName,
    title: siteName,
    description: siteDescription,
    images: [
      {
        url: "og-image.png",
        width: 1200,
        height: 630,
        alt: "Cyberpunk Tokyo alley game scene for Cyber Tokyo Runner"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    images: ["og-image.png"]
  },
  icons: {
    icon: [{ url: `${basePath}/favicon.png`, type: "image/png", sizes: "64x64" }],
    apple: [{ url: `${basePath}/apple-touch-icon.png`, sizes: "180x180", type: "image/png" }]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#05070f"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
