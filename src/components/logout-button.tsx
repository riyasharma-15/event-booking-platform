'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type LogoutButtonProps = {
  className?: string
}

export default function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Unable to log out. Please try again.')
      }

      router.replace('/login')
    } catch (logoutError) {
      setError(logoutError instanceof Error
        ? logoutError.message
        : 'Unable to log out. Please try again.')
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className={className ?? 'font-medium transition-colors hover:text-primary-indigo disabled:opacity-60'}
      >
        {isLoggingOut ? 'Logging out...' : 'Logout'}
      </button>
      {error && <span className="sr-only" role="alert">{error}</span>}
    </>
  )
}
