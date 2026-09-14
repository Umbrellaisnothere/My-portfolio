#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function startServer(port, extraEnv = {}) {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      EMAIL_DRY_RUN: 'true',
      EMAIL_USER: 'sender@example.com',
      EMAIL_PASS: 'not-a-real-password',
      EMAIL_TO: 'inbox@example.com',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_SECURE: 'false',
      FRONTEND_URL: 'http://127.0.0.1:8000',
      TRUST_PROXY: 'false',
      RATE_LIMIT_MAX: '50',
      ...extraEnv
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  return child;
}

async function request(base, pathName, options = {}) {
  const response = await fetch(`${base}${pathName}`, options);
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body };
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

let failed = 0;
let server;

try {
  const port = process.env.TEST_PORT || '3011';
  const base = `http://127.0.0.1:${port}`;
  server = startServer(port);
  await waitForHealth(server, base);

  const health = await request(base, '/health');
  assert(health.status === 200 && health.body.status === 'ok', 'GET /health should return ok');
  assert(!JSON.stringify(health.body).toLowerCase().includes('pass'), 'health must not expose secrets');
  console.log('ok  GET /health');

  const valid = await request(base, '/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:8000' },
    body: JSON.stringify({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'Hello from the portfolio test suite.'
    })
  });
  assert(valid.status === 200 && valid.body.success === true, `valid submission failed: ${valid.status} ${JSON.stringify(valid.body)}`);
  console.log('ok  POST /send-email valid payload');

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

  console.log('\nAll contact API checks passed.');
} catch (error) {
  failed = 1;
  console.error(error.message || error);
} finally {
  if (server) await stop(server);
  process.exit(failed);
}
