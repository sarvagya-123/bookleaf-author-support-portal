# Assignment Completion Status

**Assessment date:** 18 October 2026
**Scope reviewed:** assignment brief, `revamp.md`, current source tree, and QA
evidence from this workspace.

## Latest hosted connection checks (18 October 2026)

Hosted dashboard and SQL Editor checks below were read-only. A separate,
approved local API end-to-end test later created uniquely labeled temporary QA
accounts and a ticket, then removed those exact rows and confirmed all six
aggregate counts returned to their original values.

- The `bookleaf-api` Vercel Production deployment is **Ready** at commit
  `27dedf8` on `main`, at `https://bookleaf-api-ten.vercel.app`. Its production
  `DATABASE_URL`, `JWT_SECRET`, and `ADMIN_SIGNUP_SECRET` are configured as
  secrets. The public `/api/health` endpoint returned HTTP 200. A non-existent
  account login returned the expected HTTP 401, confirming a database-backed
  lookup without changing data.
- The frontend Vercel Production deployment is **Ready** at commit `27dedf8`
  on `main`, at `https://bookleaf-author-support-portal-one.vercel.app`.
  `VITE_API_BASE_URL` is configured for Production as
  `https://bookleaf-api-ten.vercel.app/api`. The landing page and author
  sign-in screen loaded. From the frontend origin, API health returned HTTP
  200, missing login fields returned HTTP 400, and a non-existent account
  returned HTTP 401. The production CORS preflight allowed the frontend origin.
  No hosted account, ticket, or other persistent test data was created.
- Read-only queries in the Supabase SQL Editor confirmed the six expected
  public tables: `authors`, `books`, `users`, `tickets`, `ticket_messages`,
  and `ticket_notes`. Aggregate counts were: 10 authors, 18 books, 3 users,
  2 tickets, 5 ticket messages, and 1 private note. A read-only query using
  the app's corrected local `DATABASE_URL` also connected successfully and
  returned the same counts. No account details or message contents were
  queried, and no writes were made.
- The Supabase project reports **Healthy**, but shows no connected GitHub
  repository, branches, migrations, or backups. The local app connection was
  restored after correcting the project reference and updating the private
  password in ignored `server/.env`. Existing rows are confirmed, but new app
  writes and end-to-end persistence have not been tested.
- The provided public repository is
  `sarvagya-123/bookleaf-author-support-portal`, default branch `main`, now at
  commit `27dedf8` (“Record local Supabase end-to-end QA results”). The current
  completion branch was fast-forwarded into `main` after authorization.
  Private `.env` files and generated build/dependency folders were excluded
  from the push.
- GitHub now grants collaborator access to the publishing account. Actions
  secrets/variables are empty, and public metadata shows no visible Actions
  workflows or GitHub deployments. The repository remains connected to Vercel,
  as shown by the Vercel project source.
- Hosted health, CORS, frontend loading, and non-mutating authentication
  validation have been checked. Authenticated author/admin browser workflows,
  hosted ticket writes, live AI-provider behavior, and responsive/empty/error
  states still need end-to-end QA.

## Overall assessment

**The assignment is not fully complete or ready to submit yet.** The main
author/admin experiences, REST API, AI-assisted ticket handling, sample-data
seed script, and an aging-ticket queue signal are implemented. The intended
Supabase schema, aggregate data counts, and core local app write/read flows
are verified. The public frontend appears stale and points at a localhost API URL.
The assignment now has working Production frontend and API deployments. It
still needs authenticated live-demo QA and test credentials, and the required
one-page approach write-up is missing.

“Implemented” below means code/UI is present; it does not imply successful
production deployment or verification against the live database.

## Assignment requirements

| Requirement | Status | Evidence and remaining work |
| --- | --- | --- |
| Author sign-in and account creation | **Locally verified against Supabase** | A temporary author was registered, logged in, token-verified, and then removed; aggregate counts were restored. Signup has no email ownership verification, so linking a seeded profile by email alone needs a production-safe verification decision. |
| Author sees only their own records | **Locally verified against Supabase** | Two temporary author accounts confirmed ticket list scoping and that one author receives 404 when requesting the other author's ticket or conversation. Test accounts and ticket were removed. Production-session/browser UX remains unverified. |
| Books and royalty details | **Implemented; live data pending** | Book list/detail and royalty summary/breakdown API/UI are present for title, ISBN, genre, publication date, status, MRP, sales, and royalty figures. Verify all supplied records, production statuses, zero royalties, and calculations against the seeded database. |
| Submit a support query | **Implemented** | Author can select an owned book or submit a general/account-level query, with subject and description. Attachment selection is UI-only, as allowed by the brief; actual upload is not implemented. |
| My Tickets and admin responses | **API end-to-end verified; browser flow pending** | Ticket creation, author/admin conversation reads, admin reply, and author follow-up were exercised against Supabase. The author client polls every 15 seconds; verify the visible browser flow and status refresh. |
| Admin ticket queue and filters | **API workflow verified; browser behavior smoke-tested** | API queue access and status/category/priority updates were tested against Supabase. UI queue filters and details were browser-smoke-tested with sample/mock tickets; verify the browser-to-live-API workflow after deployment. |
| Automatic AI category and priority | **Fallback verified; live AI behavior pending** | Ticket creation with external AI calls disabled returned the validated fallback classification. Verify provider responses, timeouts/rate limits, and live AI behavior separately. |
| Admin override of AI classification/priority | **Implemented** | Admin can review and apply suggestions and manually change category/priority. AI request body shape was corrected and the client lint/build pass; the complete browser flow against a running API was not conclusively verified. |
| AI-drafted response from BookLeaf knowledge base | **Partially implemented** | The AI service includes the supplied policy knowledge base, prompt guidance, and fallback reply; admins can request a draft and edit it. The draft is generated on demand using a button, rather than being automatically presented when opening a ticket as the brief describes. Verify the provider output against the sample-query expectations and confirm the draft UI/API round trip. |
| Ticket status, private notes, assignment | **Locally verified against Supabase** | A temporary admin updated ticket status/category/priority, assigned it, posted a reply, and added/read a private note. The author saw the reply but not the note and was denied the admin-only notes endpoint. Temporary data was removed afterward. |
| REST API, auth, roles, validation, errors | **Core local paths verified** | Local health, invalid login input, protected-route denial, signup/login/token verification, author scoping, and admin workflows were exercised against Supabase. The README endpoint table still needs reconciliation against every route/method before submission. |
| AI key security and failure handling | **Implemented; API secrets configured** | Required API secrets are configured server-side in Vercel Production. The optional AI provider key and live provider/fallback behavior have not been tested in the hosted deployment. Keep secrets out of client build variables. |
| Cost awareness and model choice documentation | **Partially documented** | Calls are limited to ticket details plus the relevant knowledge-base prompt rather than a full ticket history. The README does not yet explain why the selected OpenRouter model/provider was chosen, expected cost/token strategy, or rate-limit controls. Add this explanation and validate current model availability. |
| Provided sample dataset (10 authors, 18 books) | **Expected row counts confirmed; exact records not inspected** | Read-only Supabase aggregate counts show 10 authors and 18 books, matching the assignment dataset size. The seed script is present, but the exact sample records and their linkage/contents were intentionally not inspected. |
| Admin UI revamp and standout features | **Implemented locally** | Admin queue/detail workflow has been revamped. Aging triage highlights unresolved tickets aged 48+ hours. Similar-ticket intelligence now surfaces up to three heuristic matches using shared subject/description terms and category, with clear match reasons and one-click navigation; it never auto-merges records. UI behavior has been exercised using mock ticket data. |
| Deployment and accessible live demo | **Production deployments ready; authenticated demo QA pending** | API is live at `https://bookleaf-api-ten.vercel.app` and frontend at `https://bookleaf-author-support-portal-one.vercel.app`, both from commit `27dedf8`. Health, browser-origin CORS, and non-mutating login checks passed. Verify authenticated author/admin flows and supply safe demo credentials before submission. `render.yaml` remains an unused deployment alternative. |
| Source repository and collaborator access | **Current work merged to `main`** | `sync/current-completion-2026-10-18` was fast-forwarded into `main` at `27dedf8`; Production deployments now use that commit. Collaborator access was granted to the publishing account. |
| README and API documentation | **Partially complete** | Root README now covers local setup, deployment instructions, accounts, a main endpoint table, validation, and known limitations. Before submission, verify the endpoint table against all mounted routes, add architecture rationale and AI prompt/error/cost/model details, and include the live demo URL and test credentials after provisioning them. |
| Brief approach write-up (maximum one page) | **Not completed** | Create a separate concise write-up describing priorities, trade-offs, and a production evolution plan. |
| Full QA | **Core local API/database E2E passed; hosted smoke checks passed** | Client lint/build, server syntax, dependency audit, API stub checks, local UI smoke checks, and 29 assertions across temporary Supabase author/admin/ticket workflows passed. QA rows were removed and aggregate counts returned to baseline. Hosted frontend/API health, CORS, and non-existent-account login were verified without persistent writes; authenticated browser workflows and AI provider behavior remain untested. |

## `revamp.md` phase check

| Planned phase | Status | Notes |
| --- | --- | --- |
| Audit current submission | **Substantially complete** | The key gaps and deployment/database limitations are identified. Final audit evidence still depends on live database and deployed app access. |
| Fix authentication and database persistence | **Core local flows verified; production hardening pending** | Temporary author/admin signups and logins, ticket writes/reads, private-note isolation, and cross-author ownership checks passed against Supabase; test rows were cleaned up. Seeded-profile linking by email still lacks ownership verification and should be addressed before relying on it in production. |
| Revamp admin experience | **Implemented locally** | Queue filtering, ticket details, admin operations, aging metric/filter, and ticket-age/assignment visibility are present. |
| Add one standout feature | **Implemented locally** | The unresolved-over-48-hours aging triage metric/filter was added. |
| QA, deployment, submission readiness | **Production deployed; final hosted QA and submission work remain** | Production API and frontend are Ready on `main` at `27dedf8`; smoke checks passed. Authenticated hosted workflows, demo credentials, final README details, and the one-page write-up remain. |

## Remaining work, in recommended order

1. **Finish local UI-to-API QA.** Exercise the browser signup/login and full author/admin pages against the local API, including books, royalties, AI fallback, and responsive/error states. Core API/database flows are already covered through 29 assertions.
2. **Complete hosted browser QA.** Use authorized test accounts to verify author/admin sign-in, books/royalties, ticket creation/replies/private notes, admin triage, and responsive/error states against the deployed API. Avoid seeding or modifying existing data unless needed and explicitly approved.
3. **Prepare the submission.** Confirm safe author/admin demo credentials and document them appropriately; seed the live demo with the exact 10 authors and 18 books only if needed.
5. **Finish documentation.** Add the missing one-page approach write-up. Expand README with architecture decisions, AI model/provider rationale, prompt strategy, fallback/rate-limit behavior, and cost/token considerations; reconcile endpoint docs with the mounted API routes.
6. **Close AI acceptance gaps.** Decide whether to change the UI so an AI draft is presented automatically when an admin opens a ticket, as the brief requests; otherwise document the on-demand behavior as an intentional trade-off. Verify the chosen model/provider and sample-query quality.
7. **Repeat QA on the deployed app.** Exercise author/admin end-to-end journeys, errors and empty states, responsive layouts, and 15-second near-real-time updates using the deployed API and database.

## Verification boundary

The local 29-assertion run established selected API workflows against Supabase
with temporary rows that were removed. Hosted checks establish that both
Production deployments are ready, the frontend reaches the API with allowed
CORS, and authentication performs a database-backed lookup. They do **not**
establish authenticated hosted author/admin journeys, correctness of all live
book/royalty data, AI provider availability, or the quality of the full
browser-based workflow. Treat those items as incomplete until verified.
