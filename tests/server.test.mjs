import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from '../server.mjs';
import { empty } from '../dist/model.mjs';

test('accounts isolate data, reject unsafe writes, and survive a server restart', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clearledger-'));
  let app;
  const start = async () => {
    app = createApp({ database: join(dir, 'test.sqlite') });
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
    assert.equal((await request('/api/ledger', 'PUT', write, cookie)).status, 409);
    assert.equal((await request('/api/ledger', 'PUT', { ...write, state: {}, revision: 1 }, cookie)).status, 400);
    const other = await request('/api/register', 'POST', { ...credentials, email: 'two@example.com' });
    const otherCookie = other.headers.get('set-cookie').split(';')[0];
    assert.equal((await request('/api/ledger', 'PUT', write, otherCookie)).status, 409);
    assert.deepEqual((await (await request('/api/ledger', 'GET', undefined, otherCookie)).json()).state, empty());
    await app.close(); base = await start();
    assert.deepEqual((await (await request('/api/ledger', 'GET', undefined, cookie)).json()).state, state);
    assert.equal((await request('/api/logout', 'POST', {}, cookie)).status, 200);
    assert.equal((await request('/api/ledger', 'GET', undefined, cookie)).status, 401);
    const login = await request('/api/login', 'POST', credentials);
    assert.equal(login.status, 200);
    const loginCookie = login.headers.get('set-cookie').split(';')[0];
    const database = new DatabaseSync(join(dir, 'test.sqlite'));
    const stored = database.prepare('SELECT password_hash FROM users WHERE email=?').get(credentials.email);
    assert.notEqual(stored.password_hash, credentials.password);
    assert.equal(stored.password_hash.length, 128);
    database.prepare('UPDATE sessions SET expires=0').run(); database.close();
    assert.equal((await request('/api/session', 'GET', undefined, loginCookie)).status, 401);
    for (let i = 0; i < 19; i++) assert.equal((await request('/api/login', 'POST', {})).status, 400);
    assert.equal((await request('/api/login', 'POST', {})).status, 429);
    assert.equal((await request('/data/test.sqlite')).status, 404);
  } finally { await app.close(); await rm(dir, { recursive: true, force: true }); }
});
