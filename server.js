require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const PORT = Number.parseInt(process.env.PORT, 10) || 3001;
const DRY_RUN = process.env.EMAIL_DRY_RUN === 'true';
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_TO = process.env.EMAIL_TO || '';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number.parseInt(process.env.SMTP_PORT, 10) || 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';

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
  return Boolean(EMAIL_USER && EMAIL_PASS && EMAIL_TO && SMTP_HOST);
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

function createTransporter() {
  if (DRY_RUN) {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  if (!isMailConfigured()) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });
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

const transporter = createTransporter();

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/send-email', sendEmailLimiter, async (req, res) => {
  const parsed = validatePayload(req.body);
  if (!parsed.ok) {
    res.status(400).json({ success: false, message: GENERIC_VALIDATION });
    return;
  }

  if (!transporter) {
    console.error('Contact form is not configured: missing SMTP environment variables.');
    res.status(503).json({ success: false, message: GENERIC_SERVER });
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Portfolio Contact Form" <${EMAIL_USER}>`,
      to: EMAIL_TO,
      replyTo: parsed.data.email,
      subject: `[Portfolio Contact] ${parsed.data.subject}`,
      text: buildTextEmail(parsed.data),
      html: buildHtmlEmail(parsed.data)
    });

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
      console.warn('SMTP environment variables are incomplete; POST /send-email will return 503.');
    }
  });
}

module.exports = app;
