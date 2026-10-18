# BookLeaf Author Support & Communication Portal

A two-role web portal for BookLeaf authors and support administrators. Authors
can review their books and royalties, submit support tickets, and follow ticket
conversations. Administrators can triage and manage the support queue, use
knowledge-base-guided AI suggestions, and communicate with authors.

## Live application

- **Author and admin portal:** https://bookleaf-author-support-portal-one.vercel.app
- **API health:** https://bookleaf-api-ten.vercel.app/api/health
- **Source:** https://github.com/sarvagya-123/bookleaf-author-support-portal

### Demo accounts

| Role | Email | Password | Scope |
| --- | --- | --- | --- |
| Author | `rohit.kapoor@email.com` | `hyvraQ-UaChuV6uul4sajY7a` | Seeded author workspace; manage own books and tickets |
| Admin | `demo.admin@bookleaf-demo.com` | `XKp25jbvF-auDM1eOngrJ-jC` | Manage support tickets for the demo author |

The public demo admin is intentionally scoped to author `AUTH002`: it can read
and manage that author's tickets, but not other authors' tickets. The author
demo account is linked to the seeded author profile. These are public demo
credentials, not private production administrator credentials.

### Reviewer test data

Both credentials above were verified against the live API. The author demo
opens the seeded `AUTH002` profile, which currently has two sample books and
one support ticket. The admin demo sees that ticket in its queue and can
exercise status/priority/category updates, assignment, public replies, and
private notes. Its data access remains restricted to `AUTH002`.

To test the portals, open the live URL, choose the matching workspace, select
**Sign in**, and use the corresponding email/password from the table. The
public author account is writable, so changes made during a review may remain
in its demo profile. The assignment dataset itself contains 10 sample authors
and 18 sample books. Seven of the other sample author profiles are currently
unlinked and can be linked through author signup using their corresponding
email addresses.

## Assignment coverage

### Author workspace

- Email/password signup and login with role-aware access.
- Author-scoped book catalogue including ISBN, genre, publication status, MRP,
  copies sold, earned/paid/pending royalties, and publication information.
- Royalty summary and per-book breakdown.
- Draft book creation, editing, and deletion when the draft has no sales or
  earned royalties.
- Support ticket submission with subject, description, category, and optional
  related book.
- Ticket status and conversation view, with the ability to reply while a ticket
  is open.
- Book and ticket empty states for newly registered accounts.

### Admin workspace

- Ticket queue with status, category, priority, and creation-date filters,
  urgency-first sorting, and an unresolved-over-48-hours indicator.
- Ticket status, category, and priority updates; assignment to the signed-in
  admin; public replies; and private internal notes.
- AI classification suggestions that admins review and apply or override.
- A knowledge-base-guided reply draft when a ticket is opened. Admins can edit
  the draft before sending it; drafts are never sent automatically.
- Similar-ticket suggestions based on transparent keyword/category matching.
  These are review aids and do not merge or change tickets.
- The demo admin's queue and ticket reads/writes are restricted server-side to
  author `AUTH002`.

## Technology and architecture

| Layer | Implementation |
| --- | --- |
| Frontend | React 19, Vite 8, JavaScript, CSS |
| API | Node.js, Express 5, REST |
| Database | PostgreSQL through the `pg` driver; production data is hosted on Supabase |
| Authentication | Password hashing with `bcryptjs`; signed JWT bearer tokens |
| AI provider | OpenRouter API, accessed through the OpenAI-compatible Node client |
| Hosting | Vercel frontend and API projects, deployed from `main` |

The client calls the Express API under `/api`. The API reads and writes
PostgreSQL records for users, authors, books, tickets, messages, and private
notes. JWT authentication reloads the active user from the database. Role
middleware limits admin routes, and author queries filter through the signed-in
user's linked author profile. The demo-admin restriction is enforced by the API,
not only by the user interface.

Ticket updates use polling at approximately 15-second intervals for
near-real-time behavior. The app does not currently use WebSockets or
server-sent events.

## Local development

### Requirements

- Node.js 20.19+ or 22.12+
- npm
- A PostgreSQL database with the schema described below

### Configure the API

From the repository root, copy `server/.env.example` to `server/.env` and set
the values for your development environment:

```dotenv
PORT=5000
NODE_ENV=development
CLIENT_ORIGINS=http://localhost:5173
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
JWT_SECRET=use-a-long-random-secret
ADMIN_SIGNUP_SECRET=use-a-different-random-invitation-secret
OPENROUTER_API_KEY=
```

`DATABASE_URL`, `JWT_SECRET`, and `ADMIN_SIGNUP_SECRET` are required for a
complete local setup. `OPENROUTER_API_KEY` is optional; AI requests use
fallback behavior when it is not configured. Never commit `.env` files or put
server secrets in a `VITE_` variable.

Install and start the API:

```powershell
cd server
npm ci
npm run dev
```

The API runs on `http://localhost:5000` by default. Its health endpoint is
`http://localhost:5000/api/health`.

### Configure the frontend

In a second terminal:

```powershell
cd client
npm ci
Copy-Item .env.example .env
npm run dev
```

The development client uses `VITE_API_BASE_URL=http://localhost:5000/api` and
is served by Vite, typically at `http://localhost:5173`.

### Database and sample data

The API expects the following tables and their application columns to exist:
`users`, `authors`, `books`, `tickets`, `ticket_messages`, and `ticket_notes`.
This repository does not contain database migrations; provision the schema
before starting the app. The database connection must be PostgreSQL-compatible.

`server/data/bookleaf_sample_data.json` contains the assignment's 10 authors
and 18 books. To import them into the configured database:

```powershell
cd server
node seed.js
```

The seed script runs in a transaction and upserts records by author/book ID.
It overwrites the matching sample author and book fields with the supplied
assignment values. Review it and take a backup before running it against a
database with later edits or non-demo data.

## Authentication and account behavior

- Author signup creates an account and either links an unlinked author record
  with the same email address or creates a new author profile.
- Email ownership is not verified. Do not use email matching to grant access
  to an existing author's private profile in a production deployment until an
  email-verification flow is added.
- Passwords are hashed before database storage. Successful login issues a
  signed JWT with a seven-day expiry. The client stores the token in browser
  local storage and sends it as `Authorization: Bearer <token>`.
- Admin signup is protected by `ADMIN_SIGNUP_SECRET`, which must only be
  configured on the API server. Admin signup returns a forbidden/service
  unavailable response if the invitation is absent or invalid.
- For an initial administrator, the API also supports the configured
  `ADMIN_EMAIL`/`ADMIN_PASSWORD` bootstrap through `server/check-user.js`.

## AI design and operational behavior

AI capabilities are part of the assignment's support workflow:

1. **Classification:** when a ticket is submitted, the API asks the configured
   model for one allowed category, one priority (`Critical`, `High`, `Medium`,
   or `Low`), and a short reason. An author-selected category takes precedence;
   the model or fallback supplies the priority. Administrators can request a
   new suggestion and choose whether to apply it.
2. **Reply drafting:** opening a ticket requests a draft using the ticket
   subject, description, category, priority, author/book context, and a compact
   BookLeaf policy knowledge base. The prompt asks for an empathetic,
   professional response, prohibits inventing exact account data, and asks the
   model to provide a clear next step. Drafts are editable and require an admin
   to send them.
3. **Provider and model:** the backend uses OpenRouter's
   `nvidia/nemotron-3-super-120b-a12b:free` route through its OpenAI-compatible
   API. It was selected for its context window and zero listed token pricing
   during hosted assignment testing. Model availability, rate limits, and
   pricing can change independently of this repository.
4. **Graceful degradation:** if the key is absent, the provider errors, the
   draft is empty, or classification output is invalid, the API returns
   fallback content or a safe default classification. Ticket creation does
   not depend on a successful provider response. The admin can edit and send a
   reply manually.
5. **Token/cost controls:** classification is capped at 400 output tokens and
   draft generation at 1,000. Prompts include the current ticket context and
   concise policy facts rather than a full conversation history. The app has
   no application-level per-user AI rate limit, usage budget, or spend alert;
   add these before enabling a paid provider model for wider production use.

`OPENROUTER_API_KEY` is a server-side secret. Do not prefix it with `VITE_`,
include it in browser code, or commit it.

## REST API

All routes below are prefixed with `/api`. Unless marked public, send:

```http
Authorization: Bearer <jwt>
Content-Type: application/json
```

### Authentication

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/health` | Public | API health and timestamp |
| POST | `/auth/register` | Public | Create an author account and profile |
| POST | `/auth/register-admin` | Public, invitation required | Create an admin using `inviteCode` |
| POST | `/auth/login` | Public | Authenticate author/admin and issue JWT |
| POST | `/auth/verify` | Public | Verify token and active account |
| POST | `/auth/logout` | Public | Acknowledge logout; the client must clear its token |

### Author books and royalties

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/books` | Author | List the signed-in author's books |
| GET | `/books/:id` | Author | Read one owned book |
| GET | `/books/search/:query` | Author | Search owned books by title, ISBN, or genre |
| GET | `/books/royalties/summary` | Author | Aggregate earned, paid, and pending royalties |
| GET | `/books/royalties/breakdown` | Author | Per-book royalty data and totals |
| POST | `/books` | Author | Create a draft book |
| PUT | `/books/:id` | Author | Update an owned book |
| DELETE | `/books/:id` | Author | Delete an owned, unsold draft with no earned royalties |

### Tickets and conversations

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/tickets?limit=50` | Author/admin | List tickets; authors see their own, admins see their queue |
| POST | `/tickets` | Author | Create a ticket and opening message; attempts classification |
| GET | `/tickets/:id` | Owner/admin | Read an accessible ticket |
| GET | `/tickets/:id/messages` | Owner/admin | Read an accessible conversation |
| POST | `/tickets/:id/messages` | Author | Reply to an open ticket owned by the author |
| PUT | `/tickets/:id` | Admin | Update status, priority, and/or assignment |
| POST | `/tickets/:id/close` | Admin | Close an accessible ticket |

Ticket creation accepts `subject`, `message`, optional `bookId`, and optional
`category`. The related book, when supplied, must belong to the signed-in
author.

### Admin queue and ticket operations

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/admin/tickets` | Admin | Filter by `status`, `category`, `priority`, and `from_date` |
| PATCH | `/admin/tickets/:ticketId` | Admin | Update status, priority, and/or category |
| PATCH | `/admin/tickets/:ticketId/assign` | Admin | Assign ticket to the signed-in admin |
| POST | `/admin/tickets/:ticketId/replies` | Admin | Add a public author-visible reply |
| GET | `/admin/tickets/:ticketId/notes` | Admin | Read private notes |
| POST | `/admin/tickets/:ticketId/notes` | Admin | Add a private note |

For demo admin requests, ticket reads and mutations in these routes and the
generic ticket update/close endpoints are restricted to `AUTH002` tickets.
Requests for tickets outside this scope return 404.

### AI assistance

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/ai/classify` | Admin | Suggest category, priority, and reason for `{ "ticket": { "subject": "...", "description": "..." } }` |
| POST | `/ai/draft-reply` | Admin | Return a draft and its source for the same ticket shape |

Errors use JSON responses with a `success: false` field and a message. Common
responses include 400 for invalid input, 401 for missing/invalid authentication,
403 for an unsupported role or invitation, 404 for an inaccessible/missing
record, and 500 for server/database failures.

## Deployment

The frontend and API are separate Vercel projects connected to this GitHub
repository and deploy from `main`.

Configure the API project's server-side environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_SIGNUP_SECRET`
- `OPENROUTER_API_KEY` (optional; enables provider-backed AI)
- `PORT` (provided by the hosting platform when applicable)
- `CLIENT_ORIGINS` (optional comma-separated browser origins)

Configure the frontend project's `VITE_API_BASE_URL` as:

```text
https://bookleaf-api-ten.vercel.app/api
```

Redeploy after changing environment variables. Only public configuration such
as the API URL belongs in `VITE_` variables. Keep database, JWT, invitation,
and provider credentials private and server-side.

## Validation and hosted checks

Run frontend quality checks from the client directory:

```powershell
npm run lint
npm run build
```

Check the backend JavaScript syntax from the server directory:

```powershell
node --check server.js
node --check routes/auth.routes.js
node --check routes/books.routes.js
node --check routes/tickets.routes.js
node --check routes/admin.routes.js
node --check routes/ai.routes.js
```

The repository does not currently include an automated unit, API integration,
or browser test suite. Hosted acceptance checks have exercised author/admin
login, signup persistence, book and royalty reads, draft CRUD, ticket
creation/replies/status/assignment/notes, AI fallback/provider behavior, role
checks, and demo-admin scope. Temporary acceptance-test records were removed
after testing. The Supabase sample author/book records were compared
field-by-field with the checked-in assignment JSON on 18 October 2026; all 10
sample authors and 18 books matched. The live database also contains accounts
created for testing beyond the 10 sample author profiles, so aggregate author
and user counts can exceed the assignment dataset. At the latest verification,
the database contained 11 author profiles, 18 books, 7 users, 3 tickets,
6 messages, and 2 notes.

See [APPROACH.md](./APPROACH.md) for the one-page implementation approach and
[ASSIGNMENT_STATUS.md](./ASSIGNMENT_STATUS.md) for hosted QA and dataset
verification notes.

## Known limitations and next steps

- **Email verification:** signup does not prove email ownership. Add a
  time-limited verification flow before linking signups to existing author
  records.
- **Attachments:** file selection is present in the form, but files are not
  uploaded or stored.
- **Database provisioning:** migrations and schema-version management are not
  included; the target PostgreSQL schema must already exist.
- **Live updates:** ticket refresh is polling-based, not push-based.
- **AI operations:** no app-level rate limiting, usage budget, or spend alert is
  implemented. The free model/provider may change availability or terms.
- **Session storage:** bearer tokens are stored in local storage rather than an
  HttpOnly cookie.
- **Automated coverage:** add repeatable API and browser tests against a
  disposable test database.
- **Operations:** add structured logs, monitoring, backup/restore procedures,
  and provider/database health alerts before scaling to production traffic.

## Implementation approach

The project prioritizes the end-to-end author support workflow: scoped account
access, a useful author view of books and royalties, a ticket conversation,
admin triage, and a human-reviewed response. React/Vite and Express/PostgreSQL
provide a straightforward separation between the browser UI, API, and data
layer. Polling was chosen for near-real-time updates within the assignment
scope; private admin notes and public replies are stored separately so that
internal context is not exposed in the author conversation. AI suggestions are
bounded and reviewable, while deterministic fallback behavior keeps ticket
handling available during provider outages.
