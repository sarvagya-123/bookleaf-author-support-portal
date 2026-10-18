# BookLeaf Support Portal

React and Vite frontend for the BookLeaf author and operations workspaces.

## Local development

Install the frontend dependencies and start the API and Vite dev server in
separate terminals:

```powershell
cd server
npm ci
npm run dev
```

```powershell
cd client
npm ci
Copy-Item .env.example .env
npm run dev
```

Set `DATABASE_URL` and `JWT_SECRET` in `server/.env` before starting the API.
Set `ADMIN_SIGNUP_SECRET` there to enable invitation-protected admin signup.
The client uses `VITE_API_BASE_URL` to find the API; it defaults to
`http://localhost:5000/api` during local development.

## Deployment configuration

`render.yaml` defines the Express API as a separate Render web service. In
Render, create a Blueprint from this repository and supply the private values
for `DATABASE_URL`, `JWT_SECRET`, `ADMIN_SIGNUP_SECRET`, and
`OPENROUTER_API_KEY` in the service environment. Do not commit those values.

After Render gives the API a public URL, set `VITE_API_BASE_URL` in the Vercel
frontend project's Environment Variables to `https://<api-host>/api` and
redeploy the frontend. Update `CLIENT_ORIGINS` in the Render service to include
the Vercel production domain (and any preview domains you intend to use).

The production frontend otherwise defaults to `/api`, which requires a proxy
or API hosted on the same domain; the current Vercel static frontend does not
provide that proxy.

Admin account registration requires the API-side `ADMIN_SIGNUP_SECRET`; never
expose that value in the frontend or deployment build variables.

The admin queue highlights unresolved tickets at least 48 hours old as an
aging triage signal. This is an operational queue aid, not a guaranteed
response-time commitment.
