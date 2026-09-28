'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

type RegisterResponse = {
  error?: string
  message?: string
}

export default function RegisterPage() {
  const router = useRouter()
  const isSubmitting = useRef(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; success: boolean } | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting.current) return

    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setFeedback({ message: 'Please fill in all fields.', success: false })
      return
    }

    if (password !== confirmPassword) {
      setFeedback({ message: 'Passwords do not match. Please try again.', success: false })
      return
    }

    isSubmitting.current = true
    setIsLoading(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const payload: RegisterResponse = await response.json()

      if (!response.ok) {
        setFeedback({
          message: payload.error || 'Unable to register. Please try again.',
          success: false,
        })
        return
      }

      setFeedback({ message: payload.message || 'Registration successful.', success: true })
      window.setTimeout(() => router.push('/login'), 900)
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
    <div className="flex min-h-full flex-1 flex-col bg-[#f5f7f4] text-[#17372f]">
      <header className="border-b border-[#17372f]/10 bg-[#f5f7f4]">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 sm:px-8 lg:px-12"
        >
          <Link href="/" className="text-xl font-bold">
            Event<span className="text-[#d9674e]">Book</span>
          </Link>
          <div className="flex items-center gap-5 text-sm font-medium sm:gap-8">
            <Link className="transition-colors hover:text-[#d9674e]" href="/events">
              Events
            </Link>
            <Link className="transition-colors hover:text-[#d9674e]" href="/login">
              Login
            </Link>
            <Link
              className="rounded-md bg-[#17372f] px-4 py-2.5 text-white transition-colors hover:bg-[#285447]"
              href="/register"
              aria-current="page"
            >
              Register
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex flex-1 items-center px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-9 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
          <section className="max-w-lg">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d9674e]">
              Find your next experience
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
              Make plans worth remembering.
            </h1>
            <p className="mt-5 text-lg leading-8 text-[#53645d]">
              Create your EventBook account and start discovering events that matter to you.
            </p>
          </section>

          <section className="w-full rounded-lg border border-[#17372f]/10 bg-white p-6 shadow-sm sm:p-9">
            <h2 className="text-2xl font-semibold">Create your account</h2>
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-semibold">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="min-h-12 w-full rounded-md border border-[#17372f]/20 bg-white px-3.5 text-base outline-none transition focus:border-[#17372f] focus:ring-2 focus:ring-[#17372f]/15"
                />
              </div>
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
                  className="min-h-12 w-full rounded-md border border-[#17372f]/20 bg-white px-3.5 text-base outline-none transition focus:border-[#17372f] focus:ring-2 focus:ring-[#17372f]/15"
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
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="min-h-12 w-full rounded-md border border-[#17372f]/20 bg-white px-3.5 text-base outline-none transition focus:border-[#17372f] focus:ring-2 focus:ring-[#17372f]/15"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="min-h-12 w-full rounded-md border border-[#17372f]/20 bg-white px-3.5 text-base outline-none transition focus:border-[#17372f] focus:ring-2 focus:ring-[#17372f]/15"
                />
              </div>

              {feedback && (
                <p
                  role={feedback.success ? 'status' : 'alert'}
                  className={feedback.success ? 'text-sm font-medium text-[#285447]' : 'text-sm font-medium text-[#b43f32]'}
                >
                  {feedback.message}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-[#17372f] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#285447] disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isLoading ? 'Registering...' : 'Register'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#53645d]">
              Already have an account?{' '}
              <Link className="font-semibold text-[#17372f] underline decoration-[#d9674e] underline-offset-4 hover:text-[#d9674e]" href="/login">
                Login
              </Link>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-[#17372f]/10 bg-[#edf1ec]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-7 text-sm text-[#53645d] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <Link href="/" className="font-bold text-[#17372f]">EventBook</Link>
          <p>© 2026 EventBook. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}