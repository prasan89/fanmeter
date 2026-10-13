import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle } from "lucide-react";
import { getShowSeasons, getActiveRound } from "@/lib/api";

export const metadata: Metadata = {
  title: "FanMeter — Bigg Boss Fan Voting",
  description:
    "Vote for your favourite Bigg Boss contestant. Independent community polls for Tamil 10, Telugu 10, Malayalam 8, and Kannada 13.",
  openGraph: {
    title: "FanMeter — Bigg Boss Fan Voting",
    description: "Independent community voting for Bigg Boss Tamil 10, Telugu 10, Malayalam 8, and Kannada 13.",
    type: "website",
  },
};

const EVENTS = [
  {
    eventSlug:   "bigg-boss-tamil-10",
    showSlug:    "bigg-boss-tamil",
    title:       "Bigg Boss Tamil 10",
    subtitle:    "Season 10 · Carnivizha",
    host:        "Vijay Sethupathi",
    network:     "Star Vijay & JioHotstar",
    heroImage:   "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800",
    gradFrom:    "from-pink-600",
    gradTo:      "to-rose-700",
    accentBg:    "bg-rose-50",
    accentBorder:"border-rose-200",
    accentText:  "text-rose-700",
    btnClass:    "bg-rose-600 hover:bg-rose-700",
  },
  {
    eventSlug:   "bigg-boss-telugu-10",
    showSlug:    "bigg-boss-telugu",
    title:       "Bigg Boss Telugu 10",
    subtitle:    "Season 10 · Dasavatharam",
    host:        "Nagarjuna Akkineni",
    network:     "Star Maa & JioHotstar",
    heroImage:   "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800",
    gradFrom:    "from-blue-600",
    gradTo:      "to-indigo-700",
    accentBg:    "bg-blue-50",
    accentBorder:"border-blue-200",
    accentText:  "text-blue-700",
    btnClass:    "bg-blue-600 hover:bg-blue-700",
  },
  {
    eventSlug:   "bigg-boss-malayalam-8",
    showSlug:    "bigg-boss-malayalam",
    title:       "Bigg Boss Malayalam 8",
    subtitle:    "Season 8 · Asianet",
    host:        "Mohanlal",
    network:     "Asianet & JioHotstar",
    heroImage:   "https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=800",
    gradFrom:    "from-emerald-600",
    gradTo:      "to-teal-700",
    accentBg:    "bg-emerald-50",
    accentBorder:"border-emerald-200",
    accentText:  "text-emerald-700",
    btnClass:    "bg-emerald-600 hover:bg-emerald-700",
  },
  {
    eventSlug:   "bigg-boss-kannada-13",
    showSlug:    "bigg-boss-kannada",
    title:       "Bigg Boss Kannada 13",
    subtitle:    "Season 13 · Colors Kannada",
    host:        "Kichcha Sudeepa",
    network:     "Colors Kannada & JioHotstar",
    heroImage:   "https://images.unsplash.com/photo-1493612276216-ee3925520721?w=800",
    gradFrom:    "from-amber-600",
    gradTo:      "to-orange-700",
    accentBg:    "bg-amber-50",
    accentBorder:"border-amber-200",
    accentText:  "text-amber-700",
    btnClass:    "bg-amber-600 hover:bg-amber-700",
  },
] as const;

async function getEventStatus(showSlug: string) {
  try {
    const seasons = await getShowSeasons(showSlug);
    const live = seasons.find((s) => s.status === "live") ?? seasons[0];
    if (!live) return { isLive: false, roundOpen: false, contestantCount: 0 };
    const round = await getActiveRound(live.id).catch(() => null);
    return {
      isLive: live.status === "live",
      roundOpen: round?.status === "open",
      contestantCount: round?.results?.length ?? 0,
    };
  } catch {
    return { isLive: false, roundOpen: false, contestantCount: 0 };
  }
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [tamilStatus, teluguStatus, malayalamStatus, kannadaStatus] = await Promise.all([
    getEventStatus("bigg-boss-tamil"),
    getEventStatus("bigg-boss-telugu"),
    getEventStatus("bigg-boss-malayalam"),
    getEventStatus("bigg-boss-kannada"),
  ]);
  const statuses = [tamilStatus, teluguStatus, malayalamStatus, kannadaStatus];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Page title */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 text-center">
          <h1 className="text-2xl font-black text-gray-900">Choose an event</h1>
          <p className="text-sm text-gray-400 mt-1">
            Vote for your favourite contestant in the ongoing season
          </p>
        </div>
      </div>

      {/* Event cards */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {EVENTS.map((ev, i) => {
            const st = statuses[i];
            return (
              <article
                key={ev.eventSlug}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col"
              >
                {/* Poster */}
                <div className={`relative h-52 bg-gradient-to-br ${ev.gradFrom} ${ev.gradTo} overflow-hidden`}>
                  <Image
                    src={ev.heroImage}
                    alt={ev.title}
                    fill
                    className="object-cover mix-blend-overlay opacity-25"
                    sizes="(max-width: 640px) 100vw, 50vw"
                    priority
                  />
                  {/* Status badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    {st.isLive ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        LIVE
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-white/20 text-white text-xs font-semibold rounded-full">
                        Season 10
                      </span>
                    )}
                    {st.roundOpen && (
                      <span className="px-2.5 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow">
                        Voting open
                      </span>
                    )}
                  </div>
                  {/* Title overlay at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-4">
                    <h2 className="text-lg font-black text-white leading-tight">{ev.title}</h2>
                    <p className="text-white/70 text-xs mt-0.5">{ev.subtitle}</p>
                  </div>
                </div>

                {/* Card body */}
                <div className="p-4 flex flex-col flex-1">
                  {/* Host + network */}
                  <div className={`flex items-center gap-3 px-3 py-2.5 ${ev.accentBg} rounded-xl border ${ev.accentBorder} mb-4`}>
                    <span className="text-base flex-shrink-0">🎬</span>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Host</p>
                      <p className={`text-sm font-bold ${ev.accentText} truncate`}>{ev.host}</p>
                    </div>
                    <div className="ml-auto min-w-0 text-right">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Network</p>
                      <p className="text-xs font-medium text-gray-600 truncate">{ev.network}</p>
                    </div>
                  </div>

                  {/* Contestant count */}
                  {st.contestantCount > 0 && (
                    <p className="text-xs text-gray-400 mb-3 text-center">
                      {st.contestantCount} contestants in the running
                    </p>
                  )}

                  {/* CTA */}
                  <div className="mt-auto">
                    <Link
                      href={`/events/${ev.eventSlug}`}
                      className={`w-full inline-flex items-center justify-center gap-2 py-3 ${ev.btnClass} text-white font-bold rounded-xl text-sm transition-all shadow-sm hover:shadow`}
                    >
                      Enter Event →
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl mt-6">
          <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            <strong>FanMeter is an independent fan community platform.</strong> Votes here do not affect
            official Bigg Boss evictions. Official voting: Star Vijay / JioHotstar (Tamil) · Star Maa / JioHotstar (Telugu) · Asianet / JioHotstar (Malayalam) · Colors Kannada / JioHotstar (Kannada).
          </p>
        </div>
      </div>
    </div>
  );
}
