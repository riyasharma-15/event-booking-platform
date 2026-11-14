'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import EventBookLogo from '@/components/eventbook-logo'
import LogoutButton from '@/components/logout-button'

type OrganizerShellProps = {
  children: ReactNode
}

const navigationItems = [
  { label: 'Dashboard', href: '/organizer/dashboard', icon: 'dashboard' },
  { label: 'Create New Event', href: '/organizer/events/new', icon: 'create' },
  { label: 'My Event', href: '/organizer/events', icon: 'events' },
  { label: 'Attendee Management', href: '/organizer/attendees', icon: 'attendees' },
  { label: 'Bookings and Registrations', href: '/organizer/bookings', icon: 'bookings' },
  { label: 'Payments and Revenue', href: '/organizer/payments', icon: 'payments' },
  { label: 'Reviews and Feedback', href: '/organizer/reviews', icon: 'reviews' },
  { label: 'My Profile Settings', href: '/organizer/profile', icon: 'profile' },
  { label: 'Logout', action: 'logout', icon: 'logout' },
] as const

type NavigationIcon = (typeof navigationItems)[number]['icon']

const iconPaths: Record<NavigationIcon, string> = {
  dashboard: 'M3 3h7v7H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 14h7v7H3z',
  create: 'M12 5v14 M5 12h14',
  events: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16',
  attendees: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  bookings: 'M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h5',
  payments: 'M3 6h18v12H3z M3 10h18 M7 15h3',
  reviews: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z',
  profile: 'M20 21a8 8 0 0 0-16 0 M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10',
  logout: 'M10 17l5-5-5-5 M15 12H3 M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7',
}

function NavigationLink({
  href,
  label,
  icon,
  active,
}: {
  href: string
  label: string
  icon: NavigationIcon
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-indigo ${
        active
          ? 'bg-light-indigo text-primary-indigo'
          : 'text-secondary-text hover:bg-light-indigo hover:text-primary-text'
      }`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-5 shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[icon]} />
      </svg>
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  )
}

function OrganizerNavigation({
  pathname,
  compact = false,
}: {
  pathname: string
  compact?: boolean
}) {
  return (
    <nav aria-label="Organizer navigation" className={compact ? 'flex min-w-max gap-1' : 'space-y-1'}>
      {navigationItems.map((item) => {
        if ('action' in item) {
          return (
            <div
              key={item.label}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-secondary-text hover:bg-light-indigo hover:text-primary-text ${compact ? 'shrink-0' : ''}`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-5 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[item.icon]} />
              </svg>
              <LogoutButton className="whitespace-nowrap text-left font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-indigo" />
            </div>
          )
        }

        return (
          <div key={item.label} className={compact ? 'shrink-0' : undefined}>
            <NavigationLink
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname === item.href}
            />
          </div>
        )
      })}
    </nav>
  )
}

export default function OrganizerShell({ children }: OrganizerShellProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-white text-primary-text md:flex">
      <aside className="hidden w-72 shrink-0 border-r border-border bg-white md:sticky md:top-0 md:flex md:h-screen md:flex-col">
        <div className="border-b border-border px-6 py-6">
          <EventBookLogo />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-6">
          <OrganizerNavigation pathname={pathname} />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-b border-border bg-white md:hidden">
          <div className="flex min-h-16 items-center px-4">
            <EventBookLogo />
          </div>
          <div className="overflow-x-auto border-t border-border px-3 py-2">
            <OrganizerNavigation pathname={pathname} compact />
          </div>
        </header>
        <main className="min-h-[calc(100vh-7rem)]">{children}</main>
      </div>
    </div>
  )
}
