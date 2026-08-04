export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Hero Skeleton */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="aspect-[16/10] animate-pulse rounded-2xl bg-zinc-800/50" />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 rounded-xl bg-zinc-800/30 p-3">
              <div className="h-24 w-36 animate-pulse rounded-lg bg-zinc-800/50" />
              <div className="flex flex-1 flex-col justify-center gap-2">
                <div className="h-3 w-16 animate-pulse rounded bg-zinc-800/50" />
                <div className="h-4 w-full animate-pulse rounded bg-zinc-800/50" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800/50" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Skeleton */}
      <div className="mt-14 grid gap-8 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="mb-5 h-5 w-24 animate-pulse rounded bg-zinc-800/50" />
            <div className="space-y-3 rounded-xl border border-zinc-800/60 p-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="flex gap-3">
                  <div className="mt-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-800/50" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-full animate-pulse rounded bg-zinc-800/50" />
                    <div className="h-3 w-16 animate-pulse rounded bg-zinc-800/50" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
