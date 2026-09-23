require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const PORT = Number.parseInt(process.env.PORT, 10) || 3001;
const DRY_RUN = process.env.EMAIL_DRY_RUN === 'true';
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_API_URL = process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email';
const EMAIL_FROM = process.env.EMAIL_FROM || '';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Portfolio Contact';
const EMAIL_TO = process.env.EMAIL_TO || '';

const LIMITS = {
  name: 100,
  email: 254,
  subject: 200,
  message: 4000,
  projectType: 40
};

const PROJECT_TYPES = new Set([
  'web-development',
  'mobile-app',
  'ui-ux-design',
  'consultation',
  'collaboration',
  'other'
]);

const GENERIC_VALIDATION = 'Please check the information you entered.';
const GENERIC_SERVER = 'Unable to send your message right now. Please try again later.';
const GENERIC_RATE = 'Too many messages. Please try again later.';

function parseAllowedOrigins() {
  const raw = process.env.FRONTEND_URL || 'http://127.0.0.1:8000,http://localhost:8000';
  return raw.split(',').map((origin) => origin.trim()).filter(Boolean);
}

function isMailConfigured() {
  return Boolean(BREVO_API_KEY && EMAIL_FROM && EMAIL_TO);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function asTrimmedString(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\0/g, '').trim();
}

function withoutHeaderBreaks(value) {
  return String(value).replace(/[\r\n]+/g, ' ').trim();
}

function isValidEmail(email) {
  if (!email || email.length > LIMITS.email) return false;
  if (/[\r\n\0]/.test(email)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false };
  }

  const name = asTrimmedString(body.name);
  const email = asTrimmedString(body.email);
  const message = asTrimmedString(body.message);
  const subject = asTrimmedString(body.subject);
  const projectType = asTrimmedString(body.projectType);

  if (!name || name.length > LIMITS.name) return { ok: false };
  if (!isValidEmail(email)) return { ok: false };
  if (!message || message.length > LIMITS.message) return { ok: false };
  if (subject.length > LIMITS.subject) return { ok: false };
  if (projectType && (!PROJECT_TYPES.has(projectType) || projectType.length > LIMITS.projectType)) {
    return { ok: false };
  }

  return {
    ok: true,
    data: {
      name,
      email,
      message,
      subject: subject || 'Portfolio Contact',
      projectType: projectType || ''
    }
  };
}

function buildTextEmail(data) {
  const lines = [
    'New portfolio contact form message',
    '',
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Subject: ${data.subject}`
  ];

  if (data.projectType) {
    lines.push(`Project type: ${data.projectType}`);
  }

  lines.push('', 'Message:', data.message);
  return lines.join('\n');
}

function buildHtmlEmail(data) {
  const projectRow = data.projectType
    ? `<p><strong>Project type:</strong> ${escapeHtml(data.projectType)}</p>`
    : '';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #141414;">
      <h2 style="margin-bottom: 16px;">New portfolio contact form message</h2>
      <p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
      <p><strong>Subject:</strong> ${escapeHtml(data.subject)}</p>
      ${projectRow}
      <p><strong>Message:</strong></p>
      <p style="white-space: pre-wrap;">${escapeHtml(data.message)}</p>
    </div>
  `;
}

async function sendViaBrevo(data) {
  let response;
  try {
    response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: {
          name: withoutHeaderBreaks(EMAIL_FROM_NAME),
          email: EMAIL_FROM
        },
        to: [{ email: EMAIL_TO }],
        replyTo: {
          email: data.email,
          name: withoutHeaderBreaks(data.name)
        },
        subject: `[Portfolio Contact] ${data.subject}`,
        htmlContent: buildHtmlEmail(data),
        textContent: buildTextEmail(data)
      })
    });
  } catch (error) {
    console.error('Brevo API network error:', error && error.message ? error.message : 'unknown error');
    throw new Error('Brevo API network error');
  }

  if (!response.ok) {
    console.error('Brevo API request failed with status', response.status);
    throw new Error('Brevo API request failed');
  }
}

const app = express();
app.disable('x-powered-by');

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

const allowedOrigins = parseAllowedOrigins();

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: false,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '16kb' }));

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    res.status(400).json({ success: false, message: GENERIC_VALIDATION });
    return;
  }
  if (error && error.type === 'entity.too.large') {
    res.status(413).json({ success: false, message: GENERIC_VALIDATION });
    return;
  }
  next(error);
});

const sendEmailLimiter = rateLimit({
  windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: Number.parseInt(process.env.RATE_LIMIT_MAX, 10) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    res.status(429).json({ success: false, message: GENERIC_RATE });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/send-email', sendEmailLimiter, async (req, res) => {
  const parsed = validatePayload(req.body);
  if (!parsed.ok) {
    res.status(400).json({ success: false, message: GENERIC_VALIDATION });
    return;
  }

  if (DRY_RUN) {
    res.status(200).json({ success: true, message: 'Message sent successfully.' });
    return;
  }

  if (!isMailConfigured()) {
    console.error('Contact form is not configured: missing Brevo environment variables.');
    res.status(503).json({ success: false, message: GENERIC_SERVER });
    return;
  }

  try {
    await sendViaBrevo(parsed.data);
    res.status(200).json({ success: true, message: 'Message sent successfully.' });
  } catch (error) {
    console.error('Failed to send contact email:', error && error.message ? error.message : 'unknown error');
    res.status(500).json({ success: false, message: GENERIC_SERVER });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found.' });
});

app.use((error, req, res, next) => {
  console.error('Unhandled API error:', error && error.message ? error.message : 'unknown error');
  res.status(500).json({ success: false, message: GENERIC_SERVER });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Contact API listening on port ${PORT}`);
    if (DRY_RUN) {
      console.log('EMAIL_DRY_RUN is enabled; messages will not be delivered.');
    } else if (!isMailConfigured()) {
      console.warn('Brevo environment variables are incomplete; POST /send-email will return 503.');
    }
  });
}

module.exports = app;
