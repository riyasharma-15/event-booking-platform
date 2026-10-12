import { NextResponse } from 'next/server'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
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

    const applications = await prisma.user.findMany({
      where: { organizerStatus: 'PENDING' },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        organizationName: true,
        phoneNumber: true,
        organizationDescription: true,
        organizationPurpose: true,
        organizerStatus: true,
      },
    })

    return NextResponse.json({ applications }, { status: 200 })
  } catch (error: unknown) {
    console.error('Admin organizer application list error:', error)
    return NextResponse.json(
      { error: 'Unable to load pending organizer applications.' },
      { status: 500 }
    )
  }
}