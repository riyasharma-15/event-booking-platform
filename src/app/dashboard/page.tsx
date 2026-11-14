'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import EventBookLogo from '@/components/eventbook-logo'
import ProfileDropdown from '@/components/profile-dropdown'

type OrganizerStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'

type DashboardUser = {
  name: string
  email: string
  role: string
  organizerStatus: OrganizerStatus
  rejectionReason: string | null
}

type ApplicationForm = {
  organizationName: string
  phoneNumber: string
  organizationDescription: string
  organizationPurpose: string
}

type ApplicationResponse = {
  error?: string
  message?: string
}

const initialApplicationForm: ApplicationForm = {
  organizationName: '',
  phoneNumber: '',
  organizationDescription: '',
  organizationPurpose: '',
}

const applicationFieldLimits: Record<keyof ApplicationForm, number> = {
  organizationName: 120,
  phoneNumber: 32,
  organizationDescription: 2000,
  organizationPurpose: 1000,
}

const applicationFieldLabels: Record<keyof ApplicationForm, string> = {
  organizationName: 'Organization Name',
  phoneNumber: 'Phone Number',
  organizationDescription: 'Organization Description',
  organizationPurpose: 'Organization Purpose',
}

type DashboardState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: DashboardUser }
  | { status: 'unauthorized' }
  | { status: 'error'; message: string }

export default function DashboardPage() {
  const [dashboardState, setDashboardState] = useState<DashboardState>({ status: 'loading' })
  const [retryCount, setRetryCount] = useState(0)
  const [applicationForm, setApplicationForm] = useState(initialApplicationForm)
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false)
  const [applicationFeedback, setApplicationFeedback] = useState<{ message: string; success: boolean } | null>(null)
  const isSubmittingRef = useRef(false)

  useEffect(() => {
    let isCurrent = true

    async function loadCurrentUser() {
      setDashboardState({ status: 'loading' })

      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' })

        if (response.status === 401) {
          if (isCurrent) setDashboardState({ status: 'unauthorized' })
          return
        }

        const payload: { user?: DashboardUser; error?: string } = await response.json()

        if (!response.ok) {
          throw new Error(payload.error || 'Unable to check your session. Please try again.')
        }

        if (!payload.user) {
          throw new Error('The user information could not be loaded. Please try again.')
        }

        if (isCurrent) {
          setDashboardState({ status: 'authenticated', user: payload.user })
        }
      } catch (error) {
        if (isCurrent) {
          setDashboardState({
            status: 'error',
            message: error instanceof Error
              ? error.message
              : 'A server error occurred. Please try again.',
          })
        }
      }
    }

    void loadCurrentUser()

    return () => {
      isCurrent = false
    }
  }, [retryCount])

  function updateApplicationField(field: keyof ApplicationForm, value: string) {
    setApplicationForm((currentForm) => ({ ...currentForm, [field]: value }))
    setApplicationFeedback(null)
  }

  async function handleApplicationSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmittingRef.current) return

    const missingField = Object.entries(applicationForm).find(([, value]) => !value.trim())?.[0]
    if (missingField) {
      const field = missingField as keyof ApplicationForm
      setApplicationFeedback({
        message: `${applicationFieldLabels[field]} is required.`,
        success: false,
      })
      return
    }

    const overLimitField = Object.entries(applicationForm).find(([field, value]) =>
      value.trim().length > applicationFieldLimits[field as keyof ApplicationForm]
    )?.[0] as keyof ApplicationForm | undefined
    if (overLimitField) {
      setApplicationFeedback({
        message: `${applicationFieldLabels[overLimitField]} must be ${applicationFieldLimits[overLimitField]} characters or fewer.`,
        success: false,
      })
      return
    }

    isSubmittingRef.current = true
    setIsSubmittingApplication(true)
    setApplicationFeedback(null)

    try {
      const response = await fetch('/api/organizer/apply', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: applicationForm.organizationName.trim(),
          phoneNumber: applicationForm.phoneNumber.trim(),
          organizationDescription: applicationForm.organizationDescription.trim(),
          organizationPurpose: applicationForm.organizationPurpose.trim(),
        }),
      })
      const payload: ApplicationResponse = await response.json()

      if (!response.ok) {
        setApplicationFeedback({
          message: payload.error || 'Unable to submit your application. Please try again.',
          success: false,
        })
        return
      }

      setDashboardState((currentState) => currentState.status === 'authenticated'
        ? {
            ...currentState,
            user: { ...currentState.user, organizerStatus: 'PENDING' },
          }
        : currentState
      )
      setApplicationForm(initialApplicationForm)
      setApplicationFeedback({
        message: payload.message || 'Your application has been submitted for review.',
        success: true,
      })
    } catch {
      setApplicationFeedback({
        message: 'A server error occurred. Please try again.',
        success: false,
      })
    } finally {
      isSubmittingRef.current = false
      setIsSubmittingApplication(false)
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white text-primary-text">
      <header className="border-b border-border bg-white">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 sm:px-8 lg:px-12"
        >
          <EventBookLogo />
          <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-3 text-sm font-medium sm:gap-x-8">
            <Link className="transition-colors hover:text-primary-indigo" href="/events">
              Explore Events
            </Link>
            <Link className="transition-colors hover:text-primary-indigo" href="/bookings">
              My Bookings
            </Link>
            {dashboardState.status === 'authenticated'
              && dashboardState.user.role === 'ATTENDEE'
              && (dashboardState.user.organizerStatus === 'NONE'
                || dashboardState.user.organizerStatus === 'REJECTED') && (
                  <Link className="transition-colors hover:text-primary-indigo" href="#organizer-application">
                    Apply to Become an Organizer
                  </Link>
                )}
            {dashboardState.status === 'authenticated' && (
              <ProfileDropdown name={dashboardState.user.name} />
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
        {dashboardState.status === 'loading' ? (
          <p className="w-full py-16 text-center text-secondary-text" role="status">
            Checking your session...
          </p>
        ) : dashboardState.status === 'unauthorized' ? (
          <section className="mx-auto max-w-xl text-center" role="alert">
            <h1 className="text-3xl font-semibold">You need to log in to access your dashboard.</h1>
            <Link
              href="/login"
              className="mt-7 inline-flex min-h-12 items-center justify-center rounded-md bg-primary-indigo px-6 py-3 font-semibold text-white transition-colors hover:bg-light-indigo hover:text-primary-indigo hover:ring-2 hover:ring-secondary-indigo"
            >
              Go to Login
            </Link>
          </section>
        ) : dashboardState.status === 'error' ? (
          <section className="mx-auto max-w-xl text-center" role="alert">
            <h1 className="text-2xl font-semibold">We couldn&apos;t load your dashboard</h1>
            <p className="mt-3 text-secondary-text">{dashboardState.message}</p>
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="mt-7 inline-flex min-h-12 items-center justify-center rounded-md bg-primary-indigo px-6 py-3 font-semibold text-white transition-colors hover:bg-light-indigo hover:text-primary-indigo hover:ring-2 hover:ring-secondary-indigo"
            >
              Try again
            </button>
          </section>
        ) : (
          <section className="mx-auto w-full">
            <div className="border-b border-border pb-10 sm:pb-12">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-indigo">
                Attendee Dashboard
              </p>
              <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
                Welcome back, {dashboardState.user.name} 👋
              </h1>
              <p className="mt-5 text-lg font-medium leading-7">
                Ready for your next experience?
              </p>
              <p className="mt-2 text-base leading-7 text-secondary-text sm:text-lg">
                Discover events and manage your bookings from one place.
              </p>
            </div>

            {dashboardState.user.role === 'ATTENDEE' && (
              <section id="organizer-application" className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12 sm:py-12">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-indigo">
                    Organizer application
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">Become an Organizer</h2>
                  <p className="mt-3 max-w-xl leading-7 text-secondary-text">
                    Tell us about your organization and the events you hope to bring to EventBook.
                  </p>

                  {dashboardState.user.organizerStatus === 'PENDING' && (
                    <div className="mt-6 border-l-4 border-warning bg-warning-soft p-4 text-primary-text" role="status">
                      <h3 className="font-semibold">Application pending</h3>
                      <p className="mt-1 text-sm leading-6">
                        {applicationFeedback?.success
                          ? applicationFeedback.message
                          : 'Your application is awaiting review. You cannot submit another while it is pending.'}
                      </p>
                    </div>
                  )}

                  {dashboardState.user.organizerStatus === 'REJECTED' && (
                    <div className="mt-6 border-l-4 border-error bg-error-soft p-4 text-primary-text" role="status">
                      <h3 className="font-semibold">Your application was rejected</h3>
                      <p className="mt-1 text-sm leading-6">
                        {dashboardState.user.rejectionReason?.trim() || 'No rejection reason was provided.'}
                      </p>
                      <p className="mt-2 text-sm leading-6">
                        You may submit an updated application for review.
                      </p>
                    </div>
                  )}

                  {dashboardState.user.organizerStatus === 'APPROVED' && (
                    <div className="mt-6 border-l-4 border-success bg-success-soft p-4 text-primary-text" role="status">
                      <h3 className="font-semibold">Your application was approved</h3>
                      <p className="mt-1 text-sm leading-6">
                        Organizer access has been approved for your account.
                      </p>
                    </div>
                  )}
                </div>

                {(dashboardState.user.organizerStatus === 'NONE' || dashboardState.user.organizerStatus === 'REJECTED') && (
                  <form
                    onSubmit={handleApplicationSubmit}
                    className="rounded-lg border border-border bg-white p-5 shadow-sm sm:p-8"
                  >
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label htmlFor="organization-name" className="mb-2 block text-sm font-semibold">
                          Organization Name
                        </label>
                        <input
                          id="organization-name"
                          name="organizationName"
                          type="text"
                          autoComplete="organization"
                          required
                          maxLength={applicationFieldLimits.organizationName}
                          value={applicationForm.organizationName}
                          onChange={(event) => updateApplicationField('organizationName', event.target.value)}
                          className="min-h-12 w-full rounded-md border border-border bg-white px-3.5 text-base outline-none transition focus:border-primary-indigo focus:ring-2 focus:ring-primary-indigo/20"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor="organization-phone" className="mb-2 block text-sm font-semibold">
                          Phone Number
                        </label>
                        <input
                          id="organization-phone"
                          name="phoneNumber"
                          type="tel"
                          autoComplete="tel"
                          required
                          maxLength={applicationFieldLimits.phoneNumber}
                          value={applicationForm.phoneNumber}
                          onChange={(event) => updateApplicationField('phoneNumber', event.target.value)}
                          className="min-h-12 w-full rounded-md border border-border bg-white px-3.5 text-base outline-none transition focus:border-primary-indigo focus:ring-2 focus:ring-primary-indigo/20"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor="organization-description" className="mb-2 block text-sm font-semibold">
                          Organization Description
                        </label>
                        <textarea
                          id="organization-description"
                          name="organizationDescription"
                          required
                          rows={5}
                          maxLength={applicationFieldLimits.organizationDescription}
                          value={applicationForm.organizationDescription}
                          onChange={(event) => updateApplicationField('organizationDescription', event.target.value)}
                          className="w-full rounded-md border border-border bg-white px-3.5 py-3 text-base outline-none transition focus:border-primary-indigo focus:ring-2 focus:ring-primary-indigo/20"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor="organization-purpose" className="mb-2 block text-sm font-semibold">
                          Organization Purpose
                        </label>
                        <textarea
                          id="organization-purpose"
                          name="organizationPurpose"
                          required
                          rows={4}
                          maxLength={applicationFieldLimits.organizationPurpose}
                          value={applicationForm.organizationPurpose}
                          onChange={(event) => updateApplicationField('organizationPurpose', event.target.value)}
                          className="w-full rounded-md border border-border bg-white px-3.5 py-3 text-base outline-none transition focus:border-primary-indigo focus:ring-2 focus:ring-primary-indigo/20"
                        />
                      </div>
                    </div>

                    {applicationFeedback && (
                      <p
                        className={`mt-5 text-sm font-medium ${applicationFeedback.success ? 'text-primary-text' : 'text-error'}`}
                        role={applicationFeedback.success ? 'status' : 'alert'}
                      >
                        {applicationFeedback.message}
                      </p>
                    )}

                    <div className="mt-7 border-t border-border pt-6">
                      <button
                        type="submit"
                        disabled={isSubmittingApplication}
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary-indigo px-6 py-3 font-semibold text-white transition-colors hover:bg-light-indigo hover:text-primary-indigo hover:ring-2 hover:ring-secondary-indigo disabled:cursor-not-allowed disabled:opacity-65 sm:w-auto"
                      >
                        {isSubmittingApplication ? 'Submitting application...' : 'Submit application'}
                      </button>
                    </div>
                  </form>
                )}
              </section>
            )}
          </section>
        )}
      </main>

      <footer className="border-t border-border bg-light-indigo">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-7 text-sm text-primary-text sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <EventBookLogo compact />
          <p>© 2026 EventBook. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}