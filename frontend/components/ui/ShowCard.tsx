import Image from "next/image";
import Link from "next/link";
import { Badge } from "./Badge";
import type { Show } from "@/types";

interface ShowCardProps {
  show: Show;
  size?: "sm" | "md" | "lg";
  featured?: boolean;
}

export function ShowCard({ show, size = "md", featured = false }: ShowCardProps) {
  const statusVariant =
    show.status === "live" ? "live" : show.status === "upcoming" ? "upcoming" : "completed";
  const statusLabel =
    show.status === "live" ? "Live Now" : show.status === "upcoming" ? "Upcoming" : "Ended";

  const cardHeight = featured ? "h-72" : size === "lg" ? "h-64" : size === "sm" ? "h-36" : "h-48";

  return (
    <Link href={`/shows/${show.slug}`} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200">
        {/* Image */}
        <div className={`relative ${cardHeight} overflow-hidden bg-gradient-card`}>
          {show.imageUrl ? (
            <Image
              src={show.imageUrl}
              alt={show.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-hero flex items-center justify-center">
              <span className="text-4xl font-bold text-white/30">{show.name.charAt(0)}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Status badge */}
          <div className="absolute top-3 left-3">
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>

          {/* Category pill */}
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center px-2 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-xs text-white font-medium capitalize">
              {show.category.replace(/-/g, " ")}
            </span>
          </div>

          {/* Language */}
          {show.language && (
            <div className="absolute bottom-3 right-3">
              <span className="inline-flex items-center px-2 py-1 bg-black/30 backdrop-blur-sm rounded-lg text-xs text-white/80 font-medium">
                {show.language}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-bold text-text-primary group-hover:text-brand-purple transition-colors line-clamp-1">
            {show.name}
          </h3>
          {show.description && size !== "sm" && (
            <p className="mt-1 text-sm text-text-muted line-clamp-2">{show.description}</p>
          )}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-brand-purple font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              View Show →
            </span>
            {show.status === "live" && (
              <span className="text-xs text-red-500 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-live" />
                Live
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
