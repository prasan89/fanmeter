import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Fan Wars — Coming Soon | FanClash",
  description: "Fan Wars is coming to FanClash. Battle other fanbases and prove your fandom is the strongest.",
};

export default function WarsPage() {
  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Icon */}
        <div className="w-24 h-24 bg-gradient-to-br from-brand-pink to-brand-orange rounded-3xl flex items-center justify-center text-5xl mx-auto mb-8 shadow-brand-lg">
          ⚔️
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-pink/10 rounded-full mb-4">
          <span className="w-2 h-2 rounded-full bg-brand-pink animate-pulse-live" />
          <span className="text-sm font-semibold text-brand-pink">Coming Soon</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-text-primary mb-4">
          Fan Wars
        </h1>

        <p className="text-text-secondary text-lg mb-3">
          The battles are coming.
        </p>
        <p className="text-text-muted mb-10 max-w-md mx-auto">
          Support your favorite contestant and fight for your fandom. Challenge rival fanbases,
          rise up the leaderboard, and prove your fandom is the strongest.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/shows"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-br from-brand-pink to-brand-orange text-white font-bold rounded-2xl shadow-brand-sm hover:shadow-brand-lg hover:scale-105 transition-all"
          >
            Explore Shows
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-text-secondary font-semibold rounded-2xl border border-gray-200 hover:border-brand-pink/30 hover:text-brand-pink transition-all"
          >
            ← Back Home
          </Link>
        </div>

        {/* Feature preview */}
        <div className="mt-14 grid grid-cols-3 gap-4">
          {[
            { icon: "🔥", label: "Fandom Battles" },
            { icon: "📊", label: "War Leaderboard" },
            { icon: "🎖️", label: "Fan Badges" },
          ].map((f) => (
            <div key={f.label} className="bg-white rounded-2xl p-4 shadow-card text-center">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="text-xs font-semibold text-text-muted">{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
