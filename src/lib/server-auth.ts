import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Role } from '@/generated/prisma/enums'
import { getCurrentUserFromSessionId } from '@/lib/auth'

export const dashboardPaths: Record<Role, string> = {
  ATTENDEE: '/dashboard',
  ORGANIZER: '/organizer/dashboard',
  ADMIN: '/admin/dashboard',
}

export async function requireServerUser() {
  const cookieStore = await cookies()
  const user = await getCurrentUserFromSessionId(cookieStore.get('sessionId')?.value)

  if (!user) {
    redirect('/login')
  }

  return user
}

export async function requireServerRole(role: Role) {
  const user = await requireServerUser()

  if (user.role !== role) {
    redirect(dashboardPaths[user.role])
  }

  return user
}
