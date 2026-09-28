'use client'

import Image from 'next/image'
import Link from 'next/link'
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
    <div className="flex min-h-full flex-1 flex-col bg-[#f5f7f4] text-[#17372f]">
      <header className="border-b border-[#17372f]/10 bg-[#f5f7f4]">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 sm:px-8 lg:px-12"
        >
          <Link href="/" className="text-xl font-bold">
            Event<span className="text-[#d9674e]">Book</span>
          </Link>
          <div className="flex items-center gap-5 text-sm font-medium sm:gap-8">
            <Link className="text-[#d9674e]" href="/events" aria-current="page">
              Events
            </Link>
            <Link className="transition-colors hover:text-[#d9674e]" href="/login">
              Login
            </Link>
            <Link
              className="rounded-md bg-[#17372f] px-4 py-2.5 text-white transition-colors hover:bg-[#285447]"
              href="/register"
            >
              Register
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <section aria-labelledby="events-title">
          <div className="flex flex-col gap-7 border-b border-[#17372f]/15 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#d9674e]">
                Find your next experience
              </p>
              <h1 id="events-title" className="text-4xl font-semibold sm:text-5xl">
                Explore events
              </h1>
              <p className="mt-4 max-w-2xl leading-7 text-[#53645d]">
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
                className="min-h-12 w-full rounded-md border border-[#17372f]/20 bg-white px-4 text-[#17372f] outline-none placeholder:text-[#78857f] focus:border-[#d9674e] focus:ring-2 focus:ring-[#d9674e]/20"
              />
            </div>
          </div>

          {isLoading ? (
            <p className="py-16 text-center text-[#53645d]" role="status">
              Loading events…
            </p>
          ) : hasError ? (
            <div className="py-16 text-center" role="alert">
              <p className="text-lg font-semibold">Events are unavailable right now.</p>
              <p className="mt-2 text-[#53645d]">Please try again in a little while.</p>
            </div>
          ) : events.length === 0 ? (
            <p className="py-16 text-center text-[#53645d]">
              There are no events to show right now. Please check back soon.
            </p>
          ) : filteredEvents.length === 0 ? (
            <p className="py-16 text-center text-[#53645d]">
              No events match “{search}”. Try another title or location.
            </p>
          ) : (
            <div className="grid gap-6 pt-8 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event) => (
                <article
                  key={event.id}
                  className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-[#17372f]/10 bg-white shadow-sm"
                >
                  {event.image ? (
                    <div className="relative aspect-[16/9] bg-[#e8ede8]">
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
                      className="flex aspect-[16/9] items-center justify-center bg-[#e8ede8] text-sm font-medium text-[#78857f]"
                    >
                      EventBook
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <h2 className="text-xl font-semibold leading-7">{event.title}</h2>
                    <p className="mt-3 line-clamp-3 leading-6 text-[#53645d]">
                      {event.description}
                    </p>
                    <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[#17372f]/10 pt-4 text-sm">
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
                    </dl>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[#78857f]">Available seats</p>
                        <p className="mt-1 font-semibold">{event.availableSeats}</p>
                      </div>
                      <div>
                        <p className="text-[#78857f]">Total seats</p>
                        <p className="mt-1 font-semibold">{event.totalSeats}</p>
                      </div>
                    </div>
                    <Link
                      href={`/events/${event.id}`}
                      className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-[#17372f] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#285447]"
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

      <footer className="border-t border-[#17372f]/10 bg-[#edf1ec]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-7 text-sm text-[#53645d] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <Link href="/" className="font-bold text-[#17372f]">
            EventBook
          </Link>
          <p>© 2026 EventBook. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}