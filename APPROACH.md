# Implementation Approach

The solution prioritizes the assignment's core author and support workflows:
authors can sign in, inspect their books and royalty totals, and create and
track support tickets; admins can triage tickets, respond, assign work, and
keep private notes. React/Vite provides the client, Express exposes the API,
and PostgreSQL/Supabase persists the records. JWT role checks separate admin
operations from author data, with author queries scoped to the linked profile.

For the admin experience, the queue emphasizes urgency and aging work. A
48-hour unresolved-ticket signal and explainable similar-ticket matches help
staff prioritize without automatically merging or changing records. These
rules are intentionally transparent and reversible.

AI is assistive rather than authoritative. OpenRouter classification proposes
a category and priority; admins can review or override the result. When an
admin opens a ticket, the client requests a knowledge-base-guided response
draft. The admin remains responsible for editing and sending it. The provider
uses a free route with bounded output sizes; missing keys, provider errors, or
empty responses fall back to labeled deterministic text. This keeps the
workflow usable during provider outages, while leaving rate limits, usage
monitoring, and a spend alert as production follow-up before adopting a paid
model.

The main trade-offs are a compact existing database schema, polling instead
of persistent real-time connections, and attachment selection without upload
storage. The assignment dataset was seeded to Supabase and verified field by
field against the provided JSON. Before broader production use, the next steps
are verified email ownership for seeded-profile linking, versioned migrations,
row-level database policies, durable attachment storage, automated API/UI
tests, and operational monitoring.
