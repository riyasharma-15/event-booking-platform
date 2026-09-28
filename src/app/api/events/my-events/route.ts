import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // 2. Authorize: Only users with the ORGANIZER role can access this endpoint
    if (user.role !== 'ORGANIZER') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 3. Query Prisma for events belonging to the authenticated organizer, ordered by date ascending
    const events = await prisma.event.findMany({
      where: {
        organizerId: user.id,
      },
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
        status: true,
        organizerId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // 4. Return the list of events with 200 OK
    return NextResponse.json(
      { events },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('Error fetching organizer events:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
