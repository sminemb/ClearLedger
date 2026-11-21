import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from '../server.mjs';
import { empty } from '../dist/model.mjs';

test('page errors return HTML with the correct status and a way back to the overview', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'clearledger-errors-'));
  let app;
  t.after(async () => {
    await app?.close();
    await rm(dir, { recursive: true, force: true });
  });
  const dist = join(dir, 'dist');
  await mkdir(dist);
  for (const file of ['server.mjs', 'error-page.mjs', 'dist/model.mjs', 'dist/styles.css']) {
    await copyFile(new URL(`../${file}`, import.meta.url), join(dir, file));
  }
  const fixture = await import(pathToFileURL(join(dir, 'server.mjs')).href);
  app = fixture.createApp({ database: ':memory:' });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;

  const serverLog = t.mock.method(console, 'error', () => {});
  for (const [path, status, heading, action] of [
    ['/old/link', 404, 'Page not found', 'Back to overview'],
    ['/', 500, 'This page couldn’t load', 'Try again'],
  ]) {
    const response = await fetch(base + path);
    assert.equal(response.status, status);
    assert.match(response.headers.get('content-type'), /^text\/html/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const html = await response.text();
    assert.ok(html.includes(`<h1 id="error-title">${heading}</h1>`));
    assert.ok(html.includes(`href="/">${action}</a>`));
    assert.ok(html.includes('href="/styles.css"'));
  }
  assert.equal(serverLog.mock.callCount(), 1);

  const head = await fetch(`${base}/old/link`, { method: 'HEAD' });
  assert.equal(head.status, 404);
  assert.equal(head.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(await head.text(), '');

  const asset = await fetch(`${base}/missing.css`, { headers: { 'Sec-Fetch-Dest': 'style' } });
  assert.equal(asset.status, 404);
  assert.deepEqual(await asset.json(), { error: 'Not found.' });
  const api = await fetch(`${base}/api/ledger`, { headers: { Accept: 'text/html' } });
  assert.equal(api.status, 401);
  assert.deepEqual(await api.json(), { error: 'Sign in to open your ledger.' });

  await copyFile(new URL('../dist/index.html', import.meta.url), join(dist, 'index.html'));
  assert.equal((await fetch(`${base}/`)).status, 200);
  assert.equal((await fetch(`${base}/styles.css`)).status, 200);
});

test('AI advice sends only the signed-in account’s selected month summary and returns structured text', async t => {
  const app = createApp({ database: ':memory:', geminiKey: 'test-key', geminiModel: 'gemini-3.5-flash-lite' });
  t.after(() => app.close());
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const advice = { summary: 'Review your food spending.', observations: ['Food spending exceeded its budget.'], nextSteps: ['Set a weekly food limit.'] };
  const providerRequests = [];
  let reply = advice;
  let finishReason = 'STOP';
  const realFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', (url, options) => {
    if (url.startsWith(base + '/')) return realFetch(url, options);
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
    providerRequests.push({ body: JSON.parse(options.body), headers: options.headers });
    const json = JSON.stringify(reply);
    return Response.json({ candidates: [{ finishReason, content: { role: 'model', parts: [
      { text: 'Thinking', thought: true }, { text: json.slice(0, 30) }, { text: json.slice(30) },
    ] } }] });
  });
  const request = (path, body, cookie = '', origin = base, method = 'POST') => fetch(base + path, {
    method, headers: { 'content-type': 'application/json', origin, cookie }, body: JSON.stringify(body),
  });
  const account = 'advice@example.com';
  const data = { month: '2026-11', account, revision: 0 };
  assert.equal((await request('/api/advice', data)).status, 401);
  const signup = await request('/api/register', { email: account, password: 'long enough password' });
  const cookie = signup.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('/api/advice', data, cookie, 'https://other.example')).status, 403);
  assert.equal((await request('/api/advice', { ...data, month: '2026-13' }, cookie)).status, 400);
  assert.equal((await request('/api/advice', { ...data, account: 'other@example.com' }, cookie)).status, 409);
  assert.equal((await request('/api/advice', data, cookie)).status, 422);
  assert.equal(providerRequests.length, 0);

  const state = empty();
  state.currency = 'PHP';
  state.budgets['2026-11'] = { 'Food & dining': 1000, Other: 0 };
  state.transactions = [
    { id: 'private-id', description: 'Private merchant name', amount: 1234, date: '2026-11-19', type: 'expense', category: 'Food & dining' },
    { id: 'other-month', description: 'October records', amount: 999, date: '2026-10-19', type: 'income', category: 'Other' },
  ];
  assert.equal((await request('/api/ledger', { state, revision: 0, account }, cookie, base, 'PUT')).status, 200);
  assert.equal((await request('/api/advice', data, cookie)).status, 409);
  const response = await request('/api/advice', { ...data, revision: 1 }, cookie);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), advice);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const [{ body, headers }] = providerRequests;
  assert.equal(headers['x-goog-api-key'], 'test-key');
  assert.equal(body.generationConfig.responseMimeType, 'application/json');
  assert.deepEqual(body.generationConfig.responseJsonSchema.required, ['summary', 'observations', 'nextSteps']);
  assert.deepEqual(JSON.parse(body.contents[0].parts[0].text), {
    month: '2026-11', currency: 'PHP', income: 0, expenses: 1234, remaining: -1234,
    spendingByCategory: { Housing: 0, 'Food & dining': 1234, Shopping: 0, Transport: 0, Entertainment: 0, Other: 0 },
    budgets: { 'Food & dining': 1000, Other: 0 },
  });

  reply = { ...advice, nextSteps: [] };
  assert.equal((await request('/api/advice', { ...data, revision: 1 }, cookie)).status, 502);
  reply = advice;
  finishReason = 'MAX_TOKENS';
  assert.equal((await request('/api/advice', { ...data, revision: 1 }, cookie)).status, 502);
});

test('accounts isolate data, reject unsafe writes, and survive a server restart', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clearledger-'));
  let app;
  const start = async () => {
    app = createApp({ database: join(dir, 'test.sqlite'), geminiKey: '' });
    await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${app.server.address().port}`;
  };
  let base = await start();
  const request = (path, method = 'GET', body, cookie = '', origin = base) => fetch(base + path, {
    method, headers: { 'content-type': 'application/json', origin, cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const credentials = { email: 'one@example.com', password: 'long enough password' };
  try {
    assert.equal((await request('/api/ledger')).status, 401);
    assert.equal((await request('/api/register', 'POST', credentials, '', 'https://evil.example')).status, 403);
    const signup = await request('/api/register', 'POST', credentials);
    assert.equal(signup.status, 201);
    const cookie = signup.headers.get('set-cookie').split(';')[0];
    assert.match(signup.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    assert.equal((await request('/api/login', 'POST', { ...credentials, password: 'wrong password' })).status, 401);
    const state = empty(); state.currency = 'PHP'; state.budgets['2026-11'] = { Housing: 10000 };
    state.transactions.push({ id: 'test', description: 'Café ☕', amount: 1234, date: '2026-11-19', type: 'expense', category: 'Other' });
    const write = { state, revision: 0, account: credentials.email };
    assert.equal((await request('/api/ledger', 'PUT', write, cookie)).status, 200);
    const adviceWithoutKey = await request('/api/advice', 'POST', { month: '2026-11', account: credentials.email, revision: 1 }, cookie);
    assert.equal(adviceWithoutKey.status, 503);
    assert.match((await adviceWithoutKey.json()).error, /GEMINI_API_KEY/);
    assert.equal((await request('/api/ledger', 'PUT', write, cookie)).status, 409);
    assert.equal((await request('/api/ledger', 'PUT', { ...write, state: {}, revision: 1 }, cookie)).status, 400);
    const other = await request('/api/register', 'POST', { ...credentials, email: 'two@example.com' });
    const otherCookie = other.headers.get('set-cookie').split(';')[0];
    assert.equal((await request('/api/ledger', 'PUT', write, otherCookie)).status, 409);
    assert.deepEqual((await (await request('/api/ledger', 'GET', undefined, otherCookie)).json()).state, empty());
    await app.close(); base = await start();
    assert.deepEqual((await (await request('/api/ledger', 'GET', undefined, cookie)).json()).state, state);
    assert.equal((await request('/api/logout', 'POST', {}, cookie, 'https://foreign.example')).status, 403);
    for (let i = 0; i < 2; i++) {
      const logout = await request('/api/logout', 'POST', {}, cookie);
      assert.equal(logout.status, 200);
      assert.match(logout.headers.get('set-cookie'), /clearledger_session=;.*Max-Age=0/);
    }
    assert.equal((await request('/api/ledger', 'GET', undefined, cookie)).status, 401);
    const login = await request('/api/login', 'POST', credentials);
    assert.equal(login.status, 200);
    const loginCookie = login.headers.get('set-cookie').split(';')[0];
    const database = new DatabaseSync(join(dir, 'test.sqlite'));
    const stored = database.prepare('SELECT password_hash FROM users WHERE email=?').get(credentials.email);
    assert.notEqual(stored.password_hash, credentials.password);
    assert.equal(stored.password_hash.length, 128);
    database.prepare('UPDATE sessions SET expires=0 WHERE user_id=(SELECT id FROM users WHERE email=?)').run(credentials.email); database.close();
    assert.equal((await request('/api/session', 'GET', undefined, loginCookie)).status, 401);
    for (let i = 0; i < 19; i++) assert.equal((await request('/api/login', 'POST', {})).status, 400);
    assert.equal((await request('/api/login', 'POST', {})).status, 429);
    assert.equal((await request('/data/test.sqlite')).status, 404);

    const reset = { email: credentials.email, password: 'new password for this ledger' };
    const requestCode = (email, origin = base) => request('/api/request-recovery-code', 'POST', { email }, '', origin);
    assert.equal((await request('/api/reset-password', 'POST', reset)).status, 429);
    assert.equal((await requestCode(credentials.email)).status, 429);
    assert.throws(() => app.generateRecoveryCode('unknown@example.com'), /No local account/);
    const expired = app.generateRecoveryCode(credentials.email);
    const recoveryDb = new DatabaseSync(join(dir, 'test.sqlite'));
    const storedCode = recoveryDb.prepare('SELECT token_hash FROM password_recovery').get();
    assert.match(storedCode.token_hash, /^[a-f0-9]{64}$/);
    assert.notEqual(storedCode.token_hash, expired);
    recoveryDb.prepare('UPDATE password_recovery SET expires=0').run();
    recoveryDb.close();

    await app.close(); base = await start();
    const resetWith = (code, fields = {}, origin = base) => request('/api/reset-password', 'POST', { ...reset, code, ...fields }, '', origin);
    assert.equal((await resetWith(expired)).status, 400);
    const superseded = app.generateRecoveryCode(credentials.email);
    assert.equal((await requestCode(credentials.email, 'https://foreign.example')).status, 403);
    assert.equal((await requestCode('invalid')).status, 400);
    const missing = await requestCode('unknown@example.com');
    assert.equal(missing.status, 200);
    const missingFile = await missing.json();
    assert.match(missingFile.filename, /^recovery-[a-f0-9]+\.txt$/);
    await assert.rejects(readFile(join(dir, missingFile.filename)), { code: 'ENOENT' });
    const issued = await requestCode(` ${credentials.email.toUpperCase()} `);
    assert.equal(issued.status, 200);
    const location = await issued.json();
    assert.deepEqual(Object.keys(location), ['filename']);
    assert.deepEqual(Object.keys(missingFile), ['filename']);
    assert.equal((await request('/data/' + location.filename)).status, 404);
    const codeFile = join(dir, location.filename);
    const code = (await readFile(codeFile, 'utf8')).trim();
    assert.match(code, /^[a-f0-9]{32}$/);
    assert.deepEqual(await (await requestCode(credentials.email)).json(), location);
    assert.equal((await readFile(codeFile, 'utf8')).trim(), code);
    assert.equal((await resetWith(superseded)).status, 400);
    assert.equal((await resetWith(code, { email: 'two@example.com' })).status, 400);
    assert.equal((await resetWith(code, { password: 'too short' })).status, 400);
    assert.equal((await resetWith(code, {}, 'https://foreign.example')).status, 403);
    const freshCookies = await Promise.all([0, 1].map(async () => {
      const response = await request('/api/login', 'POST', credentials);
      assert.equal(response.status, 200);
      return response.headers.get('set-cookie').split(';')[0];
    }));

    await app.close(); base = await start();
    const results = await Promise.all([resetWith(code), resetWith(code)]);
    assert.deepEqual(results.map(response => response.status).sort(), [200, 400]);
    assert.equal((await resetWith(code)).status, 400);
    for (const oldCookie of freshCookies) assert.equal((await request('/api/session', 'GET', undefined, oldCookie)).status, 401);
    assert.equal((await request('/api/session', 'GET', undefined, otherCookie)).status, 200);
    assert.equal((await request('/api/login', 'POST', credentials)).status, 401);
    const recovered = await request('/api/login', 'POST', reset);
    assert.equal(recovered.status, 200);
    const ledger = await request('/api/ledger', 'GET', undefined, recovered.headers.get('set-cookie').split(';')[0]);
    assert.deepEqual(await ledger.json(), { state, revision: 1, account: credentials.email });
  } finally { await app.close(); await rm(dir, { recursive: true, force: true }); }
});
