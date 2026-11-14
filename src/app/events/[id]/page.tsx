'use client'

import Image from 'next/image'
import Link from 'next/link'
import EventBookLogo from '@/components/eventbook-logo'
import { useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

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
type BookingFeedback = { type: 'error' | 'success'; message: string } | null

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
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [ticketCount, setTicketCount] = useState(1)
  const [email, setEmail] = useState('')
  const [bookingFeedback, setBookingFeedback] = useState<BookingFeedback>(null)
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false)
  const [eventRefreshKey, setEventRefreshKey] = useState(0)
  const emailInputRef = useRef<HTMLInputElement>(null)

  function validateBookingDetails() {
    if (!event) return false

    setBookingFeedback(null)

    if (ticketCount < 1) {
      setBookingFeedback({ type: 'error', message: 'Choose at least 1 ticket.' })
      return false
    }

    if (ticketCount > event.availableSeats) {
      setBookingFeedback({
        type: 'error',
        message: `Only ${event.availableSeats} tickets are available.`,
      })
      return false
    }

    if (!email.trim()) {
      setBookingFeedback({ type: 'error', message: 'Enter your email address.' })
      return false
    }

    if (!emailInputRef.current?.checkValidity()) {
      emailInputRef.current?.reportValidity()
      setBookingFeedback({ type: 'error', message: 'Enter a valid email address.' })
      return false
    }

    setBookingFeedback({ type: 'success', message: 'Details are valid. Ready to book.' })
    return true
  }

  async function submitBooking() {
    if (isSubmittingBooking || !validateBookingDetails()) return

    setIsSubmittingBooking(true)

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: Number(id),
          ticketCount,
          email: email.trim(),
        }),
      })

      if (!response.ok) {
        let payload: { error?: unknown } = {}
        try {
          payload = await response.json()
        } catch {
          // Use the generic message when the response is not JSON.
        }

        setBookingFeedback({
          type: 'error',
          message:
            typeof payload.error === 'string' && payload.error.trim()
              ? payload.error
              : 'Unable to complete your booking. Please try again.',
        })
        return
      }

      setBookingFeedback({ type: 'success', message: 'Booking confirmed successfully.' })
      setEventRefreshKey((currentKey) => currentKey + 1)
    } catch {
      setBookingFeedback({
        type: 'error',
        message: 'Unable to complete your booking. Please try again.',
      })
    } finally {
      setIsSubmittingBooking(false)
    }
  }

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
  }, [id, eventRefreshKey])

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

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <Link
          href="/events"
          className="inline-flex min-h-10 items-center text-sm font-semibold text-secondary-text transition-colors hover:text-primary-indigo"
        >
          <span aria-hidden="true" className="mr-2">←</span>
          Back to Events
        </Link>

        {pageState === 'loading' ? (
          <p className="py-24 text-center text-secondary-text" role="status">
            Loading event details…
          </p>
        ) : pageState === 'invalid' ? (
          <div className="py-24 text-center" role="alert">
            <h1 className="text-2xl font-semibold">Invalid event ID</h1>
            <p className="mt-3 text-secondary-text">The event link does not contain a valid ID.</p>
          </div>
        ) : pageState === 'not-found' ? (
          <div className="py-24 text-center" role="status">
            <h1 className="text-2xl font-semibold">Event not found</h1>
            <p className="mt-3 text-secondary-text">This event may have been removed or is no longer available.</p>
          </div>
        ) : pageState === 'error' || !event ? (
          <div className="py-24 text-center" role="alert">
            <h1 className="text-2xl font-semibold">We couldn’t load this event</h1>
            <p className="mt-3 text-secondary-text">Please try again in a little while.</p>
          </div>
        ) : (
          <article className="mt-6 overflow-hidden rounded-lg border border-border bg-white shadow-sm">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
              <div className="relative aspect-[16/10] bg-light-indigo lg:aspect-auto lg:min-h-[34rem]">
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
                  <div className="flex h-full min-h-64 items-center justify-center text-sm font-medium text-secondary-text">
                    Event image unavailable
                  </div>
                )}
              </div>

              <div className="flex flex-col p-6 sm:p-9 lg:p-10">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-indigo">
                  Event details
                </p>
                <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
                  {event.title}
                </h1>
                <p className="mt-5 whitespace-pre-line leading-7 text-secondary-text">
                  {event.description}
                </p>

                <dl className="mt-8 grid grid-cols-1 gap-5 border-t border-border pt-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm text-secondary-text">Date</dt>
                    <dd className="mt-1 font-semibold">{formatEventDate(event.date)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-secondary-text">Time</dt>
                    <dd className="mt-1 font-semibold">{event.time}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm text-secondary-text">Location</dt>
                    <dd className="mt-1 font-semibold">{event.location}</dd>
                  </div>
                </dl>

                <div className="mt-7 grid grid-cols-2 gap-4 rounded-md bg-white p-4">
                  <div>
                    <p className="text-sm text-secondary-text">Available seats</p>
                    <p className="mt-1 text-lg font-semibold">{event.availableSeats}</p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary-text">Total seats</p>
                    <p className="mt-1 text-lg font-semibold">{event.totalSeats}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsBookingOpen(true)}
                  className="mt-7 inline-flex min-h-12 items-center justify-center rounded-md bg-primary-indigo px-6 py-3 font-semibold text-white transition-colors hover:bg-light-indigo hover:text-primary-indigo hover:ring-2 hover:ring-secondary-indigo"
                >
                  Book Tickets
                </button>
              </div>
            </div>

            {isBookingOpen && (
              <form
                onSubmit={(submitEvent) => {
                  submitEvent.preventDefault()
                  void submitBooking()
                }}
                className="grid gap-5 border-t border-border p-6 sm:grid-cols-2 sm:p-9 lg:p-10"
              >
                {bookingFeedback && (
                  <p
                    className={`sm:col-span-2 text-sm font-medium ${
                      bookingFeedback.type === 'error' ? 'text-error' : 'text-primary-text'
                    }`}
                    role={bookingFeedback.type === 'error' ? 'alert' : 'status'}
                  >
                    {bookingFeedback.message}
                  </p>
                )}
                <div>
                  <label htmlFor="ticket-count" className="mb-2 block text-sm font-semibold">
                    Number of tickets
                  </label>
                  <input
                    id="ticket-count"
                    name="ticketCount"
                    type="number"
                    min={1}
                    value={ticketCount}
                    onChange={(changeEvent) => {
                      setTicketCount(Number(changeEvent.target.value))
                      setBookingFeedback(null)
                    }}
                    className="min-h-12 w-full rounded-md border border-border bg-white px-3.5 text-base outline-none focus:border-primary-indigo focus:ring-2 focus:ring-primary-indigo/20"
                  />
                </div>
                <div>
                  <label htmlFor="booking-email" className="mb-2 block text-sm font-semibold">
                    Email
                  </label>
                  <input
                    id="booking-email"
                    name="email"
                    type="email"
                    ref={emailInputRef}
                    value={email}
                    onChange={(changeEvent) => {
                      setEmail(changeEvent.target.value)
                      setBookingFeedback(null)
                    }}
                    className="min-h-12 w-full rounded-md border border-border bg-white px-3.5 text-base outline-none focus:border-primary-indigo focus:ring-2 focus:ring-primary-indigo/20"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isSubmittingBooking}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary-indigo px-6 py-3 font-semibold text-white transition-colors hover:bg-light-indigo hover:text-primary-indigo hover:ring-2 hover:ring-secondary-indigo"
                  >
                    {isSubmittingBooking ? 'Booking…' : 'Confirm Booking'}
                  </button>
                </div>
              </form>
            )}
          </article>
        )}
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