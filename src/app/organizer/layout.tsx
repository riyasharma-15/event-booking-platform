import type { ReactNode } from 'react'
import OrganizerShell from '@/components/organizer-shell'
import { requireServerRole } from '@/lib/server-auth'

export default async function OrganizerLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireServerRole('ORGANIZER')

  return <OrganizerShell>{children}</OrganizerShell>
}
