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

Edit `.env` with your Brevo API values. Do not commit `.env`.

```bash
npm start
```

The API listens on `PORT` (default `3001`).

### Endpoints

- `GET /health` — liveness check
- `POST /send-email` — send a contact message

Required JSON fields: `name`, `email`, `message`. `subject` is optional.

## Deploying the contact API

The frontend stays on Vercel as a static site (`vercel.json`). The contact API is a long-running Express process started with `npm start`. Host it on a Node service, not as Vercel serverless functions.

Outbound SMTP ports are blocked on Render Free web services. This API sends mail through Brevo's HTTPS transactional API instead of SMTP.

### Runtime

- Node.js 18 or later
- npm 9 or later

### Install and start

```bash
npm install
npm start
```

`npm start` runs `node server.js`. Listen on the host-provided `PORT` (default `3001` if unset). Health check: `GET /health`.

### Environment variables

Set these in the hosting provider's environment-variable settings. Do not commit `.env` or put API keys in frontend files.

- `BREVO_API_KEY` — Brevo transactional API key
- `EMAIL_FROM` — verified Brevo sender address
- `EMAIL_FROM_NAME` — sender display name
- `EMAIL_TO` — address that receives contact-form messages
- `EMAIL_DRY_RUN` — `true` accepts messages without sending; `false` calls Brevo
- `PORT` — usually injected by the host
- `FRONTEND_URL` — live frontend origin(s), comma-separated (scheme + host + port only)
- `TRUST_PROXY` — `true` when the API is behind a reverse proxy

Optional:

- `RATE_LIMIT_MAX` (default 5)
- `RATE_LIMIT_WINDOW_MS` (default 900000)

The visitor address is used only as `replyTo`. It is never the sender.

After changing environment variables, restart the web service so the process reloads them.

`POST /send-email` is limited to 5 requests per 15 minutes per IP unless those rate-limit variables are overridden.
