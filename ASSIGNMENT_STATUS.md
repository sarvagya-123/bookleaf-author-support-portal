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
- Local OpenRouter acceptance checks used synthetic tickets only. Two category
  predictions matched their expected categories. The generated draft began
  `Dear Author,`, was 137 words, and included a next step. Hosted AI-provider
  behavior itself remains unverified until the provider key is configured.
- Temporary QA author/admin accounts, two synthetic hosted tickets, their
  messages, and private notes were removed. Supabase aggregate counts returned
  to baseline: 10 authors, 18 books, 3 users, 2 tickets, 5 messages, 1 note.

## Dataset comparison

The assignment JSON and Supabase contain all 10 expected author IDs, all 18
book IDs, and all 18 matching author-book relationships. Values differ:
`joined_date` for 10/10 authors; `publication_date`, `mrp`, and
`author_royalty_per_copy` for 16/18 books; `total_royalty_earned`,
`royalty_paid`, and `royalty_pending` for 18/18 books; and
`last_royalty_payout_date` for 12/18 books. No production sample data was
changed. Do not run `server/seed.js` against this database without deciding
which values are authoritative; the script upserts these fields.

## Submission and remaining decisions

- `README.md` now describes the current Vercel deployment, mounted API
  endpoints, architecture, AI behavior, token caps, cost/rate-limit caveats,
  and known limitations. `APPROACH.md` contains the requested one-page summary.
- Client lint and production build pass. Changed backend files pass
  `node --check`; no automated test files are present in the repository.
- No pre-existing demo credentials were identified. The temporary QA accounts
  were deleted, and no persistent demo users or passwords were published.
- To finish hosted AI acceptance, configure `OPENROUTER_API_KEY` in the API's
  Vercel Production environment and redeploy. Decide separately whether to
  create persistent demo accounts and whether to align the differing sample
  dates/royalty fields; neither was changed without approval.

## Known limitations

The app does not verify email ownership before linking a seeded author profile.
Attachments are selected in the UI but not uploaded. Ticket updates use polling,
not WebSockets. AI calls have output-token caps but no application-level
rate-limit or usage-budget enforcement. The database schema is provisioned
outside this repository; no migrations are included.
