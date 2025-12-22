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

The contact form requires a separate backend server to send emails. The backend is located in `../portfolio-backend/` with its own setup instructions in `README.md`.

## Development

1. **Start the backend server first** (see `../portfolio-backend/README.md`)
2. Open `index.html` in your browser or use a local server
3. The contact form will send emails via the backend API

## Production Deployment

For production:
1. Deploy the backend (`../portfolio-backend/`) to a service like Railway, Render, or Vercel
2. Update `API_BASE_URL` in `script.js` to point to your deployed backend URL
3. Deploy these frontend files to any static hosting service (GitHub Pages, Netlify, Vercel, etc.)

## Local Development Server

You can serve the frontend locally using any static server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (if you install serve)
npx server .

# Or just open index.html directly in your browser
```