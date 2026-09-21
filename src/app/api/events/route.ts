import { NextResponse } from 'next/server'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    // 1. Authorization: verify the user has the ORGANIZER role
    const user = await requireRole(request, 'ORGANIZER')

    if (!user) {
      const currentUser = await getCurrentUser(request)

      // Unauthenticated user: No valid session
      if (!currentUser) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      // Authenticated user whose role is not ORGANIZER
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 2. Parse request body and handle invalid JSON
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

    // 3. Input validation
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

    // 4. Trim string fields
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()
    const parsedDate = new Date(date.trim())
    const trimmedTime = time.trim()
    const trimmedLocation = location.trim()
    const trimmedImage = typeof image === 'string' && image.trim().length > 0 ? image.trim() : null

    // 5. Create Event in database
    const event = await prisma.event.create({
      data: {
        title: trimmedTitle,
        description: trimmedDescription,
        date: parsedDate,
        time: trimmedTime,
        location: trimmedLocation,
        totalSeats,
        availableSeats: totalSeats,
        image: trimmedImage,
        organizerId: user.id,
      },
    })

    // 6. Return response
    return NextResponse.json(
      {
        message: 'Event created successfully',
        event: {
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.date,
          time: event.time,
          location: event.location,
          totalSeats: event.totalSeats,
          availableSeats: event.availableSeats,
          image: event.image,
          organizerId: event.organizerId,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: {
        date: 'asc',
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

    return NextResponse.json(
      { events },
      { status: 200 }
    )
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

