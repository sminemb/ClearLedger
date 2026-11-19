import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as model from '../dist/model.mjs';

async function editorApp() {
  const nodes = new Map();
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, {
      value: '', disabled: false, dataset: {}, listeners: {},
      addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); },
      async emit(type, properties = {}) {
        const event = new Event(type, { cancelable: true });
        for (const [key, value] of Object.entries({ target: this, ...properties })) Object.defineProperty(event, key, { value });
        await Promise.all((this.listeners[type] || []).map(listener => listener(event)));
        return event;
      },
      showModal() { this.open = true; }, close() { this.open = false; }, focus() {},
    });
    return nodes.get(selector);
  };
  const form = node('#transaction-form');
  form.elements = ['description', 'amount', 'date', 'type', 'category'].map(name => node(name));
  for (const name of ['description', 'amount', 'date', 'type', 'category']) form.elements[name] = node(name);
  form.elements.push(node('save'), node('cancel'), node('close'), node('#delete'));
  form.reset = () => { for (const control of form.elements) control.value = ''; form.elements.type.value = 'expense'; form.elements.category.value = 'Other'; };
  const document = node('document');
  document.querySelector = node; document.querySelectorAll = () => [];
  const writes = [];
  const fetch = async (_url, options) => {
    if (options.method === 'GET') return { ok: true, json: async () => ({ state: model.empty(), revision: 0, account: 'test@example.com' }) };
    return new Promise(resolve => writes.push({ body: JSON.parse(options.body), respond: (ok = true) => resolve({ ok, status: ok ? 200 : 500, json: async () => ok ? { revision: writes.length } : { error: 'Save failed' } }) }));
  };
  const source = (await readFile(new URL('../dist/app.js', import.meta.url), 'utf8')).replace(/^import [^\n]*\n/, '');
  const run = new (async () => {}).constructor('document', 'fetch', 'setTimeout', 'clearTimeout', ...Object.keys(model), source + '\nreturn { openEditor };');
  const app = await run(document, fetch, () => 0, () => {}, ...Object.values(model));
  const close = () => document.emit('click', { target: { closest: () => ({ dataset: {}, matches: () => false, hasAttribute: name => name === 'data-close' }) } });
  app.openEditor();
  form.elements.description.value = 'Transaction A'; form.elements.amount.value = '12.34';
  return { ...app, node, form, writes, close };
}

test('a delayed save locks the editor until completion, then permits a new draft', async () => {
  const app = await editorApp();
  const pending = app.form.emit('submit');
  await app.close();
  assert.equal(app.node('#editor').open, true, 'Cancel and Close must leave the saving editor open');
  assert.equal((await app.node('#editor').emit('cancel')).defaultPrevented, true, 'Escape must be prevented');
  app.openEditor();
  assert.equal(app.form.elements.description.value, 'Transaction A', 'reopening must not reset the saving draft');
  assert.ok(app.form.elements.every(control => control.disabled), 'all editor controls must be locked');
  await app.form.emit('submit');
  assert.equal(app.writes.length, 1, 'repeated submit must not start another save');
  assert.equal(app.node('#form-error').textContent, '');
  app.writes[0].respond(); await pending;
  assert.equal(app.node('#editor').open, false);
  assert.equal(app.writes[0].body.state.transactions[0].description, 'Transaction A');
  assert.ok(app.form.elements.every(control => !control.disabled));
  app.openEditor(); app.form.elements.description.value = 'Transaction B';
  await Promise.resolve();
  assert.equal(app.node('#editor').open, true);
  assert.equal(app.form.elements.description.value, 'Transaction B');
  await app.close(); assert.equal(app.node('#editor').open, false);
  assert.equal((await app.node('#editor').emit('cancel')).defaultPrevented, false);
});

test('a failed delayed save unlocks the editor and preserves the draft for retry', async () => {
  const app = await editorApp();
  const pending = app.form.emit('submit');
  app.writes[0].respond(false); await pending;
  assert.equal(app.node('#editor').open, true);
  assert.equal(app.form.elements.description.value, 'Transaction A');
  assert.equal(app.form.elements.amount.value, '12.34');
  assert.ok(app.form.elements.every(control => !control.disabled));
  assert.match(app.node('#form-error').textContent, /not saved/);
  const retry = app.form.emit('submit');
  assert.equal(app.writes.length, 2);
  app.writes[1].respond(); await retry;
  assert.equal(app.node('#editor').open, false);
});
