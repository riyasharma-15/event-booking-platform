import { prisma } from '@/lib/prisma'

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
