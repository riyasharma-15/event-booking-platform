import ProfileClient from '@/app/profile/profile-client'
import { requireServerRole } from '@/lib/server-auth'

export default async function OrganizerProfilePage() {
  const organizer = await requireServerRole('ORGANIZER')
  return <ProfileClient name={organizer.name} organizerMode />
}
