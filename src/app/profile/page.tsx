import { requireServerRole } from '@/lib/server-auth'
import ProfileClient from './profile-client'

export default async function ProfilePage() {
  const user = await requireServerRole('ATTENDEE')
  return <ProfileClient name={user.name} />
}
