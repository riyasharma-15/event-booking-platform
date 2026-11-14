# Event Booking Platform Security Audit

**Audit type:** Read-only source review  
**Scope:** Authentication and sessions, role authorization, sensitive APIs, route protection, profile uploads, input handling, and related security controls  
**Result:** One confirmed medium-severity data-integrity vulnerability. No source code, database records, accounts, credentials, sessions, cookies, or environment variables were changed during the initial audit. The user later authorized a separate follow-up remediation to the affected route; no database or account operations were performed.

## Findings

### 1. Concurrent booking cancellation can return seats more than once

- **Severity:** Medium
- **Relevant location:** [`src/app/api/bookings/[id]/route.ts`](./src/app/api/bookings/%5Bid%5D/route.ts), `DELETE` handler, lines 65–99
- **Status:** Confirmed by source inspection; remediation applied in a user-authorized follow-up. Concurrent runtime behavior was not tested.
- **Vulnerability:** The handler checks that the booking is confirmed before starting a transaction. Inside the transaction it updates the booking using only its ID and increments the event's available-seat count without ensuring the booking was still confirmed. The status check and state transition are therefore not atomic.
- **Example exploitation:** An attendee sends two cancellation requests for their own confirmed booking at nearly the same time. Both requests can pass the initial status check. Each transaction can then mark the booking cancelled and increment the event's available seats. The extra seat may allow bookings beyond the event's actual capacity.
- **Recommended fix:** In the transaction, conditionally transition the booking from `CONFIRMED` to `CANCELLED` and increment the event's available seats only if exactly one booking row was transitioned. Keep both operations in the same transaction, and treat a zero-row transition as already cancelled/not cancellable.

**Remediation applied:** `src/app/api/bookings/[id]/route.ts` now conditionally updates the booking using its ID, attendee ID, and `CONFIRMED` status. It increments available seats only when exactly one row was transitioned; a request that loses the race receives HTTP 409.

## Checks that passed

These are source-review observations, not claims that runtime penetration tests were performed.

- **Authentication/session source review:** Inspected `src/lib/auth.ts` (`getCurrentUser`, `getCurrentUserFromSessionId`, `requireRole`), `src/app/api/auth/login/route.ts` (`POST`), `src/app/api/auth/logout/route.ts` (`POST`), and `src/lib/server-auth.ts` (`requireServerUser`, `requireServerRole`). Session IDs are generated as random 32-byte values; session lookup checks expiration; login configures an HttpOnly, SameSite=Lax cookie and enables Secure in production. No additional authentication/session vulnerability was confirmed.
- **Server-side authorization source review:** Inspected the admin organizer-application listing and approval/rejection routes, organizer application route, event create/update/delete routes, event booking retrieval route, and booking create/retrieve/cancel routes. Role checks were present on the inspected sensitive operations. Ownership checks were present for inspected event booking access and attendee booking cancellation.
- **Frontend route protection source review:** Inspected `src/app/admin/layout.tsx`, `src/app/dashboard/layout.tsx`, `src/app/organizer/layout.tsx`, and `src/app/organizer/dashboard/layout.tsx`. These layouts use `requireServerRole`; navigation visibility was not treated as a security control.
- **Profile and upload source review:** Inspected `src/app/api/profile/route.ts` (`GET`, `PATCH`, `parseProfileFields`, `detectImageExtension`, `removeProfileImage`). The inspected code applies authentication/role checks, upload size limits, JPEG/PNG/WebP signature checks, UUID filenames, a profile-field allowlist, and path constraints when removing generated profile image files. No upload exploit was confirmed.
- **Unsafe HTML/code execution sink search:** Searched `src` for `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `eval`, `new Function`, and URL redirects. No matching unsafe HTML or code-execution sink was found in that search. This is limited search evidence, not proof that all XSS classes are absent.
- **Environment-file tracking check:** `.env` is ignored, and no tracked environment file was listed by the audit. The file contents were not opened.

## Checks that failed

- `npm.cmd run lint` exited with **6 errors and 8 warnings**. These lint results were not identified as security vulnerabilities and were not changed as part of this audit.
- The booking cancellation transaction logic failed the source-level concurrency/data-integrity check described in Finding 1.

## Checks that could not be verified

- Runtime authentication and authorization behavior, including expired/invalid-session rejection on live requests, was not exercised.
- No authenticated tests were run using local accounts.
- Explicit CSRF token or Origin/Referer enforcement was not established. SameSite=Lax was observed in the login cookie configuration, but this alone was not treated as proof of complete CSRF protection.
- Production cookie behavior through deployed proxies/browsers, HTTPS/TLS configuration, response security headers, deployment configuration, and database permissions were not verified.
- The build and runtime test suites were not run.
- No dependency vulnerability audit or comprehensive secret scan was run.
- The contents of `.env` were deliberately not inspected; therefore, the correctness and secrecy of its values could not be verified.
- SQL injection resistance across every query path and XSS resistance across all rendered data were not exhaustively tested. No additional high-confidence issue was confirmed during the source review.

## Limitations

This was a read-only source audit, not a penetration test. No application was exercised with crafted requests, no live database or deployment was accessed, and no authenticated account was used. Conclusions are limited to the inspected code and searches; uninspected routes, runtime configuration, deployment controls, and dependency behavior may introduce risks not represented here.

## Follow-up validation

After the user-authorized route remediation, `npx.cmd eslint 'src/app/api/bookings/[id]/route.ts'` completed with no errors and one warning for an unused catch variable; `npx.cmd tsc --noEmit` completed successfully. No automated test specifically exercising simultaneous cancellations was available or run. The project-wide lint command during the audit had 6 errors and 8 warnings as noted above.

## Priority summary

The confirmed booking-cancellation race has been addressed with an atomic conditional transition; runtime concurrency behavior remains unverified. Next, resolve the existing lint failures and run authorized runtime tests for session expiry, role boundaries, ownership checks, and CSRF behavior. Verify production TLS, cookie settings, headers, database privileges, and dependency status separately.
