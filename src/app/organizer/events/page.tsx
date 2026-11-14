'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import EventBookLogo from '@/components/eventbook-logo'

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
    <div className="flex min-h-full flex-1 flex-col bg-white text-primary-text">
      <header className="border-b border-border bg-white">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12"
        >
          <EventBookLogo />
          <Link
            href="/organizer/dashboard"
            className="text-sm font-semibold transition-colors hover:text-primary-indigo"
          >
            Organizer Dashboard
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <section aria-labelledby="my-events-title">
          <div className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-primary-indigo">
                Organizer
              </p>
              <h1 id="my-events-title" className="text-3xl font-semibold sm:text-4xl">
                My Events
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-secondary-text">
                View the events you have created and check their details and seat availability.
              </p>
            </div>
            <Link
              href="/organizer/events/new"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary-indigo px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-light-indigo hover:text-primary-indigo hover:ring-2 hover:ring-secondary-indigo"
            >
              Create Event
            </Link>
          </div>

          {eventsState.status === 'loading' ? (
            <p className="py-16 text-center text-secondary-text" role="status">
              Loading your events...
            </p>
          ) : eventsState.status === 'unauthenticated' ? (
            <div className="py-16 text-center" role="alert">
              <h2 className="text-xl font-semibold">Please log in to view your events.</h2>
              <Link
                href="/login"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-white"
              >
                Go to Login
              </Link>
            </div>
          ) : eventsState.status === 'unauthorized' ? (
            <div className="py-16 text-center" role="alert">
              <h2 className="text-xl font-semibold">You are not authorized to view these events.</h2>
              <p className="mt-2 text-secondary-text">This page is available to organizers only.</p>
            </div>
          ) : eventsState.status === 'error' ? (
            <div className="py-16 text-center" role="alert">
              <h2 className="text-xl font-semibold">We couldn&apos;t load your events</h2>
              <p className="mt-2 text-secondary-text">{eventsState.message}</p>
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-white"
              >
                Try again
              </button>
            </div>
          ) : eventsState.events.length === 0 ? (
            <div className="py-16 text-center">
              <h2 className="text-xl font-semibold">You haven&apos;t created any events yet.</h2>
              <p className="mt-2 text-secondary-text">Your events will appear here after you create one.</p>
              <Link
                href="/organizer/events/new"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-white px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-light-indigo"
              >
                Create your first event
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 pt-8 md:grid-cols-2 xl:grid-cols-3">
              {eventsState.events.map((event) => (
                <article
                  key={event.id}
                  className="flex min-w-0 flex-col rounded-lg border border-border bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="min-w-0 text-xl font-semibold leading-7">{event.title}</h2>
                    <span className="shrink-0 rounded-full bg-light-indigo px-3 py-1 text-xs font-semibold text-primary-text">
                      {event.status}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-line leading-6 text-secondary-text">
                    {event.description}
                  </p>
                  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-border pt-4 text-sm">
                    <div>
                      <dt className="text-secondary-text">Date</dt>
                      <dd className="mt-1 font-medium">{formatEventDate(event.date)}</dd>
                    </div>
                    <div>
                      <dt className="text-secondary-text">Time</dt>
                      <dd className="mt-1 font-medium">{event.time}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-secondary-text">Location</dt>
                      <dd className="mt-1 font-medium">{event.location}</dd>
                    </div>
                    <div>
                      <dt className="text-secondary-text">Total seats</dt>
                      <dd className="mt-1 font-semibold">{event.totalSeats}</dd>
                    </div>
                    <div>
                      <dt className="text-secondary-text">Available seats</dt>
                      <dd className="mt-1 font-semibold">{event.availableSeats}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-border bg-light-indigo">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-7 text-sm text-primary-text sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <EventBookLogo compact />
          <p>© 2026 EventBook. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}