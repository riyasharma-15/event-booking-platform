import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    // 1. Validate that all required fields are provided and non-empty
    if (
      !name ||
      !email ||
      !password ||
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !name.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      return NextResponse.json(
        { error: 'Name, email, and password are all required.' },
        { status: 400 }
      )
    }

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    // 2. Check if a user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists.' },
        { status: 409 }
      )
    }

    // 3. Hash the password using bcryptjs with 10 salt rounds
    const hashedPassword = await bcrypt.hash(password, 10)

    // 4. Create the new user in PostgreSQL via Prisma (role defaults to ATTENDEE)
    const newUser = await prisma.user.create({
      data: {
        name: trimmedName,
        email: trimmedEmail,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    // 5. Return success response with user details (excluding password)
    return NextResponse.json(
      {
        message: 'User registered successfully.',
        user: newUser,
      },
      { status: 201 }
    )
  } catch (error: any) {
    // Handle invalid JSON input
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request payload. Expected JSON body.' },
        { status: 400 }
      )
    }

    // Handle Prisma unique constraint violation code (P2002) for race conditions
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'A user with this email already exists.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process registration. Please try again.' },
      { status: 500 }
    )
  }
}
