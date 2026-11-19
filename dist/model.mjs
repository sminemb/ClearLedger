export const categories = ['Housing', 'Food & dining', 'Shopping', 'Transport', 'Entertainment', 'Other'];
export const colors = ['#BC6043', '#D79A48', '#D6BA69', '#9BAF79', '#627D50', '#C8C5B3'];
export const currencies = ['USD', 'PHP', 'EUR', 'GBP'];
export function amount(input, allowZero = false) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(input))) throw Error('Enter an amount with up to two decimal places.');
  const [whole, fraction = ''] = String(input).split('.');
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1) || value > 99999999999) throw Error('Enter an amount between 0.01 and 999,999,999.99.');
  return value;
}
export const empty = () => ({ version: 1, currency: 'USD', transactions: [], budgets: {} });
export function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '1900-01-01' && value <= '9999-12-31' && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validate(state) {
  if (!state || state.version !== 1 || !currencies.includes(state.currency) || !Array.isArray(state.transactions) || !state.budgets || typeof state.budgets !== 'object' || Array.isArray(state.budgets)) throw Error('Saved data has an unsupported format.');
  const ids = new Set();
  for (const t of state.transactions) {
    if (!t || typeof t.id !== 'string' || !t.id || ids.has(t.id) || typeof t.description !== 'string' || !t.description.trim() || t.description.length > 160 || !validDate(t.date) || !['income', 'expense'].includes(t.type) || !categories.includes(t.category) || !Number.isSafeInteger(t.amount) || t.amount < 1 || t.amount > 99999999999) throw Error('A saved transaction is invalid.');
    ids.add(t.id);
  }
  if (state.transactions.reduce((sum, t) => sum + t.amount, 0) > Number.MAX_SAFE_INTEGER) throw Error('The total exceeds the supported amount.');
  for (const [month, budgets] of Object.entries(state.budgets)) {
    if (!validDate(month + '-01') || !budgets || typeof budgets !== 'object' || Array.isArray(budgets)) throw Error('A saved budget is invalid.');
    for (const [category, limit] of Object.entries(budgets)) if (!categories.includes(category) || !Number.isSafeInteger(limit) || limit < 0 || limit > 99999999999) throw Error('A saved budget is invalid.');
  }
  return state;
}
export function summary(state, month) {
  const result = { income: 0, expenses: 0, remaining: 0, categories: Object.fromEntries(categories.map(c => [c, 0])) };
  for (const t of state.transactions.filter(t => t.date.startsWith(month + '-'))) {
    if (t.type === 'income') result.income += t.amount;
    else { result.expenses += t.amount; result.categories[t.category] += t.amount; }
  }
  result.remaining = result.income - result.expenses; return result;
}
export function csv(state) {
  const cell = value => { let text = String(value); if (/^[\s]*[=+@-]/.test(text)) text = "'" + text; return '"' + text.replaceAll('"', '""') + '"'; };
  return '\uFEFF' + [['Date', 'Description', 'Type', 'Category', 'Amount', 'Currency'], ...state.transactions.map(t => [t.date, t.description, t.type, t.category, (t.amount / 100).toFixed(2), state.currency])].map(row => row.map(cell).join(',')).join('\r\n');
}
export function sample(month) {
  const state = empty();
  const rows = [['Rent',120000,'Housing',1,'expense'],['Grocery run',14280,'Food & dining',8,'expense'],['Coffee & lunch',1870,'Food & dining',10,'expense'],['Weekly groceries',31900,'Food & dining',16,'expense'],['New headphones',28000,'Shopping',14,'expense'],['Train pass',18000,'Transport',12,'expense'],['Concert tickets',12000,'Entertainment',17,'expense'],['Home essentials',8000,'Other',18,'expense'],['Freelance project',485000,'Other',15,'income']];
  state.transactions = rows.map(([description, amount, category, day, type], i) => ({ id: 'sample-' + i, description, amount, category, type, date: `${month}-${String(day).padStart(2,'0')}` }));
  state.budgets[month] = { 'Food & dining': 60000, Shopping: 25000, Transport: 25000 };
  return state;
}
