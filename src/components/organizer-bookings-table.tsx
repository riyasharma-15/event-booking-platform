'use client'

import { useState } from 'react'

export type OrganizerRegistration = {
  bookingId: number
  attendeeName: string
  attendeeEmail: string
  eventId: number
  eventName: string
  registrationDate: string
  status: 'CONFIRMED' | 'CANCELLED'
}

type OrganizerEventOption = {
  id: number
  title: string
}

type OrganizerBookingsTableProps = {
  mode: 'attendees' | 'bookings'
  registrations: OrganizerRegistration[]
  events: OrganizerEventOption[]
}

const fieldClassName =
  'min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-primary-text outline-none focus:border-primary-indigo focus:ring-2 focus:ring-primary-indigo/20'
const pageSize = 20

function formatRegistrationDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function OrganizerBookingsTable({
  mode,
  registrations,
  events,
}: OrganizerBookingsTableProps) {
  const [search, setSearch] = useState('')
  const [eventId, setEventId] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const isAttendeeView = mode === 'attendees'
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const filteredRegistrations = registrations.filter((registration) => {
    const matchesSearch =
      !normalizedSearch ||
      registration.attendeeName.toLocaleLowerCase().includes(normalizedSearch) ||
      registration.attendeeEmail.toLocaleLowerCase().includes(normalizedSearch)
    const matchesEvent = eventId === 'all' || String(registration.eventId) === eventId
    const matchesStatus = status === 'all' || registration.status === status
    return matchesSearch && matchesEvent && matchesStatus
  })
  const pageCount = Math.max(1, Math.ceil(filteredRegistrations.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visibleRegistrations = filteredRegistrations.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  )

  function updateSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function updateEvent(value: string) {
    setEventId(value)
    setPage(1)
  }

  function updateStatus(value: string) {
    setStatus(value)
    setPage(1)
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-7 sm:py-10 lg:px-10">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-indigo">
          Organizer workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {isAttendeeView ? 'Attendee Management' : 'Bookings and Registrations'}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary-text sm:text-base">
          {isAttendeeView
            ? 'Search and review attendees registered for your events.'
            : 'Review registrations and their current booking status.'}
        </p>
      </header>

      <section
        aria-label="Registration filters"
        className="mb-5 grid gap-3 rounded-xl border border-border bg-white p-4 shadow-sm md:grid-cols-[minmax(14rem,2fr)_minmax(12rem,1fr)_minmax(10rem,1fr)]"
      >
        <div>
          <label htmlFor="registration-search" className="mb-1.5 block text-xs font-semibold text-secondary-text">
            Search attendee
          </label>
          <input
            id="registration-search"
            type="search"
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Name or email"
            className={fieldClassName}
          />
        </div>
        <div>
          <label htmlFor="registration-event" className="mb-1.5 block text-xs font-semibold text-secondary-text">
            Event
          </label>
          <select
            id="registration-event"
            value={eventId}
            onChange={(event) => updateEvent(event.target.value)}
            className={fieldClassName}
          >
            <option value="all">All events</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>{event.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="registration-status" className="mb-1.5 block text-xs font-semibold text-secondary-text">
            Booking status
          </label>
          <select
            id="registration-status"
            value={status}
            onChange={(event) => updateStatus(event.target.value)}
            className={fieldClassName}
          >
            <option value="all">All statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <p className="text-sm text-secondary-text" aria-live="polite">
            {filteredRegistrations.length} {filteredRegistrations.length === 1 ? 'registration' : 'registrations'}
          </p>
        </div>
        {visibleRegistrations.length === 0 ? (
          <div className="px-5 py-14 text-center sm:px-6">
            <h2 className="text-base font-semibold">
              {registrations.length === 0 ? 'No registrations yet' : 'No registrations match these filters'}
            </h2>
            <p className="mt-2 text-sm text-secondary-text">
              {registrations.length === 0
                ? 'Registrations for your events will appear here.'
                : 'Try changing your search or filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-white text-xs uppercase tracking-wide text-secondary-text">
                <tr>
                  {isAttendeeView ? (
                    <>
                      <th scope="col" className="px-5 py-3 font-semibold sm:px-6">Attendee</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Email</th>
                    </>
                  ) : (
                    <th scope="col" className="px-5 py-3 font-semibold sm:px-6">Booking ID</th>
                  )}
                  {!isAttendeeView && <th scope="col" className="px-5 py-3 font-semibold">Attendee</th>}
                  {!isAttendeeView && <th scope="col" className="px-5 py-3 font-semibold">Email</th>}
                  <th scope="col" className="px-5 py-3 font-semibold">Event</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Registered</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleRegistrations.map((registration) => (
                  <tr key={registration.bookingId}>
                    {isAttendeeView ? (
                      <>
                        <th scope="row" className="px-5 py-4 font-semibold sm:px-6">
                          {registration.attendeeName}
                        </th>
                        <td className="px-5 py-4 text-secondary-text">{registration.attendeeEmail}</td>
                      </>
                    ) : (
                      <>
                        <th scope="row" className="px-5 py-4 font-semibold sm:px-6">
                          #{registration.bookingId}
                        </th>
                        <td className="px-5 py-4 font-medium">{registration.attendeeName}</td>
                        <td className="px-5 py-4 text-secondary-text">{registration.attendeeEmail}</td>
                      </>
                    )}
                    <td className="max-w-64 truncate px-5 py-4">{registration.eventName}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-secondary-text">
                      {formatRegistrationDate(registration.registrationDate)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        registration.status === 'CONFIRMED'
                          ? 'bg-success-soft text-primary-text'
                          : 'bg-neutral-soft text-primary-text'
                      }`}>
                        {registration.status === 'CONFIRMED' ? 'Confirmed' : 'Cancelled'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredRegistrations.length > pageSize && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 sm:px-6">
            <p className="text-sm text-secondary-text">
              Page {currentPage} of {pageCount}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
                className="min-h-9 rounded-md border border-border px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage === pageCount}
                onClick={() => setPage(currentPage + 1)}
                className="min-h-9 rounded-md border border-border px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
