import type { ReactNode } from 'react'
import { requireServerRole } from '@/lib/server-auth'

export default async function OrganizerDashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireServerRole('ORGANIZER')
  return children
}
