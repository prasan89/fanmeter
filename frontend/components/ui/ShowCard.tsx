import Image from "next/image";
import Link from "next/link";
import type { Show } from "@/types";

const STATUS_STYLES = {
  live:      "bg-red-500 text-white",
  upcoming:  "bg-orange-400 text-white",
  completed: "bg-gray-400 text-white",
};
const STATUS_LABELS = { live: "Live Now", upcoming: "Upcoming", completed: "Ended" };

export function ShowCard({ show }: { show: Show }) {
  return (
    <Link href={`/shows/${show.slug}`} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden shadow hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
        <div className="relative h-48 overflow-hidden bg-gray-100">
          {show.imageUrl ? (
            <Image src={show.imageUrl} alt={show.name} fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center">
              <span className="text-4xl font-bold text-white/40">{show.name.charAt(0)}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[show.status]}`}>
              {show.status === "live" && <span className="w-1.5 h-1.5 rounded-full bg-white animate-[pulseLive_2s_infinite]" />}
              {STATUS_LABELS[show.status]}
            </span>
          </div>

          <div className="absolute bottom-3 left-3">
            <span className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-xs text-white font-medium capitalize">
              {show.category.replace(/-/g, " ")}
            </span>
          </div>

          {show.language && (
            <div className="absolute bottom-3 right-3">
              <span className="px-2 py-1 bg-black/30 backdrop-blur-sm rounded-lg text-xs text-white/80">
                {show.language}
              </span>
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-bold text-gray-900 group-hover:text-violet-600 transition-colors line-clamp-1">{show.name}</h3>
          {show.description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{show.description}</p>
          )}
          <div className="mt-3">
            <span className="text-xs text-violet-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              View Show →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
