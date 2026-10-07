import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";
import { getContestant, getSeason, getShow } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ContestantPageProps {
  params: Promise<{ slug: string; contestantSlug: string }>;
}

export async function generateMetadata({ params }: ContestantPageProps) {
  const { contestantSlug } = await params;
  try {
    const contestant = await getContestant(contestantSlug);
    return {
      title: `${contestant.name} — FanClash`,
      description: contestant.bio ?? `Follow ${contestant.name} on FanClash.`,
      openGraph: {
        title: `${contestant.name} — FanClash`,
        description: contestant.bio ?? `Follow ${contestant.name} on FanClash.`,
        images: contestant.profileImage ? [contestant.profileImage] : [],
      },
    };
  } catch {
    return { title: "Contestant — FanClash" };
  }
}

export default async function ContestantPage({ params }: ContestantPageProps) {
  const { slug, contestantSlug } = await params;

  let contestant, season, show;
  try {
    contestant = await getContestant(contestantSlug);
    season = await getSeason(contestant.seasonId);
    show = await getShow(slug);
  } catch {
    notFound();
    return;
  }

  const statusVariant =
    contestant.status === "winner" ? "active" : contestant.status === "eliminated" ? "eliminated" : "active";
  const statusLabel =
    contestant.status === "winner" ? "Winner" : contestant.status === "eliminated" ? "Eliminated" : "Active";

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Cover / Hero */}
      <div className="relative h-[300px] sm:h-[400px] overflow-hidden">
        {contestant.coverImage ? (
          <Image
            src={contestant.coverImage}
            alt={`${contestant.name} cover`}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : contestant.profileImage ? (
          <Image
            src={contestant.profileImage}
            alt={contestant.name}
            fill
            className="object-cover object-top blur-sm scale-110"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-hero" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="absolute top-4 left-4">
          <Link
            href={`/shows/${slug}`}
            className="inline-flex items-center gap-2 px-3 py-2 bg-black/30 backdrop-blur-sm text-white rounded-xl text-sm hover:bg-black/50 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {show.name}
          </Link>
        </div>
      </div>

      {/* Profile card overlap */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-20 relative z-10">
        <div className="bg-white rounded-3xl shadow-card-hover p-6 sm:p-8">
          <div className="flex items-end gap-5 mb-6">
            {/* Avatar */}
            <div className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden ring-4 ring-white shadow-xl -mt-16">
              {contestant.profileImage ? (
                <Image
                  src={contestant.profileImage}
                  alt={contestant.name}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-brand flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">{contestant.name.charAt(0)}</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant={statusVariant}>{statusLabel}</Badge>
                <span className="text-sm text-text-muted">{season.name}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-text-primary">{contestant.name}</h1>
            </div>
          </div>

          {/* Season details */}
          <div className="flex flex-wrap gap-4 text-sm text-text-muted mb-6 pb-6 border-b border-gray-100">
            {season.startDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Season started: {formatDate(season.startDate)}
              </div>
            )}
          </div>

          {/* Bio */}
          {contestant.bio ? (
            <div>
              <h2 className="text-base font-bold text-text-primary mb-3">About</h2>
              <p className="text-text-secondary leading-relaxed">{contestant.bio}</p>
            </div>
          ) : (
            <p className="text-text-muted text-sm">Bio coming soon.</p>
          )}

          {/* Vote CTA */}
          <div className="mt-8 bg-gradient-to-br from-surface-secondary to-white rounded-2xl p-6 text-center border border-gray-100">
            <p className="text-sm font-semibold text-text-primary mb-3">
              Support {contestant.name.split(" ")[0]}
            </p>
            <Link
              href="/vote"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-brand text-white font-bold rounded-xl shadow-brand-sm hover:shadow-brand-lg hover:scale-105 transition-all text-sm"
            >
              Vote Now — Coming Soon
            </Link>
          </div>

          {/* Back link */}
          <div className="mt-6 text-center">
            <Link
              href={`/shows/${slug}`}
              className="text-sm text-text-muted hover:text-brand-purple transition-colors"
            >
              ← Back to {show.name}
            </Link>
          </div>
        </div>
      </div>

      <div className="pb-16" />
    </div>
  );
}
