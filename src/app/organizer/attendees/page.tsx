import OrganizerBookingsTable from '@/components/organizer-bookings-table'
import { prisma } from '@/lib/prisma'
import { requireServerRole } from '@/lib/server-auth'

export default async function OrganizerAttendeesPage() {
  const organizer = await requireServerRole('ORGANIZER')
  const [bookings, events] = await Promise.all([
    prisma.booking.findMany({
      where: { event: { organizerId: organizer.id } },
      orderBy: { bookingDate: 'desc' },
      select: {
        id: true,
        bookingDate: true,
        status: true,
        email: true,
        user: { select: { name: true } },
        event: { select: { id: true, title: true } },
      },
    }),
    prisma.event.findMany({
      where: { organizerId: organizer.id },
      orderBy: { title: 'asc' },
      select: { id: true, title: true },
    }),
  ])
  const registrations = bookings.map((booking) => ({
    bookingId: booking.id,
    attendeeName: booking.user.name,
    attendeeEmail: booking.email,
    eventId: booking.event.id,
    eventName: booking.event.title,
    registrationDate: booking.bookingDate.toISOString(),
    status: booking.status,
  }))

  return (
    <OrganizerBookingsTable
      mode="attendees"
      registrations={registrations}
      events={events}
    />
  )
}
