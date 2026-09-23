# Portfolio

Static frontend with a small Express contact-form API.

## Frontend

- `index.html` — home
- `about.html` — about
- `contact.html` — contact
- `css/style.css` — styles
- `script.js` — frontend behavior
- `config.js` — API base URL

Serve the frontend locally:

```bash
python3 -m http.server 8000
```

Then open `http://127.0.0.1:8000`.

## Contact API

The homepage and contact page forms send `POST /send-email` to the API in `config.js`.

### Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` with your SMTP credentials. Do not commit `.env`.

```bash
npm start
```

The API listens on `PORT` (default `3001`).

### Endpoints

- `GET /health` — liveness check
- `POST /send-email` — send a contact message

Required JSON fields: `name`, `email`, `message`. `subject` is optional.

### Frontend API URL

`config.js` defaults to `http://localhost:3001` for local development. Leave it there until the API has a real production origin. Do not invent an API URL.

## Deploying the contact API

The frontend stays on Vercel as a static site (`vercel.json`). The contact API is a long-running Express process started with `npm start`. Host it on a Node service, not as Vercel serverless functions.

### Runtime

- Node.js 18 or later
- npm 9 or later

### Install and start

```bash
npm install
npm start
```

`npm start` runs `node server.js`. Listen on the host-provided `PORT` (default `3001` if unset). Use that value as the service health-check port.

### Health check

`GET /health` returns `{ "status": "ok" }`.

### Environment variables

Set these in the hosting provider's environment-variable settings. Do not commit `.env` or put real credentials in the repository.

Required to deliver mail:

- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_TO`
- `SMTP_HOST`

Also set:

- `PORT` — usually injected by the host; do not hardcode it
- `FRONTEND_URL` — live frontend origin(s), comma-separated (scheme + host + port only, no path)
- `TRUST_PROXY` — `true` when the API is behind a reverse proxy (required so rate limiting uses the visitor IP)
- `SMTP_PORT`
- `SMTP_SECURE`
- `EMAIL_DRY_RUN` — keep `false` when mail should be delivered

Optional:

- `RATE_LIMIT_MAX` (default 5)
- `RATE_LIMIT_WINDOW_MS` (default 900000)

SMTP credentials must be configured through the host's environment-variable settings. Do not put passwords in git, `config.js`, or Vercel frontend env vars.

### After the API has a real origin

Change `apiBaseUrl` in `config.js` only after the backend is deployed and that origin is known. Then redeploy the Vercel frontend. Do not put SMTP passwords in frontend files.

`POST /send-email` is limited to 5 requests per 15 minutes per IP unless `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` are overridden.
