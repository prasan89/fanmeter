import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventPage, type EventSlug } from "./EventPage";
import { BreadcrumbSchema } from "@/components/seo/JsonLd";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://fanmeter.in";

interface EventMeta {
  title: string;
  description: string;
  h1: string;
  heroImage: string;
}

const EVENT_META: Record<EventSlug, EventMeta> = {
  "bigg-boss-tamil-10": {
    title:       "Bigg Boss Tamil 10 Eviction Nominees & Fan Rankings",
    description: "Check this week's Bigg Boss Tamil 10 eviction nominees and live fan rankings. Support your favourite contestant on FanMeter. Independent community poll — not an official Star Vijay vote.",
    h1:          "Bigg Boss Tamil 10",
    heroImage:   "https://media.housepulse.in/studio/season-featured/2026/09/1790407725774-9964eee2-d49a-4948-8581-cc38a8c1c2c4/master.webp",
  },
  "bigg-boss-telugu-10": {
    title:       "Bigg Boss Telugu 10 Eviction Nominees & Fan Rankings",
    description: "See this week's Bigg Boss Telugu Season 10 eviction nominees and live fan rankings. Support your favourite contestant on FanMeter. Independent community poll — not an official Star Maa vote.",
    h1:          "Bigg Boss Telugu 10",
    heroImage:   "https://media.housepulse.in/studio/season-featured/2026/08/1785688148489-telugu_bigg_boss/master.webp",
  },
  "bigg-boss-malayalam-8": {
    title:       "Bigg Boss Malayalam 8 Eviction Nominees & Fan Rankings",
    description: "Follow Bigg Boss Malayalam Season 8 — see this week's eviction nominees, live fan rankings, and support your favourite contestant on FanMeter. Independent community poll — not an official Asianet vote.",
    h1:          "Bigg Boss Malayalam 8",
    heroImage:   "https://media.housepulse.in/studio/season-featured/2026/09/1790407766213-b4d169bb-7b77-4462-9370-3d89fa064d35/master.webp",
  },
  "bigg-boss-kannada-13": {
    title:       "Bigg Boss Kannada 13 Eviction Nominees & Fan Rankings",
    description: "Track Bigg Boss Kannada Season 13 eviction nominees and live fan rankings. Support your favourite contestant on FanMeter. Independent community poll — not an official Colors Kannada vote.",
    h1:          "Bigg Boss Kannada 13",
    heroImage:   "https://media.housepulse.in/studio/season-featured/2026/09/1790407697190-04ad2e4e-2400-46e4-b2ca-bcc2ce44dd45/master.webp",
  },
  "bigg-boss-hindi-20": {
    title:       "Bigg Boss Hindi 20 Eviction Nominees & Fan Rankings",
    description: "View Bigg Boss Hindi Season 20 eviction nominees and live fan rankings on FanMeter. Support your favourite contestant. Independent community poll — not an official Colors TV or JioHotstar vote.",
    h1:          "Bigg Boss Hindi 20",
    heroImage:   "https://media.housepulse.in/studio/season-featured/2026/08/1785688715040-hindi_bigg_boss/master.webp",
  },
  "bigg-boss-bangla-3": {
    title:       "Bigg Boss Bangla 3 Eviction Nominees & Fan Rankings",
    description: "Check Bigg Boss Bangla Season 3 eviction nominees and fan rankings. Support your favourite contestant on FanMeter. Independent community poll — not an official Star Jalsha vote.",
    h1:          "Bigg Boss Bangla 3",
    heroImage:   "https://media.housepulse.in/studio/season-featured/2026/09/1788965542371-bigg-boss_bangla/master.webp",
  },
};

const VALID_SLUGS = new Set<EventSlug>(
  Object.keys(EVENT_META) as EventSlug[]
);

interface Props {
  params: Promise<{ eventSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventSlug } = await params;
  if (!VALID_SLUGS.has(eventSlug as EventSlug)) {
    return { title: "Event not found" };
  }
  const m = EVENT_META[eventSlug as EventSlug];
  const url = `${SITE_URL}/events/${eventSlug}`;

  return {
    title: m.title,
    description: m.description,
    alternates: { canonical: url },
    openGraph: {
      title: m.title,
      description: m.description,
      url,
      type: "website",
      images: [
        {
          url: m.heroImage,
          width: 1200,
          height: 630,
          alt: m.h1,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: m.title,
      description: m.description,
      images: [m.heroImage],
    },
  };
}

export async function generateStaticParams() {
  return (Object.keys(EVENT_META) as EventSlug[]).map((eventSlug) => ({
    eventSlug,
  }));
}

export default async function EventRoute({ params }: Props) {
  const { eventSlug } = await params;
  if (!VALID_SLUGS.has(eventSlug as EventSlug)) notFound();
  const m = EVENT_META[eventSlug as EventSlug];
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", href: "/" },
          { name: m.h1, href: `/events/${eventSlug}` },
        ]}
      />
      <EventPage eventSlug={eventSlug as EventSlug} />
    </>
  );
}
