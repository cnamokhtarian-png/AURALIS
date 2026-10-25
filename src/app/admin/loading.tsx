import { Skeleton } from "@/components/ui";

export default function AdminLoading() {
  return (
    <div>
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-8 w-56" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
      <Skeleton className="mt-6 h-72 w-full" />
    </div>
  );
}
