import { categories, colors, currencies, amount, empty, validate, summary, csv, sample } from './model.mjs';
const $ = s => document.querySelector(s);
const paths = { home:'m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',list:'M5 4h14v17H5zM8 8h8M8 12h8M8 16h5',chart:'M5 21V11m7 10V4m7 17V8',settings:'m9 3-1 3-3 1-2 4 2 3 1 3 4 2 3-2 3-1 3-4-2-3-1-3-4-2-3 2ZM9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0',check:'M21 11v1a9 9 0 1 1-5-8M8 11l4 4 9-10',plus:'M12 5v14M5 12h14',close:'m6 6 12 12M6 18 18 6',refresh:'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1',food:'M5 3v6c0 3 6 3 6 0V3M8 3v18M19 3c-5 3-5 10 0 10V3Zm0 10v8',bag:'M5 7h14l2 14H3L5 7Zm3 1V6a4 4 0 0 1 8 0v2',train:'M6 3h12v14H6zM6 10h12M9 14h0m6 0h0M8 17l-3 4m11-4 3 4',ticket:'M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6Zm12 0v12',dots:'M4 12h1m6 0h1m6 0h1',edit:'m4 16 11-11 4 4L8 20l-5 1 1-5ZM14 6l4 4',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5' };
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.dots}"/></svg>`;
document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
const categoryIcon = ['home','food','bag','train','ticket','dots'];
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; };
const key = 'clearledger-v1';
let month = today().slice(0,7), state, demo = true, blocked = false, view = 'overview', editId = null, search = '', filterCategory = '', filterType = '';
let savedRaw = null;
try { savedRaw = localStorage.getItem(key); if (savedRaw !== null) { state = validate(JSON.parse(savedRaw)); demo = false; } else state = sample(month); }
catch { state = empty(); demo = false; blocked = true; showError('Your saved records could not be read. They have been left untouched. Download a recovery copy in Settings before repairing your browser storage.'); }
$('#month').value = month;
const money = value => new Intl.NumberFormat(undefined,{style:'currency',currency:state.currency}).format(value/100);
const monthName = () => new Date(month+'-01T12:00:00').toLocaleDateString(undefined,{month:'long',year:'numeric'});
function showError(message) { $('#notice').textContent = message; $('#notice').hidden = false; }
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').hidden = true, 3500); }
function commit(next) {
  if (blocked) { showError('Saved data needs recovery. Open Settings to download the untouched records.'); return false; }
  try {
    validate(next);
    if (!demo && localStorage.getItem(key) !== savedRaw) throw Error('Records changed in another tab. Reload this page before saving to avoid overwriting them.');
    if (!demo) { const raw = JSON.stringify(next); localStorage.setItem(key, raw); savedRaw = raw; }
    state = next; if (!demo) $('#save-status').textContent = 'Saved on this device'; return true;
  } catch(error) { showError(error.message.includes('another tab') ? error.message : 'Could not save changes. Browser storage may be full or unavailable. Your previous records are unchanged. Export your records in Settings.'); return false; }
}
function ask(message) {
  return new Promise(resolve => { const dialog=$('#confirm-dialog'); $('#confirm-message').textContent=message; dialog.returnValue='cancel'; dialog.addEventListener('close',()=>resolve(dialog.returnValue==='confirm'),{once:true}); dialog.showModal(); });
}
async function personalStart() {
  if (!await ask('Start your personal ledger? Sample transactions and budgets will be removed.')) return;
  try {
    if (localStorage.getItem(key) !== null) throw Error('Records already exist in this browser. Reload to open them.');
    const next = empty(); next.currency = state.currency; const raw = JSON.stringify(next); localStorage.setItem(key,raw); savedRaw = raw; state = next; demo = false; render(); toast('Your personal ledger is ready.');
  } catch(error) { showError(error.message.includes('already exist') ? error.message : 'Could not start your ledger. Allow browser storage and try again.'); }
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
  return `<section class="panel budget-form"><h2>Plan your month</h2><p class="panel-intro">Set limits for ${escape(monthName())}. Leave a field blank for no budget.</p><form id="budget-form">${categories.map(c=>`<div class="budget-edit-row"><div><h3>${escape(c)}</h3><p>${money(totals.categories[c])} spent this month</p></div><label><span class="sr-only">${escape(c)} budget in ${state.currency}</span><input inputmode="decimal" name="${escape(c)}" placeholder="No limit" pattern="[0-9]+([.][0-9]{1,2})?" value="${state.budgets[month]?.[c]===undefined?'':(state.budgets[month][c]/100).toFixed(2)}"></label></div>`).join('')}<p id="budget-error" class="form-error" role="alert"></p><button class="primary" type="submit">Save budgets</button></form></section>`;
}
function settingsHTML() { return `<section class="panel settings-panel"><h2>Make it yours</h2><p>ClearLedger stores your records only in this browser. There’s no account to create and no financial data sent to a server.</p><label>Display currency<select id="currency">${currencies.map(c=>`<option ${state.currency===c?'selected':''}>${c}</option>`).join('')}</select></label><p>Changing currency changes the label on existing amounts. It does not convert them using exchange rates.</p><hr><h2>Your records, in your hands</h2><p>Export your transactions as CSV for a spreadsheet, or download a full JSON copy of your records and budgets. Keep a copy before clearing browser data.</p><div class="settings-actions"><button class="secondary" data-export>${icon('download')}Export CSV</button><button class="secondary" id="backup">Download full backup</button></div>${blocked?'<button class="secondary" id="recovery">Download recovery data</button>':''}<small>${demo?'You’re exploring sample data. Changes in sample mode are temporary.':'Records do not sync between browsers or devices.'}</small>${demo?'<hr><button class="primary" id="settings-start">Start my personal ledger</button>':''}</section>`; }
function render() {
  const titles = {overview:['Your month, at a glance','A little clarity for your everyday spending.'],transactions:['Your transactions','Every entry brings a little more clarity.'],budgets:['A plan for your month','Spend with intention. Leave room for what matters.'],settings:['Your space, your settings','Simple preferences. Complete ownership.']};
  $('#page-title').textContent = titles[view][0]; $('#page-subtitle').textContent = titles[view][1];
  document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-current',b.dataset.view===view?'page':'false');});
  $('#demo-bar').hidden = !demo; $('#save-status').textContent = demo?'Exploring sample data':blocked?'Storage needs attention':'Saved on this device';
  const totals=summary(state,month);
  $('#content').innerHTML = view==='settings'?settingsHTML():totalsHTML(totals)+(view==='overview'?`<div class="overview-grid">${breakdown(totals)}<section class="panel"><h2>Monthly budget</h2><p class="panel-intro">Your spending against this month’s budgets.</p>${budgetItems(totals)}<button class="primary wide" data-go="budgets">${icon('edit')}Edit budgets</button></section></div>`+transactionsHTML(true):view==='transactions'?transactionsHTML():budgetsHTML(totals));
  $('#add').disabled = blocked; if ($('#currency')) $('#currency').disabled = blocked;
}
function navigate(next) { view=next; render(); }
function openEditor(id) {
  editId = id || null; const form=$('#transaction-form'); form.reset();
  $('#editor-title').textContent = id?'Edit transaction':'Add transaction'; $('#delete').hidden = !id; $('#form-error').textContent='';
  form.elements.category.innerHTML = categories.map(c=>`<option>${escape(c)}</option>`).join('');
  $('.currency-label').textContent = state.currency;
  if (id) { const t=state.transactions.find(t=>t.id===id); for(const field of ['description','date','category','type']) form.elements[field].value=t[field]; form.elements.amount.value=(t.amount/100).toFixed(2); }
  else form.elements.date.value = today().startsWith(month)?today():month+'-01';
  $('#editor').showModal(); form.elements.description.focus();
}
function download(text,name,type) { const url=URL.createObjectURL(new Blob([text],{type})); const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
document.addEventListener('click',event=>{
  const button=event.target.closest('button'); if(!button)return;
  if(button.dataset.view)navigate(button.dataset.view);
  if(button.dataset.go)navigate(button.dataset.go);
  if(button.matches('#add,[data-add]'))openEditor();
  if(button.dataset.edit)openEditor(button.dataset.edit);
  if(button.hasAttribute('data-close'))$('#editor').close();
  if(button.matches('#start-fresh,#settings-start'))personalStart();
  if(button.hasAttribute('data-export'))download(csv(state),'clearledger-transactions.csv','text/csv;charset=utf-8');
  if(button.id==='backup')download(JSON.stringify(state,null,2),'clearledger-backup.json','application/json');
  if(button.id==='recovery') { try {download(localStorage.getItem(key)||'','clearledger-recovery.txt','text/plain');}catch{showError('Browser storage is unavailable. Allow storage access and reload.');} }
});
$('.brand').addEventListener('click',()=>navigate('overview'));
$('#month').addEventListener('change',()=>{const value=$('#month').value;if(!/^\d{4}-\d{2}$/.test(value))return;month=value;render();});
document.addEventListener('change',event=>{
  if(event.target.id==='category-filter'){filterCategory=event.target.value;render();}
  if(event.target.id==='type-filter'){filterType=event.target.value;render();}
  if(event.target.id==='currency'){const next=structuredClone(state);next.currency=event.target.value;if(commit(next)){render();toast('Display currency updated.');}else event.target.value=state.currency;}
});
document.addEventListener('input',event=>{if(event.target.id==='search'){search=event.target.value;const cursor=event.target.selectionStart;render();$('#search').focus();$('#search').setSelectionRange(cursor,cursor);}});
$('#transaction-form').addEventListener('submit',event=>{
  event.preventDefault(); const form=event.target;
  try {
    const record={id:editId||crypto.randomUUID(),description:form.elements.description.value.trim(),amount:amount(form.elements.amount.value),date:form.elements.date.value,type:form.elements.type.value,category:form.elements.category.value};
    const next=structuredClone(state);if(editId)next.transactions[next.transactions.findIndex(t=>t.id===editId)]=record;else next.transactions.push(record);validate(next);
    if(commit(next)){$('#editor').close();month=record.date.slice(0,7);$('#month').value=month;render();toast(demo?'Sample transaction saved temporarily.':editId?'Transaction updated.':'Transaction added.');}else $('#form-error').textContent='Changes were not saved. Check the storage notice after closing this form.';
  }catch(error){$('#form-error').textContent=error.message;}
});
$('#delete').addEventListener('click',async()=>{if(!await ask('Delete this transaction? This cannot be undone.'))return;const next=structuredClone(state);next.transactions=next.transactions.filter(t=>t.id!==editId);if(commit(next)){$('#editor').close();render();toast('Transaction deleted.');}});
document.addEventListener('submit',event=>{if(event.target.id!=='budget-form')return;event.preventDefault();try{const budgets={};for(const c of categories){const value=event.target.elements.namedItem(c).value.trim();if(value!=='')budgets[c]=amount(value,true);}const next=structuredClone(state);next.budgets[month]=budgets;if(commit(next)){render();toast(demo?'Sample budgets saved temporarily.':'Budgets saved.');}}catch(error){$('#budget-error').textContent=error.message;}});
window.addEventListener('storage',event=>{if(event.key===key){blocked=true;showError('Records changed in another tab. Reload to open the latest records before making changes.');render();}});
render();
