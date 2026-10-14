import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle } from "lucide-react";
import { getShowSeasons, getActiveRound } from "@/lib/api";
import { TwoColumnLayout } from "@/components/layout/TwoColumnLayout";
import { AdSidebar } from "@/components/ads/AdSidebar";

export const metadata: Metadata = {
  title: "FanMeter — Bigg Boss Fan Voting",
  description:
    "Vote for your favourite Bigg Boss contestant. Independent community polls for Tamil 10, Telugu 10, Malayalam 8, Kannada 13, Hindi 20, and Bangla 3.",
  openGraph: {
    title: "FanMeter — Bigg Boss Fan Voting",
    description: "Independent community voting for Bigg Boss Tamil 10, Telugu 10, Malayalam 8, Kannada 13, Hindi 20, and Bangla 3.",
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
    hostImage:   "https://media.housepulse.in/studio/host-photo/2026/05/1779861001595-vijay_sethupathi_tamil_bigg_boss_host/sm.webp",
    network:     "Star Vijay & JioHotstar",
    heroImage:   "https://media.housepulse.in/studio/season-featured/2026/09/1790407725774-9964eee2-d49a-4948-8581-cc38a8c1c2c4/master.webp",
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
    hostImage:   "https://media.housepulse.in/studio/host-photo/2026/05/1779860959338-nagarjuna_telugu_bigg_boss_host/sm.webp",
    network:     "Star Maa & JioHotstar",
    heroImage:   "https://media.housepulse.in/studio/season-featured/2026/08/1785688148489-telugu_bigg_boss/master.webp",
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
    hostImage:   "https://media.housepulse.in/studio/host-photo/2026/05/1779860941775-mohanlal_malayalam_bigg_boss_host/sm.webp",
    network:     "Asianet & JioHotstar",
    heroImage:   "https://media.housepulse.in/studio/season-featured/2026/09/1790407766213-b4d169bb-7b77-4462-9370-3d89fa064d35/master.webp",
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
    hostImage:   "https://media.housepulse.in/studio/host-photo/2026/05/1779860918563-kichcha_sudeep_kannada_bigg_boss_host/sm.webp",
    network:     "Colors Kannada & JioHotstar",
    heroImage:   "https://media.housepulse.in/studio/season-featured/2026/09/1790407697190-04ad2e4e-2400-46e4-b2ca-bcc2ce44dd45/master.webp",
    gradFrom:    "from-amber-600",
    gradTo:      "to-orange-700",
    accentBg:    "bg-amber-50",
    accentBorder:"border-amber-200",
    accentText:  "text-amber-700",
    btnClass:    "bg-amber-600 hover:bg-amber-700",
  },
  {
    eventSlug:   "bigg-boss-hindi-20",
    showSlug:    "bigg-boss-hindi",
    title:       "Bigg Boss Hindi 20",
    subtitle:    "Season 20 · Colors TV",
    host:        "Salman Khan",
    hostImage:   "https://media.housepulse.in/studio/host-photo/2026/05/1779860981421-salman_khan_hindi_bigg_boss_host/sm.webp",
    network:     "Colors TV & JioHotstar",
    heroImage:   "https://media.housepulse.in/studio/season-featured/2026/08/1785688715040-hindi_bigg_boss/master.webp",
    gradFrom:    "from-purple-700",
    gradTo:      "to-fuchsia-800",
    accentBg:    "bg-purple-50",
    accentBorder:"border-purple-200",
    accentText:  "text-purple-700",
    btnClass:    "bg-purple-700 hover:bg-purple-800",
  },
  {
    eventSlug:   "bigg-boss-bangla-3",
    showSlug:    "bigg-boss-bangla",
    title:       "Bigg Boss Bangla 3",
    subtitle:    "Season 3 · Star Jalsha",
    host:        "Sourav Ganguly",
    hostImage:   "https://media.housepulse.in/studio/host-photo/2026/09/1788869638270-saurav_ganguly_bangla_bigg_boss_host/sm.webp",
    network:     "Star Jalsha & JioHotstar",
    heroImage:   "https://media.housepulse.in/studio/season-featured/2026/09/1788965542371-bigg-boss_bangla/master.webp",
    gradFrom:    "from-green-700",
    gradTo:      "to-emerald-800",
    accentBg:    "bg-green-50",
    accentBorder:"border-green-200",
    accentText:  "text-green-700",
    btnClass:    "bg-green-700 hover:bg-green-800",
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
  const [tamilStatus, teluguStatus, malayalamStatus, kannadaStatus, hindiStatus, banglaStatus] = await Promise.all([
    getEventStatus("bigg-boss-tamil"),
    getEventStatus("bigg-boss-telugu"),
    getEventStatus("bigg-boss-malayalam"),
    getEventStatus("bigg-boss-kannada"),
    getEventStatus("bigg-boss-hindi"),
    getEventStatus("bigg-boss-bangla"),
  ]);
  const statuses = [tamilStatus, teluguStatus, malayalamStatus, kannadaStatus, hindiStatus, banglaStatus];

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-x-hidden">
      {/* Soft abstract background shapes — decorative only */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        style={{
          background: [
            /* Base: very faint violet wash across the whole page */
            "radial-gradient(ellipse 120% 60% at 50% -10%, rgba(167,139,250,0.13) 0%, transparent 70%)",
            /* Top-left: large soft lavender blob */
            "radial-gradient(ellipse 80% 70% at -15% 10%, rgba(196,181,253,0.18) 0%, transparent 65%)",
            /* Top-right: blush pink */
            "radial-gradient(ellipse 60% 55% at 110% 5%, rgba(251,207,232,0.22) 0%, transparent 60%)",
            /* Mid-left: pale sky blue */
            "radial-gradient(ellipse 55% 50% at -10% 55%, rgba(186,230,253,0.15) 0%, transparent 60%)",
            /* Mid-right: soft violet */
            "radial-gradient(ellipse 50% 45% at 108% 50%, rgba(221,214,254,0.18) 0%, transparent 60%)",
            /* Bottom-left: mint accent */
            "radial-gradient(ellipse 60% 40% at -5% 95%, rgba(167,243,208,0.10) 0%, transparent 55%)",
            /* Bottom-right: blush */
            "radial-gradient(ellipse 55% 40% at 105% 90%, rgba(252,231,243,0.18) 0%, transparent 55%)",
            /* White center — keeps the card grid area clean */
            "radial-gradient(ellipse 70% 60% at 50% 55%, rgba(255,255,255,0.85) 0%, transparent 80%)",
          ].join(", "),
        }}
      />
      <div className="flex-1 py-8">
        <TwoColumnLayout sidebar={<AdSidebar />}>
          {/* Compact event-discovery intro */}
          <div className="mb-6">
            <p className="text-[10px] font-black tracking-widest text-violet-400 uppercase mb-1">
              The Fan Community
            </p>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">
              Your favourite show. Your voice.
            </h1>
            <p className="text-sm text-gray-400 mt-1 max-w-lg">
              Explore live seasons, support contestants, and discover fan rankings.
              Unofficial fan polls — not affiliated with Bigg Boss or its broadcasters.
            </p>
          </div>

          {/* Event cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {EVENTS.map((ev, i) => {
              const st = statuses[i];
              return (
                <article
                  key={ev.eventSlug}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col"
                >
                  {/* Poster */}
                  <div className="relative h-52 overflow-hidden bg-gray-900">
                    <Image
                      src={ev.heroImage}
                      alt={ev.title}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      priority
                    />
                    {/* Status badge */}
                    <div className="absolute top-3 left-3">
                      {st.isLive ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          LIVE
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-white/20 text-white text-xs font-semibold rounded-full">
                          {ev.subtitle.split(" · ")[0]}
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
                      <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
                        <Image
                          src={ev.hostImage}
                          alt={ev.host}
                          fill
                          className="object-cover object-top"
                          sizes="36px"
                        />
                      </div>
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
              official Bigg Boss evictions. Official voting: Star Vijay / JioHotstar (Tamil) · Star Maa / JioHotstar (Telugu) · Asianet / JioHotstar (Malayalam) · Colors Kannada / JioHotstar (Kannada) · Colors TV / JioHotstar (Hindi) · Star Jalsha / JioHotstar (Bangla).
            </p>
          </div>
        </TwoColumnLayout>
      </div>
    </div>
  );
}
