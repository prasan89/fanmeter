export interface Show {
  id: number;
  name: string;
  slug: string;
  category: string;
  language: string | null;
  description: string | null;
  status: "live" | "upcoming" | "completed";
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Season {
  id: number;
  showId: number;
  showName: string;
  showSlug: string;
  name: string;
  seasonNumber: number;
  status: "live" | "upcoming" | "completed";
  description: string | null;
  heroImage: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Episode {
  id: number;
  seasonId: number;
  episodeNumber: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  durationMinutes: number | null;
  airDate: string | null;
  status: "upcoming" | "live" | "aired";
  createdAt: string;
  updatedAt: string;
}

export interface Contestant {
  id: number;
  seasonId: number;
  name: string;
  slug: string;
  profileImage: string | null;
  coverImage: string | null;
  bio: string | null;
  status: "active" | "eliminated" | "winner";
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface SearchResult {
  shows: Show[];
  contestants: Contestant[];
  total: number;
}

export interface ContestantVoteDto {
  contestantId: number;
  contestantName: string;
  contestantSlug: string;
  profileImage: string | null;
  status: string;
  voteCount: number;
  rank: number;
}

export interface VotingRoundDto {
  id: number;
  seasonId: number;
  seasonName: string;
  showSlug: string;
  title: string;
  status: "draft" | "open" | "closed";
  opensAt: string | null;
  closesAt: string | null;
  createdAt: string;
  results: ContestantVoteDto[];
}

export interface CastVoteResponse {
  success: boolean;
  message: string;
  voteId: number | null;
  contestantId: number;
  newTotalVotes: number;
}

export interface ContestantRankingDto {
  contestantId: number;
  contestantName: string;
  contestantSlug: string;
  profileImage: string | null;
  status: string;
  favouriteCount: number;
  rank: number;
  voteShare: number;
}

export interface RankingsDto {
  seasonId: number;
  seasonName: string;
  showSlug: string;
  rankings: ContestantRankingDto[];
  myFavourites: number[];
  updatedAt: string;
}

export interface ToggleFavouriteResponse {
  success: boolean;
  message: string;
  favourited: boolean;
  contestantId: number;
  newFavouriteCount: number;
}

export interface AddFavouriteResponse {
  success: boolean;
  message: string;
  duplicate: boolean;
  contestantId: number;
  newFavouriteCount: number;
}

export interface EvictionNomineeDto {
  contestantId: number;
  contestantName: string;
  contestantSlug: string;
  profileImage: string | null;
  voteCount: number;
  voteShare: number;
  rank: number;
}

export type NominationState =
  | "NOMINATIONS_PUBLISHED"
  | "NEEDS_VERIFICATION"
  | "SOURCE_UNAVAILABLE"
  | "NO_NOMINATIONS_CONFIRMED"
  | "POLL_OPEN"
  | "VOTING_CLOSED";

export interface EvictionPollDto {
  id: number;
  seasonId: number;
  seasonName: string;
  showSlug: string;
  weekNumber: number;
  weekLabel: string | null;
  voteMode: "save" | "evict";
  status: "draft" | "open" | "closed" | "archived";
  opensAt: string | null;
  closesAt: string | null;
  sourceVerified: boolean;
  nominationState: NominationState | null;
  nominees: EvictionNomineeDto[];
  updatedAt: string;
  sourceAttribution: string | null;
}

export interface CastEvictionVoteResponse {
  success: boolean;
  message: string;
  newVoteCount: number;
  contestantId: number;
}

export interface GuestTokenResponse {
  token: string;
  displayName: string;
}

export interface ChatMessageDto {
  id: number;
  roomId: string;
  displayName: string;
  messageText: string;
  createdAt: string;
  isOwn: boolean;
}

export interface ChatHistoryResponse {
  roomId: string;
  messages: ChatMessageDto[];
  hasMore: boolean;
  nextCursor: string | null;
}
