import { NextResponse } from 'next/server'
import { getCurrentUser, requireRole } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const user = await requireRole(request, 'ORGANIZER')

    if (!user) {
      const currentUser = await getCurrentUser(request)

      // 1. Unauthenticated user: No valid session
      if (!currentUser) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      // 2. Authenticated user whose role is not ORGANIZER
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 3. User is an ORGANIZER: Return 200 with user data (excluding password)
    return NextResponse.json(
      {
        message: 'Organizer access granted',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
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
