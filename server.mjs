import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { empty, validate } from './dist/model.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const derive = (password, salt) => promisify(scrypt)(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 });
const digest = value => createHash('sha256').update(value).digest('hex');
const fail = (status, message) => Object.assign(Error(message), { status });
const cookieHeader = (token, age) => `clearledger_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}`;
const normalizeEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const authWindow = 15 * 60 * 1000;

export function createApp({ database = resolve(root, 'data/clearledger.sqlite') } = {}) {
  mkdirSync(dirname(database), { recursive: true });
  const db = new DatabaseSync(database);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ledgers (user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, state TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS password_recovery (user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL, expires INTEGER NOT NULL);`);
  function generateRecoveryCode(email) {
    const code = randomBytes(16).toString('hex');
    const result = db.prepare(`INSERT INTO password_recovery(user_id,token_hash,expires)
      SELECT id,?,? FROM users WHERE email=?
      ON CONFLICT(user_id) DO UPDATE SET token_hash=excluded.token_hash, expires=excluded.expires`)
      .run(digest(code), Date.now() + authWindow, normalizeEmail(email));
    if (!result.changes) throw fail(404, 'No local account matches that email.');
    return code;
  }
  // shortcut: one loopback server uses an in-memory limiter; use a shared limiter before hosting multiple instances.
  const attempts = new Map();
  const server = createServer(async (req, res) => {
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const host = req.headers.host;
      if (!/^(localhost|127\.0\.0\.1):\d+$/.test(host || '')) throw fail(403, 'Use the local server address.');
      const path = new URL(req.url, `http://${host}`).pathname;
      if (!path.startsWith('/api/')) {
        const files = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/model.mjs': ['model.mjs', 'text/javascript'], '/styles.css': ['styles.css', 'text/css'] };
        if (req.method !== 'GET' || !files[path]) throw fail(404, 'Not found.');
        const [file, type] = files[path]; res.writeHead(200, { 'Content-Type': type }); res.end(readFileSync(resolve(root, 'dist', file))); return;
      }
      let body;
      if (req.method !== 'GET') {
        if (req.headers.origin !== `http://${host}` || req.headers['sec-fetch-site'] === 'cross-site') throw fail(403, 'Request origin is not allowed.');
        if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw fail(415, 'Send JSON data.');
        const chunks = []; let size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > 2 * 1024 * 1024) throw fail(413, 'Ledger is too large. Export a backup before reducing its size.'); chunks.push(chunk); }
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw fail(400, 'Invalid JSON.'); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail(400, 'Invalid request.');
      }
      const token = req.headers.cookie?.match(/(?:^|;\s*)clearledger_session=([a-f0-9]{64})(?:;|$)/)?.[1];
      if (path === '/api/logout' && req.method === 'POST') {
        if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));
        res.setHeader('Set-Cookie', cookieHeader('', 0)); send(200, {}); return;
      }
      db.prepare('DELETE FROM sessions WHERE expires <= ?').run(Date.now());
      const user = token && db.prepare('SELECT users.id, users.email FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=?').get(digest(token));
      if (req.method === 'POST' && ['/api/register', '/api/login', '/api/reset-password'].includes(path)) {
        const now = Date.now();
        for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
        const address = req.socket.remoteAddress;
        const attempt = attempts.get(address) || { count: 0, until: now + authWindow };
        attempts.set(address, attempt);
        if (++attempt.count > 20) throw fail(429, 'Too many account attempts. Try again in 15 minutes.');
        const email = normalizeEmail(body.email);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128) throw fail(400, 'Enter a valid email and a password of 12–128 characters.');
        let account = db.prepare('SELECT * FROM users WHERE email=?').get(email);
        if (path === '/api/reset-password') {
          const invalidCode = () => fail(400, 'The recovery code is invalid or expired. Check the email and code, or generate a new code.');
          const code = typeof body.code === 'string' ? body.code.trim().toLowerCase() : '';
          if (!account || !/^[a-f0-9]{32}$/.test(code)) throw invalidCode();
          const codeHash = digest(code);
          if (!db.prepare('SELECT 1 FROM password_recovery WHERE user_id=? AND token_hash=? AND expires>?').get(account.id, codeHash, now)) throw invalidCode();
          const salt = randomBytes(16).toString('hex');
          const hash = (await derive(body.password, salt)).toString('hex');
          db.exec('BEGIN IMMEDIATE');
          try {
            const used = db.prepare('DELETE FROM password_recovery WHERE user_id=? AND token_hash=? AND expires>?').run(account.id, codeHash, Date.now());
            if (!used.changes) throw invalidCode();
            db.prepare('UPDATE users SET salt=?,password_hash=? WHERE id=?').run(salt, hash, account.id);
            db.prepare('DELETE FROM sessions WHERE user_id=?').run(account.id);
            db.exec('COMMIT');
          } catch (error) { db.exec('ROLLBACK'); throw error; }
          if (user?.id === account.id) res.setHeader('Set-Cookie', cookieHeader('', 0));
          send(200, {}); return;
        }
        if (path === '/api/register') {
          const salt = randomBytes(16).toString('hex'); const hash = (await derive(body.password, salt)).toString('hex');
          if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) throw fail(409, 'An account with this email already exists. Sign in instead.');
          db.exec('BEGIN');
          try {
            const result = db.prepare('INSERT INTO users(email,salt,password_hash) VALUES(?,?,?)').run(email, salt, hash);
            account = { id: Number(result.lastInsertRowid), password_hash: hash };
            db.prepare('INSERT INTO ledgers(user_id,state) VALUES(?,?)').run(account.id, JSON.stringify(empty())); db.exec('COMMIT');
          } catch (error) { db.exec('ROLLBACK'); throw error; }
        } else {
          const hash = await derive(body.password, account?.salt || 'missing-account-salt');
          if (!account || !timingSafeEqual(hash, Buffer.from(account.password_hash, 'hex'))) throw fail(401, 'Email or password is incorrect.');
        }
        const session = randomBytes(32).toString('hex'); const age = 7 * 24 * 60 * 60;
        // The password may have been reset while scrypt was running.
        const issued = db.prepare('INSERT INTO sessions SELECT ?,id,? FROM users WHERE id=? AND password_hash=?')
          .run(digest(session), Date.now() + age * 1000, account.id, account.password_hash);
        if (!issued.changes) throw fail(401, 'Email or password is incorrect.');
        if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));
        res.setHeader('Set-Cookie', cookieHeader(session, age)); send(path === '/api/register' ? 201 : 200, { email }); return;
      }
      if (!user) throw fail(401, 'Sign in to open your ledger.');
      if (path === '/api/session' && req.method === 'GET') { send(200, { email: user.email }); return; }
      if (path === '/api/ledger' && req.method === 'GET') {
        const ledger = db.prepare('SELECT state,revision FROM ledgers WHERE user_id=?').get(user.id);
        send(200, { state: JSON.parse(ledger.state), revision: ledger.revision, account: user.email }); return;
      }
      if (path === '/api/ledger' && req.method === 'PUT') {
        if (body.account !== user.email) throw fail(409, 'The signed-in account changed. Reload before saving.');
        try { validate(body.state); } catch (error) { throw fail(400, error.message); }
        if (!Number.isSafeInteger(body.revision) || body.revision < 0) throw fail(400, 'Invalid ledger revision.');
        const update = db.prepare('UPDATE ledgers SET state=?,revision=revision+1 WHERE user_id=? AND revision=?').run(JSON.stringify(body.state), user.id, body.revision);
        if (!update.changes) throw fail(409, 'Records changed in another tab. Download a backup, then reload before saving.');
        send(200, { revision: body.revision + 1 }); return;
      }
      throw fail(404, 'Not found.');
    } catch (error) { if (!error.status) console.error('Local server request failed:', error.code || error.name); send(error.status || 500, { error: error.status ? error.message : 'The server could not save or load records. Your previous records are unchanged.' }); }
  });
  return { server, generateRecoveryCode, close: () => new Promise((resolveClose, reject) => server.close(error => {
    db.close();
    if (error && error.code !== 'ERR_SERVER_NOT_RUNNING') reject(error);
    else resolveClose();
  })) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = createApp();
  if (process.argv[2] === 'recovery-code') {
    try {
      if (process.argv.length !== 4) throw fail(400, 'Usage: npm run recovery-code -- you@example.com');
      console.log(`Recovery code (expires in 15 minutes): ${app.generateRecoveryCode(process.argv[3])}`);
    } catch (error) {
      console.error(error.status ? error.message : 'Could not generate a recovery code.');
      process.exitCode = 1;
    } finally { await app.close(); }
  } else {
    const port = Number(process.env.PORT || 4173);
    app.server.listen(port, '127.0.0.1', () => console.log(`ClearLedger: http://localhost:${port}`));
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await app.close(); process.exit(0); });
  }
}
