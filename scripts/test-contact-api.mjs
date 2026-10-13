#!/usr/bin/env node

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST_API_KEY = 'test-brevo-key-not-real';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertDesignedHtml(html, label) {
  assert(typeof html === 'string' && html.trim().length > 0, `${label}: htmlContent must be non-empty`);
  assert(
    html.includes('color:#d71938;">01 /</span>') && html.includes('> Correspondence</span>'),
    `${label}: masthead should include the 01 / Correspondence kicker markup`
  );
  assert(
    html.includes('font-size:28px') && html.includes('>A new conversation.</div>'),
    `${label}: cream body should include the 28px A new conversation. heading`
  );
  assert(html.includes('#3d7eff'), `${label}: HTML should include the blue accent`);
  assert(html.includes('bgcolor="#d71938"'), `${label}: HTML should include the red rail`);
  assert(html.includes('bgcolor="#f5f1e8"'), `${label}: HTML should include the cream panel`);
  assert(
    html.includes('width="600"') && html.includes('max-width:600px'),
    `${label}: HTML should use an approximately 600px table layout`
  );
  assert(html.includes('mailto:'), `${label}: HTML should include a mailto reply link`);
  assert(html.includes('>Reply to '), `${label}: HTML should include the Reply to label`);
  assert(
    html.includes('bgcolor="#d71938" style="background-color:#d71938;padding:14px 22px;"'),
    `${label}: reply button cell should own the red background and padding`
  );
  assert(
    html.includes('width="100%" bgcolor="#f5f1e8"'),
    `${label}: inner letter table should have an explicit cream background`
  );
  assert(html.includes('#ebe6dc'), `${label}: message panel should use the cream-dark surface`);
  assert(html.includes('white-space:pre-wrap'), `${label}: message panel should preserve whitespace`);
  const footerMarker = 'Nairobi · Kenya</div>';
  const footerAt = html.lastIndexOf(footerMarker);
  assert(footerAt !== -1, `${label}: HTML footer should include Nairobi · Kenya`);
  const footerNameAt = html.lastIndexOf('Keith Murimi', footerAt);
  assert(footerNameAt !== -1 && footerNameAt < footerAt, `${label}: footer should include Keith Murimi`);
  const footerHtml = html.slice(footerNameAt, footerAt + footerMarker.length);
  assert(footerHtml.includes('Portfolio / Contact'), `${label}: footer should include Portfolio / Contact`);
  assert(!footerHtml.toLowerCase().includes('.com'), `${label}: designed footer must not contain .com`);
  assert(!/Murimi\.com/i.test(html), `${label}: designed identity must not use a .com suffix`);
}

function startServer(port, extraEnv = {}) {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      EMAIL_DRY_RUN: 'true',
      BREVO_API_KEY: TEST_API_KEY,
      EMAIL_FROM: 'verified-sender@example.com',
      EMAIL_FROM_NAME: 'Portfolio Contact',
      EMAIL_TO: 'inbox@example.com',
      FRONTEND_URL: 'http://127.0.0.1:8000',
      TRUST_PROXY: 'false',
      RATE_LIMIT_MAX: '50',
      ...extraEnv
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  return child;
}

function startBrevoMock(handler) {
  const received = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    let body = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      body = raw;
    }
    const record = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body
    };
    received.push(record);
    handler(req, res, record);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        received,
        url: `http://127.0.0.1:${port}/v3/smtp/email`
      });
    });
  });
}

function stopHttp(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

async function request(base, pathName, options = {}) {
  const response = await fetch(`${base}${pathName}`, options);
  const headers = Object.fromEntries(response.headers.entries());
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body, headers };
}

async function waitForHealth(child, base) {
  const started = Date.now();
  while (Date.now() - started < 8000) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited early with code ${child.exitCode}`);
    }
    try {
      const health = await request(base, '/health');
      if (health.status === 200) return health;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('Server did not become ready');
}

function stop(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null) {
      resolve();
      return;
    }
    child.once('exit', resolve);
    child.kill('SIGTERM');
  });
}

const validPayload = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'Hello from the portfolio test suite.'
};

let failed = 0;
let server;
let mock;

try {
  const source = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  assert(source.includes('process.env.BREVO_API_KEY'), 'API key must be read from the environment');
  assert(!source.includes(TEST_API_KEY), 'test API key must not be hardcoded in server.js');
  assert(!source.includes('nodemailer'), 'nodemailer must not remain in server.js');
  assert(!source.includes('SMTP_HOST'), 'SMTP_HOST must not remain in server.js');
  console.log('ok  API key comes from environment');

  const port = process.env.TEST_PORT || '3011';
  const base = `http://127.0.0.1:${port}`;
  server = startServer(port);
  await waitForHealth(server, base);

  const health = await request(base, '/health');
  assert(health.status === 200 && health.body.status === 'ok', 'GET /health should return ok');
  assert(!JSON.stringify(health.body).toLowerCase().includes('pass'), 'health must not expose secrets');
  assert(!JSON.stringify(health.body).toLowerCase().includes('key'), 'health must not expose keys');
  console.log('ok  GET /health');

  const valid = await request(base, '/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:8000' },
    body: JSON.stringify(validPayload)
  });
  assert(valid.status === 200 && valid.body.success === true, `valid dry-run failed: ${valid.status} ${JSON.stringify(valid.body)}`);
  assert(valid.headers['access-control-allow-origin'] === 'http://127.0.0.1:8000', 'CORS should allow FRONTEND_URL origin');
  console.log('ok  POST /send-email dry-run valid payload');

  const denied = await request(base, '/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://example.com' },
    body: JSON.stringify(validPayload)
  });
  assert(denied.headers['access-control-allow-origin'] !== 'https://example.com', 'CORS must not reflect an unrelated origin');
  console.log('ok  CORS rejects unrelated origin');

  const optionalSubject = await request(base, '/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      subject: '',
      message: 'Subject can be empty.'
    })
  });
  assert(optionalSubject.status === 200 && optionalSubject.body.success === true, 'empty subject should be accepted');
  console.log('ok  POST /send-email optional subject');

  const missingName = await request(base, '/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ada@example.com', message: 'Hi' })
  });
  assert(missingName.status === 400, `missing name expected 400, got ${missingName.status}`);
  console.log('ok  missing name');

  const missingEmail = await request(base, '/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Ada', message: 'Hi' })
  });
  assert(missingEmail.status === 400, 'missing email expected 400');
  console.log('ok  missing email');

  const invalidEmail = await request(base, '/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Ada', email: 'not-an-email', message: 'Hi' })
  });
  assert(invalidEmail.status === 400, 'invalid email expected 400');
  console.log('ok  invalid email');

  const missingMessage = await request(base, '/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Ada', email: 'ada@example.com' })
  });
  assert(missingMessage.status === 400, 'missing message expected 400');
  console.log('ok  missing message');

  const oversized = await request(base, '/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ada',
      email: 'ada@example.com',
      message: 'x'.repeat(5000)
    })
  });
  assert(oversized.status === 400, 'oversized message expected 400');
  console.log('ok  oversized message');

  const malformed = await request(base, '/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not json'
  });
  assert(malformed.status === 400, `malformed JSON expected 400, got ${malformed.status}`);
  console.log('ok  malformed JSON');

  const injectionEmail = await request(base, '/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ada',
      email: 'ada@example.com\nBcc: evil@example.com',
      message: 'Hi'
    })
  });
  assert(injectionEmail.status === 400, 'newline in email should be rejected');
  console.log('ok  email header injection rejected');

  await stop(server);

  const ratePort = String(Number(port) + 1);
  const rateBase = `http://127.0.0.1:${ratePort}`;
  server = startServer(ratePort, { RATE_LIMIT_MAX: '3' });
  await waitForHealth(server, rateBase);

  let limited = false;
  for (let i = 0; i < 6; i += 1) {
    const result = await request(rateBase, '/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ada',
        email: 'ada@example.com',
        message: `Rate limit probe ${i}`
      })
    });
    if (result.status === 429) {
      limited = true;
      break;
    }
  }
  assert(limited, 'expected 429 after repeated submissions');
  console.log('ok  rate limit');
  await stop(server);

  mock = await startBrevoMock((_req, res) => {
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ messageId: 'mock-message-id' }));
  });

  const brevoPort = String(Number(port) + 2);
  const brevoBase = `http://127.0.0.1:${brevoPort}`;
  server = startServer(brevoPort, {
    EMAIL_DRY_RUN: 'false',
    BREVO_API_URL: mock.url
  });
  await waitForHealth(server, brevoBase);

  const escapedName = 'Ada <script>alert(1)</script>';
  const escapedMessage = 'Hello <b>world</b> & "quotes"';
  const live = await request(brevoBase, '/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:8000' },
    body: JSON.stringify({
      name: escapedName,
      email: 'ada@example.com',
      subject: 'Optional subject',
      message: escapedMessage
    })
  });
  assert(live.status === 200 && live.body.success === true, `Brevo success failed: ${live.status} ${JSON.stringify(live.body)}`);
  assert(mock.received.length === 1, `expected one Brevo call, got ${mock.received.length}`);
  const captured = mock.received[0];
  assert(captured.method === 'POST', 'Brevo request should be POST');
  assert(captured.headers['api-key'] === TEST_API_KEY, 'api-key header must come from BREVO_API_KEY');
  assert(captured.headers['content-type'] === 'application/json', 'Brevo content-type should be JSON');
  assert(captured.body.sender.email === 'verified-sender@example.com', 'sender must be EMAIL_FROM');
  assert(captured.body.sender.email !== 'ada@example.com', 'visitor must not be sender');
  assert(captured.body.to[0].email === 'inbox@example.com', 'to must be EMAIL_TO');
  assert(captured.body.replyTo.email === 'ada@example.com', 'replyTo must be the visitor email');
  assert(captured.body.replyTo.name.includes('Ada'), 'replyTo should include the visitor name');
  assert(captured.body.subject === '[Portfolio Contact] Optional subject', 'subject fallback prefix should be preserved');
  assert(captured.body.htmlContent.includes('Ada &lt;script&gt;alert(1)&lt;/script&gt;'), 'HTML name must be escaped');
  assert(captured.body.htmlContent.includes('Hello &lt;b&gt;world&lt;/b&gt; &amp; &quot;quotes&quot;'), 'HTML message must be escaped');
  assert(!captured.body.htmlContent.includes('<script>'), 'raw script tags must not appear in HTML');
  assert(captured.body.textContent.includes(escapedMessage), 'text body should keep the visitor message');
  assertDesignedHtml(captured.body.htmlContent, 'designed HTML');
  assert(typeof captured.body.textContent === 'string' && captured.body.textContent.trim().length > 0, 'textContent must be non-empty');
  assert(captured.body.htmlContent.includes('overflow-wrap:anywhere'), 'long values should wrap safely');
  assert(captured.body.textContent.includes('01 / A new conversation.'), 'plain text should include the correspondence heading');
  assert(captured.body.textContent.includes('Nairobi · Kenya'), 'plain text should include the footer location');
  console.log('ok  Brevo API success, replyTo, and HTML escaping');

  const longName = 'Sarah Alexandra Mwangi-Okonkwo';
  const longEmail = 'sarah.alexandra.mwangi.okonkwo.inquiry@verylongdomainexample.com';
  const longSubject = 'Website redesign collaboration for a multi-brand launch in Nairobi';
  const longMessage = '<script>alert("x")</script>\n<b>hello</b>\nLine two with & special chars.\n' + 'A'.repeat(800);
  const presentation = await request(brevoBase, '/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: longName,
      email: longEmail,
      subject: longSubject,
      message: longMessage
    })
  });
  assert(presentation.status === 200 && presentation.body.success === true, `presentation payload failed: ${presentation.status}`);
  assert(mock.received.length === 2, `expected two Brevo calls, got ${mock.received.length}`);
  const longCaptured = mock.received[1];
  assert(longCaptured.body.replyTo.email === longEmail, 'long visitor email must remain replyTo');
  assert(longCaptured.body.sender.email === 'verified-sender@example.com', 'sender identity must stay EMAIL_FROM');
  assert(longCaptured.body.htmlContent.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;') || longCaptured.body.htmlContent.includes('&lt;script&gt;alert("x")&lt;/script&gt;'), 'long HTML message must be escaped');
  assert(!longCaptured.body.htmlContent.includes('<script>'), 'raw script must not appear in long HTML');
  assert(longCaptured.body.htmlContent.includes('overflow-wrap:anywhere'), 'long content must keep wrapping styles');
  assertDesignedHtml(longCaptured.body.htmlContent, 'long-content HTML');
  assert(longCaptured.body.textContent.includes(longMessage), 'plain text should keep the long visitor message');
  console.log('ok  inbound email presentation cases');
  await stop(server);
  await stopHttp(mock.server);

  mock = await startBrevoMock((_req, res) => {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'bad request' }));
  });
  const failPort = String(Number(port) + 3);
  const failBase = `http://127.0.0.1:${failPort}`;
  server = startServer(failPort, {
    EMAIL_DRY_RUN: 'false',
    BREVO_API_URL: mock.url
  });
  await waitForHealth(server, failBase);
  const non2xx = await request(failBase, '/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validPayload)
  });
  assert(non2xx.status === 500, `non-2xx expected 500, got ${non2xx.status}`);
  assert(non2xx.body.success === false, 'non-2xx should not report success');
  assert(!JSON.stringify(non2xx.body).toLowerCase().includes('brevo'), 'client error must not mention Brevo');
  assert(!JSON.stringify(non2xx.body).includes(TEST_API_KEY), 'client error must not include API key');
  console.log('ok  Brevo API non-2xx response');
  await stop(server);
  await stopHttp(mock.server);
  mock = null;

  const netPort = String(Number(port) + 4);
  const netBase = `http://127.0.0.1:${netPort}`;
  server = startServer(netPort, {
    EMAIL_DRY_RUN: 'false',
    BREVO_API_URL: 'http://127.0.0.1:9/v3/smtp/email'
  });
  await waitForHealth(server, netBase);
  const networkFail = await request(netBase, '/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validPayload)
  });
  assert(networkFail.status === 500, `network failure expected 500, got ${networkFail.status}`);
  assert(!JSON.stringify(networkFail.body).includes(TEST_API_KEY), 'network error must not include API key');
  console.log('ok  Brevo API network failure');

  console.log('\nAll contact API checks passed.');
} catch (error) {
  failed = 1;
  console.error(error.message || error);
} finally {
  if (server) await stop(server);
  if (mock && mock.server) await stopHttp(mock.server);
  process.exit(failed);
}
