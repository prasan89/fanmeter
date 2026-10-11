import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Vote — Coming Soon | FanClash",
  description: "Live voting for your favorite contestants is coming to FanClash. Stay tuned.",
};

export default function VotePage() {
  return (
    <div className="min-h-screen bg-violet-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Icon */}
        <div className="w-24 h-24 bg-gradient-to-r from-violet-600 to-pink-500 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-8 shadow-lg">
          🗳️
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-600/10 rounded-full mb-4">
          <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse-live" />
          <span className="text-sm font-semibold text-violet-600">Coming Soon</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
          Live Voting
        </h1>

        <p className="text-gray-600 text-lg mb-3">
          The voting booth is almost open.
        </p>
        <p className="text-gray-400 mb-10 max-w-md mx-auto">
          Support your favorite contestants with live votes. See results update in real time.
          Battle other fanbases. Every vote counts.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/shows"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-violet-600 to-pink-500 text-white font-bold rounded-2xl shadow hover:shadow-lg hover:scale-105 transition-all"
          >
            Explore Shows
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-gray-600 font-semibold rounded-2xl border border-gray-200 hover:border-violet-300/30 hover:text-violet-600 transition-all"
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
            <div key={f.label} className="bg-white rounded-2xl p-4 shadow text-center">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="text-xs font-semibold text-gray-400">{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
