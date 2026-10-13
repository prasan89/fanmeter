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
  title: "FanMeter — Bigg Boss Fan Community",
  description: "Vote for your favourite Bigg Boss Tamil 10 and Telugu 10 contestants. Community polls, live rankings, and fan battles. Not an official broadcaster vote.",
  keywords: ["bigg boss", "bigg boss tamil 10", "bigg boss telugu 10", "fan voting", "reality tv", "community poll"],
  openGraph: {
    title: "FanMeter — Bigg Boss Fan Community",
    description: "Vote for your favourite Bigg Boss contestant. Live community rankings and fan polls.",
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
      <body className="min-h-screen bg-slate-50">
        <Header />
        <main className="pb-16 md:pb-0">{children}</main>
        <Footer />
        <MobileNav />
      </body>
    </html>
  );
}
