export default function OrganizerPaymentsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-7 sm:py-10 lg:px-10">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-indigo">
          Organizer workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Payments and Revenue
        </h1>
      </header>
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <div className="flex size-12 items-center justify-center rounded-full bg-light-indigo text-primary-indigo">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18v12H3z M3 10h18 M7 15h3" />
          </svg>
        </div>
        <h2 className="mt-5 text-xl font-semibold">Payments are coming later</h2>
        <p className="mt-2 max-w-2xl leading-7 text-secondary-text">
          Payment integration has not been enabled yet. Online payments and revenue tracking will be available in a future update.
        </p>
      </section>
    </div>
  )
}
