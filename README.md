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

`config.js` defaults to `http://localhost:3001` for local development.

For production, change `apiBaseUrl` in `config.js` to the deployed API origin. Do not put SMTP passwords in frontend files.

### Production notes

- Frontend (static) and API (Node) are expected to be on different origins.
- `vercel.json` keeps the Vercel frontend static so `package.json` is not treated as the web app.
- Set `FRONTEND_URL` to the live frontend origin, for example `https://your-frontend.example.com`.
- Set `TRUST_PROXY=true` if the API is behind a reverse proxy.
- `POST /send-email` is limited to 5 requests per 15 minutes per IP.
