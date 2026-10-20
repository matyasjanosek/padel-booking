# Decisions

A running log of real decisions. Newest at the bottom.

## 2026-09-02: MySQL with Prisma

Bookings are relational data with strict constraints between courts, slots and
users. A unique constraint on court and start time is the guarantee against
double booking, which a document database does not provide in the same way.
MySQL was chosen over other relational options because of existing experience
with it and the short project timeframe. Unique constraints and transactions,
which are all the project needs, work the same way.

## 2026-09-02: npm workspaces monorepo

Client and server live in one repository as npm workspaces. One `npm install`
at the root sets up both, and CI runs a single `npm ci`. Prisma sits at the
root because the schema and migrations are shared project state.

## 2026-09-02: concurrently for the dev script

`concurrently` is a dev dependency so `npm run dev` runs client and server in
one terminal with a clean shutdown. The alternative, a plain `dev:server &
dev:client` shell line, handles Ctrl-C and interleaved output poorly.

## 2026-09-02: Node built-ins instead of dotenv and nodemon

Node 20+ reads env files with `--env-file` and restarts on change with
`--watch`, so `dotenv` and `nodemon` are not needed. The server dev script
uses both flags.

## 2026-09-02: Join table for tournament match teams

The data model lists `team_a` and `team_b` as arrays of two player ids. MySQL
has no array type. Rather than storing them as JSON, matches and players are
linked through a join table `tournament_match_players (match_id,
tournament_player_id, team)`. This keeps "which matches did this player play"
and "who is in this match" as ordinary queryable relations.

## 2026-09-02: dedicated Prisma shadow database

`prisma migrate dev` needs a shadow database to detect schema drift. By
default it creates and drops one on the fly, which needs the CREATE DATABASE
privilege. The `padel` user is deliberately limited to its own schema, so
instead there is a second database `padel_booking_shadow` and a
`SHADOW_DATABASE_URL` in the environment. This is the workaround Prisma
documents for hosts where the app user cannot create databases.

## 2026-09-02: SESSION_SECRET, not JWT_SECRET

Auth uses signed httpOnly session cookies, not JWT. The environment variable
is `SESSION_SECRET` everywhere. An earlier draft of `docs/setup.md` mentioned
`JWT_SECRET`; that has been corrected.

## 2026-09-07: seed script for the two courts

Phase 2 needs the two courts in the database. `prisma/seed.js` creates them
with a plain `npm run seed`, next to the schema where shared project state
lives. It checks the court count first and skips if courts already exist, so
running it twice is safe. The `package.json#prisma` seed hook was left out
because Prisma 6 deprecates it in favour of a config file, which is more setup
than a one-line npm script needs.

## 2026-09-07: walking skeleton reads courts, not health

The Phase 2 slice is `GET /api/courts`: route in `routes/courts.js`, the query
in `services/courts.js`, rendered as a list on the home page. It replaces the
health status on the home page; the `/api/health` endpoint stays for CI and
monitoring. The route has a try/catch returning 500 because the database can be
down and an unhandled rejection would leave the request hanging. The route test
mocks the service so it needs no database, matching the CI setup which has no
MySQL yet.

## 2026-09-08: design system foundation

Fonts load from Google Fonts with a `<link>` in `index.html`, only the weights
used: Poppins 400 and 500, Unbounded 700. A font package like `@fontsource`
would be another dependency for no real gain at this stage.

Tokens live in `styles/variables.css` as CSS custom properties: the seven
palette colours from the plan plus `--font-heading`, `--font-body` and a
`--content-width`. `styles/global.css` imports the tokens and sets the base
element styles and a `prefers-reduced-motion` rule. `styles/layout.css` holds
the nav, content wrapper and footer.

The layout is a `Layout` component with `Nav`, a `main` content wrapper and
`Footer` around a router `Outlet`. It is a layout route in `main.jsx`, so every
page renders inside it. The nav already links Home, Info, Booking and Contact;
only Home has a route so far, the rest are added in their own phases.

## 2026-09-08: home page hero

`Hero` component on the home page, following the structure in the plan: an
uppercase letterspaced eyebrow, a three-line title (GEN / PADEL / ROZNOV, the
middle line in accent green) a muted lead paragraph and a pill link to booking.
Layout is a two-column grid on screens 900px and up, content on the left and an
empty `.hero-visual` column on the right that the 3D ball fills in the next
step; below 900px it is a single column and the visual column is hidden. The
title uses `clamp()` for size with tight line height and negative letter
spacing. Motion is a short staggered fade-up on load, inside a
`prefers-reduced-motion: no-preference` block so it is skipped otherwise. Green
appears only in the eyebrow, one title word and the link hover. The court list
moved below the hero into a "The courts" section.

The `main` wrapper in `Layout` no longer centres content in a fixed column. It
is now full width and each page sets its own padding, so the hero can sit close
to the left edge of the viewport. The hero and the courts section share a
`--page-max` cap and align on the same left inset. Info and Contact will need
their own width wrapper when they are built.

Copy is written in plain short sentences with no marketing voice. Em dashes are
not used anywhere in the site copy.

## 2026-09-08: 3D hero ball

Added `three`, `@react-three/fiber` 9.7.0 and `@react-three/drei` 10.7.8 (all in
the stack in CLAUDE.md). `HeroScene` loads `ball_compressed.glb` with `useGLTF`
and a self-hosted Draco decoder in `client/public/draco`, centres and scales the
model, and turns it slowly on the Y axis in a frame loop. `HeroBall` lazy loads
that scene so three.js and the 6.6 MB model stay out of the main bundle and
shows a bordered circle placeholder while it loads. The model was moved to
`client/src/assets` and the Draco decoder files live in `client/public/draco`.

Whether to show the moving ball (wide screen, motion allowed) is decided once,
synchronously, from `matchMedia` when the hero first renders. The first version
kept a `matchMedia` change listener that re-ran `setState` in both directions,
so a transient change to the match, for example a scrollbar width blip near the
breakpoint, unmounted the live WebGL scene a second after it appeared. The check
is now a one-time decision and is not re-evaluated, so the scene is never torn
down.

No still-image fallback. On screens under 900px the column is hidden; on wide
screens with reduced motion the column is simply empty. A rendered-to-image
fallback can be added later if the empty space looks wrong.

## 2026-09-08: Tailwind CSS for the client

The client now uses Tailwind CSS v4 through the `@tailwindcss/vite` plugin. All
the hand-written CSS files (`variables.css`, `global.css`, `layout.css`,
`hero.css`, `home.css`) are replaced by utility classes in the components and
one file, `client/src/styles/main.css`.

`main.css` holds `@import "tailwindcss"`, an `@theme` block with the design
tokens, a small `@layer base` for the body and heading defaults, the
reduced-motion rule and the hero entrance keyframes. The `@theme` block clears
the `--color-*`, `--font-*` and `--breakpoint-*` namespaces with `initial` and
then defines only what the project uses: the seven palette colours, the two
font families and two breakpoints (`sm` 700px, `md` 900px). This is the only
place a colour value, a font name or a breakpoint is written down. Nothing in
the components hardcodes a colour.

Reason for adding a dependency outside the stack in CLAUDE.md: the project was
already asking for colours and fonts to live in one place and for consistent
spacing, and Tailwind gives that plus responsive variants without a separate
CSS file per component.

The hero content sits at a larger left inset (`md:pl-24`, 6rem) so it has room
but stays clearly left aligned, not centred. The nav and footer still use the
smaller chrome inset.

## 2026-09-15: Info and Contact pages

Added `client/src/pages/Info.jsx` and `client/src/pages/Contact.jsx`, the last
piece of Phase 3. This is the first use of `client/src/pages`, the folder
CLAUDE.md sets aside for route level components; the home page still lives in
`App.jsx` at the top of `src`, unchanged, since moving it was not part of this
task.

`Layout`'s `main` has no width or padding of its own, so each page section
repeats the same wrapper classes the hero and the home page courts section
already use: `px-5` on small screens, `md:max-w-page md:pl-24 md:pr-10` from
900px up. No new CSS, just the same utility classes copied across pages, to
stay consistent with how the rest of the design system was built.

The contact form is plain HTML with no React state. There is no backend route
for it yet, so the submit handler only calls `preventDefault`, it does not
pretend to send anything.

Copy is placeholder content for a fictional business (address, price, opening
hours) written in short factual sentences, no em dashes, matching the voice
set on the home page.

## 2026-09-16: email and password auth, no new dependencies

Phase 4's first step: registration, login, logout, session handling, auth
middleware and an admin role check. Two choices that would normally need a
library were done with Node's built-ins instead, since nothing in CLAUDE.md's
stack covers them and the data model has no `sessions` table:

- Passwords are hashed with Node's built-in `crypto.scrypt`, a random salt per
  password, compared with `timingSafeEqual`. This is an OWASP-approved
  password hash, in Node core, no native bindings to install.
- The session is the cookie itself, there is no server-side session store.
  `server/src/services/session.js` signs the user id with HMAC-SHA256 using
  `SESSION_SECRET` (already in `.env`, unused until now) and verifies it with
  a timing safe comparison. Express's own `res.cookie` sets it httpOnly,
  `sameSite: lax`, and `secure` in production. Reading the `Cookie` header is
  about eight lines of parsing, since Express does not do this itself and
  `cookie-parser` would be the only reason to add a dependency here.

Registration relies on the `users.email` unique constraint the same way
booking relies on `(court_id, start_time)`: `registerUser` just calls
`prisma.user.create` and the route turns a Prisma `P2002` error into a 409,
rather than checking for an existing email first and racing a concurrent
registration.

Login returns the same 401 and message for a wrong password and for an email
that does not exist, so the response cannot be used to find out which emails
are registered.

Added `GET /api/auth/me`, protected by the new `requireAuth` middleware, one
step beyond what was asked. Without it nothing in the running app actually
uses session auth, and there is no way to check "am I logged in" over HTTP
before the client exists. `requireAdmin` has no route yet, it is tested
directly as a function until an admin route exists to hang it on.

Tests stub `SESSION_SECRET` themselves in each test file rather than reading
`.env`, since CI has no `.env` file and server tests are not wired to load one.

## 2026-09-16: auth UI

Phase 4's second step: login and registration pages, a nav that shows the
logged in state, logging out, and a protected account page. The session is a
cookie the client cannot read, so the client learns whether anyone is logged
in by calling `GET /api/auth/me` once on load and holding the result in a
small `AuthContext` (`client/src/context`, a new folder; the documented
structure has no slot for app wide state, and this is the first feature that
needs any). `RequireAuth` reads that context and redirects to `/login` when
there is no user; it renders nothing while the initial `/auth/me` check is
still in flight, so it never redirects on a guess.

The account page shows only name and email for now. This proves the guard
works; the plan's "profile page with editing" is a real feature that was not
part of this step, so it stays a stub until asked for.

Added one colour, `--color-danger`, for form error text. The palette in
`docs/plan.md` has no colour for this and reusing the brand accent for errors
would blur what the accent means, so this is a small, named addition to the
same `@theme` block, not a one-off hardcoded colour.

Login and registration call the same context methods, which call the Phase 4
backend and update the held user on success. Login shows the server's own
message on failure, which is deliberately the same message for a wrong
password and for an unknown email.

Verified end to end against the real server and database, not only the
mocked tests: register, direct visit to /account while logged out redirects
to /login, log out clears the nav and the guard, wrong password shows an
error, correct password logs in, and a duplicate email on registration shows
"Email is already registered". Test accounts were deleted from the database
afterwards.

## 2026-09-16: Google OAuth login

Phase 4's third step. Hand rolled the OAuth2 authorization code flow with
`fetch` (`server/src/services/googleAuth.js`) rather than adding `passport` or
similar, the same choice as for password hashing and session cookies:
`GET /api/auth/google` redirects to Google with a random `state` in a short
lived httpOnly cookie, Google calls `GET /api/auth/google/callback` with a
`code`, the server exchanges it for an access token and reads
`https://www.googleapis.com/oauth2/v3/userinfo` with it.

The `id_token` Google also returns is a JWT signed with keys that rotate, and
verifying it properly needs fetching and caching Google's JWKS, which is a
different, harder problem than signing our own session cookie. Calling the
userinfo endpoint with the access token sidesteps that: it is a live
authenticated call to Google's own server, not a signature we would have to
verify ourselves.

`findOrCreateGoogleUser` is the account linking asked for: a user found by
`googleId` is returned as is, a user found by email instead gets that email's
existing row updated with the `googleId`, and only a genuinely new email
creates a new row. Either path calls the same `prisma.user.create` as
password registration, so the rest of the app sees one kind of user record.
Linking only happens when Google's `email_verified` is `true`, otherwise a
Google account claiming an unverified address could attach itself to
somebody else's password account.

The redirect URI defaults to `http://localhost:${PORT}/api/auth/google/callback`,
overridable with `GOOGLE_REDIRECT_URI`; it must match what is registered for
the client id in Google Cloud Console. Verified for real: opening
`/api/auth/google` in a browser reaches Google's real account chooser rather
than a `redirect_uri_mismatch` error, so the current registration is correct.
Did not complete a real sign in, that needs an actual Google account. The
error paths (state mismatch, missing code, a fake code rejected by Google's
real token endpoint) were checked against the live server and redirect to
`/login?error=google` instead of crashing.

The client got a `ContinueWithGoogle` link (`/api/auth/google`, a real
navigation, not a router `Link`) on both the login and registration pages,
and the login page reads `?error=google` from the URL to show a message when
the callback sends someone back after a failure.

## 2026-09-17: availability endpoint

Phase 5's first step. `GET /api/availability?date=YYYY-MM-DD&courtId=` returns
one array of slots for that day and court, each `{ startTime, endTime,
status }`, rather than separate free and taken arrays, since a client needs
one pass to render a calendar and can reuse `startTime` directly once
booking creation exists.

Two things this needed beyond the fixed slot length asked for, added to a new
`server/src/config.js`:

- Opening hours. Enumerating a day's slots needs a start and end of day, not
  only a slot length. Set to 07:00 to 22:00 with a 60 minute slot, matching
  the hours and the "one hour costs 400 CZK" price already on the Info page.
- Timezone. The centre is in Czechia, but nothing in this codebase handles a
  real timezone yet and none is in the approved stack. Doing that correctly
  across DST is real work that does not belong in a first step. Configured
  hours are treated as plain UTC clock values for now, a known simplification
  to revisit before this reaches real users, not silently ignored.

A slot's taken/free status is decided entirely by the database query in
`getAvailability`: bookings for that court and day where `status = confirmed`
OR (`status = pending` AND `holdExpiresAt` is in the future). An expired hold
is read as free, matching the plan; actually flipping its status to expired
is the separate "hold expiry as a job and on availability reads" step, not
this one.

Returns 404 for a court id that does not exist, checked with its own query
before touching bookings, rather than silently returning "everything free"
for a bogus id.

Verified against the real database, not only the mocked tests: seeded a
confirmed booking, a pending booking with an unexpired hold, and a pending
booking with an expired hold on the same day, and confirmed the endpoint
marks exactly the first two taken and the third free. Also checked a bogus
court id (404) and a malformed and a calendar-invalid date (both 400) against
the live server. Test data was deleted afterwards.

## 2026-09-17: real Europe/Prague timezone handling

The UTC simplification from the previous entry was wrong and is replaced.
Opening hours are wall clock time in Rožnov pod Radhoštěm, and Europe/Prague
observes CET in winter and CEST in summer, so "7 in the morning" is a
different UTC instant depending on the date. Treating configured hours as
UTC would have opened and closed the courts an hour or two off from what the
centre actually intends for at least half the year.

Fixed with `server/src/timezone.js`, using only `Intl.DateTimeFormat`, no new
dependency:

- `pragueTimeToUtc(year, month, day, hour, minute)` gets Prague's offset by
  formatting a guessed instant in Prague and reinterpreting those fields as
  UTC; the difference from the guess is the offset at that moment. It looks
  the offset up twice, once from a naive guess and once from the instant
  that guess implies, so the result is correct even for a wall clock time
  that falls exactly on the moment clocks change, not only for 7 and 22
  which never do.
- `formatPragueIso(instant)` writes that instant back out with its real
  offset, `+01:00` or `+02:00`, instead of `Z`.

`getAvailability` now builds the day's slot boundaries with
`pragueTimeToUtc` and formats `startTime`/`endTime` with `formatPragueIso`.
An offset-suffixed ISO string is still an exact, unambiguous UTC-derivable
instant, so this satisfies "store in UTC" and "display in Prague" from the
same value, rather than picking one and pushing the other onto whichever
client reads this later.

Verified against the real server for a summer date (+02:00), a winter date
(+01:00), the day clocks spring forward, and the day they fall back, plus a
real seeded booking still correctly read as taken now that the day window
itself is computed from Prague hours rather than UTC.

## 2026-10-08: creating a booking

Phase 5's second step. `POST /api/bookings` takes `courtId` and `startTime`,
requires a logged in user, and writes a `pending` booking with
`holdExpiresAt` ten minutes ahead. `HOLD_MINUTES` and `PRICE_PER_SLOT_CZK`
(400, matching the Info page) joined the existing slot settings in
`config.js`.

The unique constraint on `(court_id, start_time)` is the guarantee, as the
plan intends: `createBooking` just writes the row, and the route turns a
Prisma `P2002` into 409 "That slot was just taken", the same shape as
registration relying on the `users.email` unique constraint. A `P2003`
foreign key error becomes 404, so a court that does not exist needs no
separate existence query before every write.

The requested `startTime` is validated against the real slot grid, reusing
`slotStartsForDay` from the availability service rather than duplicating it.
Without that check a request for 09:13 would not collide with an existing
09:00 booking at the database level, since the constraint only matches an
exact start time, but it would still physically overlap it on the court.
This is what "fixed slot length keeps the unique constraint meaningful" in
the plan depends on.

`tests/bookingConcurrency.test.js` is the only test here that uses a real
database instead of a mocked Prisma client. Mocking would remove the exact
thing it proves, that the database and not application code decides which of
two racing requests wins. It fires two identical requests with
`Promise.all` and asserts the statuses are exactly `[201, 409]` and that one
row exists. Ran it ten times while developing, always the same result. CI had
no database at all, so `ci.yml` now starts a MySQL 8 service container, runs
`prisma migrate deploy` and seeds the courts before `npm test`.

Two bugs the mocked tests could not have caught, found by running the real
endpoint and reading the response:

- `formatPragueIso` produced a malformed offset such as `+01:59.994` for any
  instant not on a whole second, and silently dropped the milliseconds. The
  Intl formatter has no millisecond field, so the offset subtraction was off
  by the instant's milliseconds. Every previous caller passed exact slot
  boundaries, so it never showed; a hold expiry is "now plus ten minutes" and
  almost never lands on a whole second. Fixed by carrying the instant's own
  milliseconds into the comparison, with regression tests for a mid-second
  instant.
- `price` came back as the string `"400"`, because Prisma `Decimal` serialises
  to a string. `toPublicBooking` now converts it, and its test passes a
  Decimal-like object rather than a plain number so this stays caught.

Known gap, resolved by the next step: a pending booking whose hold has
expired reads as free in availability but still returns 409 when booked,
because the row is still there and the unique constraint does not care about
the hold. Confirmed deliberately against the live server. Expiring holds, the
plan's "hold expiry as a job and on availability reads", is what closes this.

## 2026-10-08: hold expiry

Phase 5's third step, and it closes the gap above. Asked first, since the
fix touches more than an expiry function (see below) and it is not a small
change.

`server/src/services/holdExpiry.js` has one function, `expireStaleHolds`,
which flips every pending booking with a past `holdExpiresAt` to `expired`.
It runs from two places: `server/src/jobs/holdExpiry.js` on a one minute
interval (`HOLD_EXPIRY_INTERVAL_SECONDS` in config.js), started from
`index.js`, not `app.js`, so the test suite's `createApp()` never starts a
background timer; and at the top of `getAvailability`, so the stored status
is accurate by the time anyone reads it, not only after the job's next tick.

This alone does not make a stale hold stop blocking a slot. MySQL's unique
index on `(court_id, start_time)` matches every row regardless of status, so
a row that is now `expired` still occupies that exact key, and inserting a
new booking there still raises P2002. `getAvailability`'s query already
treated an expired hold as free before this step (it only counts a pending
row as taken while `holdExpiresAt` is still in the future), so `expireStaleHolds`
running there does not change what availability shows, only what is stored.
The actual fix is in `createBooking`: on a P2002 conflict, instead of always
surfacing it as "taken", it checks whether the conflicting row is actually
stale (its hold passed, or it was cancelled) and reclaims that same row in
place with an `UPDATE` guarded by that same condition. The row is reused,
not replaced: same id, same slot, new user, new hold. That `UPDATE`'s
affected row count is the race guarantee for this path, the same role the
unique constraint plays for a slot nobody has booked before, so the
constraint stays the single source of truth for both paths, nothing is
removed or routed around.

`bookingConcurrency.test.js` gained a second real-database race alongside
the brand-new-slot one: seed a booking with an already-expired hold, fire
two concurrent requests for that same slot, and assert exactly one gets 201,
the other 409, one row remains, and it is the same row, now pending again
for the winner. Ran it ten times while developing, same result every time.

Verified against the real dev server end to end, the scenario the known gap
described: seeded a stale pending booking directly, confirmed availability
already showed it free, confirmed the availability read flipped its stored
status to expired, then booked that exact slot through the real endpoint and
got 201 reusing the same row, where the same request used to return 409.
Also confirmed booking that now-active slot again correctly returns 409, and
separately confirmed the scheduled job alone, with no availability call in
between, flips a second seeded stale row after its one minute interval. Test
data deleted afterwards.

## 2026-10-08: cancellation and the bookings list

Phase 5's fourth step. `GET /api/bookings` returns the logged in user's own
bookings, newest start time first, scoped by `req.user.id` from `requireAuth`,
never from a client supplied id. `POST /api/bookings/:id/cancel` cancels one
of them.

`cancelBooking(bookingId, userId)` looks the booking up first and returns one
of four outcomes: not found, not the caller's own, not in a cancellable
state, or cancelled. The route turns those into 404, 403, 409 and 200. A
tagged result object rather than throwing or returning a bare booking or
null, there are three distinct failure reasons and the route needs to tell
them apart to pick the right status code. Only a `pending` or `confirmed`
booking can be cancelled, cancelling an already `expired` or already
`cancelled` one returns 409 rather than silently succeeding a second time.
No cutoff based on how close the booking's start time is: nothing about
refunds or payment exists yet to make "too late to cancel" mean anything
concrete, so that stays a later decision rather than a guess now.

Ownership is checked against `req.user.id` from the session, never a client
supplied field, the same principle as every other write in this project.

A cancelled booking is exactly one of the conditions `createBooking`'s
reclaim logic already treats as stale (`{ status: "cancelled" }`, added when
reclaim was built), so cancelling a slot makes it bookable again immediately,
through the existing reclaim-on-conflict path, no new wiring needed.
Confirmed this against the real server: cancelled A's booking, availability
showed the slot free, and a second user booked the exact same row, reused by
id, through the ordinary `POST /api/bookings`.

On the client, `Account.jsx` fetches `/api/bookings` and the courts list on
mount, and renders each booking's court name, its time in Prague (using
`Intl.DateTimeFormat` with an explicit `timeZone: "Europe/Prague"`, since
formatting otherwise uses the viewer's own browser timezone, and a court's
booked time means Prague time regardless of where the viewer happens to be,
the same reasoning as the server's own `formatPragueIso`), its status, and a
Cancel button for a `pending` or `confirmed` booking. Cancelling calls the
same endpoint and replaces that booking in state with the server's response,
not a guessed local update.

## 2026-10-08: confirm before cancelling, and an act() warning in Account.test.jsx

Two fixes to the step above, both requested after review.

Cancelling now asks first. Clicking Cancel turns the button into "Cancel
this booking? Yes, cancel / No" for that one row; only the second click
calls the API. This is plain inline state (`confirmingId`, separate from
`cancellingId`, the one actually in flight), not a modal: no modal or dialog
component exists anywhere in this codebase yet, and `window.confirm` would
look out of place against the rest of the design, so a one-off dialog
component for this single use was not worth building either.

`Account.test.jsx` had the same cause as the earlier `App.test.jsx` warning:
its first test asserted synchronously and only waited for `fetchMyBookings`
to be called, not for the resulting state update to land, so React could
warn about a state update after the test had already finished. Fixed the
same way, waiting for the settled UI ("You have no bookings yet.") instead
of the mock call. Checked the fix by searching the test run's own output for
the warning text directly, not only by the tests passing, and ran the file
five times in a row to rule out it being timing dependent.

## 2026-10-08: Stripe payment intent and checkout

Phase 6's first step. `POST /api/bookings/:id/pay` creates a Stripe payment
intent for one of the caller's own pending bookings and returns its client
secret; it does not confirm the booking, that is the webhook's job in the
next step. Added `stripe` on the server and `@stripe/stripe-js` plus
`@stripe/react-stripe-js` on the client, all three already named in CLAUDE.md's
stack.

`createPaymentIntentForBooking` looks up any existing payment for the
booking first and reuses its payment intent rather than creating a second
one, Stripe's own guidance for a checkout page that might be reloaded. A
concurrent double submit is handled the same way `createBooking`'s reclaim
logic handles its own race: try the insert, and on the `Payment.bookingId`
unique constraint's P2002, cancel the payment intent this request just made
at Stripe so it is not left dangling, and use the one that actually got
stored. `getStripe()` in the new `stripeClient.js` builds the Stripe client
lazily on first use rather than at import time, Stripe's constructor throws
if the key is missing, and this module is reached through `app.js` by most
of the route test suite, not only the payment tests, so constructing it
eagerly would have required every unrelated test to configure a Stripe key
too.

Real bug, found only by calling the real Stripe test API, not by the mocked
tests: the amount sent to Stripe was wrong. CZK is not one of Stripe's
zero-decimal currencies, confirmed against Stripe's own currency
documentation after the live call failed with "Amount must be at least
Kč15.00 CZK" on a 400 CZK booking, the unmistakable sign of an amount read
as 4.00 instead of 400.00. `createPaymentIntentForBooking` now sends the
booking's price in crowns multiplied by 100 to Stripe, while
`Payment.amount` and the API response stay in crowns, matching how
`Booking.price` is already stored and shown. The test that had encoded the
wrong assumption is fixed alongside the code.

Verified against the real Stripe test API end to end with the fix in place:
a real payment intent created for a real booking with amount 40000 (haléře)
confirmed by retrieving it back from Stripe directly, a second call for the
same booking returning the identical client secret rather than a new
payment intent, and the ownership (403), already-settled (409), not found
(404) and logged out (401) guards all checked against the live server. The
payment intent and the smoke test data were cleaned up afterwards.

The client's `Checkout` page, routed at `/booking/:id/checkout` behind
`RequireAuth`, fetches the booking through the existing `GET /api/bookings`
and matches it by id rather than adding a single-booking endpoint for this.
Card details are entered directly into Stripe's own Payment Element and
confirmed with `stripe.confirmPayment`, so they never reach this app's
server, as the plan requires. `loadStripe` is memoised on the publishable
key so Stripe's script is not reloaded on every render. `formatSlot` moved
out of `Account.jsx` into `client/src/utils/formatSlot.js` since `Checkout`
needed the identical formatting, the first real second use, not a
speculative extraction. The account page's pending bookings now show a Pay
now link next to Cancel.

`STRIPE_PUBLISHABLE_KEY` is missing from the project's `.env`, only
`STRIPE_SECRET_KEY` is set, even though both were named as already present.
The server route reads `process.env.STRIPE_PUBLISHABLE_KEY` and sends
whatever that is to the client; with it unset the checkout page cannot call
`loadStripe` and will not render the payment form. Needs adding before the
checkout page can be used, or clicking Pay now in the browser will fail at
that step. `.env.example` and `docs/setup.md` (docs/setup.md was already
missing it too) now document it next to `STRIPE_SECRET_KEY`.

## 2026-10-09: the Stripe webhook

Phase 6's second step. A booking is only confirmed from `POST
/api/stripe/webhook`, never from the browser returning from checkout, since
the browser redirect only means the customer's own browser saw success, not
that Stripe actually captured the payment.

The route (`routes/stripeWebhook.js`) verifies the signature itself with
`getStripe().webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`
inside a try/catch, returning 400 on failure. It needs the exact raw bytes
Stripe signed, so it is mounted in `app.js` with `express.raw()` before the
app-wide `express.json()`, rather than after it like every other route; `app.js`
has a comment explaining why the order matters here specifically. A verified
event is handed to `handleStripeEvent` in the new `services/stripeWebhook.js`;
anything that event handling throws becomes a 500, so Stripe retries the
delivery instead of it being silently dropped.

`handleStripeEvent` dispatches on `event.type`: `payment_intent.succeeded`
confirms the booking and generates its gate code (`generateGateCode`, new
`services/gateCode.js`, `crypto.randomInt`, never derived from the booking's
id, per the security rules) together with marking the payment `succeeded`,
in one `prisma.$transaction`. `payment_intent.payment_failed` marks the
payment `failed` and leaves the booking `pending`, so the customer can retry
the same payment intent, or it is naturally swept up by the existing hold
expiry once the hold runs out. Any other event type is acknowledged (200)
and otherwise ignored, Stripe's documented expectation for events an
integration does not care about.

Stripe redelivers events, and a booking's payment can already have been
released by `releasePaymentIfPending` if its hold expired or it was
cancelled before the event arrived (see the entry below this one, the
problem that function fixes). Both handlers share one guard,
`isCurrentPendingPayment`: the booking must still be `pending`, it must
still have a payment attached, that payment's `stripePaymentIntentId` must
still be this exact event's payment intent, and that payment must still be
`pending`. A duplicate delivery of an already-processed event, or a genuinely
late event for a row that has since been reclaimed by someone else, both
fail this guard and the handler does nothing, rather than re-confirming a
booking, re-generating a gate code, or confirming the wrong person's
booking.

Tested two ways, continuing the practice from the payment intent step:
`tests/stripeWebhook.test.js` mocks Prisma and drives `handleStripeEvent`
directly through the guard's cases (missing booking, already processed,
reclaimed row, no payment attached, wrong-type events).
`tests/stripeWebhookRoute.test.js` mocks the service instead, and uses the
real Stripe SDK's `Stripe.webhooks.generateTestHeaderString` to sign a real
payload with a real secret and send it through an actual running Express
app, no network call and no API key needed since signing and verifying is
local HMAC; this is the one place mocking the signature check would remove
the exact thing worth proving, so it asserts a correctly signed event is
accepted, a wrong secret and a tampered payload are both rejected with 400,
and a missing signature header is too.

`STRIPE_WEBHOOK_SECRET` is still missing from the project's `.env`, even
though `docs/setup.md` already documented it from an earlier step and the
task named it as already present. It was also missing from `.env.example`,
now added there alongside the other Stripe keys. A real value needs
Stripe's own webhook signing secret, from the Stripe CLI (`stripe listen
--print-secret` while forwarding to the local server) for local testing or
the Dashboard's webhook endpoint page for anything hosted; this was not
invented here and still needs adding to `.env` before any real webhook call
can be verified.

## 2026-10-09: booking confirmation email

Phase 6's last step. `handlePaymentSucceeded` in `stripeWebhook.js` now sends
a confirmation email right after the transaction that confirms the booking,
using the newly added `resend` package (the email provider CLAUDE.md's stack
already named generically, this step just picks it, as the task asked).
`resendClient.js` is a lazy `getResend()` singleton, the same pattern as
`stripeClient.js` and for the same reason: an eager client would force every
unrelated test that imports `app.js` to configure `RESEND_API_KEY` too.

`services/bookingConfirmationEmail.js` has one function,
`sendBookingConfirmationEmail(booking)`, where `booking` already carries its
`user` and `court`, added to the transaction's `booking.update` via
`include` so no extra query is needed. It builds a plain text email, no HTML
template, nothing here calls for one yet. It throws on failure rather than
swallowing it, so the decision of what a failed send means stays with the
caller: `handlePaymentSucceeded` wraps the call in its own try/catch and
only logs, since the booking is already paid and confirmed by the time the
email is attempted, and Stripe would otherwise retry an event that already
succeeded if this were allowed to fail the webhook.

Verified Resend's own SDK behaviour before relying on it, rather than
assuming: `resend.emails.send()` resolves to `{ data, error }` and does not
throw on an API level failure such as a bad key or an invalid address, so
both that `error` and a genuine network failure are handled, not just one of
them.

Two gate code details corrected after the first draft, both now two separate
config constants: the code only opens the gate from outside, there is never
a code needed to leave, and its window is measured from the slot's start
time, not its end, `GATE_CODE_VALID_BEFORE_MINUTES` (20) before start and
`GATE_CODE_VALID_AFTER_MINUTES` (45) after it, the extra time on the late
side is for someone running behind. The code has no usage limit inside that
window, since all four players on a court let themselves in separately,
this is a property of how the code works rather than something the email or
this step needed to enforce.

In development, email sends from `onboarding@resend.dev`, Resend's own
sandbox address, until the project has a real domain verified there; this
is a plain constant in `config.js`, not read from the environment, since
there is nothing to configure yet.

## 2026-10-12: tournament admin UI and fixing tournament status

Last step of Phase 9: the admin UI for tournament management (create a
tournament, register and remove players, generate the next round, enter
scores, see the standings), on top of the Phase 8 backend.

One backend addition was needed: there was no way to list tournaments at
all. Added `listTournaments()` and `GET /tournaments`, admin only, in the
same `tournaments.js` router as the rest of this resource rather than a
separate `adminTournaments.js`, matching how this one resource already
mixes its public and admin routes in one file. Listed newest first, since
the admin only cares about whichever tournament is currently running.

One real bug fixed rather than worked around, raised during review:
`tournament.status` flipped `draft` to `active` on the first round, but
never flipped to `finished`, so the public tournament page and the TV
display were each deriving "finished" themselves from the round count and
completeness instead of trusting the stored status. `recordScore` now
flips the status to `finished` itself, in the same transaction, once the
last score of the tournament's last round comes in. Both pages were
simplified to read `tournament.status === "finished"` directly.

Score entry, the thing done most standing at the court on a phone, uses a
stepper per team instead of typing a number: moving one team's score
always sets the other team's score to the rest of the fixed points total,
so there is only ever one number to adjust and no way to end up with a
total that does not add up.

## 2026-10-12: one Railway service for client and server, not two

Phase 10's first step, deployment. The server now serves the client's
built files itself (`express.static` plus a catch-all that falls back to
`index.html` for anything that is not under `/api`), instead of deploying
the frontend as its own static service alongside the backend.

Two real options existed here, not just one. Railway's own guide for
deploying a plain static Vite SPA needs a Dockerfile and a Caddy config
just to serve files and handle client side routing. Splitting the two
apart would also need a `cors` package (not in CLAUDE.md's stack) and
changing both places the session cookie is set from `sameSite: "lax"` to
`"none"`, which that cookie's own existing comment already shows was
chosen assuming one origin, plus threading an API base URL through every
file under `client/src/api/`. One service avoids all of that for an app
that has no reason to scale the two independently.

The `prisma` CLI package (not `@prisma/client`, already a real dependency
of `server`) moved from the root `package.json`'s devDependencies to
dependencies, since Railway's production install skips devDependencies and
the pre-deploy command needs `npx prisma migrate deploy` to actually find
it.

## 2026-10-14: a court_slots table replaces the unique constraint on (court_id, start_time)

Bookings are now a variable length, any whole number of 30 minute units
from one hour upward, start times move to every 30 minutes, and closing
time depends on the day (22:00 Monday to Friday, 20:00 at the weekend).
The unique constraint on `bookings(court_id, start_time)` was the entire
double booking guarantee up to now, see the 2026-09-02 MySQL decision and
`docs/plan.md`'s old "fixed slot length" note. With a variable length that
stops working: a booking from 18:00 to 20:00 and a booking from 19:00 to
20:00 have different start times, so the constraint accepts both, even
though they overlap.

A new `court_slots` table is the guarantee instead: one row per 30 minute
unit a booking currently occupies, with a composite primary key on
`(court_id, slot_start)`. Creating a booking inserts the booking row and
every unit it covers in one transaction; an overlap with any other
booking, whatever its own start time, fails that insert and rolls back the
whole thing, so no partial rows are ever left behind. Cancelling a
booking, or its hold expiring, deletes its own rows in the same
transaction as the status change, so a freed slot is free again the
instant that commits.

This also removed the stale row reclaim mechanism `createBooking` used to
need: with the old design, a cancelled or expired booking's row stayed in
the table forever at its own `(court_id, start_time)`, status was not part
of the unique index, so a fresh booking for that same slot had to update
the old row in place rather than insert a new one, guarded so only a
genuinely stale row could be taken over. Now that a cancelled or expired
booking's `court_slots` rows are deleted as it happens, there is nothing
stale left to reclaim: the slot is simply free, and a new booking for it
is a plain insert.

`bookings(court_id, start_time)` no longer has a unique constraint at all.
Leaving it in place would have been actively wrong, not just redundant,
for exactly the reason the reclaim mechanism existed: a cancelled booking
keeps its row, with its own original start time, forever. Once its
`court_slots` rows are deleted on cancel instead of reclaimed in place, a
new booking for that same, now genuinely free, start time would still
fail on the old constraint, blocking a slot that `court_slots` itself
says is free. `court_slots` is the only thing enforcing the guarantee
from here on.

## 2026-10-14: the gate code window is now measured from both ends of the booking

The gate code used to be valid from 20 minutes before the booking's start
to 45 minutes after it, measured only from the start, never from the end.
That second number was never a deliberate choice about how long a code
should keep working after arrival; it only happened to be right because
every booking was exactly one hour long, so 45 minutes after the start
landed close enough to the end to go unnoticed. The rule was really "until
a bit after you arrive", written down as if it meant "until a bit after
you leave", and the two were indistinguishable at a fixed length.

Variable length booking made the gap visible: a member on a two hour
booking lost the code 45 minutes in, well over an hour before their
booking actually ended, with no way back in if they stepped outside.

The window is now `[start - 20 minutes, end + 15 minutes]`, derived from
the booking's own start and end every time, so it grows with the booking
instead of stopping at a fixed point. `GATE_CODE_VALID_AFTER_MINUTES` is
renamed `GATE_CODE_VALID_AFTER_END_MINUTES`, to say outright which end of
the booking it is measured from, now that the two no longer coincide.
Everywhere that computed or checked the old window, `gateCodeWindow`
itself, `gateAccess.js`'s own check, `toPublicBooking` and the
confirmation email, now reads both the booking's start and its end.

## 2026-10-14: the hero's 3D ball is desktop only, on purpose

`HeroBall` only renders at `md` (900px) and up, and only when the visitor
has not asked for reduced motion. Below `md` there is no ball and no
placeholder for it, the hero is the heading, the intro line and the Book a
court button on their own.

This is a deliberate choice, not a gap to close later. Two reasons: the
model is a 6.6&nbsp;MB Draco-compressed GLB plus the three.js and
react-three-fiber runtime to render it, real weight to ship to a visitor
who is very likely on mobile data in the evening, for a decorative element
with no function beyond atmosphere; and the layout it needs, a two column
hero with the text on one side and a tall canvas on the other, has no
honest single column equivalent, shrinking the canvas into the stack would
either starve the text of width or push the actual content below the
fold.

Because the ball will never appear below `md`, the mobile hero was
redesigned to work on its own rather than read as the desktop version with
something missing: more vertical room (`pt-16 pb-20` instead of `pt-8
pb-12`), and the heading's own clamp raised (`clamp(2.875rem, 13vw,
6.5rem)`, was `clamp(2.5rem, 12vw, 6.5rem)`) so it carries the page on
mobile width without the ball's visual weight to lean on. Desktop size is
unchanged, both clamps hit the same 6.5rem ceiling well before `md`.

## 2026-10-14: the hero ball is decimated, the high poly source stays in the repo

`ball_compressed.glb` was 6.65 MB and, despite the name, Draco compression
was never the problem: it was already compressing at a normal ~4–6
bytes/vertex. The file was that large because the fuzzy felt surface was
modelled as real geometry, 1,096,107 vertices for what reads, from a normal
viewing distance, as a plain sphere.

The original is kept as `client/src/assets/ball_source_highpoly.glb`, not
loaded by the app, so the source is not lost if it ever needs to be
re-derived differently.

The first attempt used `simplify --ratio 0.05 --error 0.02`, forcing an
exact target of 5% of the vertex count. That target, not the error
threshold, was the problem: to hit an exact count regardless of where the
geometry could actually afford to lose detail, the algorithm over-collapsed
vertices near the seam, producing a visible dent and a lumpy silhouette.
This was invisible in the small preview the decision was first checked in,
and only showed up once judged at the ball's real size on the page, roughly
598×520 CSS px in the hero column at 1440px wide. Caught after shipping,
by rendering it there and actually looking at it, not in a smaller or
scaled-down check.

The fix: drop the forced ratio, `--ratio 0 --error <threshold>`, so the
algorithm stops once it would exceed the allowed shape deviation instead of
chasing a vertex count. Shape first, size second. Error values between
0.005 and 0.02 all collapse to the same ~3,000-vertex floor regardless of
which one is picked, and at that floor the silhouette is visibly faceted,
the same kind of defect as the original dent, only worse. `error 0.002` was
the smallest file that still read as round and clean, checked at the real
hero size, at several rotations, against the un-decimated source.

`client/src/assets/ball_optimized.glb` is what `HeroScene.jsx` actually
loads: 94,981 vertices (down from 1,096,107) in the main mesh, texture
resized from 1024x1024 to 512x512, Draco compressed again, 1.34 MB total,
down from 6.65 MB. A 5x reduction, not the much larger reduction the first,
flawed attempt reached, because shape held the line this time instead of a
target vertex count.

Made with `@gltf-transform/cli`, run with `npx`, not installed as a
dependency, since this is a one-off asset step, not part of the build. The
exact commands, run against a copy of the original file:

```
npx @gltf-transform/cli weld ball_source_highpoly.glb welded.glb
npx @gltf-transform/cli simplify welded.glb simplified.glb --ratio 0 --error 0.002
npx @gltf-transform/cli resize simplified.glb resized.glb --width 512 --height 512
npx @gltf-transform/cli draco resized.glb ball_optimized.glb
```

`weld` merges equivalent vertices first, which the tool's own docs
recommend before simplifying; it has little effect on this particular mesh,
which had few true duplicate vertices to begin with, so it was not the fix
on its own. No change to `HeroScene.jsx`'s lighting was needed: the
decimated model was checked, rendered, under the exact ambient/key/rim
light values already written for the hero, and it still looked right.

## 2026-10-15: home page sunset photo band

The approved redesign plan included a full-bleed photo band on the home
page, under the hero; it was never actually built. Found while checking
where the hero ball's high poly source file lives, not reported by the
user. Built it into `App.jsx`: `client/src/assets/photos/club-at-sunset.jpg`,
a dark-to-transparent scrim gradient over it, and a short heading and line.

The scrim's rgba stops reuse the exact opacities already measured in the
redesign's own palette/type preview: 92% where the heading sits (15.1:1
against the photo there), 70% at the worst case against the brightest sky
pixel in the photo (6.3:1), both AAA. `width`/`height` attributes and
`loading="lazy"` on the `img` prevent layout shift and keep it off the
initial page weight.

## 2026-10-15: checkout page redesign, refund band is dark text on red

Applied the design system to `Checkout.jsx`: full-contrast booking details
and price (numeral treatment), loading/error/blocked states in a bordered
panel instead of bare text, a declined-card error that states what to do
next alongside Stripe's own message, and the refund warning as a solid
band directly above Pay now, in the exact approved wording.

The plan's own wording for the band was "bold chalk text", left over from
an earlier, rejected palette proposal where chalk meant light text. Measured
against the real tokens: light text on the danger red is 2.31:1, fails AA;
dark text on the same red is 7.16:1, AAA. Used dark text, not the plan's
literal wording, since the wording predates the current palette and
following it literally would have shipped illegible text.

## 2026-10-15: account page, muted booking details moved to full contrast

The booking status/price line, the two gate code instructions, and the
refund warning in the cancel confirmation were all `text-text-muted`,
which buried information people need to act on under decorative-label
grey. Moved to full contrast; the refund warning also moved from grey to
`text-danger` with `font-medium`, so it reads as a warning rather than a
footnote, consistent with the Checkout page's refund band.

## 2026-10-15: login and register pages get a filled primary action

`Log in` / `Create account` were outline buttons with the same weight as
`Continue with Google` below them, no visual lead between the two paths.
Changed the form submit button to `btn-primary` (filled) and
`ContinueWithGoogle` to `btn-secondary` (outline), matching the
one-filled-action pattern already used on Booking and Checkout.

## 2026-10-15: admin and tournament pages confirmed, nothing to fix

Final step of the redesign: checked every admin page (Bookings, Courts,
Users, Coupons, Tournaments, Tournament detail) and both public tournament
pages (the live page and the TV display) against the design tokens. None
of them use a raw Tailwind color class or a hardcoded hex value outside
the shared tokens; all were verified live in the browser logged in as a
local test admin account, created for this check and deleted afterwards.
No changes were needed, this was a confirmation pass, not a redesign, as
scoped from the start.

## 2026-10-15: the hero ball's source and licence

The dent reported in the live model turned out to be in the untouched
`ball_source_highpoly.glb` too (see the comparison in the previous ball
entry), so it is a property of the source asset, not of the decimation.
Stopped trying to fix it by re-decimating.

While looking into that, checked where the model actually came from: its
own embedded glTF `asset.extras`, not a guess or a memory of adding it.

- Title: "Tennis Ball"
- Author: Arman.Abgaryan (https://sketchfab.com/Arman.Abgaryan)
- Licence: CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
- Source: https://sketchfab.com/3d-models/tennis-ball-8f1cbc19dc414ad89097eabe063ada88

CC-BY-4.0 permits commercial use and modification, decimation included,
with attribution. The site does not currently credit it anywhere public;
that is a real gap under the licence, not just a nicety, and is separate
from whether to keep using this specific model.

## 2026-10-15: the map's dark filter had to live outside @layer components

`.club-map .leaflet-tile-pane { filter: ... }` and the attribution
control's colours were first added inside `@layer components`, following
every other custom class in main.css. The tile filter worked, since
leaflet.css sets no `filter` of its own to compete with, but the
attribution's background and text colour were silently lost to
leaflet.css's own rules every time, despite a more specific selector.

The reason: Tailwind's CSS layers always lose to unlayered rules,
regardless of selector specificity, and leaflet.css is loaded unlayered.
Moved both rules out of `@layer components` to fix it. The background
also needed matching Leaflet's own selector specificity exactly
(`.leaflet-container .leaflet-control-attribution`, two classes) rather
than just adding `.club-map`, since the two rules were then tied on
specificity and whichever stylesheet the bundler placed last was winning.

## 2026-10-15: crediting the ball model, and checking what else needs it

Added the CC BY 4.0 credit for the ball model to the footer, next to the
copyright line: title, author and licence each linked, plus a note that
the model was simplified for the web, since the licence requires stating
a Modified Version was changed from the original, not just naming it.

Checked every other third-party asset on the site for the same
requirement, rather than assuming the ball was the only one:

- **Leaflet** (BSD-2-Clause): requires the copyright notice be kept in
  redistributed copies of the source or binary. That is satisfied by the
  npm package's own LICENSE file; it does not require an on-page credit
  for using the library in a built site, unlike CC BY's attribution-when-
  displayed requirement.
- **OpenStreetMap tiles** (ODbL): already credited, Leaflet's own
  attribution control on the map itself. Not revisited here.
- **Unbounded and Poppins** (SIL OFL 1.1, confirmed via Google Fonts'
  own licence pages): the attribution requirement is about redistributing
  the font software itself with its licence intact. Linking to Google's
  own hosted stylesheet is not redistribution, Google serves the files
  directly, so no on-page credit is required.
- **The two club photos** (`club-at-sunset.jpg`, `rackets-and-balls.jpg`):
  no embedded metadata of any kind, and the commit that added them calls
  them "supplied club photos", moved out of a folder they had been
  dropped into by mistake. Nothing here said where they actually came
  from, so this was flagged rather than assumed either way. Confirmed
  by the user: the club's own photos, no licence to credit.

With that, every third-party asset on the site has been checked: the ball
is credited, OSM already was, Leaflet and the fonts need no on-page
credit under their own licences, and the photos need none because
they are not third-party at all.

## 2026-10-15: the ball credit removed from the footer again

Removed on request, right after adding it. Flagged first that this
leaves the site out of compliance with CC BY 4.0 while the model stays
in use, same licence that required the credit in the first place. The
user's call to make, confirmed after that: remove the whole line, change
nothing else in the footer.
