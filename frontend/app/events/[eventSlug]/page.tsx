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
};

const VALID_SLUGS = new Set<EventSlug>(["bigg-boss-tamil-10", "bigg-boss-telugu-10"]);

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
  ];
}

export default async function EventRoute({ params }: Props) {
  const { eventSlug } = await params;
  if (!VALID_SLUGS.has(eventSlug as EventSlug)) notFound();
  return <EventPage eventSlug={eventSlug as EventSlug} />;
}
