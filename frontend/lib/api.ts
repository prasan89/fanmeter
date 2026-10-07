import type { ApiResponse, Show, Season, Episode, Contestant, SearchResult } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${path}`);
  }
  return res.json();
}

export async function getShows(params?: { category?: string; language?: string; status?: string }): Promise<Show[]> {
  const filtered = params ? Object.fromEntries(
    Object.entries(params).filter(([, v]) => v != null && v !== "")
  ) : {};
  const qs = Object.keys(filtered).length > 0
    ? "?" + new URLSearchParams(filtered as Record<string, string>).toString()
    : "";
  const res = await fetchApi<ApiResponse<Show[]>>(`/api/shows${qs}`);
  return res.data;
}

export async function getShow(slug: string): Promise<Show> {
  const res = await fetchApi<ApiResponse<Show>>(`/api/shows/${slug}`);
  return res.data;
}

export async function getShowSeasons(slug: string): Promise<Season[]> {
  const res = await fetchApi<ApiResponse<Season[]>>(`/api/shows/${slug}/seasons`);
  return res.data;
}

export async function getSeason(id: number): Promise<Season> {
  const res = await fetchApi<ApiResponse<Season>>(`/api/seasons/${id}`);
  return res.data;
}

export async function getSeasonContestants(seasonId: number): Promise<Contestant[]> {
  const res = await fetchApi<ApiResponse<Contestant[]>>(`/api/seasons/${seasonId}/contestants`);
  return res.data;
}

export async function getSeasonEpisodes(seasonId: number): Promise<Episode[]> {
  const res = await fetchApi<ApiResponse<Episode[]>>(`/api/seasons/${seasonId}/episodes`);
  return res.data;
}

export async function getEpisode(id: number): Promise<Episode> {
  const res = await fetchApi<ApiResponse<Episode>>(`/api/episodes/${id}`);
  return res.data;
}

export async function getContestant(slug: string): Promise<Contestant> {
  const res = await fetchApi<ApiResponse<Contestant>>(`/api/contestants/${slug}`);
  return res.data;
}

export async function search(q: string): Promise<SearchResult> {
  const res = await fetch(
    `${API_BASE}/api/search?q=${encodeURIComponent(q)}`,
    { cache: "no-store", headers: { "Content-Type": "application/json" } }
  );
  if (!res.ok) throw new Error(`Search error ${res.status}`);
  const data = (await res.json()) as ApiResponse<SearchResult>;
  return data.data;
}
