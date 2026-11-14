import Link from 'next/link'
import EventBookLogo from '@/components/eventbook-logo'
import ProfileDropdown from '@/components/profile-dropdown'
import { requireServerRole } from '@/lib/server-auth'

export default async function AdminDashboardPage() {
  const user = await requireServerRole('ADMIN')

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white text-primary-text">
      <header className="border-b border-border bg-white">
        <nav
          aria-label="Admin navigation"
          className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12"
        >
          <EventBookLogo />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium">
            <Link href="/admin/dashboard" aria-current="page" className="text-primary-indigo">
              Dashboard
            </Link>
            <Link
              href="/admin/organizer-applications"
              className="transition-colors hover:text-primary-indigo"
            >
              Organizer Applications
            </Link>
            <ProfileDropdown name={user.name} />
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <section aria-labelledby="admin-dashboard-title">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-indigo">
            Administration
          </p>
          <h1 id="admin-dashboard-title" className="mt-4 text-3xl font-semibold sm:text-4xl">
            Admin Dashboard
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-secondary-text">
            Review organizer applications and manage platform administration.
          </p>
        </section>
      </main>

      <footer className="border-t border-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-7 text-sm text-primary-text sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <EventBookLogo compact />
          <p>© 2026 EventBook. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
