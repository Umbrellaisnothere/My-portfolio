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

function firstNameFrom(name) {
  const first = asTrimmedString(name).split(/\s+/)[0] || 'Visitor';
  return first.slice(0, 40);
}

function buildMailtoHref(email, subject) {
  const safeEmail = withoutHeaderBreaks(email);
  const safeSubject = withoutHeaderBreaks(subject || 'Portfolio Contact');
  return `mailto:${safeEmail}?subject=${encodeURIComponent(safeSubject)}`;
}

function buildTextEmail(data) {
  const lines = [
    'Keith Murimi / Portfolio / Contact',
    '01 / A new conversation.',
    '',
    `From: ${data.name}`,
    `Email: ${data.email}`,
    `Subject: ${data.subject}`
  ];

  if (data.projectType) {
    lines.push(`Project type: ${data.projectType}`);
  }

  lines.push('', 'Message:', data.message, '', `Reply: ${data.email}`, '', 'Nairobi · Kenya');
  return lines.join('\n');
}

function buildHtmlEmail(data) {
  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const safeSubject = escapeHtml(data.subject);
  const safeMessage = escapeHtml(data.message);
  const safeFirstName = escapeHtml(firstNameFrom(data.name)).toUpperCase();
  const mailtoHref = escapeHtml(buildMailtoHref(data.email, data.subject));
  const wrap = 'word-wrap:break-word;overflow-wrap:anywhere;word-break:break-word;';
  const projectRow = data.projectType
    ? `
                      <tr>
                        <td style="padding:0 0 24px 0;">
                          <div style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.4;letter-spacing:0.18em;text-transform:uppercase;color:#8a8680;">Project type</div>
                          <div style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.45;color:#141414;${wrap}">${escapeHtml(data.projectType)}</div>
                        </td>
                      </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A new conversation</title>
</head>
<body bgcolor="#141414" style="margin:0;padding:0;background-color:#141414;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#141414;font-size:1px;line-height:1px;">
    A new conversation from ${safeName}
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#141414" style="width:100%;background-color:#141414;margin:0;padding:0;">
    <tr>
      <td align="center" bgcolor="#141414" style="padding:24px 12px;background-color:#141414;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;border-collapse:collapse;table-layout:fixed;">
          <tr>
            <td width="6" bgcolor="#d71938" style="width:6px;background-color:#d71938;font-size:0;line-height:0;">&nbsp;</td>
            <td width="594" bgcolor="#0b0b0b" style="width:594px;background-color:#0b0b0b;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;table-layout:fixed;">
                <tr>
                  <td bgcolor="#0b0b0b" style="padding:28px 32px;background-color:#0b0b0b;border-top:1px solid #3a3a3a;">
                    <div style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.4;letter-spacing:0.28em;text-transform:uppercase;">
                      <span style="color:#d71938;">01 /</span><span style="color:#c4bfb8;"> Correspondence</span>
                    </div>
                    <div style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.4;letter-spacing:0.22em;text-transform:uppercase;color:#f5f1e8;">Keith Murimi</div>
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#f5f1e8" style="padding:40px 36px 44px 36px;background-color:#f5f1e8;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f5f1e8" style="width:100%;background-color:#f5f1e8;table-layout:fixed;">
                      <tr>
                        <td style="padding:0 0 16px 0;">
                          <div style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:1.2;font-weight:bold;letter-spacing:0;color:#141414;">A new conversation.</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 32px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td valign="middle" width="48" height="2" bgcolor="#d71938" style="width:48px;height:2px;background-color:#d71938;font-size:0;line-height:0;vertical-align:middle;">&nbsp;</td>
                              <td width="8" style="width:8px;font-size:0;line-height:0;">&nbsp;</td>
                              <td valign="middle" width="5" height="5" bgcolor="#3d7eff" style="width:5px;height:5px;background-color:#3d7eff;font-size:0;line-height:0;vertical-align:middle;">&nbsp;</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 24px 0;">
                          <div style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.4;letter-spacing:0.18em;text-transform:uppercase;color:#8a8680;">From</div>
                          <div style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.35;font-weight:bold;color:#141414;${wrap}">${safeName}</div>
                          <div style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;word-break:break-all;${wrap}">
                            <a href="${mailtoHref}" style="color:#6f6a64;text-decoration:underline;">${safeEmail}</a>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 24px 0;">
                          <div style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.4;letter-spacing:0.18em;text-transform:uppercase;color:#8a8680;">Subject</div>
                          <div style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.45;color:#141414;${wrap}">${safeSubject}</div>
                        </td>
                      </tr>
                      ${projectRow}
                      <tr>
                        <td style="padding:0 0 28px 0;">
                          <div style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.4;letter-spacing:0.18em;text-transform:uppercase;color:#8a8680;">Message</div>
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#ebe6dc" style="width:100%;background-color:#ebe6dc;table-layout:fixed;">
                            <tr>
                              <td bgcolor="#ebe6dc" style="padding:22px 20px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;color:#141414;background-color:#ebe6dc;white-space:pre-wrap;${wrap}">${safeMessage}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0 0 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td bgcolor="#d71938" style="background-color:#d71938;padding:14px 22px;">
                                <a href="${mailtoHref}" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.2;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;color:#f5f1e8;${wrap}">Reply to ${safeFirstName}</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#0b0b0b" style="padding:24px 32px;background-color:#0b0b0b;border-top:1px solid #3a3a3a;">
                    <div style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.4;letter-spacing:0.22em;text-transform:uppercase;color:#c4bfb8;">Keith Murimi</div>
                    <div style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:#6f6a64;">Portfolio / Contact</div>
                    <div style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:#6f6a64;">Nairobi · Kenya</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
