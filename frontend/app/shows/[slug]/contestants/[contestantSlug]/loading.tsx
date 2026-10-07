import { Skeleton } from "@/components/ui/Skeleton";

export default function ContestantLoading() {
  return (
    <div className="min-h-screen bg-surface-secondary">
      <Skeleton className="h-[300px] sm:h-[400px] rounded-none" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-20 relative z-10">
        <div className="bg-white rounded-3xl shadow-card-hover p-6 sm:p-8">
          <div className="flex items-end gap-5 mb-6">
            <Skeleton className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl flex-shrink-0 -mt-16" />
            <div className="flex-1 space-y-2 pb-1">
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-8 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6 mt-2" />
          <Skeleton className="h-4 w-3/4 mt-2" />
        </div>
      </div>
    </div>
  );
}
