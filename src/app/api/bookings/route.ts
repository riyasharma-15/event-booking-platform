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

    const { eventId, ticketCount } = body as Record<string, unknown>

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

    // 6. Check the event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // 7. Run the booking inside a Prisma transaction
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

    // 8. Return the created booking
    return NextResponse.json(
      {
        message: 'Booking created successfully',
        booking,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
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
