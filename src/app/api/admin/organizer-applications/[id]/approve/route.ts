import { NextResponse } from 'next/server'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type RouteContext = {
  params: Promise<{ id: string }>
}

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

    const userId = Number(id)
    const result = await prisma.user.updateMany({
      where: {
        id: userId,
        organizerStatus: 'PENDING',
      },
      data: {
        role: 'ORGANIZER',
        organizerStatus: 'APPROVED',
        rejectionReason: null,
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
        message: 'Organizer application approved.',
        application: {
          userId,
          role: 'ORGANIZER',
          organizerStatus: 'APPROVED',
        },
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('Admin organizer application approval error:', error)
    return NextResponse.json(
      { error: 'Unable to approve organizer application.' },
      { status: 500 }
    )
  }
}