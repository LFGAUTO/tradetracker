import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LFG Trade Tracker",
  description: "Trade and appraisal tracking for LFG AUTO.",
  icons: { icon: "/logo.png" },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"
        />
      </head>
      <body className="min-h-screen bg-ink font-sans antialiased">{children}</body>
    </html>
  );
}
