# Portfolio Frontend

Static website files for the portfolio.

## Project Structure

This folder contains only the frontend files:
- `index.html` - Main portfolio page
- `about.html` - About page
- `contact.html` - Contact page
- `css/` - Stylesheets and images
- `script.js` - Frontend JavaScript
- `.gitignore` - Frontend-specific ignore rules

## Backend Setup

The contact form uses a small Express API in this repository (`server.js`).

1. Copy `.env.example` to `.env` and add SMTP credentials (never commit `.env`)
2. Run `npm install` and `npm start`
3. Keep `config.js` pointed at `http://localhost:3001` for local development
4. For production, set `apiBaseUrl` in `config.js` to the deployed API origin

See `README.md` for endpoint and environment details.

## Local Development Server *(Testing)

You can serve the frontend locally using any static server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (if you install serve)
npx server .

# Or just open index.html directly in your browser
```