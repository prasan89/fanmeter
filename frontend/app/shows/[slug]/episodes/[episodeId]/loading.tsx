import { Skeleton } from "@/components/ui/Skeleton";

export default function EpisodeLoading() {
  return (
    <div className="min-h-screen bg-surface-secondary">
      <Skeleton className="h-[280px] sm:h-[420px] rounded-none" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
