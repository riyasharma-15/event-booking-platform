'use client'

export default function OrganizerDashboardError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center" role="alert">
      <h1 className="text-2xl font-semibold">We couldn&apos;t load your dashboard</h1>
      <p className="mt-3 text-sm leading-6 text-secondary-text">
        Please try again. If the problem continues, contact support.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-indigo px-5 py-2.5 text-sm font-semibold text-white hover:bg-light-indigo hover:text-primary-indigo hover:ring-2 hover:ring-secondary-indigo"
      >
        Try again
      </button>
    </div>
  )
}
