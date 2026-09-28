import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f5f7f4] text-[#17372f]">
      <header className="relative z-10 border-b border-[#17372f]/10 bg-[#f5f7f4]">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 sm:px-8 lg:px-12"
        >
          <a href="/" className="text-xl font-bold tracking-tight">
            Event<span className="text-[#d9674e]">Book</span>
          </a>
          <div className="flex items-center gap-5 text-sm font-medium sm:gap-8">
            <a className="transition-colors hover:text-[#d9674e]" href="/events">
              Events
            </a>
            <a className="transition-colors hover:text-[#d9674e]" href="/login">
              Login
            </a>
            <a
              className="rounded-md bg-[#17372f] px-4 py-2.5 text-white transition-colors hover:bg-[#285447]"
              href="/register"
            >
              Register
            </a>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <section aria-labelledby="hero-title" className="bg-[#f5f7f4]">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-12 lg:py-24">
            <div className="max-w-2xl">
              <p className="mb-5 text-sm font-semibold uppercase tracking-[0.16em] text-[#d9674e]">
                Make room for something memorable
              </p>
              <h1
                id="hero-title"
                className="text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl"
              >
                Discover Events That Matter to You
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#53645d]">
                Find and book conferences, workshops, concerts, sports events,
                cultural experiences, celebrations, and more.
              </p>
              <a
                className="mt-8 inline-flex min-h-12 items-center rounded-md bg-[#17372f] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#285447]"
                href="/events"
              >
                Browse Events
              </a>
            </div>
            <div className="relative mx-auto aspect-[4/3] w-full max-w-[34rem] overflow-hidden rounded-xl">
              <Image
                src="/chatgpt.png"
                alt="A variety of events and experiences"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
              />
            </div>
          </div>
        </section>

        <section
          aria-labelledby="why-title"
          className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12"
        >
          <div className="mb-10 flex flex-col gap-3 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
            <h2 id="why-title" className="text-3xl font-semibold sm:text-4xl">
              Why EventBook?
            </h2>
            <p className="max-w-md text-base leading-7 text-[#53645d]">
              Good plans start with finding the right event.
            </p>
          </div>
          <div className="grid gap-9 border-t border-[#17372f]/15 pt-8 sm:grid-cols-3 sm:gap-8">
            <article>
              <p className="mb-5 text-sm font-semibold text-[#d9674e]">01</p>
              <h3 className="text-xl font-semibold">Discover Events</h3>
              <p className="mt-3 max-w-sm leading-7 text-[#53645d]">
                Explore events and find something that feels just right for you.
              </p>
            </article>
            <article>
              <p className="mb-5 text-sm font-semibold text-[#d9674e]">02</p>
              <h3 className="text-xl font-semibold">Easy Booking</h3>
              <p className="mt-3 max-w-sm leading-7 text-[#53645d]">
                Reserve your tickets in a few simple steps and get on with the
                excitement.
              </p>
            </article>
            <article>
              <p className="mb-5 text-sm font-semibold text-[#d9674e]">03</p>
              <h3 className="text-xl font-semibold">Secure Platform</h3>
              <p className="mt-3 max-w-sm leading-7 text-[#53645d]">
                Your booking details are handled with care from start to finish.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#17372f]/10 bg-[#edf1ec]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-7 text-sm text-[#53645d] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <a href="/" className="font-bold text-[#17372f]">
            EventBook
          </a>
          <p>© 2026 EventBook. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
