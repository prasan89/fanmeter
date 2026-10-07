import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FanClash — Fandoms Battle Here",
  description: "Vote, support your favorites, discuss, and climb the leaderboard. FanClash is the ultimate fan engagement platform.",
  keywords: ["fan platform", "voting", "reality tv", "bigg boss", "music", "sports", "fandom"],
  openGraph: {
    title: "FanClash — Fandoms Battle Here",
    description: "Vote • Support • Discuss • Climb the Leaderboard",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-surface-secondary">
        <Header />
        <main className="pb-20 md:pb-0">{children}</main>
        <Footer />
        <MobileNav />
      </body>
    </html>
  );
}
