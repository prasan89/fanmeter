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
    if (!query || query.trim().length < 2) {
      setResults(null);
      return;
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
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-text-muted hover:text-brand-purple hover:bg-surface-tertiary transition-all text-sm"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:block text-sm">Search</span>
        </button>
      ) : (
        <div className="flex items-center gap-2 bg-surface-secondary border border-brand-purple/20 rounded-xl px-3 py-2 min-w-[220px] focus-within:border-brand-purple transition-colors">
          <Search className="w-4 h-4 text-brand-purple flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shows, contestants..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none min-w-0"
          />
          {loading ? (
            <Loader2 className="w-4 h-4 text-brand-purple animate-spin flex-shrink-0" />
          ) : (
            <button onClick={handleClose} className="text-text-muted hover:text-text-primary flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Dropdown results */}
      {open && (query.length >= 2) && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-card-hover border border-gray-100 overflow-hidden z-50 animate-fade-in">
          {loading && !results && (
            <div className="p-6 text-center text-text-muted text-sm">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-purple" />
              Searching...
            </div>
          )}

          {!loading && results && results.total === 0 && (
            <div className="p-6 text-center text-text-muted text-sm">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {hasResults && (
            <>
              {results.shows.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-bold text-text-muted bg-surface-secondary uppercase tracking-wide">
                    Shows
                  </div>
                  {results.shows.slice(0, 4).map((show) => (
                    <Link
                      key={show.id}
                      href={`/shows/${show.slug}`}
                      onClick={handleClose}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-secondary transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-card">
                        {show.imageUrl ? (
                          <Image src={show.imageUrl} alt={show.name} width={40} height={40} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-brand flex items-center justify-center">
                            <span className="text-xs font-bold text-white">{show.name.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-text-primary line-clamp-1">{show.name}</div>
                        <div className="text-xs text-text-muted capitalize">{show.category.replace(/-/g, " ")} · {show.language}</div>
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
                  <div className="px-4 py-2 text-xs font-bold text-text-muted bg-surface-secondary uppercase tracking-wide">
                    Contestants
                  </div>
                  {results.contestants.slice(0, 3).map((c) => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-secondary transition-colors">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-card">
                        {c.profileImage ? (
                          <Image src={c.profileImage} alt={c.name} width={40} height={40} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-brand flex items-center justify-center">
                            <span className="text-xs font-bold text-white">{c.name.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-text-primary line-clamp-1">{c.name}</div>
                        <div className="text-xs text-text-muted capitalize">{c.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.total > 7 && (
                <div className="border-t border-gray-100 p-3 text-center">
                  <span className="text-xs text-text-muted">{results.total} total results</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
