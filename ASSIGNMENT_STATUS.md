# Assignment Completion Status

**Assessment date:** 18 October 2026
**Scope reviewed:** assignment brief, `revamp.md`, current source tree, and QA
evidence from this workspace.

## Latest hosted connection checks (18 October 2026)

Hosted dashboard and SQL Editor checks below were read-only. A separate,
approved local API end-to-end test later created uniquely labeled temporary QA
accounts and a ticket, then removed those exact rows and confirmed all six
aggregate counts returned to their original values.

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
  `sarvagya-123/bookleaf-author-support-portal`, default branch `main`, with
  latest visible commit `e1a86a7` (“Configure CORS for production frontend”).
  Its `main` tree does not include the current root README, assignment status,
  Render blueprint, environment examples, local landing page, or similar-ticket
  feature. No non-example `.env` file was found in the public tree.
- A clean sync branch, `sync/current-completion-2026-10-18`, was pushed at
  commit `5770b37` after collaborator access was granted. The workspace folder
  itself remains outside a Git worktree; the branch was prepared in an isolated
  clone. No pull request or merge was created, so `main` and production remain
  unchanged. Private `.env` files and generated build/dependency folders were
  excluded from the push.
- GitHub now grants collaborator access to the publishing account. Actions
  secrets/variables are empty, and public metadata shows no visible Actions
  workflows or GitHub deployments. The repository remains connected to Vercel,
  as shown by the Vercel project source.
- A full hosted end-to-end check is blocked because there is no deployed,
  reachable API. Local app writes, role checks, and ticket flows have now been
  tested against Supabase using temporary QA data that was removed afterward.

## Overall assessment

**The assignment is not fully complete or ready to submit yet.** The main
author/admin experiences, REST API, AI-assisted ticket handling, sample-data
seed script, and an aging-ticket queue signal are implemented. The intended
Supabase schema, aggregate data counts, and core local app write/read flows
are verified. The public frontend appears stale and points at a localhost API URL.
The assignment requires a working live demo with pre-seeded data and test
credentials. The required one-page approach write-up is also still missing.

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
| AI key security and failure handling | **Implemented; deployment configuration pending** | AI key is server-side environment configuration; AI service has fallback behavior. Keep all secrets out of client build variables and configure private values only in the deployed API environment. |
| Cost awareness and model choice documentation | **Partially documented** | Calls are limited to ticket details plus the relevant knowledge-base prompt rather than a full ticket history. The README does not yet explain why the selected OpenRouter model/provider was chosen, expected cost/token strategy, or rate-limit controls. Add this explanation and validate current model availability. |
| Provided sample dataset (10 authors, 18 books) | **Expected row counts confirmed; exact records not inspected** | Read-only Supabase aggregate counts show 10 authors and 18 books, matching the assignment dataset size. The seed script is present, but the exact sample records and their linkage/contents were intentionally not inspected. |
| Admin UI revamp and standout features | **Implemented locally** | Admin queue/detail workflow has been revamped. Aging triage highlights unresolved tickets aged 48+ hours. Similar-ticket intelligence now surfaces up to three heuristic matches using shared subject/description terms and category, with clear match reasons and one-click navigation; it never auto-merges records. UI behavior has been exercised using mock ticket data. |
| Deployment and accessible live demo | **Not complete; production API is unavailable** | Vercel frontend serves an older build pointing to localhost for its API. No `VITE_API_BASE_URL` is configured. The separate API Vercel project has no production deployment or environment variables; public health endpoints return 404. `render.yaml` is only a deployment blueprint. |
| Source repository and collaborator access | **Current work pushed to a feature branch; merge pending** | Current source is published on `sync/current-completion-2026-10-18` at `f27f167`; `main` is unchanged and still behind. Collaborator access was granted to the publishing account. Review and merge the branch before expecting a production Vercel update. |
| README and API documentation | **Partially complete** | Root README now covers local setup, deployment instructions, accounts, a main endpoint table, validation, and known limitations. Before submission, verify the endpoint table against all mounted routes, add architecture rationale and AI prompt/error/cost/model details, and include the live demo URL and test credentials after provisioning them. |
| Brief approach write-up (maximum one page) | **Not completed** | Create a separate concise write-up describing priorities, trade-offs, and a production evolution plan. |
| Full QA | **Core local API/database E2E passed; hosted/UI E2E pending** | Client lint/build, server syntax, dependency audit, API stub checks, local UI smoke checks, health/auth guards, and 29 assertions across temporary Supabase author/admin/ticket workflows passed. QA rows were removed and all aggregate counts returned to baseline. AI provider behavior and full browser/UI-to-API flow were not tested. Vercel has no production API deployment and health endpoints return 404, preventing hosted E2E. |

## `revamp.md` phase check

| Planned phase | Status | Notes |
| --- | --- | --- |
| Audit current submission | **Substantially complete** | The key gaps and deployment/database limitations are identified. Final audit evidence still depends on live database and deployed app access. |
| Fix authentication and database persistence | **Core local flows verified; production hardening pending** | Temporary author/admin signups and logins, ticket writes/reads, private-note isolation, and cross-author ownership checks passed against Supabase; test rows were cleaned up. Seeded-profile linking by email still lacks ownership verification and should be addressed before relying on it in production. |
| Revamp admin experience | **Implemented locally** | Queue filtering, ticket details, admin operations, aging metric/filter, and ticket-age/assignment visibility are present. |
| Add one standout feature | **Implemented locally** | The unresolved-over-48-hours aging triage metric/filter was added. |
| QA, deployment, submission readiness | **Local API/database E2E passed; hosted deployment needs repair** | Core local API/database flows passed. The public frontend appears stale and configured for localhost API; its health path returns 404. Hosted demo credentials, source branch review/merge, final README details, and one-page write-up remain. |

## Remaining work, in recommended order

1. **Finish local UI-to-API QA.** Exercise the browser signup/login and full author/admin pages against the local API, including books, royalties, AI fallback, and responsive/error states. Core API/database flows are already covered through 29 assertions.
2. **Repair and complete deployment.** Deploy the API with private server variables (Render blueprint or correctly configured serverless API), set frontend `VITE_API_BASE_URL` to that public API (never localhost), configure CORS, and redeploy the current frontend. Verify health and login/ticket flows.
3. **Prepare the submission.** Review and merge the current feature branch, seed the live demo with the exact 10 authors and 18 books only if needed, and add working author/admin test credentials to the README without exposing secrets.
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
