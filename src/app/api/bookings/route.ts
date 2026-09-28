import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    // 1. Verify the user is authenticated
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Verify the user is an ATTENDEE (not an ORGANIZER)
    if (user.role !== 'ATTENDEE') {
      return NextResponse.json(
        { error: 'Forbidden: Only ATTENDEEs can book events' },
        { status: 403 }
      )
    }

    // 3. Parse the request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      )
    }

    const { eventId, ticketCount, email, mobile } = body as Record<string, unknown>

    // 4. Validate eventId: must be a positive integer
    if (
      eventId === undefined ||
      eventId === null ||
      typeof eventId !== 'number' ||
      !Number.isInteger(eventId) ||
      eventId <= 0
    ) {
      return NextResponse.json(
        { error: 'eventId must be a positive integer' },
        { status: 400 }
      )
    }

    // 5. Validate ticketCount: must be a positive integer
    if (
      ticketCount === undefined ||
      ticketCount === null ||
      typeof ticketCount !== 'number' ||
      !Number.isInteger(ticketCount) ||
      ticketCount <= 0
    ) {
      return NextResponse.json(
        { error: 'ticketCount must be a positive integer' },
        { status: 400 }
      )
    }

    // 6. Validate booking contact details
    if (typeof email !== 'string' || email.trim().length === 0) {
      return NextResponse.json(
        { error: 'email must be a non-empty string' },
        { status: 400 }
      )
    }

    if (typeof mobile !== 'string' || mobile.trim().length === 0) {
      return NextResponse.json(
        { error: 'mobile must be a non-empty string' },
        { status: 400 }
      )
    }

    // 7. Check the event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // 8. Check if the event is cancelled
    if (event.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot book a cancelled event' },
        { status: 409 }
      )
    }

    // 9. Run the booking inside a Prisma transaction
    const booking = await prisma.$transaction(async (tx) => {
      // 7a. Atomically decrement availableSeats ONLY if seats are sufficient.
      //     updateMany returns { count: number } — the number of rows matched and updated.
      //     The WHERE clause guards against overbooking: availableSeats >= ticketCount.
      const updateResult = await tx.event.updateMany({
        where: {
          id: eventId,
          availableSeats: {
            gte: ticketCount, // guard: only proceed if enough seats remain
          },
        },
        data: {
          availableSeats: {
            decrement: ticketCount,
          },
        },
      })

      // 7b. If 0 rows were updated, there are not enough seats — abort the transaction
      if (updateResult.count === 0) {
        throw new InsufficientSeatsError(
          'Not enough available seats for this event'
        )
      }

      // 7c. Create the Booking record within the same transaction.
      //     userId comes from the session; status defaults to CONFIRMED via schema default.
      const newBooking = await tx.booking.create({
        data: {
          userId: user.id,
          eventId,
          ticketCount,
          email,
          mobile,
        },
        select: {
          id: true,
          userId: true,
          eventId: true,
          ticketCount: true,
          status: true,
          bookingDate: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      return newBooking
    })

    // 10. Return the created booking
    return NextResponse.json(
      {
        message: 'Booking created successfully',
        booking,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const prismaError = error as {
      code?: unknown
      meta?: { target?: unknown }
    }
    const target = prismaError?.meta?.target
    const isDuplicateBookingContact =
      prismaError?.code === 'P2002' &&
      (Array.isArray(target)
        ? target.includes('eventId') &&
          (target.includes('email') || target.includes('mobile'))
        : target === 'Booking_eventId_email_key' ||
          target === 'Booking_eventId_mobile_key')

    if (isDuplicateBookingContact) {
      return NextResponse.json(
        { error: 'This email or mobile number has already been used for this event.' },
        { status: 409 }
      )
    }

    // Handle the insufficient seats sentinel thrown inside the transaction
    if (error instanceof InsufficientSeatsError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }

    // All other unexpected errors
    console.error('Booking API error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    // 1. Authenticate the user
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Only ATTENDEE users can access this endpoint
    if (user.role !== 'ATTENDEE') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 3. Retrieve all bookings belonging to the authenticated user
    const bookings = await prisma.booking.findMany({
      where: {
        userId: user.id,
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
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            date: true,
            time: true,
            location: true,
            image: true,
            status: true,
          },
        },
      },
    })

    // 4. Return the bookings list with 200 OK
    return NextResponse.json(
      { bookings },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * Sentinel error thrown inside the Prisma transaction when the atomic seat
 * update affects 0 rows (i.e. availableSeats < ticketCount).
 * Throwing inside $transaction causes Prisma to automatically roll back.
 */
class InsufficientSeatsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InsufficientSeatsError'
  }
}
