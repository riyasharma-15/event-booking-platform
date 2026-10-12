'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type DashboardUser = {
  name: string
  email: string
  role: string
}

type DashboardState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'unauthorized' }
  | { status: 'authenticated'; user: DashboardUser }
  | { status: 'error'; message: string }

export default function OrganizerDashboardPage() {
  const [dashboardState, setDashboardState] = useState<DashboardState>({ status: 'loading' })
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let isCurrent = true

    async function loadCurrentUser() {
      setDashboardState({ status: 'loading' })

      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' })

        if (response.status === 401) {
          if (isCurrent) setDashboardState({ status: 'unauthenticated' })
          return
        }

        const payload: { user?: DashboardUser; error?: string } = await response.json()

        if (!response.ok) {
          throw new Error(payload.error || 'Unable to check your session. Please try again.')
        }

        if (!payload.user) {
          throw new Error('The user information could not be loaded. Please try again.')
        }

        if (isCurrent) {
          setDashboardState(
            payload.user.role === 'ORGANIZER'
              ? { status: 'authenticated', user: payload.user }
              : { status: 'unauthorized' },
          )
        }
      } catch (error) {
        if (isCurrent) {
          setDashboardState({
            status: 'error',
            message: error instanceof Error
              ? error.message
              : 'A server error occurred. Please try again.',
          })
        }
      }
    }

    void loadCurrentUser()

    return () => {
      isCurrent = false
    }
  }, [retryCount])

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white text-[#17372f]">
      <header className="border-b border-[#17372f]/10 bg-white">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 sm:px-8 lg:px-12"
        >
          <Link href="/" aria-label="EventBook home" className="inline-flex items-baseline font-bold leading-none">
            <span className="text-2xl tracking-tight">Event</span>
            <span className="text-lg text-[#d9674e]">Book</span>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-3 text-sm font-medium sm:gap-x-8">
            <Link className="transition-colors hover:text-[#d9674e]" href="/events">
              Explore Events
            </Link>
            <Link className="transition-colors hover:text-[#d9674e]" href="/organizer/events">
              My Events
            </Link>
            <Link className="transition-colors hover:text-[#d9674e]" href="/organizer/events/new">
              Create Event
            </Link>
            {dashboardState.status === 'authenticated' && (
              <div className="flex items-center gap-2.5 border-l border-[#17372f]/10 pl-4 sm:pl-6">
                <span
                  aria-hidden="true"
                  className="flex size-9 items-center justify-center rounded-full bg-[#e8ede8] text-sm font-semibold text-[#17372f]"
                >
                  {dashboardState.user.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="max-w-32 truncate font-semibold">{dashboardState.user.name}</span>
              </div>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
        {dashboardState.status === 'loading' ? (
          <p className="w-full py-16 text-center text-[#53645d]" role="status">
            Checking your session...
          </p>
        ) : dashboardState.status === 'unauthenticated' ? (
          <section className="mx-auto max-w-xl text-center" role="alert">
            <h1 className="text-3xl font-semibold">You need to log in to access the organizer dashboard.</h1>
            <Link
              href="/login"
              className="mt-7 inline-flex min-h-12 items-center justify-center rounded-md bg-[#17372f] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#285447]"
            >
              Go to Login
            </Link>
          </section>
        ) : dashboardState.status === 'unauthorized' ? (
          <section className="mx-auto max-w-xl text-center" role="alert">
            <h1 className="text-3xl font-semibold">You are not authorized to view this page.</h1>
            <p className="mt-3 text-[#53645d]">This dashboard is available to organizers only.</p>
            <Link
              href="/dashboard"
              className="mt-7 inline-flex min-h-12 items-center justify-center rounded-md border border-[#17372f]/20 px-6 py-3 font-semibold transition-colors hover:bg-[#f5f7f4]"
            >
              Go to attendee dashboard
            </Link>
          </section>
        ) : dashboardState.status === 'error' ? (
          <section className="mx-auto max-w-xl text-center" role="alert">
            <h1 className="text-2xl font-semibold">We couldn&apos;t load your dashboard</h1>
            <p className="mt-3 text-[#53645d]">{dashboardState.message}</p>
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="mt-7 inline-flex min-h-12 items-center justify-center rounded-md bg-[#17372f] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#285447]"
            >
              Try again
            </button>
          </section>
        ) : (
          <section className="mx-auto w-full">
            <div className="border-b border-[#17372f]/10 pb-10 sm:pb-12">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d9674e]">
                Organizer Dashboard
              </p>
              <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
                Welcome back, {dashboardState.user.name} 👋
              </h1>
              <p className="mt-5 text-base leading-7 text-[#53645d] sm:text-lg">
                Manage your events and keep track of bookings from one place.
              </p>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-[#17372f]/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-7 text-sm text-[#53645d] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <Link href="/" className="font-bold text-[#17372f]">EventBook</Link>
          <p>© 2026 EventBook. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}