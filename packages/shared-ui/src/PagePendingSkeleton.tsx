import { Skeleton } from "./ui/skeleton";

export function PagePendingSkeleton() {
  return (
    <div className="min-h-[60vh] px-4 py-6 space-y-4 animate-in fade-in duration-200">
      <Skeleton className="h-8 w-2/3 rounded-xl" />
      <Skeleton className="h-4 w-1/2 rounded-lg" />
      <div className="grid gap-3 pt-2">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    </div>
  );
}
