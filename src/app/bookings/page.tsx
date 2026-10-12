'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Booking = {
  id: number
  ticketCount: number
  status: string
  bookingDate: string
  event: {
    title: string
    date: string
    time: string
    location: string
  }
}

type BookingsState =
  | { status: 'loading' }
  | { status: 'unauthorized' }
  | { status: 'error' }
  | { status: 'loaded'; bookings: Booking[] }
type CancellationFeedback = { type: 'error' | 'success'; message: string } | null

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function BookingsPage() {
  const [bookingsState, setBookingsState] = useState<BookingsState>({ status: 'loading' })
  const [cancellationBookingId, setCancellationBookingId] = useState<number | null>(null)
  const [cancellingBookingId, setCancellingBookingId] = useState<number | null>(null)
  const [cancellationFeedback, setCancellationFeedback] = useState<CancellationFeedback>(null)
  const [bookingsRefreshKey, setBookingsRefreshKey] = useState(0)

  useEffect(() => {
    let isCurrent = true

    async function loadBookings() {
      try {
        const response = await fetch('/api/bookings', { credentials: 'include' })

        if (response.status === 401) {
          if (isCurrent) setBookingsState({ status: 'unauthorized' })
          return
        }

        if (!response.ok) {
          throw new Error('Unable to load bookings')
        }

        const payload: { bookings?: Booking[] } = await response.json()

        if (!Array.isArray(payload.bookings)) {
          throw new Error('Invalid bookings response')
        }

        if (isCurrent) setBookingsState({ status: 'loaded', bookings: payload.bookings })
      } catch {
        if (isCurrent) setBookingsState({ status: 'error' })
      }
    }

    void loadBookings()

    return () => {
      isCurrent = false
    }
  }, [bookingsRefreshKey])

  async function cancelBooking(bookingId: number) {
    if (cancellingBookingId !== null) return

    setCancellingBookingId(bookingId)
    setCancellationFeedback(null)

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        let payload: { error?: unknown } = {}
        try {
          payload = await response.json()
        } catch {
          // Use a generic message when the response is not JSON.
        }

        setCancellationFeedback({
          type: 'error',
          message:
            typeof payload.error === 'string' && payload.error.trim()
              ? payload.error
              : 'Unable to cancel this booking. Please try again.',
        })
        return
      }

      setCancellationFeedback({ type: 'success', message: 'Booking cancelled successfully.' })
      setCancellationBookingId(null)
      setBookingsRefreshKey((currentKey) => currentKey + 1)
    } catch {
      setCancellationFeedback({
        type: 'error',
        message: 'Unable to cancel this booking. Please try again.',
      })
    } finally {
      setCancellingBookingId(null)
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f5f7f4] text-[#17372f]">
      <header className="border-b border-[#17372f]/10 bg-white">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 sm:px-8 lg:px-12"
        >
          <Link href="/" aria-label="EventBook home" className="inline-flex items-baseline font-bold leading-none">
            <span className="text-2xl">Event</span>
            <span className="text-lg text-[#d9674e]">Book</span>
          </Link>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium sm:gap-x-8">
            <Link className="transition-colors hover:text-[#d9674e]" href="/events">
              Explore Events
            </Link>
            <Link className="text-[#d9674e]" href="/bookings" aria-current="page">
              My Bookings
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
        <section aria-labelledby="bookings-title" className="mx-auto w-full">
          <div className="border-b border-[#17372f]/10 pb-8 sm:pb-10">
            <h1 id="bookings-title" className="text-3xl font-semibold leading-tight sm:text-4xl">
              My Bookings
            </h1>
            <p className="mt-3 text-base leading-7 text-[#53645d]">
              View and manage your event bookings.
            </p>
          </div>

          {cancellationFeedback && (
            <p
              className={`mt-5 text-sm font-medium ${
                cancellationFeedback.type === 'error' ? 'text-[#b43f32]' : 'text-[#285447]'
              }`}
              role={cancellationFeedback.type === 'error' ? 'alert' : 'status'}
            >
              {cancellationFeedback.message}
            </p>
          )}

          {bookingsState.status === 'loading' ? (
            <p className="py-16 text-center text-[#53645d]" role="status">
              Loading your bookings...
            </p>
          ) : bookingsState.status === 'unauthorized' ? (
            <div className="py-16 text-center" role="alert">
              <p className="text-lg font-semibold">Please log in to view your bookings.</p>
              <Link
                href="/login"
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-[#17372f] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#285447]"
              >
                Log in
              </Link>
            </div>
          ) : bookingsState.status === 'error' ? (
            <p className="py-16 text-center text-[#53645d]" role="alert">
              We couldn&apos;t load your bookings. Please try again later.
            </p>
          ) : bookingsState.bookings.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-lg font-semibold">You haven&apos;t booked any events yet.</p>
              <Link
                href="/events"
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-[#17372f] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#285447]"
              >
                Explore events
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 pt-8 md:grid-cols-2">
              {bookingsState.bookings.map((booking) => (
                <article
                  key={booking.id}
                  className="min-w-0 rounded-md border border-[#17372f]/10 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h2 className="min-w-0 text-xl font-semibold leading-7">{booking.event.title}</h2>
                    <span className="shrink-0 rounded-full bg-[#e8ede8] px-3 py-1 text-xs font-semibold text-[#53645d]">
                      {booking.status}
                    </span>
                  </div>
                  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-[#17372f]/10 pt-4 text-sm">
                    <div>
                      <dt className="text-[#78857f]">Event date</dt>
                      <dd className="mt-1 font-medium">{formatDate(booking.event.date)}</dd>
                    </div>
                    <div>
                      <dt className="text-[#78857f]">Event time</dt>
                      <dd className="mt-1 font-medium">{booking.event.time}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[#78857f]">Location</dt>
                      <dd className="mt-1 break-words font-medium">{booking.event.location}</dd>
                    </div>
                    <div>
                      <dt className="text-[#78857f]">Tickets</dt>
                      <dd className="mt-1 font-medium">{booking.ticketCount}</dd>
                    </div>
                    <div>
                      <dt className="text-[#78857f]">Booking date</dt>
                      <dd className="mt-1 font-medium">{formatDate(booking.bookingDate)}</dd>
                    </div>
                  </dl>
                  {booking.status === 'CONFIRMED' && (
                    <>
                      <button
                        type="button"
                        disabled={cancellingBookingId !== null}
                        onClick={() => {
                          setCancellationBookingId(booking.id)
                          setCancellationFeedback(null)
                        }}
                        className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md border border-[#b43f32]/40 px-4 py-2 text-sm font-semibold text-[#b43f32] transition-colors hover:bg-[#fff3f1]"
                      >
                        Cancel Booking
                      </button>
                      {cancellationBookingId === booking.id && (
                        <div className="mt-5 border-t border-[#17372f]/10 pt-4">
                          <p className="text-sm font-medium text-[#53645d]" role="status">
                            Are you sure you want to cancel this booking?
                          </p>
                          <div className="mt-3 flex flex-wrap gap-3">
                            <button
                              type="button"
                              disabled={cancellingBookingId === booking.id}
                              onClick={() => void cancelBooking(booking.id)}
                              className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#b43f32] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#96362c]"
                            >
                              {cancellingBookingId === booking.id
                                ? 'Cancelling...'
                                : 'Confirm Cancellation'}
                            </button>
                            <button
                              type="button"
                              disabled={cancellingBookingId !== null}
                              onClick={() => setCancellationBookingId(null)}
                              className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#17372f]/20 px-4 py-2 text-sm font-semibold text-[#17372f] transition-colors hover:bg-[#f5f7f4]"
                            >
                              Keep Booking
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
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