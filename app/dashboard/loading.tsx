export default function DashboardLoading() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-8 sm:px-10 lg:px-12">
      <div className="panel h-40 animate-pulse rounded-[2rem]" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="panel h-32 animate-pulse rounded-[1.75rem]" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="panel h-96 animate-pulse rounded-[2rem]" />
        <div className="space-y-6">
          <div className="panel h-48 animate-pulse rounded-[2rem]" />
          <div className="panel h-40 animate-pulse rounded-[2rem]" />
        </div>
      </div>
    </main>
  );
}