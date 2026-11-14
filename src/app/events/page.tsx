'use client'

import Image from 'next/image'
import Link from 'next/link'
import EventBookLogo from '@/components/eventbook-logo'
import { useEffect, useState } from 'react'

type EventItem = {
  id: number
  title: string
  description: string
  date: string
  time: string
  location: string
  availableSeats: number
  totalSeats: number
  image: string | null
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

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let isCurrent = true

    async function loadEvents() {
      try {
        const response = await fetch('/api/events')
        const payload: { events?: EventItem[] } = await response.json()

        if (!response.ok || !Array.isArray(payload.events)) {
          throw new Error('Unable to load events')
        }

        if (isCurrent) {
          setEvents(payload.events)
        }
      } catch {
        if (isCurrent) {
          setHasError(true)
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
      }
    }

    void loadEvents()

    return () => {
      isCurrent = false
    }
  }, [])

  const normalizedSearch = search.trim().toLowerCase()
  const filteredEvents = events.filter((event) => {
    return (
      event.title.toLowerCase().includes(normalizedSearch) ||
      event.location.toLowerCase().includes(normalizedSearch)
    )
  })

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white text-primary-text">
      <header className="border-b border-border bg-white">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 sm:px-8 lg:px-12"
        >
          <EventBookLogo />
          <div className="flex items-center gap-5 text-sm font-medium sm:gap-8">
            <Link className="text-primary-indigo" href="/events" aria-current="page">
              Events
            </Link>
            <Link className="transition-colors hover:text-primary-indigo" href="/login">
              Login
            </Link>
            <Link
              className="rounded-md bg-primary-indigo px-4 py-2.5 text-white transition-colors hover:bg-light-indigo hover:text-primary-indigo hover:ring-2 hover:ring-secondary-indigo"
              href="/register"
            >
              Register
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <section aria-labelledby="events-title">
          <div className="flex flex-col gap-7 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-primary-indigo">
                Find your next experience
              </p>
              <h1 id="events-title" className="text-4xl font-semibold sm:text-5xl">
                Explore events
              </h1>
              <p className="mt-4 max-w-2xl leading-7 text-secondary-text">
                Browse what is happening and find an event that matters to you.
              </p>
            </div>

            <div className="w-full sm:max-w-sm">
              <label htmlFor="event-search" className="mb-2 block text-sm font-medium">
                Search events
              </label>
              <input
                id="event-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title or location"
                className="min-h-12 w-full rounded-md border border-border bg-white px-4 text-primary-text outline-none placeholder:text-secondary-text focus:border-secondary-indigo focus:ring-2 focus:ring-secondary-indigo/20"
              />
            </div>
          </div>

          {isLoading ? (
            <p className="py-16 text-center text-secondary-text" role="status">
              Loading events…
            </p>
          ) : hasError ? (
            <div className="py-16 text-center" role="alert">
              <p className="text-lg font-semibold">Events are unavailable right now.</p>
              <p className="mt-2 text-secondary-text">Please try again in a little while.</p>
            </div>
          ) : events.length === 0 ? (
            <p className="py-16 text-center text-secondary-text">
              There are no events to show right now. Please check back soon.
            </p>
          ) : filteredEvents.length === 0 ? (
            <p className="py-16 text-center text-secondary-text">
              No events match “{search}”. Try another title or location.
            </p>
          ) : (
            <div className="grid gap-6 pt-8 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event) => (
                <article
                  key={event.id}
                  className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm"
                >
                  {event.image ? (
                    <div className="relative aspect-[16/9] bg-light-indigo">
                      <Image
                        src={event.image}
                        alt={event.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      aria-hidden="true"
                      className="flex aspect-[16/9] items-center justify-center bg-light-indigo text-sm font-medium text-primary-text"
                    >
                      EventBook
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <h2 className="text-xl font-semibold leading-7">{event.title}</h2>
                    <p className="mt-3 line-clamp-3 leading-6 text-secondary-text">
                      {event.description}
                    </p>
                    <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 text-sm">
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
                    </dl>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-secondary-text">Available seats</p>
                        <p className="mt-1 font-semibold">{event.availableSeats}</p>
                      </div>
                      <div>
                        <p className="text-secondary-text">Total seats</p>
                        <p className="mt-1 font-semibold">{event.totalSeats}</p>
                      </div>
                    </div>
                    <Link
                      href={`/events/${event.id}`}
                      className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-primary-indigo px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-light-indigo hover:text-primary-indigo hover:ring-2 hover:ring-secondary-indigo"
                    >
                      View Details
                    </Link>
                  </div>
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