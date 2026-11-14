import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { BookingStatus, EventStatus } from '@/generated/prisma/client'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_REQUEST_SIZE = MAX_PROFILE_IMAGE_SIZE + 64 * 1024
const profileImageDirectory = path.join(process.cwd(), 'public', 'uploads', 'profiles')

type ProfileFields = {
  firstName?: string
  lastName?: string
  phoneNumber?: string
  location?: string
}

type ProfileUpdateData = {
  name?: string
  phoneNumber?: string | null
  location?: string | null
  profileImage?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function splitName(name: string) {
  const [firstName = '', ...lastNameParts] = name.trim().split(/\s+/)
  return { firstName, lastName: lastNameParts.join(' ') }
}

function sanitizeText(value: string) {
  return value
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

function detectImageExtension(bytes: Buffer): string | null {
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'png'
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpg'
  }

  if (
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp'
  }

  return null
}

function isUpcomingTime(time: string, eventDate: Date, now: Date) {
  const match = /^(?:[01]\d|2[0-3]):[0-5]\d$/.exec(time)
  if (!match) return false

  const [hours, minutes] = time.split(':').map(Number)
  const eventStart = Date.UTC(
    eventDate.getUTCFullYear(),
    eventDate.getUTCMonth(),
    eventDate.getUTCDate(),
    hours,
    minutes,
  )
  return eventStart > now.getTime()
}

function parseProfileFields(value: Record<string, unknown>): {
  fields?: ProfileFields
  error?: string
} {
  const allowedFields = new Set(['firstName', 'lastName', 'phoneNumber', 'location', 'profilePicture'])
  const unknownField = Object.keys(value).find((field) => !allowedFields.has(field))

  if (unknownField) {
    return { error: `The ${unknownField} field cannot be updated here.` }
  }

  const fields: ProfileFields = {}
  for (const field of ['firstName', 'lastName', 'phoneNumber', 'location'] as const) {
    if (field in value) {
      if (typeof value[field] !== 'string') {
        return { error: `${field} must be a string.` }
      }
      fields[field] = sanitizeText(value[field])
    }
  }

  if (Object.keys(fields).length === 0 && !('profilePicture' in value)) {
    return { error: 'Provide at least one profile field to update.' }
  }
  if ('profilePicture' in value && !(value.profilePicture instanceof File)) {
    return { error: 'Profile picture must be uploaded as an image file.' }
  }

  if (fields.firstName !== undefined && (!fields.firstName || fields.firstName.length > 80)) {
    return { error: 'First name is required and must be 80 characters or fewer.' }
  }
  if (fields.lastName !== undefined && (!fields.lastName || fields.lastName.length > 80)) {
    return { error: 'Last name is required and must be 80 characters or fewer.' }
  }
  if (fields.phoneNumber !== undefined) {
    const digits = fields.phoneNumber.replace(/\D/g, '')
    if (
      fields.phoneNumber.length > 32 ||
      (fields.phoneNumber !== '' &&
        (!/^[+\d().\-\s]+$/.test(fields.phoneNumber) || digits.length < 7 || digits.length > 15))
    ) {
      return { error: 'Enter a valid mobile number with 7 to 15 digits.' }
    }
  }
  if (fields.location !== undefined && fields.location.length > 120) {
    return { error: 'Location must be 120 characters or fewer.' }
  }

  return { fields }
}

async function removeProfileImage(imagePath: string | null) {
  if (!imagePath || !/^\/uploads\/profiles\/[0-9a-f-]+\.(?:jpg|png|webp)$/.test(imagePath)) {
    return
  }

  try {
    await unlink(path.join(profileImageDirectory, path.basename(imagePath)))
  } catch (error) {
    if (isRecord(error) && error.code === 'ENOENT') return
    console.error('Unable to remove a replaced profile image:', error)
  }
}

function createProfileResponse(
  user: {
    name: string
    email: string
    role: string
    phoneNumber: string | null
    location: string | null
    profileImage: string | null
  },
) {
  const { firstName, lastName } = splitName(user.name)
  return {
    firstName,
    lastName,
    email: user.email,
    role: user.role,
    phoneNumber: user.phoneNumber,
    location: user.location,
    profileImage: user.profileImage,
  }
}

export async function GET(request: Request) {
  try {
    const authenticatedUser = await getCurrentUser(request)
    if (!authenticatedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (authenticatedUser.role !== 'ATTENDEE' && authenticatedUser.role !== 'ORGANIZER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: authenticatedUser.id },
      select: {
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        location: true,
        profileImage: true,
      },
    })
    if (!user) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    let statistics: {
      totalBookings: number
      cancelledBookings: number
      upcomingEvents: number
      eventsAttended: null
    } | undefined
    if (authenticatedUser.role === 'ATTENDEE') {
      const now = new Date()
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

      const [totalBookings, cancelledBookings, futureBookings, todayBookings] = await Promise.all([
        prisma.booking.count({ where: { userId: authenticatedUser.id } }),
        prisma.booking.count({
          where: { userId: authenticatedUser.id, status: BookingStatus.CANCELLED },
        }),
        prisma.booking.count({
          where: {
            userId: authenticatedUser.id,
            status: BookingStatus.CONFIRMED,
            event: {
              is: {
                status: EventStatus.ACTIVE,
                date: { gte: tomorrowStart },
              },
            },
          },
        }),
        prisma.booking.findMany({
          where: {
            userId: authenticatedUser.id,
            status: BookingStatus.CONFIRMED,
            event: {
              is: {
                status: EventStatus.ACTIVE,
                date: { gte: todayStart, lt: tomorrowStart },
              },
            },
          },
          select: {
            event: {
              select: { date: true, time: true },
            },
          },
        }),
      ])
      const upcomingEvents = futureBookings + todayBookings.filter(({ event }) =>
        isUpcomingTime(event.time, event.date, now)
      ).length

      statistics = {
        totalBookings,
        cancelledBookings,
        upcomingEvents,
        eventsAttended: null,
      }
    }

    return NextResponse.json(
      {
        user: createProfileResponse(user),
        ...(statistics ? { statistics } : {}),
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    console.error('Error fetching account profile:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  let newImagePath: string | null = null

  try {
    const authenticatedUser = await getCurrentUser(request)
    if (!authenticatedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (authenticatedUser.role !== 'ATTENDEE' && authenticatedUser.role !== 'ORGANIZER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const contentLength = Number(request.headers.get('content-length'))
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE) {
      return NextResponse.json({ error: 'Profile image must be 5 MB or smaller.' }, { status: 413 })
    }

    const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''
    let values: Record<string, unknown>
    let imageFile: File | null = null

    if (contentType.includes('multipart/form-data')) {
      let formData: FormData
      try {
        formData = await request.formData()
      } catch {
        return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 })
      }

      values = {}
      for (const field of new Set(Array.from(formData.keys()))) {
        const entries = formData.getAll(field)
        if (entries.length !== 1) {
          return NextResponse.json({ error: `Provide only one ${field} value.` }, { status: 400 })
        }
        const entry = entries[0]
        if (field === 'profilePicture') {
          if (typeof entry === 'string') {
            return NextResponse.json({ error: 'Profile picture must be an image file.' }, { status: 400 })
          }
          if (entry.size > 0) {
            imageFile = entry
            values[field] = entry
          }
        } else {
          values[field] = entry
        }
      }
    } else if (contentType.includes('application/json')) {
      try {
        const body: unknown = await request.json()
        if (!isRecord(body)) {
          return NextResponse.json({ error: 'Request body must be an object.' }, { status: 400 })
        }
        if ('profilePicture' in body) {
          return NextResponse.json(
            { error: 'Upload profile pictures using multipart form data.' },
            { status: 400 },
          )
        }
        values = body
      } catch {
        return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: 'Use JSON or multipart form data.' }, { status: 415 })
    }

    const parsed = parseProfileFields(values)
    if (!parsed.fields) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: authenticatedUser.id },
      select: {
        name: true,
        phoneNumber: true,
        location: true,
        profileImage: true,
      },
    })
    if (!currentUser) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    let profilePicturePath: string | undefined
    if (imageFile) {
      if (imageFile.size > MAX_PROFILE_IMAGE_SIZE) {
        return NextResponse.json({ error: 'Profile image must be 5 MB or smaller.' }, { status: 413 })
      }

      const bytes = Buffer.from(await imageFile.arrayBuffer())
      const extension = detectImageExtension(bytes)
      if (!extension) {
        return NextResponse.json(
          { error: 'Upload a valid JPEG, PNG, or WebP image.' },
          { status: 400 },
        )
      }

      const filename = `${randomUUID()}.${extension}`
      await mkdir(profileImageDirectory, { recursive: true })
      await writeFile(path.join(profileImageDirectory, filename), bytes, { flag: 'wx' })
      profilePicturePath = `/uploads/profiles/${filename}`
      newImagePath = profilePicturePath
    }

    const data: ProfileUpdateData = {}
    if (parsed.fields.firstName !== undefined || parsed.fields.lastName !== undefined) {
      const existingName = splitName(currentUser.name)
      const firstName = parsed.fields.firstName ?? existingName.firstName
      const lastName = parsed.fields.lastName ?? existingName.lastName
      if (!firstName || !lastName) {
        if (newImagePath) await removeProfileImage(newImagePath)
        return NextResponse.json({ error: 'First and last name are required.' }, { status: 400 })
      }
      data.name = `${firstName} ${lastName}`
    }
    if (parsed.fields.phoneNumber !== undefined) {
      data.phoneNumber = parsed.fields.phoneNumber || null
    }
    if (parsed.fields.location !== undefined) {
      data.location = parsed.fields.location || null
    }
    if (profilePicturePath) data.profileImage = profilePicturePath

    const user = await prisma.user.update({
      where: { id: authenticatedUser.id },
      data,
      select: {
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        location: true,
        profileImage: true,
      },
    })

    newImagePath = null
    if (profilePicturePath) {
      await removeProfileImage(currentUser.profileImage)
    }

    return NextResponse.json(
      { message: 'Profile updated successfully.', user: createProfileResponse(user) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    if (newImagePath) await removeProfileImage(newImagePath)
    console.error('Error updating account profile:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
