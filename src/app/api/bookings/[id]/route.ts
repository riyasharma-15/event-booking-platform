import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BookingStatus } from '@/generated/prisma/client'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function DELETE(
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

    // 2. Only ATTENDEE users can cancel bookings
    if (user.role !== 'ATTENDEE') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 3. Read booking ID from route parameter using context.params
    const { id } = await context.params
    const bookingId = parseInt(id, 10)

    // 4. Validate the booking ID
    if (!/^\d+$/.test(id) || isNaN(bookingId) || bookingId <= 0) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      )
    }

    // 5. Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // 6. Verify ownership
    if (booking.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 7. Only a CONFIRMED booking can be cancelled
    if (booking.status === BookingStatus.CANCELLED) {
      return NextResponse.json(
        { error: 'Booking is already cancelled' },
        { status: 409 }
      )
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      return NextResponse.json(
        { error: 'Only confirmed bookings can be cancelled' },
        { status: 409 }
      )
    }

    // 8. Execute status cancellation and seat return inside a Prisma transaction
    await prisma.$transaction(async (tx) => {
      // Update booking status to CANCELLED (preserve booking history)
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
        },
      })

      // Increase the related event's availableSeats by the booking's ticketCount
      await tx.event.update({
        where: { id: booking.eventId },
        data: {
          availableSeats: {
            increment: booking.ticketCount,
          },
        },
      })
    })

    // 10. Return success message
    return NextResponse.json(
      { message: 'Booking cancelled successfully' },
      { status: 200 }
    )
  } catch (error: unknown) {
    // 11. Unexpected errors
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
