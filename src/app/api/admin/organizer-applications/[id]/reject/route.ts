import { NextResponse } from 'next/server'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type RouteContext = {
  params: Promise<{ id: string }>
}

const rejectionReasonMaxLength = 1000

export async function POST(request: Request, context: RouteContext) {
  try {
    const admin = await requireRole(request, 'ADMIN')

    if (!admin) {
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

    const { id } = await context.params
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
      return NextResponse.json(
        { error: 'User ID must be a positive integer.' },
        { status: 400 }
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

    const reason = (body as Record<string, unknown>).rejectionReason
    if (typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json(
        { error: 'rejectionReason is required and must be a non-empty string.' },
        { status: 400 }
      )
    }

    const rejectionReason = reason.trim()
    if (rejectionReason.length > rejectionReasonMaxLength) {
      return NextResponse.json(
        { error: `rejectionReason must be ${rejectionReasonMaxLength} characters or fewer.` },
        { status: 400 }
      )
    }

    const userId = Number(id)
    const result = await prisma.user.updateMany({
      where: {
        id: userId,
        organizerStatus: 'PENDING',
      },
      data: {
        role: 'ATTENDEE',
        organizerStatus: 'REJECTED',
        rejectionReason,
      },
    })

    if (result.count === 0) {
      const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      })

      if (!target) {
        return NextResponse.json(
          { error: 'User not found.' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Organizer application is no longer pending.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        message: 'Organizer application rejected.',
        application: {
          userId,
          role: 'ATTENDEE',
          organizerStatus: 'REJECTED',
          rejectionReason,
        },
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('Admin organizer application rejection error:', error)
    return NextResponse.json(
      { error: 'Unable to reject organizer application.' },
      { status: 500 }
    )
  }
}