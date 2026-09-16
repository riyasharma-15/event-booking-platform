import { NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // 1. Validate that email and password are provided, strings, and non-empty after trimming
    if (
      !email ||
      !password ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password.trim()
    ) {
      return NextResponse.json(
        { error: 'Email and password are both required.' },
        { status: 400 }
      )
    }

    const trimmedEmail = email.trim()

    // 2. Look up the user in PostgreSQL via Prisma
    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    })

    // 3. If user does not exist, return 401 Unauthorized
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      )
    }

    // 4. Compare provided password against stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password)

    // 5. If password does not match, return 401 Unauthorized
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      )
    }

    // 6. Generate cryptographically secure session ID and calculate 7-day expiration
    const sessionId = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // 7. Create Session record in PostgreSQL
    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        expiresAt,
      },
    })

    // 8. Create the response with user data (omitting password and password hash)
    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 }
    )

    // 9. Set HTTP-only session cookie in the response
    response.cookies.set('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })

    return response
  } catch (error: unknown) {
    // Handle malformed JSON in request body
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request payload. Expected JSON body.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process login. Please try again.' },
      { status: 500 }
    )
  }
}
