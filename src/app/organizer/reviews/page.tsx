export default function OrganizerReviewsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-7 sm:py-10 lg:px-10">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-indigo">
          Organizer workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Reviews and Feedback
        </h1>
      </header>
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <span className="inline-flex min-h-8 items-center rounded-full bg-light-indigo px-3 text-xs font-semibold text-primary-indigo">
          Coming Soon
        </span>
        <h2 className="mt-5 text-xl font-semibold">Attendee reviews are not available yet</h2>
        <p className="mt-2 max-w-2xl leading-7 text-secondary-text">
          Reviews and feedback will appear here when review functionality is introduced.
        </p>
      </section>
    </div>
  )
}
