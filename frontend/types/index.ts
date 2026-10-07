export interface Show {
  id: number;
  name: string;
  slug: string;
  category: string;
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
