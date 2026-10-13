"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, X, Loader2 } from "lucide-react";
import type { SearchResult } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export function SearchBox() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      const clear = setTimeout(() => setResults(null), 0);
      return () => clearTimeout(clear);
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.data);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function handleClose() {
    setOpen(false);
    setQuery("");
    setResults(null);
  }

  const hasResults = results && results.total > 0;

  return (
    <div ref={containerRef} className="relative">
      {/* Search trigger button */}
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:text-violet-600 hover:bg-violet-100 transition-all text-sm"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:block text-sm">Search</span>
        </button>
      ) : (
        <div className="flex items-center gap-2 bg-violet-50 border border-violet-300/20 rounded-xl px-3 py-2 min-w-[220px] focus-within:border-violet-300 transition-colors">
          <Search className="w-4 h-4 text-violet-600 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shows, contestants..."
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none min-w-0"
          />
          {loading ? (
            <Loader2 className="w-4 h-4 text-violet-600 animate-spin flex-shrink-0" />
          ) : (
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-900 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Dropdown results */}
      {open && (query.length >= 2) && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-50 animate-fade-in">
          {loading && !results && (
            <div className="p-6 text-center text-gray-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-violet-600" />
              Searching...
            </div>
          )}

          {!loading && results && results.total === 0 && (
            <div className="p-6 text-center text-gray-400 text-sm">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {hasResults && (
            <>
              {results.shows.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-bold text-gray-400 bg-violet-50 uppercase tracking-wide">
                    Shows
                  </div>
                  {results.shows.slice(0, 4).map((show) => (
                    <Link
                      key={show.id}
                      href={`/shows/${show.slug}`}
                      onClick={handleClose}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-violet-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50">
                        {show.imageUrl ? (
                          <Image src={show.imageUrl} alt={show.name} width={40} height={40} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-violet-600 to-pink-500 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">{show.name.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900 line-clamp-1">{show.name}</div>
                        <div className="text-xs text-gray-400 capitalize">{show.category.replace(/-/g, " ")} · {show.language}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        show.status === "live" ? "bg-red-100 text-red-600" :
                        show.status === "upcoming" ? "bg-orange-100 text-orange-600" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {show.status === "live" ? "LIVE" : show.status === "upcoming" ? "SOON" : "ENDED"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {results.contestants.length > 0 && (
                <div className={results.shows.length > 0 ? "border-t border-gray-100" : ""}>
                  <div className="px-4 py-2 text-xs font-bold text-gray-400 bg-violet-50 uppercase tracking-wide">
                    Contestants
                  </div>
                  {results.contestants.slice(0, 3).map((c) => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-violet-50 transition-colors">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-50">
                        {c.profileImage ? (
                          <Image src={c.profileImage} alt={c.name} width={40} height={40} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-violet-600 to-pink-500 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">{c.name.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900 line-clamp-1">{c.name}</div>
                        <div className="text-xs text-gray-400 capitalize">{c.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.total > 7 && (
                <div className="border-t border-gray-100 p-3 text-center">
                  <span className="text-xs text-gray-400">{results.total} total results</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
