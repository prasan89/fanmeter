import Link from "next/link";
import Image from "next/image";
import { Badge } from "./Badge";
import type { Contestant } from "@/types";

interface ContestantCardProps {
  contestant: Contestant;
  rank?: number;
  showSlug?: string;
}

export function ContestantCard({ contestant, rank, showSlug }: ContestantCardProps) {
  const statusVariant =
    contestant.status === "winner"
      ? "active"
      : contestant.status === "eliminated"
      ? "eliminated"
      : "active";

  const statusLabel =
    contestant.status === "winner" ? "Winner" : contestant.status === "eliminated" ? "Out" : "Active";

  const card = (
    <div className="bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200 group cursor-pointer">
      {/* Avatar */}
      <div className="relative h-48 overflow-hidden bg-gradient-card">
        {contestant.profileImage ? (
          <Image
            src={contestant.profileImage}
            alt={contestant.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-brand flex items-center justify-center">
            <span className="text-5xl font-bold text-white/50">
              {contestant.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {rank && (
          <div className="absolute top-3 left-3 w-8 h-8 bg-gradient-brand rounded-full flex items-center justify-center shadow-brand-sm">
            <span className="text-xs font-bold text-white">#{rank}</span>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h4 className="font-bold text-text-primary">{contestant.name}</h4>
        {contestant.bio && (
          <p className="mt-1 text-xs text-text-muted line-clamp-2">{contestant.bio}</p>
        )}
        <div className="mt-3 w-full text-xs font-semibold text-brand-purple border border-brand-purple/30 rounded-lg py-2 text-center group-hover:bg-brand-purple group-hover:text-white transition-all">
          View Profile
        </div>
      </div>
    </div>
  );

  if (showSlug) {
    return (
      <Link href={`/shows/${showSlug}/contestants/${contestant.slug}`}>
        {card}
      </Link>
    );
  }

  return card;
}
