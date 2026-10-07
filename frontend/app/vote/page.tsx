import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Vote — Coming Soon | FanClash",
  description: "Live voting for your favorite contestants is coming to FanClash. Stay tuned.",
};

export default function VotePage() {
  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Icon */}
        <div className="w-24 h-24 bg-gradient-brand rounded-3xl flex items-center justify-center text-5xl mx-auto mb-8 shadow-brand-lg">
          🗳️
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-purple/10 rounded-full mb-4">
          <span className="w-2 h-2 rounded-full bg-brand-purple animate-pulse-live" />
          <span className="text-sm font-semibold text-brand-purple">Coming Soon</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-text-primary mb-4">
          Live Voting
        </h1>

        <p className="text-text-secondary text-lg mb-3">
          The voting booth is almost open.
        </p>
        <p className="text-text-muted mb-10 max-w-md mx-auto">
          Support your favorite contestants with live votes. See results update in real time.
          Battle other fanbases. Every vote counts.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/shows"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-brand text-white font-bold rounded-2xl shadow-brand-sm hover:shadow-brand-lg hover:scale-105 transition-all"
          >
            Explore Shows
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-text-secondary font-semibold rounded-2xl border border-gray-200 hover:border-brand-purple/30 hover:text-brand-purple transition-all"
          >
            ← Back Home
          </Link>
        </div>

        {/* Feature preview */}
        <div className="mt-14 grid grid-cols-3 gap-4">
          {[
            { icon: "⚡", label: "Real-time Results" },
            { icon: "🏆", label: "Fan Leaderboard" },
            { icon: "🔔", label: "Vote Reminders" },
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
