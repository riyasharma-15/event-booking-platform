'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type OrganizerEvent = {
  id: number
  title: string
  description: string
  date: string
  time: string
  location: string
  totalSeats: number
  availableSeats: number
  status: string
}

type EventsState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'unauthorized' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; events: OrganizerEvent[] }

type EventsResponse = {
  events?: OrganizerEvent[]
  error?: string
}

function formatEventDate(date: string) {
  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return date
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsedDate)
}

export default function OrganizerEventsPage() {
  const [eventsState, setEventsState] = useState<EventsState>({ status: 'loading' })
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let isCurrent = true

    async function loadOrganizerEvents() {
      setEventsState({ status: 'loading' })

      try {
        const response = await fetch('/api/events/my-events', { credentials: 'include' })

        if (response.status === 401) {
          if (isCurrent) setEventsState({ status: 'unauthenticated' })
          return
        }

        if (response.status === 403) {
          if (isCurrent) setEventsState({ status: 'unauthorized' })
          return
        }

        const payload: EventsResponse = await response.json()

        if (!response.ok) {
          throw new Error(payload.error || 'Unable to load your events. Please try again.')
        }

        if (!Array.isArray(payload.events)) {
          throw new Error('The event list could not be loaded. Please try again.')
        }

        if (isCurrent) {
          setEventsState({ status: 'loaded', events: payload.events })
        }
      } catch (error) {
        if (isCurrent) {
          setEventsState({
            status: 'error',
            message: error instanceof Error
              ? error.message
              : 'A server error occurred. Please try again.',
          })
        }
      }
    }

    void loadOrganizerEvents()

    return () => {
      isCurrent = false
    }
  }, [retryCount])

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f5f7f4] text-[#17372f]">
      <header className="border-b border-[#17372f]/10 bg-white">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12"
        >
          <Link href="/" className="text-xl font-bold">
            Event<span className="text-[#d9674e]">Book</span>
          </Link>
          <Link
            href="/organizer/dashboard"
            className="text-sm font-semibold transition-colors hover:text-[#d9674e]"
          >
            Organizer Dashboard
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <section aria-labelledby="my-events-title">
          <div className="flex flex-col gap-6 border-b border-[#17372f]/15 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#d9674e]">
                Organizer
              </p>
              <h1 id="my-events-title" className="text-3xl font-semibold sm:text-4xl">
                My Events
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-[#53645d]">
                View the events you have created and check their details and seat availability.
              </p>
            </div>
            <Link
              href="/organizer/events/new"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#17372f] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#285447]"
            >
              Create Event
            </Link>
          </div>

          {eventsState.status === 'loading' ? (
            <p className="py-16 text-center text-[#53645d]" role="status">
              Loading your events...
            </p>
          ) : eventsState.status === 'unauthenticated' ? (
            <div className="py-16 text-center" role="alert">
              <h2 className="text-xl font-semibold">Please log in to view your events.</h2>
              <Link
                href="/login"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-[#17372f]/20 px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-white"
              >
                Go to Login
              </Link>
            </div>
          ) : eventsState.status === 'unauthorized' ? (
            <div className="py-16 text-center" role="alert">
              <h2 className="text-xl font-semibold">You are not authorized to view these events.</h2>
              <p className="mt-2 text-[#53645d]">This page is available to organizers only.</p>
            </div>
          ) : eventsState.status === 'error' ? (
            <div className="py-16 text-center" role="alert">
              <h2 className="text-xl font-semibold">We couldn&apos;t load your events</h2>
              <p className="mt-2 text-[#53645d]">{eventsState.message}</p>
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-[#17372f]/20 px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-white"
              >
                Try again
              </button>
            </div>
          ) : eventsState.events.length === 0 ? (
            <div className="py-16 text-center">
              <h2 className="text-xl font-semibold">You haven&apos;t created any events yet.</h2>
              <p className="mt-2 text-[#53645d]">Your events will appear here after you create one.</p>
              <Link
                href="/organizer/events/new"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-[#17372f]/20 bg-white px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-[#edf1ec]"
              >
                Create your first event
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 pt-8 md:grid-cols-2 xl:grid-cols-3">
              {eventsState.events.map((event) => (
                <article
                  key={event.id}
                  className="flex min-w-0 flex-col rounded-lg border border-[#17372f]/10 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="min-w-0 text-xl font-semibold leading-7">{event.title}</h2>
                    <span className="shrink-0 rounded-full bg-[#edf1ec] px-3 py-1 text-xs font-semibold text-[#53645d]">
                      {event.status}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-line leading-6 text-[#53645d]">
                    {event.description}
                  </p>
                  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-[#17372f]/10 pt-4 text-sm">
                    <div>
                      <dt className="text-[#78857f]">Date</dt>
                      <dd className="mt-1 font-medium">{formatEventDate(event.date)}</dd>
                    </div>
                    <div>
                      <dt className="text-[#78857f]">Time</dt>
                      <dd className="mt-1 font-medium">{event.time}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[#78857f]">Location</dt>
                      <dd className="mt-1 font-medium">{event.location}</dd>
                    </div>
                    <div>
                      <dt className="text-[#78857f]">Total seats</dt>
                      <dd className="mt-1 font-semibold">{event.totalSeats}</dd>
                    </div>
                    <div>
                      <dt className="text-[#78857f]">Available seats</dt>
                      <dd className="mt-1 font-semibold">{event.availableSeats}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-[#17372f]/10 bg-[#edf1ec]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-7 text-sm text-[#53645d] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <Link href="/" className="font-bold text-[#17372f]">EventBook</Link>
          <p>© 2026 EventBook. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}