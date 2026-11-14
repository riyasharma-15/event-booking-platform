import Link from 'next/link'

type EventBookLogoProps = {
  compact?: boolean
}

export default function EventBookLogo({ compact = false }: EventBookLogoProps) {
  return (
    <Link
      href="/"
      aria-label="EventBook home"
      className="inline-flex items-baseline font-bold leading-none tracking-tight"
    >
      <span className={compact ? 'text-base' : 'text-xl sm:text-2xl'}>Event</span>
      <span className={`text-primary-indigo ${compact ? 'text-sm' : 'text-base sm:text-lg'}`}>
        Book
      </span>
    </Link>
  )
}
