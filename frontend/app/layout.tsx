import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { WebSiteSchema, OrganizationSchema } from "@/components/seo/JsonLd";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fanmeter.in";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "FanMeter — Bigg Boss Fan Community",
    template: "%s | FanMeter",
  },
  description:
    "Independent community fan polls for Bigg Boss Tamil 10, Telugu 10, Malayalam 8, Kannada 13, Hindi 20 and Bangla 3. Live contestant rankings, eviction nominees, and fan favourites. Not an official broadcaster vote.",
  openGraph: {
    title: "FanMeter — Bigg Boss Fan Community",
    description:
      "Independent fan polls for Bigg Boss Tamil 10, Telugu 10, Malayalam 8, Kannada 13, Hindi 20 and Bangla 3. Live rankings and eviction nominees.",
    type: "website",
    url: SITE_URL,
    siteName: "FanMeter",
  },
  twitter: {
    card: "summary_large_image",
    title: "FanMeter — Bigg Boss Fan Community",
    description:
      "Independent fan polls for Bigg Boss Tamil, Telugu, Malayalam, Kannada, Hindi, and Bangla. Live rankings.",
  },
  alternates: {
    canonical: SITE_URL,
  },
};

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white">
        {/* AdSense script — loaded once, only when publisher ID is configured */}
        {ADSENSE_CLIENT && (
          <Script
            id="adsense-init"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
        )}
        <Header />
        <WebSiteSchema />
        <OrganizationSchema />
        <main className="pb-16 md:pb-0">{children}</main>
        <Footer />
        <MobileNav />
      </body>
    </html>
  );
}
