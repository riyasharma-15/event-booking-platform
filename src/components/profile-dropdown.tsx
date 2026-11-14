'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import LogoutButton from '@/components/logout-button'

type ProfileDropdownProps = {
  name: string
  profileHref?: string | null
  profileLabel?: string
}

export default function ProfileDropdown({
  name,
  profileHref = '/profile',
  profileLabel = 'My Profile',
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const initial = name.trim().charAt(0).toUpperCase()

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Profile menu for ${name}`}
        aria-expanded={isOpen}
        aria-controls="profile-dropdown-menu"
        onClick={() => setIsOpen((open) => !open)}
        className="flex min-h-11 max-w-full items-center gap-2 rounded-md px-2 py-1 text-left font-semibold transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-indigo"
      >
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-light-indigo text-sm font-semibold text-primary-text"
        >
          {initial || '?'}
        </span>
        <span className="max-w-40 truncate">{name}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`size-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div
          id="profile-dropdown-menu"
          role="group"
          aria-label="Profile options"
          className="absolute right-0 z-30 mt-2 w-56 max-w-[calc(100vw-2.5rem)] rounded-md border border-border bg-white p-2 text-sm shadow-lg"
        >
          {profileHref ? (
            <Link
              href={profileHref}
              onClick={() => setIsOpen(false)}
              className="block rounded px-3 py-2.5 font-medium transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-indigo"
            >
              {profileLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="block w-full rounded px-3 py-2.5 text-left font-medium transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-indigo"
            >
              {profileLabel}
            </button>
          )}
          <div className="my-1 border-t border-border" />
          <LogoutButton className="block w-full rounded px-3 py-2.5 text-left font-medium transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-indigo" />
        </div>
      )}
    </div>
  )
}
