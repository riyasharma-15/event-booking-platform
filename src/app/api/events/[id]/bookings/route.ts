import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    // 1. Authenticate the user
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Authorize: Only users with the ORGANIZER role can access this endpoint
    if (user.role !== 'ORGANIZER') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 3. Read and validate the event ID from dynamic route parameters
    const { id } = await context.params
    const eventId = parseInt(id, 10)

    if (!/^\d+$/.test(id) || isNaN(eventId) || eventId <= 0) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      )
    }

    // 4. Find the event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // 5. Verify that the event belongs to the authenticated organizer
    if (event.organizerId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 6. Retrieve all bookings for this event, newest first
    const bookings = await prisma.booking.findMany({
      where: {
        eventId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        ticketCount: true,
        status: true,
        bookingDate: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // 7. Return the bookings list with 200 OK
    return NextResponse.json(
      { bookings },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('Error fetching event bookings:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
