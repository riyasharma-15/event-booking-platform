import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const fieldLimits = {
  organizationName: 120,
  phoneNumber: 32,
  organizationDescription: 2000,
  organizationPurpose: 1000,
} as const

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (user.role !== 'ATTENDEE') {
      return NextResponse.json(
        { error: 'Forbidden: Only attendees can apply to become organizers.' },
        { status: 403 }
      )
    }

    if (user.organizerStatus === 'PENDING') {
      return NextResponse.json(
        { error: 'An organizer application is already pending.' },
        { status: 409 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload.' },
        { status: 400 }
      )
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object.' },
        { status: 400 }
      )
    }

    const application = body as Record<string, unknown>
    const values: Record<keyof typeof fieldLimits, string> = {
      organizationName: '',
      phoneNumber: '',
      organizationDescription: '',
      organizationPurpose: '',
    }

    for (const [field, maxLength] of Object.entries(fieldLimits) as [
      keyof typeof fieldLimits,
      number,
    ][]) {
      const value = application[field]

      if (typeof value !== 'string' || !value.trim()) {
        return NextResponse.json(
          { error: `${field} is required and must be a non-empty string.` },
          { status: 400 }
        )
      }

      const trimmedValue = value.trim()
      if (trimmedValue.length > maxLength) {
        return NextResponse.json(
          { error: `${field} must be ${maxLength} characters or fewer.` },
          { status: 400 }
        )
      }

      values[field] = trimmedValue
    }

    const update = await prisma.user.updateMany({
      where: {
        id: user.id,
        role: 'ATTENDEE',
        organizerStatus: { not: 'PENDING' },
      },
      data: {
        ...values,
        role: 'ATTENDEE',
        organizerStatus: 'PENDING',
      },
    })

    if (update.count === 0) {
      const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true, organizerStatus: true },
      })

      if (!currentUser) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      if (currentUser.role !== 'ATTENDEE') {
        return NextResponse.json(
          { error: 'Forbidden: Only attendees can apply to become organizers.' },
          { status: 403 }
        )
      }

      if (currentUser.organizerStatus === 'PENDING') {
        return NextResponse.json(
          { error: 'An organizer application is already pending.' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Application could not be submitted. Please try again.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        message: 'Organizer application submitted successfully.',
        organizerStatus: 'PENDING',
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('Organizer application API error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}