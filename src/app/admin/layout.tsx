import type { ReactNode } from 'react'
import { requireServerRole } from '@/lib/server-auth'

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireServerRole('ADMIN')
  return children
}
