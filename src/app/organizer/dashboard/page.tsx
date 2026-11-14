import Link from 'next/link'
import { BookingStatus } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireServerRole } from '@/lib/server-auth'

type SummaryCardProps = {
  label: string
  value: string
  detail: string
  icon: 'events' | 'registrations' | 'upcoming' | 'revenue'
}

const summaryIcons: Record<SummaryCardProps['icon'], string> = {
  events: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16',
  registrations: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-3.87',
  upcoming: 'M12 8v4l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  revenue: 'M3 6h18v12H3z M3 10h18 M7 15h3',
}

function SummaryCard({ label, value, detail, icon }: SummaryCardProps) {
  return (
    <article className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-secondary-text">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-primary-text">{value}</p>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-light-indigo text-primary-indigo">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-5">
            <path strokeLinecap="round" strokeLinejoin="round" d={summaryIcons[icon]} />
          </svg>
        </span>
      </div>
      <p className="mt-4 text-xs leading-5 text-secondary-text">{detail}</p>
    </article>
  )
}

function eventStartTime(date: Date, time: string) {
  const parsedTime = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(time)
  if (!parsedTime) return null

  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    Number(parsedTime[1]),
    Number(parsedTime[2]),
    Number(parsedTime[3] ?? 0),
  ))
}

function formatEventDate(date: Date) {
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export default async function OrganizerDashboardPage() {
  const organizer = await requireServerRole('ORGANIZER')
  const now = new Date()
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  const [totalEvents, registrations, futureEventsCount, todayEvents, laterEvents] = await Promise.all([
    prisma.event.count({
      where: { organizerId: organizer.id },
    }),
    prisma.booking.aggregate({
      where: {
        status: BookingStatus.CONFIRMED,
        event: { organizerId: organizer.id },
      },
      _sum: { ticketCount: true },
    }),
    prisma.event.count({
      where: {
        organizerId: organizer.id,
        date: { gte: tomorrowStart },
      },
    }),
    prisma.event.findMany({
      where: {
        organizerId: organizer.id,
        date: { gte: todayStart, lt: tomorrowStart },
      },
      select: {
        id: true,
        title: true,
        date: true,
        time: true,
        location: true,
        status: true,
      },
    }),
    prisma.event.findMany({
      where: {
        organizerId: organizer.id,
        date: { gte: tomorrowStart },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      take: 5,
      select: {
        id: true,
        title: true,
        date: true,
        time: true,
        location: true,
        status: true,
      },
    }),
  ])

  const todayUpcomingEvents = todayEvents
    .map((event) => ({ ...event, startsAt: eventStartTime(event.date, event.time) }))
    .filter((event) => event.startsAt !== null && event.startsAt > now)
    .sort((first, second) => first.startsAt!.getTime() - second.startsAt!.getTime())
  const upcomingEvents = [
    ...todayUpcomingEvents,
    ...laterEvents.map((event) => ({ ...event, startsAt: eventStartTime(event.date, event.time) })),
  ]
    .filter((event) => event.startsAt !== null)
    .sort((first, second) => first.startsAt!.getTime() - second.startsAt!.getTime())
    .slice(0, 5)
  const upcomingEventsCount = futureEventsCount + todayUpcomingEvents.length
  const registrationGroups = upcomingEvents.length > 0
    ? await prisma.booking.groupBy({
        by: ['eventId'],
        where: {
          eventId: { in: upcomingEvents.map((event) => event.id) },
          status: BookingStatus.CONFIRMED,
          event: { organizerId: organizer.id },
        },
        _sum: { ticketCount: true },
      })
    : []
  const registrationsByEventId = new Map(
    registrationGroups.map((group) => [group.eventId, group._sum.ticketCount ?? 0]),
  )

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-7 sm:py-10 lg:px-10">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-indigo">
            Organizer workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Dashboard</h1>
          <p className="mt-2 text-sm leading-6 text-secondary-text sm:text-base">
            Welcome back, {organizer.name}. Here&apos;s an overview of your events.
          </p>
        </div>
        <Link
          href="/organizer/events/new"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-indigo px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-light-indigo hover:text-primary-indigo hover:ring-2 hover:ring-secondary-indigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-indigo"
        >
          <span aria-hidden="true" className="text-lg leading-none">+</span>
          Create New Event
        </Link>
      </div>

      <section aria-label="Dashboard summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Events Created"
          value={String(totalEvents)}
          detail="Events created in your organizer account"
          icon="events"
        />
        <SummaryCard
          label="Total Registrations"
          value={String(registrations._sum.ticketCount ?? 0)}
          detail="Attendees registered across your events"
          icon="registrations"
        />
        <SummaryCard
          label="Upcoming Events"
          value={String(upcomingEventsCount)}
          detail="Events with a date and time still ahead"
          icon="upcoming"
        />
        <SummaryCard
          label="Total Revenue"
          value="Not available yet"
          detail="Payment tracking is not available"
          icon="revenue"
        />
      </section>

      <section aria-labelledby="upcoming-events-title" className="mt-8 rounded-xl border border-border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 id="upcoming-events-title" className="text-lg font-semibold">Upcoming Events</h2>
            <p className="mt-1 text-sm text-secondary-text">Your next scheduled events, ordered by date.</p>
          </div>
          <Link href="/organizer/events" className="text-sm font-semibold text-primary-indigo hover:text-primary-indigo">
            View all events
          </Link>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <h3 className="text-base font-semibold">No upcoming events yet</h3>
            <p className="mt-2 text-sm text-secondary-text">Create an event to start welcoming attendees.</p>
            <Link
              href="/organizer/events/new"
              className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-primary-indigo px-4 py-2 text-sm font-semibold text-white hover:bg-light-indigo hover:text-primary-indigo hover:ring-2 hover:ring-secondary-indigo"
            >
              Create New Event
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {upcomingEvents.map((event) => (
              <li key={event.id} className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] sm:items-center sm:px-6">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{event.title}</h3>
                  <p className="mt-1 text-sm text-secondary-text">
                    {formatEventDate(event.date)} at {event.time}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm text-secondary-text">{event.location}</p>
                  <p className="mt-1 text-xs text-secondary-text">
                    {registrationsByEventId.get(event.id) ?? 0} {(registrationsByEventId.get(event.id) ?? 0) === 1 ? 'registration' : 'registrations'}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    event.status === 'ACTIVE'
                      ? 'bg-success-soft text-primary-text'
                      : 'bg-neutral-soft text-primary-text'
                  }`}>
                    {event.status === 'ACTIVE' ? 'Active' : 'Cancelled'}
                  </span>
                  <Link href="/organizer/events" className="text-sm font-semibold text-primary-indigo hover:text-primary-indigo">
                    Manage
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="action-required-title" className="mt-6 rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
        <h2 id="action-required-title" className="text-lg font-semibold">Action Required</h2>
        {upcomingEvents.length === 0 ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-secondary-text">You don&apos;t have any upcoming events scheduled.</p>
            <Link
              href="/organizer/events/new"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary-indigo px-4 py-2 text-sm font-semibold text-white hover:bg-light-indigo hover:text-primary-indigo hover:ring-2 hover:ring-secondary-indigo"
            >
              Create an event
            </Link>
          </div>
        ) : (
          <p className="mt-3 text-sm text-secondary-text">You&apos;re all caught up!</p>
        )}
      </section>
    </div>
  )
}
