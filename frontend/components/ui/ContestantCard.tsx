import Link from "next/link";
import Image from "next/image";
import type { Contestant } from "@/types";

export function ContestantCard({ contestant, rank, showSlug }: {
  contestant: Contestant;
  rank?: number;
  showSlug?: string;
}) {
  const statusColor =
    contestant.status === "winner" ? "bg-emerald-500 text-white" :
    contestant.status === "eliminated" ? "bg-gray-400 text-white" :
    "bg-green-500 text-white";
  const statusLabel =
    contestant.status === "winner" ? "Winner" :
    contestant.status === "eliminated" ? "Out" : "Active";

  const card = (
    <div className="bg-white rounded-2xl overflow-hidden shadow hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group cursor-pointer">
      <div className="relative h-48 overflow-hidden bg-gray-100">
        {contestant.profileImage ? (
          <Image src={contestant.profileImage} alt={contestant.name} fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, 25vw" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center">
            <span className="text-5xl font-bold text-white/50">{contestant.name.charAt(0)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {rank && (
          <div className="absolute top-3 left-3 w-8 h-8 bg-gradient-to-br from-violet-600 to-pink-500 rounded-full flex items-center justify-center shadow">
            <span className="text-xs font-bold text-white">#{rank}</span>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor}`}>{statusLabel}</span>
        </div>
      </div>
      <div className="p-4">
        <h4 className="font-bold text-gray-900">{contestant.name}</h4>
        {contestant.bio && <p className="mt-1 text-xs text-gray-500 line-clamp-2">{contestant.bio}</p>}
        <div className="mt-3 w-full text-xs font-semibold text-violet-600 border border-violet-200 rounded-lg py-2 text-center group-hover:bg-violet-600 group-hover:text-white transition-all">
          View Profile
        </div>
      </div>
    </div>
  );

  if (showSlug) return <Link href={`/shows/${showSlug}/contestants/${contestant.slug}`}>{card}</Link>;
  return card;
}
