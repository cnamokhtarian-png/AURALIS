import { ProductCardSkeleton } from "@/components/product-card";
import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-8 w-64" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-3">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="hidden h-64 w-full lg:block" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:col-span-9">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
