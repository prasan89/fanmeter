import type { ApiResponse, Show, Season, Episode, Contestant, SearchResult, VotingRoundDto, CastVoteResponse, RankingsDto, AddFavouriteResponse, EvictionPollDto, CastEvictionVoteResponse } from "@/types";

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

export async function getActiveRound(seasonId: number): Promise<VotingRoundDto> {
  const res = await fetchApi<ApiResponse<VotingRoundDto>>(`/api/seasons/${seasonId}/active-round`);
  return res.data;
}

export async function getRoundResults(roundId: number): Promise<VotingRoundDto> {
  const res = await fetchApi<ApiResponse<VotingRoundDto>>(`/api/voting-rounds/${roundId}/results`);
  return res.data;
}

export async function castVote(votingRoundId: number, contestantId: number, voterKey: string): Promise<CastVoteResponse> {
  const res = await fetch(`${API_BASE}/api/votes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ votingRoundId, contestantId, voterKey }),
  });
  const data = (await res.json()) as ApiResponse<CastVoteResponse>;
  return data.data;
}

export async function getRankings(seasonId: number, voterKey?: string): Promise<RankingsDto> {
  const qs = voterKey ? `?voterKey=${encodeURIComponent(voterKey)}` : "";
  const res = await fetchApi<ApiResponse<RankingsDto>>(`/api/seasons/${seasonId}/rankings${qs}`);
  return res.data;
}

export async function addFavourite(
  seasonId: number,
  contestantId: number,
  voterKey: string,
  idempotencyKey: string,
): Promise<AddFavouriteResponse> {
  const res = await fetch(`${API_BASE}/api/seasons/${seasonId}/favourites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contestantId, voterKey, idempotencyKey }),
  });
  const data = (await res.json()) as ApiResponse<AddFavouriteResponse>;
  if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
  return data.data;
}

export async function getActiveEvictionPoll(seasonId: number): Promise<EvictionPollDto | null> {
  const res = await fetch(`${API_BASE}/api/seasons/${seasonId}/eviction-poll`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = (await res.json()) as ApiResponse<EvictionPollDto | null>;
  return data.data ?? null;
}

export async function castEvictionVote(
  seasonId: number,
  pollId: number,
  contestantId: number,
  voterKey: string,
): Promise<CastEvictionVoteResponse> {
  const res = await fetch(`${API_BASE}/api/seasons/${seasonId}/eviction-vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pollId, contestantId, voterKey }),
  });
  const data = (await res.json()) as ApiResponse<CastEvictionVoteResponse>;
  return data.data;
}

export async function getEvictionHistory(seasonId: number): Promise<EvictionPollDto[]> {
  const res = await fetch(`${API_BASE}/api/seasons/${seasonId}/eviction-history`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = (await res.json()) as ApiResponse<EvictionPollDto[]>;
  return data.data ?? [];
}
