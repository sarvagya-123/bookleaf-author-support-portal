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
- There are no default demo passwords in this repository. Create or provision
  accounts in a database you control.

## Deployment

`render.yaml` describes the Express API as a Render web service. Create a
Render Blueprint from the repository and configure its private environment
variables: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_SIGNUP_SECRET`, and optionally
`OPENROUTER_API_KEY`. Set `CLIENT_ORIGINS` to the Vercel frontend origin.

After the API deploys, set `VITE_API_BASE_URL` in the Vercel frontend project's
environment variables to `https://<api-host>/api` and redeploy the frontend.
Never add server credentials to a `VITE_` variable or commit `.env` files.

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

## Validation

```powershell
cd client
npm run lint
npm run build
cd ..\server
npm audit
```

## Known limitations

- A live Supabase connection and deployed API have not been verified from this
  workspace. The Vercel frontend domain needs a separately deployed API unless
  a same-origin API proxy is configured.
- The repository does not include database migration files. The API and seed
  script require the tables/columns already provisioned in PostgreSQL.
- AI quality, real ticket persistence, and cross-account authorization need
  end-to-end verification against a reachable test database.
- Signup currently has no email-verification flow; matching an existing
  author profile by email alone is not proof that the registrant owns that
  address.
- Real-time updates use polling, not WebSockets or server-sent events.
- Rotate any credential previously shared in screenshots; local `.env` files
  are ignored by Git and must remain private.
