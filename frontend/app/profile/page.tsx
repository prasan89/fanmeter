import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Profile — Coming Soon | FanClash",
  description: "Fan profiles are coming to FanClash. Track your votes, wins, and fan rank.",
};

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-8 shadow-brand-lg">
          👤
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full mb-4">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse-live" />
          <span className="text-sm font-semibold text-blue-600">Coming Soon</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-text-primary mb-4">
          Fan Profile
        </h1>
        <p className="text-text-secondary text-lg mb-3">
          Your fan identity is being built.
        </p>
        <p className="text-text-muted mb-10 max-w-md mx-auto">
          Track your votes, earn badges, see your fan rank, and show off your fandom loyalty.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/shows"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-brand text-white font-bold rounded-2xl shadow-brand-sm hover:shadow-brand-lg hover:scale-105 transition-all"
          >
            Browse Shows
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-text-secondary font-semibold rounded-2xl border border-gray-200 hover:border-brand-purple/30 hover:text-brand-purple transition-all"
          >
            ← Back Home
          </Link>
        </div>
      </div>
    </div>
  );
}
