'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import EventBookLogo from '@/components/eventbook-logo'
import ProfileDropdown from '@/components/profile-dropdown'

type Profile = {
  firstName: string
  lastName: string
  email: string
  role: string
  phoneNumber: string | null
  location: string | null
  profileImage: string | null
}

type Statistics = {
  totalBookings: number
  cancelledBookings: number
  upcomingEvents: number
  eventsAttended: number | null
}

type ProfileState =
  | { status: 'loading' }
  | { status: 'unauthorized' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; user: Profile; statistics: Statistics | null }

type ProfileForm = {
  firstName: string
  lastName: string
  phoneNumber: string
  location: string
}

const fieldClassName =
  'min-h-12 w-full rounded-md border border-border bg-white px-3.5 text-base outline-none transition focus:border-primary-indigo focus:ring-2 focus:ring-primary-indigo/20'

function emptyForm(user: Profile): ProfileForm {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber ?? '',
    location: user.location ?? '',
  }
}

function Avatar({ src, name, size = 96 }: { src: string | null; name: string; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return src ? (
    <Image
      src={src}
      alt={`${name}'s profile picture`}
      width={size}
      height={size}
      unoptimized
      className="size-24 shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-label={`${name}'s profile picture`}
      role="img"
      className="flex size-24 shrink-0 items-center justify-center rounded-full bg-light-indigo text-3xl font-semibold text-primary-text"
    >
      {initial}
    </span>
  )
}

function Information({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm font-semibold text-secondary-text">{label}</dt>
      <dd className="mt-1 break-words text-base">{value || 'Not added'}</dd>
    </div>
  )
}

export default function ProfileClient({
  name,
  organizerMode = false,
}: {
  name: string
  organizerMode?: boolean
}) {
  const [profileState, setProfileState] = useState<ProfileState>({ status: 'loading' })
  const [refreshKey, setRefreshKey] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<ProfileForm | null>(null)
  const [selectedPicture, setSelectedPicture] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ message: string; success: boolean } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isCurrent = true

    async function loadProfile() {
      setProfileState({ status: 'loading' })
      try {
        const response = await fetch('/api/profile', { credentials: 'include' })
        if (response.status === 401) {
          if (isCurrent) setProfileState({ status: 'unauthorized' })
          return
        }

        const payload: {
          user?: Profile
          statistics?: Statistics
          error?: string
        } = await response.json()

        if (
          !response.ok ||
          !payload.user ||
          (payload.user.role === 'ATTENDEE' && !payload.statistics)
        ) {
          throw new Error(payload.error || 'Unable to load your profile. Please try again.')
        }

        if (isCurrent) {
          setProfileState({
            status: 'loaded',
            user: payload.user,
            statistics: payload.statistics ?? null,
          })
        }
      } catch (error) {
        if (isCurrent) {
          setProfileState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unable to load your profile.',
          })
        }
      }
    }

    void loadProfile()
    return () => {
      isCurrent = false
    }
  }, [refreshKey])

  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function startEditing(user: Profile) {
    setForm(emptyForm(user))
    setSelectedPicture(null)
    setPreviewUrl(null)
    setFeedback(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setForm(null)
    setSelectedPicture(null)
    setPreviewUrl(null)
    setFeedback(null)
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form || isSaving) return

    const firstName = form.firstName.trim().replace(/\s+/g, ' ')
    const lastName = form.lastName.trim().replace(/\s+/g, ' ')
    const phoneNumber = form.phoneNumber.trim()
    const location = form.location.trim()
    if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80) {
      setFeedback({ message: 'First and last names are required (80 characters maximum).', success: false })
      return
    }
    if (location.length > 120) {
      setFeedback({ message: 'Location must be 120 characters or fewer.', success: false })
      return
    }
    if (phoneNumber) {
      const digits = phoneNumber.replace(/\D/g, '')
      if (!/^[+\d().\-\s]+$/.test(phoneNumber) || digits.length < 7 || digits.length > 15) {
        setFeedback({ message: 'Enter a valid mobile number with 7 to 15 digits.', success: false })
        return
      }
    }
    if (selectedPicture) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(selectedPicture.type) || selectedPicture.size > 5 * 1024 * 1024) {
        setFeedback({ message: 'Choose a JPEG, PNG, or WebP image up to 5 MB.', success: false })
        return
      }
    }

    setIsSaving(true)
    setFeedback(null)
    try {
      const body = new FormData()
      body.append('firstName', firstName)
      body.append('lastName', lastName)
      body.append('phoneNumber', phoneNumber)
      body.append('location', location)
      if (selectedPicture) body.append('profilePicture', selectedPicture)

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        credentials: 'include',
        body,
      })
      const payload: { user?: Profile; error?: string; message?: string } = await response.json()
      if (!response.ok || !payload.user) {
        setFeedback({
          message: payload.error || 'Unable to save your profile. Please try again.',
          success: false,
        })
        return
      }

      const updatedUser = payload.user
      setProfileState((current) => current.status === 'loaded'
        ? { ...current, user: updatedUser }
        : current)
      setIsEditing(false)
      setForm(null)
      setSelectedPicture(null)
      setPreviewUrl(null)
      setFeedback({ message: payload.message || 'Profile updated successfully.', success: true })
    } catch {
      setFeedback({ message: 'A server error occurred. Please try again.', success: false })
    } finally {
      setIsSaving(false)
    }
  }

  const currentProfile = profileState.status === 'loaded' ? profileState.user : null
  const displayName = currentProfile
    ? `${currentProfile.firstName} ${currentProfile.lastName}`.trim()
    : name
  const roleLabel = currentProfile?.role.toLowerCase().replace(/^./, (letter) => letter.toUpperCase()) ?? 'Attendee'
  const avatarSrc = previewUrl ?? currentProfile?.profileImage ?? null
  const cards = profileState.status === 'loaded' && profileState.statistics
    ? [
        {
          label: 'Total Bookings',
          value: String(profileState.statistics.totalBookings),
          detail: 'All bookings on your account',
          color: 'bg-success-soft',
        },
        {
          label: 'Cancelled Bookings',
          value: String(profileState.statistics.cancelledBookings),
          detail: 'Bookings cancelled',
          color: 'bg-error-soft',
        },
        {
          label: 'Upcoming Events',
          value: String(profileState.statistics.upcomingEvents),
          detail: 'Confirmed events that have not started',
          color: 'bg-light-indigo',
        },
        {
          label: 'Events Attended',
          value: profileState.statistics.eventsAttended === null
            ? 'Not tracked'
            : String(profileState.statistics.eventsAttended),
          detail: 'Attendance is not recorded on bookings yet',
          color: 'bg-neutral-soft',
        },
      ]
    : []

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white text-primary-text">
      {!organizerMode && <header className="border-b border-border bg-white">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 sm:px-8 lg:px-12"
        >
          <EventBookLogo />
          <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-3 text-sm font-medium sm:gap-x-8">
            <Link href="/dashboard" className="transition-colors hover:text-primary-indigo">Dashboard</Link>
            <Link href="/events" className="transition-colors hover:text-primary-indigo">Explore Events</Link>
            <Link href="/bookings" className="transition-colors hover:text-primary-indigo">My Bookings</Link>
            <ProfileDropdown name={displayName} />
          </div>
        </nav>
      </header>}

      <main className={`mx-auto w-full flex-1 px-5 py-10 sm:px-8 sm:py-14 ${organizerMode ? 'max-w-7xl' : 'max-w-6xl lg:px-10'}`}>
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-indigo">
            {organizerMode ? 'Organizer workspace' : 'Account'}
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            {organizerMode ? 'My Profile Settings' : 'My Profile'}
          </h1>
          <p className="mt-3 leading-7 text-secondary-text">
            {organizerMode
              ? 'View and update your personal profile information.'
              : 'Manage your personal information and view your event activity.'}
          </p>
        </div>

        {profileState.status === 'loading' ? (
          <p className="rounded-lg border border-border bg-white py-16 text-center text-secondary-text" role="status">
            Loading your profile...
          </p>
        ) : profileState.status === 'unauthorized' ? (
          <div className="rounded-lg border border-border bg-white py-16 text-center" role="alert">
            <p className="text-lg font-semibold">Please log in to view your profile.</p>
            <Link href="/login" className="mt-5 inline-flex min-h-11 items-center rounded-md bg-primary-indigo px-5 font-semibold text-white">
              Log in
            </Link>
          </div>
        ) : profileState.status === 'error' ? (
          <div className="rounded-lg border border-border bg-white py-16 text-center" role="alert">
            <p className="text-lg font-semibold">{profileState.message}</p>
            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              className="mt-5 min-h-11 rounded-md border border-border px-5 font-semibold hover:bg-white"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <section aria-labelledby="personal-information-title" className="rounded-lg border border-border bg-white p-5 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center gap-5 border-b border-border pb-6">
                <Avatar src={avatarSrc} name={displayName} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary-indigo">{roleLabel}</p>
                  <h2 className="mt-1 break-words text-2xl font-semibold">{displayName}</h2>
                  <p className="mt-1 break-words text-sm text-secondary-text">{profileState.user.email}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-6">
                <div>
                  <h2 id="personal-information-title" className="text-xl font-semibold">Personal Information</h2>
                  <p className="mt-1 text-sm text-secondary-text">Your profile details are only editable by you.</p>
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => startEditing(profileState.user)}
                    className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary-indigo px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-light-indigo hover:text-primary-indigo hover:ring-2 hover:ring-secondary-indigo"
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              {isEditing && form ? (
                <form onSubmit={saveProfile} className="mt-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="first-name" className="mb-2 block text-sm font-semibold">First Name</label>
                      <input id="first-name" name="firstName" required maxLength={80} autoComplete="given-name" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} className={fieldClassName} />
                    </div>
                    <div>
                      <label htmlFor="last-name" className="mb-2 block text-sm font-semibold">Last Name</label>
                      <input id="last-name" name="lastName" required maxLength={80} autoComplete="family-name" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} className={fieldClassName} />
                    </div>
                    <div>
                      <label htmlFor="mobile-number" className="mb-2 block text-sm font-semibold">Mobile Number</label>
                      <input id="mobile-number" name="phoneNumber" type="tel" maxLength={32} autoComplete="tel" value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} className={fieldClassName} />
                    </div>
                    <div>
                      <label htmlFor="profile-location" className="mb-2 block text-sm font-semibold">Location</label>
                      <input id="profile-location" name="location" type="text" maxLength={120} autoComplete="address-level2" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} className={fieldClassName} />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="profile-picture" className="mb-2 block text-sm font-semibold">Profile Picture</label>
                      <input
                        id="profile-picture"
                        name="profilePicture"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null
                          setSelectedPicture(file)
                          setPreviewUrl(file ? URL.createObjectURL(file) : null)
                          setFeedback(null)
                        }}
                        className="block min-h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-sm file:mr-4 file:rounded file:border-0 file:bg-light-indigo file:px-3 file:py-1 file:font-semibold"
                      />
                      <p className="mt-2 text-sm text-secondary-text">JPEG, PNG, or WebP; maximum 5 MB.</p>
                    </div>
                    <dl className="contents">
                      <Information label="Email Address" value={profileState.user.email} />
                      <Information label="Role (read-only)" value={roleLabel} />
                    </dl>
                  </div>

                  {feedback && !feedback.success && (
                    <p className="mt-5 text-sm font-medium text-error" role="alert">{feedback.message}</p>
                  )}
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary-indigo px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-light-indigo hover:text-primary-indigo hover:ring-2 hover:ring-secondary-indigo disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={cancelEditing}
                      className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <dl className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                  <Information label="First Name" value={profileState.user.firstName} />
                  <Information label="Last Name" value={profileState.user.lastName} />
                  <Information label="Email Address" value={profileState.user.email} />
                  <Information label="Mobile Number" value={profileState.user.phoneNumber ?? ''} />
                  <Information label="Role" value={roleLabel} />
                  <Information label="Location" value={profileState.user.location ?? ''} />
                </dl>
              )}
            </section>

            {!organizerMode && profileState.statistics && <section aria-labelledby="statistics-title" className="mt-10">
              <div className="mb-5">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-indigo">Your activity</p>
                <h2 id="statistics-title" className="mt-2 text-2xl font-semibold">Event Statistics</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                  <article key={card.label} className={`min-w-0 rounded-lg border border-border p-5 shadow-sm ${card.color}`}>
                    <h3 className="text-sm font-semibold text-secondary-text">{card.label}</h3>
                    <p className="mt-4 break-words text-3xl font-semibold">{card.value}</p>
                    <p className="mt-2 text-sm leading-5 text-secondary-text">{card.detail}</p>
                  </article>
                ))}
              </div>
            </section>}
          </>
        )}

        {feedback?.success && (
          <p className="mt-5 text-sm font-medium text-primary-text" role="status">{feedback.message}</p>
        )}
      </main>

      {!organizerMode && <footer className="border-t border-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-7 text-sm text-primary-text sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <EventBookLogo compact />
          <p>© 2026 EventBook. All rights reserved.</p>
        </div>
      </footer>}
    </div>
  )
}
