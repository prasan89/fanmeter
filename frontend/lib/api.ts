const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    next: { revalidate: 60 },
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${path}`);
  }
  return res.json();
}

import type { ApiResponse, Show, Season, Contestant } from "@/types";

export async function getShows(): Promise<Show[]> {
  const res = await fetchApi<ApiResponse<Show[]>>("/api/shows");
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
