import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('sessionId')?.value
    if (sessionId) {
      await prisma.session.deleteMany({ where: { id: sessionId } })
    }

    const response = NextResponse.json({ message: 'Logout successful.' })
    response.cookies.set('sessionId', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
    return response
  } catch {
    return NextResponse.json(
      { error: 'Unable to log out. Please try again.' },
      { status: 500 },
    )
  }
}
