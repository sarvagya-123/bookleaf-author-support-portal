# Assignment Completion Status

**Assessment date:** 18 October 2026
**Scope reviewed:** assignment brief, `revamp.md`, current source tree, and QA
evidence from this workspace.

## Latest hosted connection checks (18 October 2026)

These checks were read-only; no hosted settings or database records were
changed.

- The Vercel frontend project is connected to the GitHub repository's `main`
  branch and its current production deployment is **Ready** at commit
  `e1a86a7`. That is the older published version: it shows a sign-in-first UI,
  unlike the current local landing/workspace chooser. Its public JavaScript
  references `http://localhost:5000/api`, not a public API URL.
- The Vercel frontend project has **no environment variables**, including no
  `VITE_API_BASE_URL`. The separate `bookleaf-api` Vercel project has **no
  production deployment** and **no environment variables**. Both its
  `bookleaf-api-ten.vercel.app/api/health` and the frontend's `/api/health`
  return 404. The secondary frontend deployment redirects to Vercel login
  protection.
- Read-only queries in the Supabase SQL Editor confirmed the six expected
  public tables: `authors`, `books`, `users`, `tickets`, `ticket_messages`,
  and `ticket_notes`. Aggregate counts were: 10 authors, 18 books, 3 users,
  2 tickets, 5 ticket messages, and 1 private note. No account details or
  message contents were queried, and no writes were made.
- The Supabase project reports **Healthy**, but shows no connected GitHub
  repository, branches, migrations, or backups. The app's local database
  connection still fails: the configured project reference was mismatched;
  correcting it in memory reached Postgres but authentication failed. Thus
  existing rows are confirmed, but new app writes and end-to-end persistence
  are not.
- The provided public repository is
  `sarvagya-123/bookleaf-author-support-portal`, default branch `main`, with
  latest visible commit `e1a86a7` (“Configure CORS for production frontend”).
  Its `main` tree does not include the current root README, assignment status,
  Render blueprint, environment examples, local landing page, or similar-ticket
  feature. No non-example `.env` file was found in the public tree.
- A clean sync branch, `sync/current-completion-2026-10-18`, was pushed at
  commit `e443cc2` after collaborator access was granted. The workspace folder
  itself remains outside a Git worktree; the branch was prepared in an isolated
  clone. No pull request or merge was created, so `main` and production remain
  unchanged. Private `.env` files and generated build/dependency folders were
  excluded from the push.
- GitHub now grants collaborator access to the publishing account. Actions
  secrets/variables are empty, and public metadata shows no visible Actions
  workflows or GitHub deployments. The repository remains connected to Vercel,
  as shown by the Vercel project source.
- A full hosted end-to-end check is blocked because the live API and database
  are not verified/reachable from this workspace.

## Overall assessment

**The assignment is not fully complete or ready to submit yet.** The main
author/admin experiences, REST API, AI-assisted ticket handling, sample-data
seed script, and an aging-ticket queue signal are implemented. However, this
workspace has not verified the running application against the intended
Supabase database or a deployed API. The public frontend appears stale and
points at a localhost API URL. The assignment requires a working live demo
with pre-seeded data and test credentials. The required one-page approach
write-up is also still missing.

“Implemented” below means code/UI is present; it does not imply successful
production deployment or verification against the live database.

## Assignment requirements

| Requirement | Status | Evidence and remaining work |
| --- | --- | --- |
| Author sign-in and account creation | **Implemented; database verification pending** | Email/password login and signup are wired to API-backed accounts. Signup links an unlinked author record by email or creates a profile. Auth behavior has been smoke-tested with an isolated database stub, not Supabase. There is no email ownership verification, so linking a seeded profile by email alone needs a production-safe verification decision. |
| Author sees only their own records | **Implemented; live isolation test pending** | Book queries and ticket queries/messages are scoped to the signed-in author in the API. Role/ownership checks have had local smoke coverage, but must be exercised with two real database accounts before claiming end-to-end verified. |
| Books and royalty details | **Implemented; live data pending** | Book list/detail and royalty summary/breakdown API/UI are present for title, ISBN, genre, publication date, status, MRP, sales, and royalty figures. Verify all supplied records, production statuses, zero royalties, and calculations against the seeded database. |
| Submit a support query | **Implemented** | Author can select an owned book or submit a general/account-level query, with subject and description. Attachment selection is UI-only, as allowed by the brief; actual upload is not implemented. |
| My Tickets and admin responses | **Implemented; end-to-end test pending** | Ticket list, original query, conversation, reply submission, and status display are implemented. The author client polls for updates every 15 seconds. Verify create → admin reply → author sees reply/status against the real database. |
| Admin ticket queue and filters | **Implemented** | Admin queue supports status, category, priority, date, search, and urgency/age ordering. Admin UI was browser-smoke-tested with sample/mock tickets; real API/database behavior remains unverified. |
| Automatic AI category and priority | **Implemented with fallback; live AI behavior pending** | New ticket creation calls classification and validates the returned category/priority. Missing/unavailable AI uses a fallback so ticket creation can continue. Verify provider responses, timeouts/rate limits, and ticket persistence. |
| Admin override of AI classification/priority | **Implemented** | Admin can review and apply suggestions and manually change category/priority. AI request body shape was corrected and the client lint/build pass; the complete browser flow against a running API was not conclusively verified. |
| AI-drafted response from BookLeaf knowledge base | **Partially implemented** | The AI service includes the supplied policy knowledge base, prompt guidance, and fallback reply; admins can request a draft and edit it. The draft is generated on demand using a button, rather than being automatically presented when opening a ticket as the brief describes. Verify the provider output against the sample-query expectations and confirm the draft UI/API round trip. |
| Ticket status, private notes, assignment | **Implemented; database verification pending** | Admin API/UI supports status management, private notes, and assignment to the current admin. Verify notes are never returned to authors and all updates persist. |
| REST API, auth, roles, validation, errors | **Implemented; live authorization QA pending** | Express routes, JWT authentication, role checks, ownership scoping, input validation, and JSON error responses are present. The README documents the main API surface, but should be reconciled against every route/method before submission. |
| AI key security and failure handling | **Implemented; deployment configuration pending** | AI key is server-side environment configuration; AI service has fallback behavior. Keep all secrets out of client build variables and configure private values only in the deployed API environment. |
| Cost awareness and model choice documentation | **Partially documented** | Calls are limited to ticket details plus the relevant knowledge-base prompt rather than a full ticket history. The README does not yet explain why the selected OpenRouter model/provider was chosen, expected cost/token strategy, or rate-limit controls. Add this explanation and validate current model availability. |
| Provided sample dataset (10 authors, 18 books) | **Expected row counts confirmed; exact records not inspected** | Read-only Supabase aggregate counts show 10 authors and 18 books, matching the assignment dataset size. The seed script is present, but the exact sample records and their linkage/contents were intentionally not inspected. |
| Admin UI revamp and standout features | **Implemented locally** | Admin queue/detail workflow has been revamped. Aging triage highlights unresolved tickets aged 48+ hours. Similar-ticket intelligence now surfaces up to three heuristic matches using shared subject/description terms and category, with clear match reasons and one-click navigation; it never auto-merges records. UI behavior has been exercised using mock ticket data. |
| Deployment and accessible live demo | **Not complete; production API is unavailable** | Vercel frontend serves an older build pointing to localhost for its API. No `VITE_API_BASE_URL` is configured. The separate API Vercel project has no production deployment or environment variables; public health endpoints return 404. `render.yaml` is only a deployment blueprint. |
| Source repository and collaborator access | **Current work pushed to a feature branch; merge pending** | Current source is published on `sync/current-completion-2026-10-18` at `e443cc2`; `main` is unchanged and still behind. Collaborator access was granted to the publishing account. Review and merge the branch before expecting a production Vercel update. |
| README and API documentation | **Partially complete** | Root README now covers local setup, deployment instructions, accounts, a main endpoint table, validation, and known limitations. Before submission, verify the endpoint table against all mounted routes, add architecture rationale and AI prompt/error/cost/model details, and include the live demo URL and test credentials after provisioning them. |
| Brief approach write-up (maximum one page) | **Not completed** | Create a separate concise write-up describing priorities, trade-offs, and a production evolution plan. |
| Full QA | **Partially complete; hosted E2E blocked** | Client lint/build, server syntax, dependency audit, selected API stub checks, local UI smoke checks, and read-only Supabase table/count checks passed. The app's configured database connection still fails authentication. Vercel has no production API deployment and health endpoints return 404, preventing a hosted end-to-end test. |

## `revamp.md` phase check

| Planned phase | Status | Notes |
| --- | --- | --- |
| Audit current submission | **Substantially complete** | The key gaps and deployment/database limitations are identified. Final audit evidence still depends on live database and deployed app access. |
| Fix authentication and database persistence | **Code implemented; existing rows confirmed, app writes unverified** | Author/admin signup and login paths and database writes are implemented. The Supabase schema and aggregate row counts are confirmed read-only, but the app's own database connection fails authentication, so new signup persistence, seeded-profile linking, and cross-author isolation remain unverified. |
| Revamp admin experience | **Implemented locally** | Queue filtering, ticket details, admin operations, aging metric/filter, and ticket-age/assignment visibility are present. |
| Add one standout feature | **Implemented locally** | The unresolved-over-48-hours aging triage metric/filter was added. |
| QA, deployment, submission readiness | **In progress; hosted deployment needs repair** | Local checks passed. The public frontend appears stale and configured for localhost API; its health path returns 404. Database access, live demo credentials, source repository handoff, final README details, and one-page write-up remain. |

## Remaining work, in recommended order

1. **Restore and verify application database access.** The expected tables and aggregate rows exist in Supabase. Correct the private `DATABASE_URL` credentials in the ignored local environment (do not put secrets in this document or source control), then verify the app connects. Do not rerun the seed script unless the exact records have first been checked and a duplicate-safe seed is needed.
2. **Run real database flows.** Create/sign in as two authors and an admin; verify author ownership boundaries, create a ticket, admin classification/override/status/assignment/note/reply, and author-visible updates. Confirm private notes are inaccessible to authors and test production books/zero royalties.
3. **Repair and complete deployment.** Fix the Supabase connection and confirm schema. Deploy the API with private server variables (Render blueprint or correctly configured serverless API), set frontend `VITE_API_BASE_URL` to that public API (never localhost), configure CORS, and redeploy the current frontend. Verify health and login/ticket flows.
4. **Prepare the submission.** Publish the current local changes to the public repository using a proper Git worktree, confirm collaborator access, seed the live demo with the exact 10 authors and 18 books, and add working author/admin test credentials to the README without exposing secrets.
5. **Finish documentation.** Add the missing one-page approach write-up. Expand README with architecture decisions, AI model/provider rationale, prompt strategy, fallback/rate-limit behavior, and cost/token considerations; reconcile endpoint docs with the mounted API routes.
6. **Close AI acceptance gaps.** Decide whether to change the UI so an AI draft is presented automatically when an admin opens a ticket, as the brief requests; otherwise document the on-demand behavior as an intentional trade-off. Verify the chosen model/provider and sample-query quality.
7. **Repeat QA on the deployed app.** Exercise author/admin end-to-end journeys, errors and empty states, responsive layouts, and 15-second near-real-time updates using the deployed API and database.

## Verification boundary

The passed local checks establish that the client builds/lints and that selected
API behavior works with a stubbed database. They do **not** establish that the
Supabase schema matches, accounts or tickets persist in the target database,
the seed was applied there, the AI provider is operational, or the Vercel
frontend is connected to a deployed backend. Treat those items as incomplete
until verified.
