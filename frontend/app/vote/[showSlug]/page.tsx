import { Metadata } from "next";
import { VotingPage } from "./VotingPage";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fanmeter.in";

interface ShowMeta {
  label: string;
  eventSlug: string;
  description: string;
}

const SHOW_META: Record<string, ShowMeta> = {
  "bigg-boss-tamil": {
    label:      "Bigg Boss Tamil 10",
    eventSlug:  "bigg-boss-tamil-10",
    description:
      "Heart your favourite Bigg Boss Tamil 10 contestant to show who you'd save this week. Independent FanMeter community poll — not an official Star Vijay vote.",
  },
  "bigg-boss-telugu": {
    label:      "Bigg Boss Telugu 10",
    eventSlug:  "bigg-boss-telugu-10",
    description:
      "Heart your favourite Bigg Boss Telugu 10 contestant on FanMeter. Independent community poll — not an official Star Maa vote.",
  },
  "bigg-boss-malayalam": {
    label:      "Bigg Boss Malayalam 8",
    eventSlug:  "bigg-boss-malayalam-8",
    description:
      "Support your favourite Bigg Boss Malayalam 8 contestant on FanMeter. Independent community poll — not an official Asianet vote.",
  },
  "bigg-boss-kannada": {
    label:      "Bigg Boss Kannada 13",
    eventSlug:  "bigg-boss-kannada-13",
    description:
      "Heart your favourite Bigg Boss Kannada 13 contestant on FanMeter. Independent community poll — not an official Colors Kannada vote.",
  },
  "bigg-boss-hindi": {
    label:      "Bigg Boss Hindi 20",
    eventSlug:  "bigg-boss-hindi-20",
    description:
      "Support your favourite Bigg Boss Hindi 20 contestant on FanMeter. Independent community poll — not an official Colors TV vote.",
  },
  "bigg-boss-bangla": {
    label:      "Bigg Boss Bangla 3",
    eventSlug:  "bigg-boss-bangla-3",
    description:
      "Heart your favourite Bigg Boss Bangla 3 contestant on FanMeter. Independent community poll — not an official Star Jalsha vote.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ showSlug: string }>;
}): Promise<Metadata> {
  const { showSlug } = await params;
  const m = SHOW_META[showSlug];
  if (!m) return { title: "Fan Rankings | FanMeter", robots: { index: false } };

  // Canonical points to the primary event page — this is the same content
  const canonical = `${SITE_URL}/events/${m.eventSlug}`;
  return {
    title: `${m.label} Fan Rankings`,
    description: m.description,
    alternates: { canonical },
    openGraph: {
      title: `${m.label} Fan Rankings | FanMeter`,
      description: m.description,
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: `${m.label} Fan Rankings | FanMeter`,
      description: m.description,
    },
  };
}

export default function Page({ params }: { params: Promise<{ showSlug: string }> }) {
  return <VotingPage paramsPromise={params} />;
}
