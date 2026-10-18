# BookLeaf Author Support & Communication Portal

A React/Vite author workspace and Express/PostgreSQL API for BookLeaf books,
royalties, support tickets, and admin ticket operations.

## Local setup

Requirements: Node.js 20.19+ (or 22.12+) and npm. PostgreSQL/Supabase is
required for account and ticket data.

1. Configure `server/.env` using `server/.env.example`. Set `DATABASE_URL`,
   `JWT_SECRET`, and `ADMIN_SIGNUP_SECRET`. `OPENROUTER_API_KEY` is optional;
   AI classification and reply drafting return fallback results if it is
   missing or the provider is unavailable.
2. Install and run the API in one terminal:

   ```powershell
   cd server
   npm ci
   npm run dev
   ```

3. Install and run the client in a second terminal:

   ```powershell
   cd client
   npm ci
   Copy-Item .env.example .env
   npm run dev
   ```

The client defaults to `http://localhost:5000/api` in development. Verify the
API at `http://localhost:5000/api/health`.

The database must have the `users`, `authors`, `books`, `tickets`,
`ticket_messages`, and `ticket_notes` tables used by the API. `server/seed.js`
imports/updates the provided 10-author, 18-book sample dataset into the
existing schema. Review the script before running it against any database with
non-sample production data.

## Accounts

- Author signup uses email and password. If the email matches an unlinked
  sample author record, the new user is linked to that record; otherwise a new
  author profile is created. Email ownership is not verified with an OTP or
  confirmation link, so deployments should add verification before relying on
  email matching to link existing profiles.
- Admin signup is invitation-protected by `ADMIN_SIGNUP_SECRET`. Do not expose
  this value in Vite variables. For an initial admin account, set
  `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the server environment and run
  `node check-user.js` from the `server` directory.
- Public demo accounts:

  | Portal | Email | Password | Demo access |
  | --- | --- | --- | --- |
  | Author | `rohit.kapoor@email.com` | `hyvraQ-UaChuV6uul4sajY7a` | Explore seeded books and royalties; create support tickets and reply |
  | Admin | `demo.admin@bookleaf-demo.com` | `XKp25jbvF-auDM1eOngrJ-jC` | Manage tickets for the demo author and use AI assistance |

  The demo admin is restricted to the demo author's tickets: it can update
  their statuses, categories, and priorities; assign them; and send replies or
  internal notes. It cannot read or modify other authors' tickets. The demo
  author may manage their own books and tickets.

## Deployment

The current production frontend is
`https://bookleaf-author-support-portal-one.vercel.app`; its API is
`https://bookleaf-api-ten.vercel.app`. The Vercel projects deploy from `main`.
Set the API project's private `DATABASE_URL`, `JWT_SECRET`,
`ADMIN_SIGNUP_SECRET`, and (if enabling provider-backed AI)
`OPENROUTER_API_KEY` variables. Set the frontend's `VITE_API_BASE_URL` to
`https://bookleaf-api-ten.vercel.app/api`. Redeploy after changing environment
variables. Never put server credentials in a `VITE_` variable or commit `.env`
files.

The API falls back to deterministic, clearly labeled drafts and classification
when the OpenRouter key is absent or the provider fails. `OPENROUTER_API_KEY`
is configured in the API project's Vercel Production environment. After a
Production redeploy on 18 October 2026, hosted checks confirmed provider-backed
draft generation and classification. The fallback remains available if the
provider is unavailable.

## API overview

All API paths below are prefixed with `/api`. Protected endpoints use
`Authorization: Bearer <JWT>`. Admin-only endpoints require an admin account;
author book and ticket data are scoped to the signed-in author.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | Public | API health check |
| POST | `/auth/register` | Public | Register an author and link/create its author profile |
| POST | `/auth/register-admin` | Admin invitation | Create an admin using `ADMIN_SIGNUP_SECRET` |
| POST | `/auth/login` | Public | Authenticate an author or admin |
| POST | `/auth/verify` | Public | Validate a token and active account |
| POST | `/auth/logout` | Public | Client logout acknowledgement; clear the client token |
| GET | `/books` | Author | List the signed-in author's books |
| GET | `/books/:id` | Author | Read one owned book |
| GET | `/books/royalties/summary` | Author | Read royalty totals |
| GET | `/books/royalties/breakdown` | Author | Read per-book royalty totals |
| GET | `/books/search/:query` | Author | Search the author's books |
| POST | `/books` | Author | Create an owned draft book |
| PUT | `/books/:id` | Author | Update details on an owned book |
| DELETE | `/books/:id` | Author | Delete an owned draft only if it has no sales or earned royalties |
| POST | `/tickets` | Author | Create and AI-classify a support ticket |
| GET | `/tickets?limit=3` | Author/admin | List owned tickets; admins can list all |
| GET | `/tickets/:id` | Owner/admin | Read a ticket |
| GET | `/tickets/:id/messages` | Owner/admin | Read ticket conversation |
| POST | `/tickets/:id/messages` | Author | Add a message to an open owned ticket |
| PUT | `/tickets/:id` | Admin | Update status, priority, or assignment |
| POST | `/tickets/:id/close` | Admin | Close a ticket |
| GET | `/admin/tickets` | Admin | List/filter the operations queue |
| PATCH | `/admin/tickets/:ticketId` | Admin | Update status, priority, or category |
| PATCH | `/admin/tickets/:ticketId/assign` | Admin | Assign ticket to the signed-in admin |
| POST | `/admin/tickets/:ticketId/replies` | Admin | Send a public reply |
| GET/POST | `/admin/tickets/:ticketId/notes` | Admin | Read/write private ticket notes |
| POST | `/ai/classify` | Admin | Generate category and priority suggestions |
| POST | `/ai/draft-reply` | Admin | Draft a knowledge-base-guided response |

The client polls the admin queue and an author's open ticket conversation every
15 seconds for near-real-time updates. The admin workspace also surfaces up to
three related tickets using an explainable keyword/category heuristic; it is a
review aid, not an AI decision or automatic duplicate merge. File attachments
are currently a UI selection only and are not uploaded.

## Architecture and AI approach

The React/Vite client talks to an Express API; PostgreSQL/Supabase stores
accounts, author profiles, books, royalty data, tickets, replies, and private
notes. JWT role checks protect admin actions, while author queries are scoped
through the linked author profile. Ticket conversations are polled rather than
kept on a persistent connection.

Ticket classification and reply drafting use OpenRouter's
`nvidia/nemotron-3-super-120b-a12b:free` route when configured. Prompts include
the relevant ticket fields and a compact BookLeaf policy knowledge base. The
route is currently listed by OpenRouter at zero prompt/completion pricing; it
was chosen for a useful context window and provider-backed text quality without
per-token charges. OpenRouter's free-model availability and limits can change.
The API key must be configured only on the server. The model is asked to return
a fixed classification schema or a concise,
empathetic draft with a clear next step; drafts are reviewed and edited by an
admin and are never sent automatically. Opening a ticket requests a draft;
the admin can regenerate it. If the provider is unavailable, fallback output
is labeled as such. An author's selected issue category is retained while the
fallback supplies the default priority.

Generation is capped at 400 tokens for classification and 1,000 for a draft.
The app currently has no application-level AI rate limiter or usage budget;
production use should add per-account throttling, provider usage monitoring,
and a spend/availability alert before enabling a paid model.

## Validation

```powershell
cd client
npm run lint
npm run build
cd ..\server
npm audit
```

## Known limitations

- The repository does not include database migration files. The API and seed
  script require the tables/columns already provisioned in PostgreSQL.
- Signup currently has no email-verification flow; matching an existing
  author profile by email alone is not proof that the registrant owns that
  address.
- Real-time updates use polling, not WebSockets or server-sent events.
- Attachments are only selected in the UI; upload/storage is not implemented.
- The sample JSON and current Supabase data share all 10 author IDs, 18 book
  IDs, all author-book links, and every data field as of 18 October 2026.
  `server/seed.js` upserts the assignment data; rerunning it will overwrite
  later changes to those sample author and book records.
- Rotate any credential previously shared in screenshots; local `.env` files
  are ignored by Git and must remain private.
