import { NextResponse } from 'next/server'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EventStatus } from '@/generated/prisma/client'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    const eventId = parseInt(id, 10)

    // Validate that the ID is a valid positive integer string
    if (!/^\d+$/.test(id) || isNaN(eventId) || eventId <= 0) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      )
    }

    // Retrieve event by unique primary key ID
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        time: true,
        location: true,
        totalSeats: true,
        availableSeats: true,
        image: true,
        organizerId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // If event does not exist, return 404
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Return event details with 200 OK
    return NextResponse.json(
      { event },
      { status: 200 }
    )
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  context: RouteContext
) {
  try {
    // 1. Authentication & Authorization: Ensure user is authenticated and has ORGANIZER role
    const user = await requireRole(request, 'ORGANIZER')

    if (!user) {
      const currentUser = await getCurrentUser(request)

      if (!currentUser) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 2. Validate route parameter ID
    const { id } = await context.params
    const eventId = parseInt(id, 10)

    if (!/^\d+$/.test(id) || isNaN(eventId) || eventId <= 0) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      )
    }

    // 3. Find the event in the database
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
    })

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // 4. Ownership check: Organizer can update ONLY their own events
    if (existingEvent.organizerId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 5. Parse request body and handle malformed JSON
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      )
    }

    const { title, description, date, time, location, totalSeats, image } = body

    // 6. Validate input fields
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json(
        { error: 'Description is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (!date || typeof date !== 'string' || !date.trim() || isNaN(new Date(date.trim()).getTime())) {
      return NextResponse.json(
        { error: 'Date is required and must be a valid date' },
        { status: 400 }
      )
    }

    if (!time || typeof time !== 'string' || !time.trim()) {
      return NextResponse.json(
        { error: 'Time is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (!location || typeof location !== 'string' || !location.trim()) {
      return NextResponse.json(
        { error: 'Location is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (
      totalSeats === undefined ||
      totalSeats === null ||
      typeof totalSeats !== 'number' ||
      !Number.isInteger(totalSeats) ||
      totalSeats <= 0
    ) {
      return NextResponse.json(
        { error: 'Total seats must be an integer greater than 0' },
        { status: 400 }
      )
    }

    if (image !== undefined && image !== null && typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Image must be a string if provided' },
        { status: 400 }
      )
    }

    // 7. Preserve booked seats calculation
    const bookedSeats = existingEvent.totalSeats - existingEvent.availableSeats

    if (totalSeats < bookedSeats) {
      return NextResponse.json(
        { error: `Total seats cannot be less than already booked seats (${bookedSeats})` },
        { status: 400 }
      )
    }

    const newAvailableSeats = totalSeats - bookedSeats

    // 8. Sanitize string fields
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()
    const parsedDate = new Date(date.trim())
    const trimmedTime = time.trim()
    const trimmedLocation = location.trim()
    const trimmedImage = typeof image === 'string' && image.trim().length > 0 ? image.trim() : null

    // 9. Update event in database (do NOT allow client to modify id, organizerId, createdAt, updatedAt)
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        title: trimmedTitle,
        description: trimmedDescription,
        date: parsedDate,
        time: trimmedTime,
        location: trimmedLocation,
        totalSeats,
        availableSeats: newAvailableSeats,
        image: trimmedImage,
      },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        time: true,
        location: true,
        totalSeats: true,
        availableSeats: true,
        image: true,
        organizerId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // 10. Return success response
    return NextResponse.json(
      {
        message: 'Event updated successfully',
        event: {
          id: updatedEvent.id,
          title: updatedEvent.title,
          description: updatedEvent.description,
          date: updatedEvent.date,
          time: updatedEvent.time,
          location: updatedEvent.location,
          totalSeats: updatedEvent.totalSeats,
          availableSeats: updatedEvent.availableSeats,
          image: updatedEvent.image,
          organizerId: updatedEvent.organizerId,
          createdAt: updatedEvent.createdAt,
          updatedAt: updatedEvent.updatedAt,
        },
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    // 1. Authentication & Authorization: user must be an authenticated ORGANIZER
    const user = await requireRole(request, 'ORGANIZER')

    if (!user) {
      const currentUser = await getCurrentUser(request)

      if (!currentUser) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 2. Validate route parameter ID
    const { id } = await context.params
    const eventId = parseInt(id, 10)

    if (!/^\d+$/.test(id) || isNaN(eventId) || eventId <= 0) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      )
    }

    // 3. Find the event in the database
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
    })

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // 4. Ownership check: organizer may only cancel their own events
    if (existingEvent.organizerId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 5. Check if the event is already cancelled
    if (existingEvent.status === EventStatus.CANCELLED) {
      return NextResponse.json(
        { error: 'Event is already cancelled' },
        { status: 409 }
      )
    }

    // 6. Cancel the event
    await prisma.event.update({
      where: { id: eventId },
      data: {
        status: EventStatus.CANCELLED,
      },
    })

    // 7. Return success response
    return NextResponse.json(
      { message: 'Event cancelled successfully' },
      { status: 200 }
    )
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
