# Approach and Design Decisions

## Priorities

I focused first on the two workflows the portal must make dependable: authors
need a clear view of their books, royalties, and support conversations; support
staff need a practical way to triage requests and respond. The author portal
covers book and royalty summaries, ticket creation, and replies. The admin
queue supports filtering, prioritization, status and category updates,
assignment, public responses, and private notes. The supplied sample dataset
was loaded into the hosted database and checked against its source data.

## Architecture and access boundaries

The application uses a React/Vite client, an Express REST API, and PostgreSQL
hosted by Supabase. The client handles presentation; the API owns validation,
authentication, and data access. Passwords are hashed, and signed JWTs identify
the active user and role. Admin routes require an admin role, while author
queries are scoped to the author profile linked to the authenticated account.
The public demo administrator has an additional server-enforced restriction
to the demo author's tickets.

This keeps the implementation small enough for the assignment while ensuring
that access rules do not depend on hiding controls in the browser. Ticket
updates use polling rather than a persistent real-time connection, which is
simpler to deploy but can make updates less immediate.

## AI approach

AI assists staff; it does not make or send decisions on their behalf. Ticket
classification suggests a category and priority for an administrator to
review. For replies, the app combines ticket context with relevant
knowledge-base guidance to request a draft. The administrator can edit the
draft, and sending it remains a deliberate action.

Requests use bounded output sizes and a free provider route to keep usage
modest. If the provider is unavailable, returns an error, or produces no
usable text, the interface supplies clearly labeled deterministic fallback
content so the support workflow can continue. This is a practical assignment
trade-off, not a substitute for production rate limits, usage monitoring, or
spend alerts.

## Trade-offs and next steps

The current implementation favors working end-to-end workflows over production
infrastructure. Attachments can be selected but are not uploaded; email
ownership is not verified; and the database does not yet use versioned
migrations or row-level security policies. Automated API and browser tests,
operational monitoring, durable attachment storage, and stronger account
verification would be the first improvements before broader production use.
