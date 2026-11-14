'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import EventBookLogo from '@/components/eventbook-logo'

type OrganizerApplication = {
  id: number
  name: string
  email: string
  organizationName: string | null
  phoneNumber: string | null
  organizationDescription: string | null
  organizationPurpose: string | null
}

type PageState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'error'; message: string }
  | { status: 'ready' }

type Feedback = { type: 'success' | 'info' | 'error'; message: string } | null

export default function OrganizerApplicationsPage() {
  const [pageState, setPageState] = useState<PageState>({ status: 'loading' })
  const [applications, setApplications] = useState<OrganizerApplication[]>([])
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let isCurrent = true

    async function loadApplications() {
      setPageState({ status: 'loading' })

      try {
        const sessionResponse = await fetch('/api/auth/me', { credentials: 'include' })

        if (sessionResponse.status === 401) {
          if (isCurrent) setPageState({ status: 'unauthenticated' })
          return
        }

        const sessionPayload: { user?: { role?: string }; error?: string } =
          await sessionResponse.json()

        if (!sessionResponse.ok) {
          throw new Error(sessionPayload.error || 'Unable to verify your session.')
        }

        if (sessionPayload.user?.role !== 'ADMIN') {
          if (isCurrent) setPageState({ status: 'forbidden' })
          return
        }

        const response = await fetch('/api/admin/organizer-applications', {
          credentials: 'include',
        })

        if (response.status === 401) {
          if (isCurrent) setPageState({ status: 'unauthenticated' })
          return
        }

        if (response.status === 403) {
          if (isCurrent) setPageState({ status: 'forbidden' })
          return
        }

        const payload: {
          applications?: OrganizerApplication[]
          error?: string
        } = await response.json()

        if (!response.ok || !Array.isArray(payload.applications)) {
          throw new Error(payload.error || 'Unable to load organizer applications.')
        }

        if (isCurrent) {
          setApplications(payload.applications)
          setPageState({ status: 'ready' })
        }
      } catch (error) {
        if (isCurrent) {
          setPageState({
            status: 'error',
            message: error instanceof Error
              ? error.message
              : 'Unable to load organizer applications.',
          })
        }
      }
    }

    void loadApplications()

    return () => {
      isCurrent = false
    }
  }, [refreshKey])

  async function submitDecision(
    applicationId: number,
    decision: 'approve' | 'reject',
    reason?: string,
  ) {
    if (processingId !== null) return

    const trimmedReason = reason?.trim()
    if (decision === 'reject' && !trimmedReason) {
      setFeedback({ type: 'error', message: 'Enter a rejection reason before rejecting.' })
      return
    }

    setProcessingId(applicationId)
    setFeedback(null)

    try {
      const response = await fetch(
        `/api/admin/organizer-applications/${applicationId}/${decision}`,
        {
          method: 'POST',
          credentials: 'include',
          ...(decision === 'reject'
            ? {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rejectionReason: trimmedReason }),
              }
            : {}),
        },
      )

      let payload: { error?: string; message?: string } = {}
      try {
        payload = await response.json()
      } catch {
        // Keep a useful fallback if the API response is not JSON.
      }

      if (response.status === 401) {
        setPageState({ status: 'unauthenticated' })
        setApplications([])
        return
      }

      if (response.status === 403) {
        setPageState({ status: 'forbidden' })
        setApplications([])
        return
      }

      if (response.status === 409 || response.status === 404) {
        setApplications((current) => current.filter((item) => item.id !== applicationId))
        setRejectingId(null)
        setRejectionReason('')
        setFeedback({
          type: 'info',
          message: payload.error || 'This application is no longer pending and was removed from the list.',
        })
        return
      }

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to update this application.')
      }

      setApplications((current) => current.filter((item) => item.id !== applicationId))
      setRejectingId(null)
      setRejectionReason('')
      setFeedback({
        type: 'success',
        message: payload.message || `Application ${decision === 'approve' ? 'approved' : 'rejected'}.`,
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to update this application.',
      })
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white text-primary-text">
      <header className="border-b border-border bg-white">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12"
        >
          <EventBookLogo />
          <Link
            href="/admin/dashboard"
            className="text-sm font-semibold text-secondary-text transition-colors hover:text-primary-indigo"
          >
            Dashboard
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <section aria-labelledby="applications-title">
          <div className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-primary-indigo">
                Administration
              </p>
              <h1 id="applications-title" className="text-3xl font-semibold sm:text-4xl">
                Organizer applications
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-secondary-text">
                Review pending requests and decide who can organize events.
              </p>
            </div>
            {pageState.status === 'ready' && (
              <button
                type="button"
                onClick={() => {
                  setFeedback(null)
                  setRefreshKey((key) => key + 1)
                }}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold transition-colors hover:bg-light-indigo"
              >
                Refresh list
              </button>
            )}
          </div>

          {feedback && pageState.status === 'ready' && (
            <p
              className={`mt-5 text-sm font-medium ${
                feedback.type === 'error'
                  ? 'text-error'
                  : feedback.type === 'success'
                    ? 'text-primary-indigo'
                    : 'text-secondary-text'
              }`}
              role={feedback.type === 'error' ? 'alert' : 'status'}
            >
              {feedback.message}
            </p>
          )}

          {pageState.status === 'loading' ? (
            <p className="py-16 text-center text-secondary-text" role="status">
              Verifying access and loading applications...
            </p>
          ) : pageState.status === 'unauthenticated' ? (
            <div className="py-16 text-center" role="alert">
              <h2 className="text-xl font-semibold">Log in to review organizer applications.</h2>
              <Link
                href="/login"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-primary-indigo px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-light-indigo hover:text-primary-indigo hover:ring-2 hover:ring-secondary-indigo"
              >
                Log in
              </Link>
            </div>
          ) : pageState.status === 'forbidden' ? (
            <div className="py-16 text-center" role="alert">
              <h2 className="text-xl font-semibold">Admin access required.</h2>
              <p className="mt-2 text-secondary-text">Your account cannot review organizer applications.</p>
            </div>
          ) : pageState.status === 'error' ? (
            <div className="py-16 text-center" role="alert">
              <h2 className="text-xl font-semibold">Applications could not be loaded.</h2>
              <p className="mt-2 text-secondary-text">{pageState.message}</p>
              <button
                type="button"
                onClick={() => setRefreshKey((key) => key + 1)}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-white px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-light-indigo"
              >
                Try again
              </button>
            </div>
          ) : applications.length === 0 ? (
            <p className="py-16 text-center text-secondary-text" role="status">
              There are no pending organizer applications.
            </p>
          ) : (
            <div className="space-y-5 pt-7">
              {applications.map((application) => (
                <article
                  key={application.id}
                  className="rounded-md border border-border bg-white p-5 shadow-sm sm:p-7"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{application.organizationName || 'Organization not provided'}</h2>
                      <p className="mt-2 text-sm text-secondary-text">
                        {application.name} <span aria-hidden="true">·</span> {application.email}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={processingId !== null}
                        onClick={() => void submitDecision(application.id, 'approve')}
                        className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary-indigo px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-light-indigo hover:text-primary-indigo hover:ring-2 hover:ring-secondary-indigo disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {processingId === application.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        disabled={processingId !== null}
                        onClick={() => {
                          setFeedback(null)
                          setRejectingId(application.id)
                          setRejectionReason('')
                        }}
                        className="inline-flex min-h-10 items-center justify-center rounded-md border border-error px-4 py-2 text-sm font-semibold text-error transition-colors hover:bg-error-soft disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  <dl className="mt-6 grid gap-x-8 gap-y-5 border-t border-border pt-5 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase text-secondary-text">Phone number</dt>
                      <dd className="mt-1 break-words text-sm">{application.phoneNumber || 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-secondary-text">Applicant email</dt>
                      <dd className="mt-1 break-words text-sm">{application.email}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-secondary-text">Organization description</dt>
                      <dd className="mt-1 whitespace-pre-line text-sm leading-6">
                        {application.organizationDescription || 'Not provided'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-secondary-text">Organization purpose</dt>
                      <dd className="mt-1 whitespace-pre-line text-sm leading-6">
                        {application.organizationPurpose || 'Not provided'}
                      </dd>
                    </div>
                  </dl>

                  {rejectingId === application.id && (
                    <form
                      className="mt-6 border-t border-border pt-5"
                      onSubmit={(event) => {
                        event.preventDefault()
                        void submitDecision(application.id, 'reject', rejectionReason)
                      }}
                    >
                      <label
                        htmlFor={`rejection-reason-${application.id}`}
                        className="mb-2 block text-sm font-semibold"
                      >
                        Rejection reason
                      </label>
                      <textarea
                        id={`rejection-reason-${application.id}`}
                        required
                        maxLength={1000}
                        rows={3}
                        value={rejectionReason}
                        onChange={(event) => setRejectionReason(event.target.value)}
                        className="w-full rounded-md border border-border bg-white px-3.5 py-3 text-sm outline-none transition focus:border-secondary-indigo focus:ring-2 focus:ring-secondary-indigo/20"
                        aria-describedby={`rejection-help-${application.id}`}
                      />
                      <p id={`rejection-help-${application.id}`} className="mt-1 text-xs text-secondary-text">
                        A reason is required and will be saved with the decision.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="submit"
                          disabled={processingId !== null || !rejectionReason.trim()}
                          className="inline-flex min-h-10 items-center justify-center rounded-md bg-error px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-error disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {processingId === application.id ? 'Processing...' : 'Confirm rejection'}
                        </button>
                        <button
                          type="button"
                          disabled={processingId !== null}
                          onClick={() => {
                            setRejectingId(null)
                            setRejectionReason('')
                          }}
                          className="inline-flex min-h-10 items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Keep pending
                        </button>
                      </div>
                    </form>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
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