# Assignment Completion Status

**Assessment date:** 18 October 2026
**Production:** [Author portal](https://bookleaf-author-support-portal-one.vercel.app) · [API health](https://bookleaf-api-ten.vercel.app/api/health)

## Hosted QA

- Author login and dashboard worked. Books and royalties displayed correct
  empty/zero states for a new author; ticket creation, listing, conversation,
  and category display worked. The narrow browser viewport had no horizontal
  overflow.
- Admin login and queue worked. Opening a ticket prepared a response draft
  automatically. After `OPENROUTER_API_KEY` was added to the API project's
  Vercel Production environment and the API was redeployed, synthetic hosted
  checks returned `source: "ai"` and drafts beginning `Dear Author,`. One
  request on the earlier 500-token cap returned empty content and correctly
  used the labeled fallback. The cap was increased to 1,000 tokens; the
  post-change production check returned a 133-word AI draft.
- Admin status update, assignment, private note, and public reply succeeded.
  The author saw the public reply and could not see the private note.
- The deployed book-create route returned HTTP 201 and its draft-delete route
  returned HTTP 200. This verified the fix for the missing `randomUUID` import
  that had caused the earlier HTTP 500.
- A synthetic ticket with an explicitly selected `Royalty & Payments` category
  retained that category through the hosted API and displayed it in the author
  ticket list. The earlier missing-provider test supplied the default
  `Medium` priority.
- OpenRouter checks used synthetic tickets only. The selected free Nemotron
  route is listed at zero prompt/completion pricing. Its initial 200-token
  classification cap cut off internal reasoning and sometimes yielded empty
  content; the cap was raised to 400 after a controlled comparison returned
  valid JSON and the expected royalty category. The live production API
  classified the synthetic royalty question as `Royalty & Payments` / `Medium`
  with a matching rationale and returned a non-empty AI-sourced draft after the
  draft cap was raised to 1,000 tokens. The temporary admin used for hosted
  checks was removed. The labeled fallback remains active if the free model
  returns empty content or is unavailable.
- Temporary QA author/admin accounts, two synthetic hosted tickets, their
  messages, and private notes were removed. Supabase aggregate counts returned
  to baseline: 10 authors, 18 books, 3 users, 2 tickets, 5 messages, 1 note.

## Dataset comparison

The attached assignment JSON was compared with the checked-in
`server/data/bookleaf_sample_data.json`; both contain the same 10 authors and
18 books, with every field identical. The transaction-safe seed script was run
against Supabase to upsert these exact sample values while preserving linked
user IDs. A read-only, field-by-field verification then reported zero
mismatches across all author and book fields. Aggregate counts remain 10
authors, 18 books, 3 users, 2 tickets, 5 messages, and 1 private note.

Running `server/seed.js` again will overwrite later changes to the sample
author and book records with the assignment values.

## Submission and remaining decisions

- `README.md` now describes the current Vercel deployment, mounted API
  endpoints, architecture, AI behavior, token caps, cost/rate-limit caveats,
  and known limitations. `APPROACH.md` contains the requested one-page summary.
- Client lint and production build pass. Changed backend files pass
  `node --check`; no automated test files are present in the repository.
- Read-only author and admin demo logins are published in the README. The
  author account links to seeded author `AUTH002`; the admin queue is restricted
  to that author's synthetic demo ticket. Demo accounts cannot perform writes.
- `OPENROUTER_API_KEY` is present in the API project's Vercel Production
  environment. After deployment of the 1,000-token draft cap, a live hosted
  check returned an AI-sourced draft and the expected classification. An
  earlier empty model response used the built-in fallback; the app remains
  functional if the free provider is unavailable.

## Known limitations

The app does not verify email ownership before linking a seeded author profile.
Attachments are selected in the UI but not uploaded. Ticket updates use polling,
not WebSockets. AI calls have output-token caps but no application-level
rate-limit or usage-budget enforcement. The database schema is provisioned
outside this repository; no migrations are included.
