# Assignment Completion Status

**Assessment date:** 18 October 2026
**Production:** [Author portal](https://bookleaf-author-support-portal-one.vercel.app) · [API health](https://bookleaf-api-ten.vercel.app/api/health)

## Hosted QA

- Author login and dashboard worked. Books and royalties displayed correct
  empty/zero states for a new author; ticket creation, listing, conversation,
  and category display worked. The narrow browser viewport had no horizontal
  overflow.
- Admin login and queue worked. Opening a ticket prepared a response draft
  automatically. The hosted API returned `source: "fallback"` because
  `OPENROUTER_API_KEY` is not configured in the Vercel Production environment;
  the UI identified the fallback and populated the reply editor.
- Admin status update, assignment, private note, and public reply succeeded.
  The author saw the public reply and could not see the private note.
- The deployed book-create route returned HTTP 201 and its draft-delete route
  returned HTTP 200. This verified the fix for the missing `randomUUID` import
  that had caused the earlier HTTP 500.
- A synthetic ticket with an explicitly selected `Royalty & Payments` category
  retained that category through the hosted API and displayed it in the author
  ticket list. Missing-provider fallback supplied the default `Medium` priority.
- OpenRouter checks used synthetic tickets only. The selected free Nemotron
  route is listed at zero prompt/completion pricing. Its initial 200-token
  classification cap cut off internal reasoning and sometimes yielded empty
  content; the cap was raised to 400 after a controlled comparison returned
  valid JSON and the expected royalty category. Draft output began
  `Dear Author,` and included the royalty timing guidance. Hosted AI-provider
  behavior remains unverified until the key is configured in Vercel.
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
- No pre-existing demo credentials were identified. The temporary QA accounts
  were deleted, and no persistent demo users or passwords were published.
- To finish hosted provider-backed AI acceptance, add `OPENROUTER_API_KEY` to
  the API's Vercel Production environment and redeploy. The deployed fallback
  remains available until then. No persistent demo accounts were created.

## Known limitations

The app does not verify email ownership before linking a seeded author profile.
Attachments are selected in the UI but not uploaded. Ticket updates use polling,
not WebSockets. AI calls have output-token caps but no application-level
rate-limit or usage-budget enforcement. The database schema is provisioned
outside this repository; no migrations are included.
