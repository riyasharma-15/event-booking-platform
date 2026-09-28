'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
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

type PageState = 'loading' | 'invalid' | 'not-found' | 'error' | 'success'

function formatEventDate(date: string) {
  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return date
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsedDate)
}

export default function EventDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [event, setEvent] = useState<EventItem | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')

  useEffect(() => {
    if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
      setPageState('invalid')
      return
    }

    let isCurrent = true

    async function loadEvent() {
      setPageState('loading')
      setEvent(null)

      try {
        const response = await fetch(`/api/events/${encodeURIComponent(id)}`)

        if (response.status === 400) {
          if (isCurrent) setPageState('invalid')
          return
        }

        if (response.status === 404) {
          if (isCurrent) setPageState('not-found')
          return
        }

        if (!response.ok) {
          throw new Error('Event request failed')
        }

        const payload: { event?: EventItem } = await response.json()

        if (!payload.event) {
          throw new Error('Event response was incomplete')
        }

        if (isCurrent) {
          setEvent(payload.event)
          setPageState('success')
        }
      } catch {
        if (isCurrent) setPageState('error')
      }
    }

    void loadEvent()

    return () => {
      isCurrent = false
    }
  }, [id])

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

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <Link
          href="/events"
          className="inline-flex min-h-10 items-center text-sm font-semibold text-[#53645d] transition-colors hover:text-[#d9674e]"
        >
          <span aria-hidden="true" className="mr-2">←</span>
          Back to Events
        </Link>

        {pageState === 'loading' ? (
          <p className="py-24 text-center text-[#53645d]" role="status">
            Loading event details…
          </p>
        ) : pageState === 'invalid' ? (
          <div className="py-24 text-center" role="alert">
            <h1 className="text-2xl font-semibold">Invalid event ID</h1>
            <p className="mt-3 text-[#53645d]">The event link does not contain a valid ID.</p>
          </div>
        ) : pageState === 'not-found' ? (
          <div className="py-24 text-center" role="status">
            <h1 className="text-2xl font-semibold">Event not found</h1>
            <p className="mt-3 text-[#53645d]">This event may have been removed or is no longer available.</p>
          </div>
        ) : pageState === 'error' || !event ? (
          <div className="py-24 text-center" role="alert">
            <h1 className="text-2xl font-semibold">We couldn’t load this event</h1>
            <p className="mt-3 text-[#53645d]">Please try again in a little while.</p>
          </div>
        ) : (
          <article className="mt-6 overflow-hidden rounded-lg border border-[#17372f]/10 bg-white shadow-sm">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
              <div className="relative aspect-[16/10] bg-[#e8ede8] lg:aspect-auto lg:min-h-[34rem]">
                {event.image ? (
                  <Image
                    src={event.image}
                    alt={event.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 52vw"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full min-h-64 items-center justify-center text-sm font-medium text-[#78857f]">
                    Event image unavailable
                  </div>
                )}
              </div>

              <div className="flex flex-col p-6 sm:p-9 lg:p-10">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d9674e]">
                  Event details
                </p>
                <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
                  {event.title}
                </h1>
                <p className="mt-5 whitespace-pre-line leading-7 text-[#53645d]">
                  {event.description}
                </p>

                <dl className="mt-8 grid grid-cols-1 gap-5 border-t border-[#17372f]/10 pt-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm text-[#78857f]">Date</dt>
                    <dd className="mt-1 font-semibold">{formatEventDate(event.date)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-[#78857f]">Time</dt>
                    <dd className="mt-1 font-semibold">{event.time}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm text-[#78857f]">Location</dt>
                    <dd className="mt-1 font-semibold">{event.location}</dd>
                  </div>
                </dl>

                <div className="mt-7 grid grid-cols-2 gap-4 rounded-md bg-[#f5f7f4] p-4">
                  <div>
                    <p className="text-sm text-[#78857f]">Available seats</p>
                    <p className="mt-1 text-lg font-semibold">{event.availableSeats}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#78857f]">Total seats</p>
                    <p className="mt-1 text-lg font-semibold">{event.totalSeats}</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-7 inline-flex min-h-12 items-center justify-center rounded-md bg-[#17372f] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#285447]"
                >
                  Book Tickets
                </button>
              </div>
            </div>
          </article>
        )}
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