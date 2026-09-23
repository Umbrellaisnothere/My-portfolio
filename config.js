window.PORTFOLIO_CONFIG = {
  // Local python/static server uses the local Express API.
  // Deployed Vercel pages use the Render API.
  apiBaseUrl: (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  )
    ? "http://localhost:3001"
    : "https://my-portfolio-api-r666.onrender.com"
};
