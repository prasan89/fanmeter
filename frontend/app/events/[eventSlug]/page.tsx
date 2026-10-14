import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventPage, type EventSlug } from "./EventPage";

const EVENT_META: Record<EventSlug, { title: string; description: string }> = {
  "bigg-boss-tamil-10": {
    title:       "Bigg Boss Tamil 10 — Vote & Rankings | FanMeter",
    description: "Vote for your favourite Bigg Boss Tamil 10 contestant and see live community rankings. Independent fan poll.",
  },
  "bigg-boss-telugu-10": {
    title:       "Bigg Boss Telugu 10 — Vote & Rankings | FanMeter",
    description: "Vote for your favourite Bigg Boss Telugu 10 contestant and see live community rankings. Independent fan poll.",
  },
  "bigg-boss-malayalam-8": {
    title:       "Bigg Boss Malayalam 8 — Vote & Rankings | FanMeter",
    description: "Vote for your favourite Bigg Boss Malayalam Season 8 contestant and see live community rankings. Independent fan poll.",
  },
  "bigg-boss-kannada-13": {
    title:       "Bigg Boss Kannada 13 — Vote & Rankings | FanMeter",
    description: "Vote for your favourite Bigg Boss Kannada Season 13 contestant and see live community rankings. Independent fan poll.",
  },
  "bigg-boss-hindi-20": {
    title:       "Bigg Boss Hindi 20 — Vote & Rankings | FanMeter",
    description: "Vote for your favourite Bigg Boss Hindi Season 20 contestant and see live community rankings. Independent fan poll.",
  },
  "bigg-boss-bangla-3": {
    title:       "Bigg Boss Bangla 3 — Vote & Rankings | FanMeter",
    description: "Vote for your favourite Bigg Boss Bangla Season 3 contestant and see live community rankings. Independent fan poll.",
  },
};

const VALID_SLUGS = new Set<EventSlug>([
  "bigg-boss-tamil-10",
  "bigg-boss-telugu-10",
  "bigg-boss-malayalam-8",
  "bigg-boss-kannada-13",
  "bigg-boss-hindi-20",
  "bigg-boss-bangla-3",
]);

interface Props {
  params: Promise<{ eventSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventSlug } = await params;
  if (!VALID_SLUGS.has(eventSlug as EventSlug)) return { title: "Event not found | FanMeter" };
  const meta = EVENT_META[eventSlug as EventSlug];
  return {
    title: meta.title,
    description: meta.description,
    openGraph: { title: meta.title, description: meta.description },
  };
}

export async function generateStaticParams() {
  return [
    { eventSlug: "bigg-boss-tamil-10" },
    { eventSlug: "bigg-boss-telugu-10" },
    { eventSlug: "bigg-boss-malayalam-8" },
    { eventSlug: "bigg-boss-kannada-13" },
    { eventSlug: "bigg-boss-hindi-20" },
    { eventSlug: "bigg-boss-bangla-3" },
  ];
}

export default async function EventRoute({ params }: Props) {
  const { eventSlug } = await params;
  if (!VALID_SLUGS.has(eventSlug as EventSlug)) notFound();
  return <EventPage eventSlug={eventSlug as EventSlug} />;
}
