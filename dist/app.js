import { categories, colors, currencies, amount, validate, summary, csv, sample } from './model.mjs';
const $ = s => document.querySelector(s);
const paths = { home:'m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',list:'M5 4h14v17H5zM8 8h8M8 12h8M8 16h5',chart:'M5 21V11m7 10V4m7 17V8',settings:'m9 3-1 3-3 1-2 4 2 3 1 3 4 2 3-2 3-1 3-4-2-3-1-3-4-2-3 2ZM9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0',check:'M21 11v1a9 9 0 1 1-5-8M8 11l4 4 9-10',plus:'M12 5v14M5 12h14',close:'m6 6 12 12M6 18 18 6',refresh:'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1',food:'M5 3v6c0 3 6 3 6 0V3M8 3v18M19 3c-5 3-5 10 0 10V3Zm0 10v8',bag:'M5 7h14l2 14H3L5 7Zm3 1V6a4 4 0 0 1 8 0v2',train:'M6 3h12v14H6zM6 10h12M9 14h0m6 0h0M8 17l-3 4m11-4 3 4',ticket:'M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6Zm12 0v12',dots:'M4 12h1m6 0h1m6 0h1',edit:'m4 16 11-11 4 4L8 20l-5 1 1-5ZM14 6l4 4',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5' };
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.dots}"/></svg>`;
document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
const categoryIcon = ['home','food','bag','train','ticket','dots'];
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; };
const key = 'clearledger-v1';
let month = today().slice(0,7), state, demo = true, blocked = false, view = 'overview', editId = null, search = '', filterCategory = '', filterType = '';
let account = null, revision = 0, saving = false;
let advice = null, advicePending = false;
state = sample(month);
async function api(path, method = 'GET', body) {
  const response = await fetch('/api/' + path, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw Object.assign(Error(result.error), { status: response.status });
  return result;
}
async function loadAccount() {
  const ledger = await api('ledger');
  state = validate(ledger.state); revision = ledger.revision; account = ledger.account; demo = false; blocked = false;
  $('#notice').hidden = true; render();
}
function showRecoveryForm(recovering) {
  const authForm = $('#auth-form'), resetForm = $('#reset-form');
  clearFieldError(authForm);
  clearFieldError(resetForm);
  authForm.hidden = recovering;
  resetForm.hidden = !recovering;
  $('#auth-dialog').setAttribute('aria-labelledby', recovering ? 'reset-title' : 'auth-title');
}
function openAuth() {
  showRecoveryForm(false);
  $('#auth-error').textContent = ''; $('#auth-status').textContent = '';
  $('#auth-dialog').showModal();
}
$('#month').value = month;
const money = value => new Intl.NumberFormat(undefined,{style:'currency',currency:state.currency}).format(value/100);
const monthName = () => new Date(month+'-01T12:00:00').toLocaleDateString(undefined,{month:'long',year:'numeric'});
function showError(message) { $('#notice').textContent = message; $('#notice').hidden = false; }
function clearFieldError(form) {
  const field = form.querySelector('[aria-errormessage]');
  if (!field) return;
  const alert = form.querySelector('.form-error');
  field.removeAttribute('aria-invalid');
  field.removeAttribute('aria-errormessage');
  alert.textContent = '';
  form.querySelector('.dialog-actions, button[type="submit"]').before(alert);
}
document.addEventListener('invalid', event => {
  const field = event.target, form = field.form;
  const alert = form?.querySelector('.form-error');
  if (!alert) return;
  event.preventDefault();
  if (field !== form.querySelector(':invalid')) return;

  clearFieldError(form);
  const label = field.labels[0];
  const message = field.validity.patternMismatch && field.title ? field.title : field.validationMessage;
  (label.closest('.form-grid') || label).after(alert);
  alert.textContent = `${label.textContent.trim()}: ${message}`;
  field.setAttribute('aria-invalid', 'true');
  field.setAttribute('aria-errormessage', alert.id);
  field.focus();
}, true);
document.addEventListener('reset', event => clearFieldError(event.target));
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').hidden = true, 3500); }
async function commit(next) {
  if (blocked || saving) { showError('A save is in progress or records need attention. Wait or reload before saving.'); return false; }
  saving = true;
  for (const control of $('#transaction-form').elements) control.disabled = true;
  try {
    validate(next);
    if (!demo) {
      $('#save-status').textContent = 'Saving…';
      const result = await api('ledger', 'PUT', { state: next, revision, account }); revision = result.revision;
    }
    state = next; return true;
  } catch (error) {
    if (error.status === 401 || error.status === 409) blocked = true;
    showError(error.message || 'Could not save changes. Your previous records are unchanged.'); return false;
  } finally {
    saving = false;
    for (const control of $('#transaction-form').elements) control.disabled = false;
    $('#save-status').textContent = demo ? 'Exploring sample data' : blocked ? 'Reload required' : 'Saved to local database';
  }
}
function ask(message) {
  return new Promise(resolve => { const dialog=$('#confirm-dialog'); $('#confirm-message').textContent=message; dialog.returnValue='cancel'; dialog.addEventListener('close',()=>resolve(dialog.returnValue==='confirm'),{once:true}); dialog.showModal(); });
}
async function importBrowserRecords() {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) throw Error('No legacy browser records were found at this address. Open the old app address to download a JSON backup.');
    const next = validate(JSON.parse(raw));
    if (revision !== 0) throw Error('Import is available only for a new, untouched account ledger.');
    if (!await ask('Import this browser’s records into your account? The browser copy will remain untouched.')) return;
    if (await commit(next)) { render(); toast('Browser records imported.'); }
  } catch (error) { showError(error.message); }
}
function tag(category) { const index = categories.indexOf(category); return `<span class="category-tag">${icon(categoryIcon[index])}${escape(category)}</span>`; }
function totalsHTML(totals) { return `<section class="summary" aria-label="Monthly totals"><div><p>Income</p><strong>${money(totals.income)}</strong></div><div><p>Expenses</p><strong>${money(totals.expenses)}</strong></div><div><p>Remaining</p><strong class="remaining">${money(totals.remaining)}</strong></div></section>`; }
function breakdown(totals) {
  let position = 0;
  const segments = categories.map((c,i) => { const start=position; position += totals.expenses ? totals.categories[c]/totals.expenses*100 : 0; return `${colors[i]} ${start}% ${position}%`; });
  return `<section class="panel"><h2>Spending breakdown</h2><p class="panel-intro">Where your money went in ${escape(monthName())}.</p><div class="breakdown-body"><div class="donut" style="background:${totals.expenses?'conic-gradient('+segments.join(',')+')':'#e8ece1'}" role="img" aria-label="Total expenses ${escape(money(totals.expenses))}. Category amounts listed alongside."><div class="donut-label"><strong>${money(totals.expenses)}</strong><span>Total expenses</span></div></div><div class="legend">${categories.map((c,i)=>`<div class="legend-row"><span class="legend-name"><span class="swatch" style="background:${colors[i]}"></span>${escape(c)}</span><strong>${money(totals.categories[c])}</strong></div>`).join('')}</div></div></section>`;
}
function budgetItems(totals) {
  const budgets = state.budgets[month] || {};
  if (!Object.keys(budgets).length) return `<div class="empty"><h3>Give your spending a plan</h3><p>Set a category budget to see what’s left throughout the month.</p></div>`;
  return `<div class="budget-list">${Object.entries(budgets).map(([c,limit]) => {const spent=totals.categories[c], percent=limit ? Math.round(spent/limit*100) : spent ? 100 : 0;return `<div class="budget-item ${spent>limit?'over':''}"><div class="budget-title"><strong><span class="budget-icon" style="background:${colors[categories.indexOf(c)]}22">${icon(categoryIcon[categories.indexOf(c)])}</span>${escape(c)}</strong><span>${money(spent)} <span style="color:var(--muted)">/ ${money(limit)}</span></span></div><div class="budget-progress"><div class="track" aria-hidden="true"><span style="width:${Math.min(percent,100)}%"></span></div><span>${limit ? percent+'%' : '—'}</span></div><p class="budget-remaining ${spent>limit?'over-text':''}">${spent>limit?'Over budget by '+money(spent-limit):money(limit-spent)+' remaining'}</p></div>`;}).join('')}</div>`;
}
function transactionsHTML(recent=false) {
  let rows = state.transactions.filter(t => t.date.startsWith(month+'-')).sort((a,b)=>b.date.localeCompare(a.date));
  if (!recent) rows = rows.filter(t => t.description.toLowerCase().includes(search.toLowerCase()) && (!filterCategory || t.category === filterCategory) && (!filterType || t.type === filterType));
  if (recent) rows = rows.slice(0,5);
  return `<section class="panel"><div class="section-heading"><div><h2>${recent?'Recent transactions':'Transactions'}</h2><p class="panel-intro">${recent?'Your latest income and spending.':'Your everyday spending, all in one place.'}</p></div><button class="secondary" ${recent?'data-go="transactions"':'data-export'}>${recent?'View all transactions':icon('download')+'Export CSV'}</button></div>${recent?'':`<div class="filters"><input type="search" id="search" aria-label="Search transaction descriptions" placeholder="Search transactions…" value="${escape(search)}"><select id="category-filter" aria-label="Filter category"><option value="">All categories</option>${categories.map(c=>`<option ${filterCategory===c?'selected':''}>${escape(c)}</option>`).join('')}</select><select id="type-filter" aria-label="Filter transaction type"><option value="">All types</option><option value="expense" ${filterType==='expense'?'selected':''}>Expenses</option><option value="income" ${filterType==='income'?'selected':''}>Income</option></select></div>`}${rows.length?`<div class="table-wrap"><table><thead><tr><th scope="col">Date</th><th scope="col">Description</th><th scope="col">Category</th><th scope="col">Amount</th></tr></thead><tbody>${rows.map(t=>`<tr><td class="date-cell">${new Date(t.date+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'2-digit'})}</td><td><button class="description-button" data-edit="${escape(t.id)}" aria-label="Edit ${escape(t.description)}">${escape(t.description)}</button></td><td>${tag(t.category)}</td><td class="amount ${t.type==='income'?'income':''}">${t.type==='income'?'+':'−'}${money(t.amount)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty"><h3>${search||filterCategory||filterType?'No matching transactions':'A fresh page for '+escape(monthName())}</h3><p>${search||filterCategory||filterType?'Try another search or clear the filters.':'Add your first income or expense to start seeing the bigger picture.'}</p><button class="primary" data-add>${icon('plus')}Add transaction</button></div>`}</section>`;
}
function budgetsHTML(totals) {
  return `<section class="panel budget-form"><h2>Plan your month</h2><p class="panel-intro">Set limits for ${escape(monthName())}. Leave a field blank for no budget.</p><form id="budget-form">${categories.map(c=>`<div class="budget-edit-row"><div><h3>${escape(c)}</h3><p>${money(totals.categories[c])} spent this month</p></div><label><span class="sr-only">${escape(c)} budget in ${state.currency}</span><input inputmode="decimal" name="${escape(c)}" placeholder="No limit" pattern="[0-9]+([.][0-9]{1,2})?" title="Enter an amount with up to two decimal places." value="${state.budgets[month]?.[c]===undefined?'':(state.budgets[month][c]/100).toFixed(2)}"></label></div>`).join('')}<p id="budget-error" class="form-error" role="alert"></p><button class="primary" type="submit">Save budgets</button></form></section>`;
}
function adviceHTML(totals) {
  const canGenerate = !demo && !blocked && (totals.income || totals.expenses || Object.keys(state.budgets[month] ?? {}).length);
  let detail = 'Generating advice sends this month’s income, spending totals, and category budgets to Google Gemini.';
  if (demo) detail = 'Sign in to get budgeting suggestions for your own ledger.';
  else if (blocked) detail = 'Reload your ledger before generating advice.';
  else if (!canGenerate) detail = 'Add a transaction or set a budget for this month to get advice.';
  return `<section class="panel advice-panel" aria-labelledby="advice-title">
    <div class="section-heading">
      <div><h2 id="advice-title">AI Advice</h2><p class="panel-intro">${detail}</p></div>
      ${canGenerate ? '<button class="secondary" id="generate-advice" type="button">Generate advice</button>' : ''}
    </div>
    <p id="advice-status" class="panel-intro advice-status" role="status"></p>
    <div id="advice-result" class="advice-result"></div>
  </section>`;
}
function updateAdvice() {
  if (!advice || view !== 'overview') return;
  const button = $('#generate-advice');
  if (!button) return;
  const current = advice.month === month && advice.revision === revision && advice.account === account ? advice : null;
  const result = current?.result;
  button.setAttribute('aria-disabled', String(advicePending));
  button.textContent = advicePending ? 'Generating…' : result ? 'Generate again' : 'Generate advice';
  const status = $('#advice-status');
  status.className = result ? 'sr-only' : 'panel-intro advice-status';
  status.textContent = advicePending ? (current ? 'Generating advice for this month…' : 'Finishing an earlier advice request…') : current?.error || (result ? 'Your advice is ready.' : '');
  const items = list => list.map(item => `<li>${escape(item)}</li>`).join('');
  $('#advice-result').innerHTML = result ? `<h3>Summary</h3><p>${escape(result.summary)}</p>
    <div class="advice-details">
      <div><h3>Observations</h3><ul>${items(result.observations)}</ul></div>
      <div><h3>Next steps</h3><ol>${items(result.nextSteps)}</ol></div>
    </div>` : '';
}
async function requestAdvice() {
  if (demo || blocked || saving || advicePending) return;
  const request = { month, revision, account };
  advice = { ...request };
  advicePending = true;
  updateAdvice();
  try { advice.result = await api('advice', 'POST', request); }
  catch (error) { advice.error = error.status ? error.message : 'Could not load AI advice. Try again.'; }
  finally { advicePending = false; updateAdvice(); }
}
function settingsHTML() { return `<section class="panel settings-panel"><h2>Make it yours</h2><p>${account ? 'Signed in as ' + escape(account) + '. Records are saved in SQLite on this computer.' : 'Explore sample data, or sign in to save a personal ledger on this computer.'}</p><label>Display currency<select id="currency">${currencies.map(c=>`<option ${state.currency===c?'selected':''}>${c}</option>`).join('')}</select></label><p>Changing currency changes the label on existing amounts. It does not convert them using exchange rates.</p><hr><h2>Your records, in your hands</h2><p>Export your transactions as CSV for a spreadsheet, or download a full JSON copy of your records and budgets. Keep a backup of your records and the local database.</p><div class="settings-actions"><button class="secondary" data-export>${icon('download')}Export CSV</button><button class="secondary" id="backup">Download full backup</button></div>${blocked?'<button class="secondary" id="recovery">Download recovery data</button>':''}<small>${demo?'You’re exploring sample data. Changes in sample mode are temporary.':'Your account is available through this local server. No cloud syncing.'}</small>${demo?'<hr><button class="primary" id="settings-start">Sign in or create account</button>':'<hr><button class="secondary" id="import-browser">Import legacy browser records</button><button class="secondary" id="sign-out">Sign out</button>'}</section>`; }
function render() {
  const titles = {overview:['Your month, at a glance','A little clarity for your everyday spending.'],transactions:['Your transactions','Every entry brings a little more clarity.'],budgets:['A plan for your month','Spend with intention. Leave room for what matters.'],settings:['Your space, your settings','Simple preferences. Complete ownership.']};
  $('#page-title').textContent = titles[view][0]; $('#page-subtitle').textContent = titles[view][1];
  document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-current',b.dataset.view===view?'page':'false');});
  $('#demo-bar').hidden = !demo; $('#header-sign-out').hidden = demo;
  $('#save-status').textContent = demo?'Exploring sample data':blocked?'Reload required':'Saved to local database';
  const totals=summary(state,month);
  $('#content').innerHTML = view==='settings'?settingsHTML():totalsHTML(totals)+(view==='overview'?`<div class="overview-grid">${breakdown(totals)}<section class="panel"><h2>Monthly budget</h2><p class="panel-intro">Your spending against this month’s budgets.</p>${budgetItems(totals)}<button class="primary wide" data-go="budgets">${icon('edit')}Edit budgets</button></section></div>`+adviceHTML(totals)+transactionsHTML(true):view==='transactions'?transactionsHTML():budgetsHTML(totals));
  updateAdvice();
  $('#add').disabled = blocked; if ($('#currency')) $('#currency').disabled = blocked;
}
function navigate(next) { view=next; render(); }
function openEditor(id) {
  if (saving) return;
  editId = id || null; const form=$('#transaction-form'); form.reset();
  $('#editor-title').textContent = id?'Edit transaction':'Add transaction'; $('#delete').hidden = !id; $('#form-error').textContent='';
  form.elements.category.innerHTML = categories.map(c=>`<option>${escape(c)}</option>`).join('');
  $('.currency-label').textContent = state.currency;
  if (id) { const t=state.transactions.find(t=>t.id===id); for(const field of ['description','date','category','type']) form.elements[field].value=t[field]; form.elements.amount.value=(t.amount/100).toFixed(2); }
  else form.elements.date.value = today().startsWith(month)?today():month+'-01';
  $('#editor').showModal(); form.elements.description.focus();
}
function download(text,name,type) { const url=URL.createObjectURL(new Blob([text],{type})); const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
document.addEventListener('click',async event=>{
  const button=event.target.closest('button'); if(!button)return;
  if(button.dataset.view)navigate(button.dataset.view);
  if(button.dataset.go)navigate(button.dataset.go);
  if(button.matches('#add,[data-add]'))openEditor();
  if(button.dataset.edit)openEditor(button.dataset.edit);
  if(button.hasAttribute('data-close') && !saving)$('#editor').close();
  if(button.matches('#start-fresh,#settings-start'))openAuth();
  if(button.id==='generate-advice') await requestAdvice();
  if(button.hasAttribute('data-export'))download(csv(state),'clearledger-transactions.csv','text/csv;charset=utf-8');
  if(button.id==='import-browser') await importBrowserRecords();
  if(button.id==='sign-out' || button.id==='header-sign-out') {
    if (saving) return;
    saving = true;
    button.disabled = true;
    try { await api('logout', 'POST', {}); location.reload(); }
    catch (error) { saving = false; button.disabled = false; showError(error.message); }
  }
  if(button.id==='backup')download(JSON.stringify(state,null,2),'clearledger-backup.json','application/json');
  if(button.id==='recovery') { try {download(localStorage.getItem(key)||'','clearledger-recovery.txt','text/plain');}catch{showError('Browser storage is unavailable. Allow storage access and reload.');} }
});
$('.brand').addEventListener('click',()=>navigate('overview'));
$('#month').addEventListener('change',()=>{const value=$('#month').value;if(!/^\d{4}-\d{2}$/.test(value))return;month=value;render();});
document.addEventListener('change',async event=>{
  if(event.target.id==='category-filter'){filterCategory=event.target.value;render();}
  if(event.target.id==='type-filter'){filterType=event.target.value;render();}
  if(event.target.id==='currency'){const next=structuredClone(state);next.currency=event.target.value;if(await commit(next)){render();toast('Display currency updated.');}else event.target.value=state.currency;}
});
document.addEventListener('input', event => {
  const field = event.target;
  if (field.hasAttribute('aria-errormessage')) clearFieldError(field.form);
  if (field.id === 'search') {
    search = field.value;
    const cursor = field.selectionStart;
    render(); $('#search').focus(); $('#search').setSelectionRange(cursor, cursor);
  }
});
$('#editor').addEventListener('cancel', event => { if (saving) event.preventDefault(); });
$('#transaction-form').addEventListener('submit',async event=>{
  event.preventDefault(); const form=event.target;
  if (saving) return;
  try {
    const record={id:editId||crypto.randomUUID(),description:form.elements.description.value.trim(),amount:amount(form.elements.amount.value),date:form.elements.date.value,type:form.elements.type.value,category:form.elements.category.value};
    const next=structuredClone(state);if(editId)next.transactions[next.transactions.findIndex(t=>t.id===editId)]=record;else next.transactions.push(record);validate(next);
    if(await commit(next)){$('#editor').close();month=record.date.slice(0,7);$('#month').value=month;render();toast(demo?'Sample transaction saved temporarily.':editId?'Transaction updated.':'Transaction added.');}else $('#form-error').textContent='Changes were not saved. Check the storage notice after closing this form.';
  }catch(error){$('#form-error').textContent=error.message;}
});
$('#delete').addEventListener('click',async()=>{if(!await ask('Delete this transaction? This cannot be undone.'))return;const next=structuredClone(state);next.transactions=next.transactions.filter(t=>t.id!==editId);if(await commit(next)){$('#editor').close();render();toast('Transaction deleted.');}});
document.addEventListener('submit',async event=>{if(event.target.id!=='budget-form')return;event.preventDefault();try{const budgets={};for(const c of categories){const value=event.target.elements.namedItem(c).value.trim();if(value!=='')budgets[c]=amount(value,true);}const next=structuredClone(state);next.budgets[month]=budgets;if(await commit(next)){render();toast(demo?'Sample budgets saved temporarily.':'Budgets saved.');}}catch(error){$('#budget-error').textContent=error.message;}});
$('#auth-form').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.target; const button = event.submitter;
  if (form.dataset.busy) return;
  form.dataset.busy = 'true'; form.querySelectorAll('button').forEach(control => control.disabled = true); $('#auth-error').textContent = '';
  try {
    await api(button?.value || 'login', 'POST', { email: form.elements.email.value, password: form.elements.password.value });
    await loadAccount(); form.reset(); $('#auth-dialog').close(); toast('Your personal ledger is ready.');
  } catch (error) { $('#auth-error').textContent = error.message; }
  finally { delete form.dataset.busy; form.querySelectorAll('button').forEach(control => control.disabled = false); }
});
$('#auth-cancel').addEventListener('click', () => $('#auth-dialog').close());
$('#forgot-password').addEventListener('click', () => {
  const authForm = $('#auth-form');
  const resetForm = $('#reset-form');
  resetForm.reset();
  $('#recovery-status').textContent = '';
  resetForm.elements.email.value = authForm.elements.email.value;
  authForm.elements.password.value = '';
  $('#auth-status').textContent = ''; $('#auth-error').textContent = ''; $('#reset-error').textContent = '';
  showRecoveryForm(true);
  resetForm.elements.email.focus();
});
$('#reset-back').addEventListener('click', () => {
  $('#reset-form').reset();
  showRecoveryForm(false);
  $('#forgot-password').focus();
});
$('#auth-dialog').addEventListener('cancel', event => {
  if ($('#auth-form').dataset.busy || $('#reset-form').dataset.busy) event.preventDefault();
});
$('#auth-dialog').addEventListener('close', () => {
  $('#auth-form').elements.password.value = '';
  $('#reset-form').reset();
});
async function submitRecovery(event) {
  event.preventDefault();
  const form = $('#reset-form');
  if (form.dataset.busy) return;
  const { email, code, password } = form.elements;
  const requesting = event.currentTarget.id === 'request-code';
  if (requesting && !email.reportValidity()) return;
  const accountEmail = email.value;
  const authForm = $('#auth-form');
  form.dataset.busy = 'true';
  email.readOnly = true;
  const buttons = form.querySelectorAll('button');
  buttons.forEach(button => button.disabled = true);
  $('#reset-error').textContent = '';
  try {
    if (requesting) {
      $('#recovery-status').textContent = '';
      const { filename } = await api('request-recovery-code', 'POST', { email: accountEmail });
      $('#recovery-status').textContent = `Look for ${filename} in the ClearLedger project’s data folder. If you find it, paste the code below. If it’s missing, check the email you used to create your account on this computer and try again.`;
      code.focus();
      return;
    }
    await api('reset-password', 'POST', { email: accountEmail, code: code.value, password: password.value });
    form.reset();
    authForm.elements.email.value = accountEmail;
    showRecoveryForm(false);
    $('#auth-status').textContent = 'Password reset. Sign in with your new password.';
    authForm.elements.password.focus();
  } catch (error) { $('#reset-error').textContent = error.message; }
  finally {
    delete form.dataset.busy;
    email.readOnly = false;
    buttons.forEach(button => button.disabled = false);
  }
}
$('#reset-form').addEventListener('submit', submitRecovery);
$('#request-code').addEventListener('click', submitRecovery);
$('#reset-form input[name="email"]').addEventListener('input', () => {
  $('#recovery-status').textContent = '';
  $('#reset-form').elements.code.value = '';
});
render();
$('#add').disabled = true;
try { await loadAccount(); }
catch (error) {
  if (error.status !== 401) { blocked = true; showError('Could not connect to your local database. Start the app with npm start, then reload.'); }
  render();
}
