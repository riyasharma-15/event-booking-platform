export default function OrganizerDashboardLoading() {
  return (
    <div role="status" aria-label="Loading organizer dashboard" className="mx-auto w-full max-w-7xl animate-pulse px-4 py-8 sm:px-7 sm:py-10 lg:px-10">
      <div className="h-9 w-56 rounded bg-neutral-soft" />
      <div className="mt-3 h-5 w-80 max-w-full rounded bg-neutral-soft" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-36 rounded-xl border border-border bg-white" />
        ))}
      </div>
      <div className="mt-8 h-72 rounded-xl border border-border bg-white" />
      <span className="sr-only">Loading dashboard data...</span>
    </div>
  )
}
