import { Metadata } from "next";
import { VotingPage } from "./VotingPage";

const SHOW_META: Record<string, { title: string; description: string }> = {
  "bigg-boss-tamil": {
    title: "Vote — Bigg Boss Tamil 10 | FanMeter",
    description:
      "Vote for your favourite Bigg Boss Tamil 10 contestant in the current eviction poll. Independent FanMeter community vote — not an official broadcaster result.",
  },
  "bigg-boss-telugu": {
    title: "Vote — Bigg Boss Telugu 10 | FanMeter",
    description:
      "Vote for your favourite Bigg Boss Telugu 10 contestant in the current eviction poll. Independent FanMeter community vote — not an official broadcaster result.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ showSlug: string }>;
}): Promise<Metadata> {
  const { showSlug } = await params;
  const meta = SHOW_META[showSlug];
  if (!meta) return { title: "Vote — FanMeter" };
  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
    },
  };
}

export default function Page({ params }: { params: Promise<{ showSlug: string }> }) {
  return <VotingPage paramsPromise={params} />;
}
