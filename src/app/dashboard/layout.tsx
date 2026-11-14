import type { ReactNode } from 'react'
import { requireServerRole } from '@/lib/server-auth'

export default async function AttendeeDashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireServerRole('ATTENDEE')
  return children
}
