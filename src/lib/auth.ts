import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

/**
 * Validates the session from the incoming Request and returns the associated User if valid.
 *
 * @param request The incoming Request object
 * @returns The User record if the session is valid and unexpired, otherwise null
 */
export async function getCurrentUser(request: Request) {
  // 1. Read the "sessionId" cookie from the request
  let sessionId: string | null = null

  // Check if NextRequest cookies API is available
  if ('cookies' in request && typeof (request as any).cookies?.get === 'function') {
    const cookie = (request as any).cookies.get('sessionId')
    if (cookie?.value) {
      sessionId = cookie.value
    }
  }

  // Fallback to parsing the standard HTTP Cookie header
  if (!sessionId) {
    const cookieHeader = request.headers.get('cookie')
    if (cookieHeader) {
      const cookies = cookieHeader.split(';')
      for (const cookie of cookies) {
        const [key, ...valueParts] = cookie.trim().split('=')
        if (key === 'sessionId') {
          sessionId = decodeURIComponent(valueParts.join('='))
          break
        }
      }
    }
  }

  // 2. If cookie does not exist, return null
  if (!sessionId) {
    return null
  }

  // 3. Find the Session using the session ID, including the related User
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  })

  // 4. If no Session exists, return null
  if (!session) {
    return null
  }

  // 5. Check whether the Session has expired by comparing session.expiresAt with current time
  if (session.expiresAt <= new Date()) {
    return null
  }

  // 6. If the Session is valid, return the associated User
  return session.user
}

/**
 * Validates that the requesting user is authenticated and has the required role.
 *
 * @param request The incoming Request object
 * @param role The required role to check against (e.g., 'ORGANIZER' or 'ATTENDEE')
 * @returns The User record if authenticated and role matches, otherwise null
 */
export async function requireRole(request: Request, role: Role) {
  // 1. Check if there is an authenticated user
  const user = await getCurrentUser(request)

  // 2. If there is no logged-in user, return null
  if (!user) {
    return null
  }

  // 3. If the user is logged in but user.role does not match the required role, return null
  if (user.role !== role) {
    return null
  }

  // 4. If the user's role matches, return the user
  return user
}
