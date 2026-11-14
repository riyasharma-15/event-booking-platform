'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import EventBookLogo from '@/components/eventbook-logo'

type LoginResponse = {
  error?: string
  message?: string
  user?: {
    role?: 'ATTENDEE' | 'ORGANIZER' | 'ADMIN'
  }
}

export default function LoginPage() {
  const router = useRouter()
  const isSubmitting = useRef(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; success: boolean } | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting.current) return

    isSubmitting.current = true
    setIsLoading(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const payload: LoginResponse = await response.json()

      if (!response.ok) {
        setFeedback({
          message: payload.error || 'Unable to log in. Please try again.',
          success: false,
        })
        return
      }

      const dashboardPaths = {
        ATTENDEE: '/dashboard',
        ORGANIZER: '/organizer/dashboard',
        ADMIN: '/admin/dashboard',
      } as const
      const role = payload.user?.role
      const dashboardPath = role ? dashboardPaths[role] : null

      if (!dashboardPath) {
        setFeedback({
          message: 'Login succeeded, but your account role could not be verified. Please try again.',
          success: false,
        })
        return
      }

      setFeedback({ message: payload.message || 'Login successful.', success: true })
      window.setTimeout(() => router.push(dashboardPath), 900)
    } catch {
      setFeedback({
        message: 'A server error occurred. Please try again.',
        success: false,
      })
    } finally {
      isSubmitting.current = false
      setIsLoading(false)
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
          <div className="flex items-center gap-5 text-sm font-medium sm:gap-8">
            <Link className="transition-colors hover:text-primary-indigo" href="/events">
              Events
            </Link>
            <Link className="text-primary-indigo" href="/login" aria-current="page">
              Login
            </Link>
            <Link
              className="rounded-md bg-primary-indigo px-4 py-2.5 text-white transition-colors hover:bg-light-indigo hover:text-primary-indigo hover:ring-2 hover:ring-secondary-indigo"
              href="/register"
            >
              Register
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex flex-1 items-center px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
          <section className="max-w-lg">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-indigo">
              Your next experience starts here
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
              Welcome back.
            </h1>
            <p className="mt-5 text-lg leading-8 text-secondary-text">
              Log in to pick up where your plans left off and find your next event.
            </p>
          </section>

          <section className="w-full rounded-lg border border-border bg-white p-6 shadow-sm sm:p-9">
            <h2 className="text-2xl font-semibold">Log in to EventBook</h2>
            <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="min-h-12 w-full rounded-md border border-border bg-white px-3.5 text-base outline-none transition focus:border-primary-indigo focus:ring-2 focus:ring-primary-indigo/20"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="min-h-12 w-full rounded-md border border-border bg-white px-3.5 text-base outline-none transition focus:border-primary-indigo focus:ring-2 focus:ring-primary-indigo/20"
                />
              </div>

              {feedback && (
                <p
                  role={feedback.success ? 'status' : 'alert'}
                  className={feedback.success ? 'text-sm font-medium text-primary-text' : 'text-sm font-medium text-error'}
                >
                  {feedback.message}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary-indigo px-6 py-3 font-semibold text-white transition-colors hover:bg-light-indigo hover:text-primary-indigo hover:ring-2 hover:ring-secondary-indigo disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-secondary-text">
              Don&apos;t have an account?{' '}
              <Link className="font-semibold text-primary-text underline decoration-secondary-indigo underline-offset-4 hover:text-primary-indigo" href="/register">
                Register
              </Link>
            </p>
          </section>
        </div>
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