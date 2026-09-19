// Contact-form worker tests: Turnstile verification, honeypot and timing gate.
// Run with: npm test  (node --test, Node >= 22.6 strips TypeScript types natively)
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.ts';

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RESEND = 'https://api.resend.com/emails';
const ENDPOINT = 'https://hulsman.dev/api/contact';

type Call = { url: string; init: RequestInit | undefined };

interface StubOptions {
  verify?: Record<string, unknown> | 'network-error';
  resendOk?: boolean;
}

let calls: Call[] = [];
const realFetch = globalThis.fetch;

function installFetch(opts: StubOptions = {}) {
  const verify = opts.verify ?? { success: true, hostname: 'hulsman.dev', action: 'contact', 'error-codes': [] };
  const resendOk = opts.resendOk ?? true;
  calls = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push({ url, init });
    if (url === SITEVERIFY) {
      if (verify === 'network-error') throw new TypeError('fetch failed');
      return new Response(JSON.stringify(verify), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url === RESEND) {
      return resendOk
        ? new Response(JSON.stringify({ id: 'email_123' }), { status: 200 })
        : new Response('nope', { status: 500 });
    }
    throw new Error(`Unexpected fetch to ${url}`);
  }) as typeof fetch;
}

function siteverifyCalls() { return calls.filter((c) => c.url === SITEVERIFY); }
function resendCalls() { return calls.filter((c) => c.url === RESEND); }

function makeEnv(overrides: Record<string, unknown> = {}) {
  return {
    ASSETS: { fetch: async () => new Response('asset', { status: 200 }) },
    TO_EMAIL: 'info@hulsman.dev',
    FROM_EMAIL: 'contact@resume.hulsman.dev',
    FROM_NAME: 'Contact Form',
    RESEND_API_KEY: 'resend-key',
    TURNSTILE_SECRET_KEY: 'ts-secret',
    ...overrides,
  } as any;
}

const GOOD_FIELDS: Record<string, string> = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'Hello, I would like to talk about a project.',
  website: '',
  elapsed: '12000',
  'cf-turnstile-response': 'tok_abc',
};

function post(fields: Record<string, string | undefined>, headers: Record<string, string> = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) fd.set(k, v);
  }
  return new Request(ENDPOINT, { method: 'POST', body: fd, headers });
}

async function submit(fields: Record<string, string | undefined>, env = makeEnv(), headers: Record<string, string> = {}) {
  const res = await worker.fetch(post(fields, headers), env);
  const body = (await res.json()) as Record<string, unknown>;
  return { res, body };
}

beforeEach(() => installFetch());
afterEach(() => { globalThis.fetch = realFetch; });

test('valid submission with a verified token sends the email', async () => {
  const { res, body } = await submit(GOOD_FIELDS, makeEnv(), { 'CF-Connecting-IP': '203.0.113.7' });
  assert.equal(res.status, 200);
  assert.equal(body.success, true);

  assert.equal(siteverifyCalls().length, 1, 'siteverify called once');
  const init = siteverifyCalls()[0].init!;
  assert.equal(init.method, 'POST');
  const params = new URLSearchParams(String(init.body));
  assert.equal(params.get('secret'), 'ts-secret');
  assert.equal(params.get('response'), 'tok_abc');
  assert.equal(params.get('remoteip'), '203.0.113.7');

  assert.equal(resendCalls().length, 1, 'email sent once');
  const emailBody = JSON.parse(String(resendCalls()[0].init!.body));
  assert.equal(emailBody.reply_to, 'ada@example.com');
  assert.ok(String(emailBody.html).includes('Ada Lovelace'));
});

test('siteverify is called before the email is sent', async () => {
  await submit(GOOD_FIELDS);
  assert.equal(calls[0].url, SITEVERIFY);
  assert.equal(calls[1].url, RESEND);
});

test('missing Turnstile token is rejected without calling siteverify', async () => {
  const { res, body } = await submit({ ...GOOD_FIELDS, 'cf-turnstile-response': undefined });
  assert.equal(res.status, 400);
  assert.match(String(body.error), /verification/i);
  assert.equal(siteverifyCalls().length, 0);
  assert.equal(resendCalls().length, 0);
});

test('oversized Turnstile token is rejected without calling siteverify', async () => {
  const { res } = await submit({ ...GOOD_FIELDS, 'cf-turnstile-response': 'x'.repeat(2049) });
  assert.equal(res.status, 400);
  assert.equal(siteverifyCalls().length, 0);
  assert.equal(resendCalls().length, 0);
});

test('siteverify failure is rejected and no email is sent', async () => {
  installFetch({ verify: { success: false, 'error-codes': ['invalid-input-response'] } });
  const { res, body } = await submit(GOOD_FIELDS);
  assert.equal(res.status, 400);
  assert.match(String(body.error), /verification/i);
  assert.equal(resendCalls().length, 0);
});

test('token issued for a different hostname is rejected', async () => {
  installFetch({ verify: { success: true, hostname: 'evil.example', action: 'contact' } });
  const { res } = await submit(GOOD_FIELDS);
  assert.equal(res.status, 400);
  assert.equal(resendCalls().length, 0);
});

test('token issued for a different action is rejected', async () => {
  installFetch({ verify: { success: true, hostname: 'hulsman.dev', action: 'login' } });
  const { res } = await submit(GOOD_FIELDS);
  assert.equal(res.status, 400);
  assert.equal(resendCalls().length, 0);
});

test('siteverify network error is rejected and no email is sent', async () => {
  installFetch({ verify: 'network-error' });
  const { res, body } = await submit(GOOD_FIELDS);
  assert.equal(res.status, 400);
  assert.match(String(body.error), /verification/i);
  assert.equal(resendCalls().length, 0);
});

test('filled honeypot returns a success-shaped response but sends nothing', async () => {
  const { res, body } = await submit({ ...GOOD_FIELDS, website: 'https://spam.example' });
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(siteverifyCalls().length, 0);
  assert.equal(resendCalls().length, 0);
});

for (const [label, elapsed] of [
  ['missing', undefined],
  ['too fast', '1500'],
  ['negative', '-5'],
  ['non-numeric', 'abc'],
] as const) {
  test(`elapsed ${label} returns a success-shaped response but sends nothing`, async () => {
    const { res, body } = await submit({ ...GOOD_FIELDS, elapsed });
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(siteverifyCalls().length, 0);
    assert.equal(resendCalls().length, 0);
  });
}

test('elapsed exactly at the threshold is accepted', async () => {
  const { res } = await submit({ ...GOOD_FIELDS, elapsed: '3000' });
  assert.equal(res.status, 200);
  assert.equal(resendCalls().length, 1);
});

test('missing TURNSTILE_SECRET_KEY fails closed', async () => {
  const { res, body } = await submit(GOOD_FIELDS, makeEnv({ TURNSTILE_SECRET_KEY: undefined }));
  assert.equal(res.status, 500);
  assert.equal(body.success, undefined);
  assert.equal(siteverifyCalls().length, 0);
  assert.equal(resendCalls().length, 0);
});

test('invalid email address is still rejected with 400', async () => {
  const { res } = await submit({ ...GOOD_FIELDS, email: 'not-an-email' });
  assert.equal(res.status, 400);
  assert.equal(siteverifyCalls().length, 0);
  assert.equal(resendCalls().length, 0);
});

test('Resend failure surfaces as 500 after successful verification', async () => {
  installFetch({ resendOk: false });
  const { res } = await submit(GOOD_FIELDS);
  assert.equal(res.status, 500);
  assert.equal(siteverifyCalls().length, 1);
});
