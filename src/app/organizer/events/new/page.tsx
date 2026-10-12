'use client'

import Link from 'next/link'
import { useState } from 'react'

type EventForm = {
  title: string
  description: string
  date: string
  time: string
  location: string
  totalSeats: string
  image: string
}

type CreateEventResponse = {
  error?: string
}

const initialForm: EventForm = {
  title: '',
  description: '',
  date: '',
  time: '',
  location: '',
  totalSeats: '',
  image: '',
}

export default function CreateEventPage() {
  const [form, setForm] = useState<EventForm>(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; success: boolean } | null>(null)

  function updateField(field: keyof EventForm, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
    setFeedback(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFeedback(null)

    if (!form.title.trim() || !form.description.trim() || !form.date || !form.time || !form.location.trim()) {
      setFeedback({ message: 'Please complete all required fields.', success: false })
      return
    }

    const totalSeats = Number(form.totalSeats)
    if (!Number.isInteger(totalSeats) || totalSeats <= 0) {
      setFeedback({ message: 'Total seats must be a positive integer.', success: false })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          date: form.date,
          time: form.time,
          location: form.location.trim(),
          totalSeats,
          image: form.image.trim(),
        }),
      })
      const payload: CreateEventResponse = await response.json()

      if (!response.ok) {
        setFeedback({
          message: payload.error || 'Unable to create the event. Please try again.',
          success: false,
        })
        return
      }

      setForm(initialForm)
      setFeedback({ message: 'Event created successfully.', success: true })
    } catch {
      setFeedback({ message: 'A server error occurred. Please try again.', success: false })
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClassName = 'min-h-12 w-full rounded-md border border-[#17372f]/20 bg-white px-3.5 text-base outline-none transition focus:border-[#17372f] focus:ring-2 focus:ring-[#17372f]/15'

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
            Back to dashboard
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d9674e]">
            Organizer
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Create an event</h1>
          <p className="mt-3 leading-7 text-[#53645d]">
            Add the details for the event you want to host.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-[#17372f]/10 bg-white p-5 shadow-sm sm:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="event-title" className="mb-2 block text-sm font-semibold">
                Title
              </label>
              <input
                id="event-title"
                name="title"
                type="text"
                required
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                className={inputClassName}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="event-description" className="mb-2 block text-sm font-semibold">
                Description
              </label>
              <textarea
                id="event-description"
                name="description"
                required
                rows={5}
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                className="w-full rounded-md border border-[#17372f]/20 bg-white px-3.5 py-3 text-base outline-none transition focus:border-[#17372f] focus:ring-2 focus:ring-[#17372f]/15"
              />
            </div>

            <div>
              <label htmlFor="event-date" className="mb-2 block text-sm font-semibold">
                Date
              </label>
              <input
                id="event-date"
                name="date"
                type="date"
                required
                value={form.date}
                onChange={(event) => updateField('date', event.target.value)}
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor="event-time" className="mb-2 block text-sm font-semibold">
                Time
              </label>
              <input
                id="event-time"
                name="time"
                type="time"
                required
                value={form.time}
                onChange={(event) => updateField('time', event.target.value)}
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor="event-location" className="mb-2 block text-sm font-semibold">
                Location
              </label>
              <input
                id="event-location"
                name="location"
                type="text"
                required
                value={form.location}
                onChange={(event) => updateField('location', event.target.value)}
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor="event-seats" className="mb-2 block text-sm font-semibold">
                Total Seats
              </label>
              <input
                id="event-seats"
                name="totalSeats"
                type="number"
                min="1"
                step="1"
                required
                value={form.totalSeats}
                onChange={(event) => updateField('totalSeats', event.target.value)}
                className={inputClassName}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="event-image" className="mb-2 block text-sm font-semibold">
                Image URL <span className="font-normal text-[#78857f]">(optional)</span>
              </label>
              <input
                id="event-image"
                name="image"
                type="url"
                value={form.image}
                onChange={(event) => updateField('image', event.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          {feedback && (
            <p
              role={feedback.success ? 'status' : 'alert'}
              className={`mt-5 text-sm font-medium ${feedback.success ? 'text-[#285447]' : 'text-[#b43f32]'}`}
            >
              {feedback.message}
            </p>
          )}

          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[#17372f]/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/organizer/dashboard"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-[#17372f]/20 px-5 py-3 text-sm font-semibold transition-colors hover:bg-[#f5f7f4]"
            >
              Return to dashboard
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#17372f] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#285447] disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isSubmitting ? 'Creating Event...' : 'Create Event'}
            </button>
          </div>
        </form>
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