import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppInitializer from "@/components/AppInitializer";
import OfflineBanner from "@/components/OfflineBanner";
import SyncDebugPanel from "@/components/SyncDebugPanel";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HireWire - Get Hired on the Wire",
  description: "Live hiring, real connections. Gamified job matching that actually works.",
  manifest: "/manifest.json",
  themeColor: "#00A8FF",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HireWire",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased`}
      >
        <AppInitializer>
          <OfflineBanner />
          {children}
          <SyncDebugPanel />
        </AppInitializer>
      </body>
    </html>
  );
}
