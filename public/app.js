// ===== STATE =====
let currentUser = null;
let token = localStorage.getItem('token');
let currentPeriod = 'month';
let deleteTargetId = null;

const CATEGORIES = {
  food: { icon: '🍔', label: 'Food', color: '#f97316' },
  transport: { icon: '🚗', label: 'Transport', color: '#3b82f6' },
  entertainment: { icon: '🎬', label: 'Entertainment', color: '#a855f7' },
  shopping: { icon: '🛍️', label: 'Shopping', color: '#ec4899' },
  bills: { icon: '📄', label: 'Bills', color: '#eab308' },
  health: { icon: '🏥', label: 'Health', color: '#14b8a6' },
  education: { icon: '📚', label: 'Education', color: '#6366f1' },
  salary: { icon: '💰', label: 'Salary', color: '#22c55e' },
  freelance: { icon: '💻', label: 'Freelance', color: '#06b6d4' },
  investment: { icon: '📈', label: 'Investment', color: '#8b5cf6' },
  gift: { icon: '🎁', label: 'Gift', color: '#f43f5e' },
  other: { icon: '📦', label: 'Other', color: '#64748b' }
};

// ===== API HELPER =====
async function api(url, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(url, { ...options, headers, credentials: 'include' });
  const data = await res.json();
  
  if (!res.ok) {
    if (res.status === 401) { handleLogout(); }
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
}

// ===== TOAST =====
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; toast.style.transition = '0.3s ease'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// ===== AUTH =====
function switchAuth(type) {
  document.getElementById('login-form').classList.toggle('active', type === 'login');
  document.getElementById('register-form').classList.toggle('active', type === 'register');
  document.querySelectorAll('.form-error').forEach(el => el.classList.add('hidden'));
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  if (!email || !password) { errorEl.textContent = 'Please fill in all fields.'; errorEl.classList.remove('hidden'); return; }

  btn.querySelector('.btn-text').textContent = 'Signing in...';
  btn.querySelector('.btn-loader').classList.remove('hidden');
  btn.disabled = true;

  try {
    const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    token = data.token;
    localStorage.setItem('token', token);
    currentUser = data.user;
    errorEl.classList.add('hidden');
    showToast('Welcome back, ' + currentUser.name + '!');
    showApp();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    btn.querySelector('.btn-text').textContent = 'Sign In';
    btn.querySelector('.btn-loader').classList.add('hidden');
    btn.disabled = false;
  }
}

async function handleRegister() {
  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const errorEl = document.getElementById('register-error');
  const btn = document.getElementById('register-btn');

  if (!name || !email || !password) { errorEl.textContent = 'Please fill in all fields.'; errorEl.classList.remove('hidden'); return; }

  btn.querySelector('.btn-text').textContent = 'Creating account...';
  btn.querySelector('.btn-loader').classList.remove('hidden');
  btn.disabled = true;

  try {
    const data = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    token = data.token;
    localStorage.setItem('token', token);
    currentUser = data.user;
    errorEl.classList.add('hidden');
    showToast('Account created! Welcome, ' + currentUser.name + '!');
    showApp();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    btn.querySelector('.btn-text').textContent = 'Create Account';
    btn.querySelector('.btn-loader').classList.add('hidden');
    btn.disabled = false;
  }
}

function handleLogout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  document.getElementById('auth-screen').classList.add('active');
  document.getElementById('app-screen').classList.remove('active');
  showToast('Logged out successfully', 'info');
}

// ===== APP INIT =====
async function showApp() {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');
  updateUserUI();
  setGreeting();
  await loadDashboard();
  // Silently load alert badge count in background
  loadAlertsBadge();
}

async function loadAlertsBadge() {
  try {
    const data = await api('/api/expenses/alerts');
    const alerts = data.alerts || [];
    const urgent = alerts.filter(a => a.severity === 'danger' || a.severity === 'warning').length;
    const badge = document.getElementById('alert-badge');
    if (badge) { badge.textContent = urgent; badge.style.display = urgent > 0 ? 'inline-block' : 'none'; }
  } catch (e) { /* silent fail */ }
}

function updateUserUI() {
  if (!currentUser) return;
  document.getElementById('user-name').textContent = currentUser.name;
  document.getElementById('user-email').textContent = currentUser.email;
  document.getElementById('user-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
}

function setGreeting() {
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  if (currentUser) greeting += ', ' + currentUser.name.split(' ')[0];
  document.getElementById('greeting').textContent = greeting;
}

// ===== PAGES =====
function switchPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  
  if (page === 'transactions') loadTransactions();
  if (page === 'analytics') loadAnalytics();
  if (page === 'dashboard') loadDashboard();
  if (page === 'alerts') loadAlerts();

  // Close sidebar on mobile
  closeSidebar();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  sidebar.classList.toggle('open');
  if (backdrop) backdrop.classList.toggle('active', sidebar.classList.contains('open'));
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');
}

function setMobileNav(page) {
  document.querySelectorAll('.mobile-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.id === 'mnav-' + page);
  });
}

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const data = await api(`/api/expenses/stats?period=${currentPeriod}`);
    const s = data.stats;
    const periodLabel = { week: 'last 7 days', month: 'last 30 days', year: 'last year' }[currentPeriod];
    document.getElementById('stat-balance').textContent = formatCurrency(s.balance);
    document.getElementById('stat-income').textContent = formatCurrency(s.income);
    document.getElementById('stat-expense').textContent = formatCurrency(s.expense);
    document.getElementById('income-count').textContent = `${s.transactionCount} total transactions`;
    document.getElementById('expense-count').textContent = periodLabel;
    renderCategoryChart(s.categoryBreakdown);
    renderTrendChart(s.dailyTrend);
    renderRecentTransactions(s.recentTransactions);
  } catch (err) { console.error('Dashboard load error:', err); }
}

function changePeriod(period) {
  currentPeriod = period;
  document.querySelectorAll('.period-btn').forEach(b => b.classList.toggle('active', b.dataset.period === period));
  loadDashboard();
}

// ===== FORMAT =====
function formatCurrency(amount) {
  return '₹' + Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ===== CHARTS =====
function renderCategoryChart(categories) {
  const el = document.getElementById('category-chart');
  if (!categories || categories.length === 0) {
    el.innerHTML = '<div class="empty-state"><span class="empty-icon">📊</span><p>No expense data yet</p></div>';
    return;
  }
  const total = categories.reduce((sum, c) => sum + c.total, 0);
  let cumulative = 0;
  const segments = categories.map(c => {
    const cat = CATEGORIES[c._id] || CATEGORIES.other;
    const pct = (c.total / total) * 100;
    const start = cumulative;
    cumulative += pct;
    return { ...c, cat, pct, start };
  });

  // Build donut SVG
  let paths = '';
  segments.forEach(s => {
    const startAngle = (s.start / 100) * 360 - 90;
    const endAngle = ((s.start + s.pct) / 100) * 360 - 90;
    const largeArc = s.pct > 50 ? 1 : 0;
    const r = 52;
    const x1 = 70 + r * Math.cos(startAngle * Math.PI / 180);
    const y1 = 70 + r * Math.sin(startAngle * Math.PI / 180);
    const x2 = 70 + r * Math.cos(endAngle * Math.PI / 180);
    const y2 = 70 + r * Math.sin(endAngle * Math.PI / 180);
    if (s.pct >= 0.5) {
      paths += `<path d="M70,70 L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z" fill="${s.cat.color}" opacity="0.85"/>`;
    }
  });

  const legendHtml = segments.slice(0, 6).map(s =>
    `<div class="legend-item"><div class="legend-dot" style="background:${s.cat.color}"></div><span class="legend-label">${s.cat.icon} ${s.cat.label}</span><span class="legend-value">${formatCurrency(s.total)}</span></div>`
  ).join('');

  el.innerHTML = `<div class="donut-chart"><svg class="donut-svg" viewBox="0 0 140 140">${paths}<circle cx="70" cy="70" r="35" fill="var(--bg-card)"/><text x="70" y="66" text-anchor="middle" fill="var(--text-primary)" font-size="12" font-weight="700">${formatCurrency(total)}</text><text x="70" y="80" text-anchor="middle" fill="var(--text-muted)" font-size="7">total</text></svg><div class="donut-legend">${legendHtml}</div></div>`;
}

function renderTrendChart(trend) {
  const el = document.getElementById('trend-chart');
  if (!trend || trend.length === 0) {
    el.innerHTML = '<div class="empty-state"><span class="empty-icon">📈</span><p>No trend data yet</p></div>';
    return;
  }
  // Build 7-day data
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const inc = trend.find(t => t._id.date === key && t._id.type === 'income')?.total || 0;
    const exp = trend.find(t => t._id.date === key && t._id.type === 'expense')?.total || 0;
    days.push({ label: d.toLocaleDateString('en', { weekday: 'short' }), income: inc, expense: exp });
  }
  const maxVal = Math.max(...days.map(d => Math.max(d.income, d.expense)), 1);
  const bars = days.map(d => {
    const incH = Math.max((d.income / maxVal) * 130, 2);
    const expH = Math.max((d.expense / maxVal) * 130, 2);
    return `<div class="bar-group"><div class="bar-stack"><div class="bar income-bar" style="height:${incH}px" title="Income: ${formatCurrency(d.income)}"></div><div class="bar expense-bar" style="height:${expH}px" title="Expense: ${formatCurrency(d.expense)}"></div></div><span class="bar-label">${d.label}</span></div>`;
  }).join('');
  el.innerHTML = `<div class="bar-chart">${bars}</div>`;
}

function renderRecentTransactions(transactions) {
  const el = document.getElementById('recent-transactions');
  if (!transactions || transactions.length === 0) {
    el.innerHTML = '<div class="empty-state"><span class="empty-icon">💸</span><p>No transactions yet. Add your first one!</p></div>';
    return;
  }
  el.innerHTML = transactions.map(t => renderTransactionItem(t)).join('');
}

function renderTransactionItem(t) {
  const cat = CATEGORIES[t.category] || CATEGORIES.other;
  const isIncome = t.type === 'income';
  return `<div class="transaction-item">
    <div class="txn-icon" style="background:${isIncome ? 'var(--green-bg)' : cat.color + '18'}">${cat.icon}</div>
    <div class="txn-info"><div class="txn-title">${t.title}</div><div class="txn-meta">${cat.label} · ${formatDate(t.date)}</div></div>
    <div class="txn-amount ${t.type}">${isIncome ? '+' : '-'}${formatCurrency(t.amount)}</div>
    <div class="txn-actions">
      <button class="btn-icon" onclick="openModal('edit','${t._id}')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
      <button class="btn-icon" onclick="openDeleteModal('${t._id}')" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
    </div>
  </div>`;
}

// ===== TRANSACTIONS PAGE =====
async function loadTransactions() {
  try {
    const type = document.getElementById('filter-type').value;
    const category = document.getElementById('filter-category').value;
    let url = '/api/expenses?limit=100';
    if (type) url += `&type=${type}`;
    if (category) url += `&category=${category}`;
    const data = await api(url);
    const el = document.getElementById('all-transactions');
    if (!data.expenses || data.expenses.length === 0) {
      el.innerHTML = '<div class="empty-state"><span class="empty-icon">💸</span><p>No transactions found</p></div>';
      return;
    }
    el.innerHTML = data.expenses.map(t => renderTransactionItem(t)).join('');
  } catch (err) { console.error(err); }
}

// ===== ANALYTICS =====
async function loadAnalytics() {
  try {
    const data = await api(`/api/expenses/stats?period=${currentPeriod}`);
    const s = data.stats;
    renderAnalyticsCategories(s.categoryBreakdown);
    renderComparison(s.income, s.expense);
    renderQuickStats(s);
  } catch (err) { console.error(err); }
}

function renderAnalyticsCategories(categories) {
  const el = document.getElementById('analytics-categories');
  if (!categories || categories.length === 0) { el.innerHTML = '<div class="empty-state"><span class="empty-icon">📊</span><p>No data to analyze</p></div>'; return; }
  const maxVal = Math.max(...categories.map(c => c.total));
  const html = categories.map(c => {
    const cat = CATEGORIES[c._id] || CATEGORIES.other;
    const pct = (c.total / maxVal) * 100;
    return `<div class="cat-bar-item"><div class="cat-bar-icon">${cat.icon}</div><div class="cat-bar-info"><div class="cat-bar-top"><span class="cat-bar-name">${cat.label}</span><span class="cat-bar-amount">${formatCurrency(c.total)} (${c.count})</span></div><div class="cat-bar-track"><div class="cat-bar-fill" style="width:${pct}%;background:${cat.color}"></div></div></div></div>`;
  }).join('');
  el.innerHTML = `<div class="category-bar-list">${html}</div>`;
}

function renderComparison(income, expense) {
  const el = document.getElementById('analytics-comparison');
  const max = Math.max(income, expense, 1);
  el.innerHTML = `<div class="comparison-visual">
    <div class="comp-item"><label>Income</label><div class="comp-bar-container"><div class="comp-bar-track"><div class="comp-bar-fill income-fill" style="width:${(income/max)*100}%">${formatCurrency(income)}</div></div></div></div>
    <div class="comp-item"><label>Expenses</label><div class="comp-bar-container"><div class="comp-bar-track"><div class="comp-bar-fill expense-fill" style="width:${(expense/max)*100}%">${formatCurrency(expense)}</div></div></div></div>
    <div class="comp-item"><label>Savings Rate</label><div style="text-align:center;padding:0.5rem"><span style="font-size:2rem;font-weight:800;color:${income > 0 ? ((income-expense)/income*100 > 0 ? 'var(--green)' : 'var(--red)') : 'var(--text-muted)'}">${income > 0 ? ((income-expense)/income*100).toFixed(1) : '0'}%</span></div></div>
  </div>`;
}

function renderQuickStats(stats) {
  const el = document.getElementById('analytics-quick-stats');
  const avgExpense = stats.transactionCount > 0 ? stats.expense / Math.max(stats.categoryBreakdown.length, 1) : 0;
  el.innerHTML = `<div class="quick-stats-grid">
    <div class="quick-stat"><div class="quick-stat-value" style="color:var(--accent)">${stats.transactionCount}</div><div class="quick-stat-label">Transactions</div></div>
    <div class="quick-stat"><div class="quick-stat-value" style="color:var(--green)">${formatCurrency(stats.income)}</div><div class="quick-stat-label">Total Income</div></div>
    <div class="quick-stat"><div class="quick-stat-value" style="color:var(--red)">${formatCurrency(stats.expense)}</div><div class="quick-stat-label">Total Expenses</div></div>
    <div class="quick-stat"><div class="quick-stat-value" style="color:var(--yellow)">${stats.categoryBreakdown.length}</div><div class="quick-stat-label">Categories Used</div></div>
  </div>`;
}

// ===== ALERTS =====
async function loadAlerts() {
  const listEl = document.getElementById('alerts-list');
  listEl.innerHTML = '<div class="empty-state"><span class="empty-icon" style="animation:spin 1s linear infinite;display:inline-block">🔄</span><p>Analysing your finances...</p></div>';

  try {
    const data = await api('/api/expenses/alerts');
    const alerts = data.alerts || [];

    // Update summary counters
    const counts = { danger: 0, warning: 0, info: 0, success: 0 };
    alerts.forEach(a => counts[a.severity] = (counts[a.severity] || 0) + 1);
    document.getElementById('as-danger').textContent  = counts.danger;
    document.getElementById('as-warning').textContent = counts.warning;
    document.getElementById('as-info').textContent    = counts.info;
    document.getElementById('as-success').textContent = counts.success;

    // Update nav badge (danger + warning = actionable)
    const urgent = counts.danger + counts.warning;
    const badge = document.getElementById('alert-badge');
    if (badge) {
      badge.textContent = urgent;
      badge.style.display = urgent > 0 ? 'inline-block' : 'none';
    }

    if (alerts.length === 0) {
      listEl.innerHTML = `<div class="no-alerts-state"><span class="no-alerts-icon">🎉</span><h3>All Clear!</h3><p>No financial alerts right now. Keep up the great work!</p></div>`;
      return;
    }

    listEl.innerHTML = alerts.map((a, i) => `
      <div class="alert-card ${a.severity}" style="animation-delay:${i * 0.06}s">
        <div class="alert-icon-wrap">${a.icon}</div>
        <div class="alert-body">
          <div class="alert-body-top">
            <span class="alert-title">${a.title}</span>
            <span class="alert-cat-badge">${a.category}</span>
          </div>
          <p class="alert-message">${a.message}</p>
        </div>
      </div>`).join('');

  } catch (err) {
    listEl.innerHTML = '<div class="empty-state"><span class="empty-icon">❌</span><p>Failed to load alerts. Please try again.</p></div>';
  }
}
const expenseCategories = ['food', 'transport', 'entertainment', 'shopping', 'bills', 'health', 'education', 'other'];
const incomeCategories = ['salary', 'freelance', 'investment', 'gift', 'other'];
let currentTxnType = 'expense';

function setTransactionType(type) {
  currentTxnType = type;
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.${type}-type`).classList.add('active');
  populateCategories(type);
}

function populateCategories(type) {
  const select = document.getElementById('txn-category');
  const cats = type === 'income' ? incomeCategories : expenseCategories;
  select.innerHTML = '<option value="">Select category</option>' + cats.map(c => {
    const cat = CATEGORIES[c];
    return `<option value="${c}">${cat.icon} ${cat.label}</option>`;
  }).join('');
}

async function openModal(mode, id = null) {
  document.getElementById('modal-overlay').classList.add('active');
  document.getElementById('modal-error').classList.add('hidden');
  document.getElementById('txn-date').value = new Date().toISOString().split('T')[0];

  if (mode === 'edit' && id) {
    document.getElementById('modal-title').textContent = 'Edit Transaction';
    document.getElementById('modal-submit-btn').querySelector('.btn-text').textContent = 'Update Transaction';
    document.getElementById('edit-id').value = id;
    try {
      const data = await api(`/api/expenses?limit=100`);
      const txn = data.expenses.find(e => e._id === id);
      if (txn) {
        setTransactionType(txn.type);
        document.getElementById('txn-title').value = txn.title;
        document.getElementById('txn-amount').value = txn.amount;
        document.getElementById('txn-category').value = txn.category;
        document.getElementById('txn-description').value = txn.description || '';
        document.getElementById('txn-date').value = txn.date.split('T')[0];
      }
    } catch (err) { console.error(err); }
  } else {
    document.getElementById('modal-title').textContent = 'Add Transaction';
    document.getElementById('modal-submit-btn').querySelector('.btn-text').textContent = 'Save Transaction';
    document.getElementById('edit-id').value = '';
    document.getElementById('txn-title').value = '';
    document.getElementById('txn-amount').value = '';
    document.getElementById('txn-description').value = '';
    setTransactionType('expense');
  }
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

async function handleSaveTransaction() {
  const errorEl = document.getElementById('modal-error');
  const title = document.getElementById('txn-title').value.trim();
  const amount = parseFloat(document.getElementById('txn-amount').value);
  const category = document.getElementById('txn-category').value;
  const description = document.getElementById('txn-description').value.trim();
  const date = document.getElementById('txn-date').value;
  const editId = document.getElementById('edit-id').value;

  if (!title || !amount || !category || !date) {
    errorEl.textContent = 'Please fill in all required fields.';
    errorEl.classList.remove('hidden');
    return;
  }

  const body = { title, amount, type: currentTxnType, category, description, date };

  try {
    if (editId) {
      await api(`/api/expenses/${editId}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Transaction updated!');
    } else {
      await api('/api/expenses', { method: 'POST', body: JSON.stringify(body) });
      showToast(`${currentTxnType === 'income' ? 'Income' : 'Expense'} added!`);
    }
    closeModal();
    loadDashboard();
    if (document.getElementById('page-transactions').classList.contains('active')) loadTransactions();
    if (document.getElementById('page-analytics').classList.contains('active')) loadAnalytics();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
}

// ===== DELETE =====
function openDeleteModal(id) {
  deleteTargetId = id;
  document.getElementById('delete-overlay').classList.add('active');
}
function closeDeleteModal() {
  document.getElementById('delete-overlay').classList.remove('active');
  deleteTargetId = null;
}
async function confirmDelete() {
  if (!deleteTargetId) return;
  try {
    await api(`/api/expenses/${deleteTargetId}`, { method: 'DELETE' });
    showToast('Transaction deleted!', 'info');
    closeDeleteModal();
    loadDashboard();
    if (document.getElementById('page-transactions').classList.contains('active')) loadTransactions();
    if (document.getElementById('page-analytics').classList.contains('active')) loadAnalytics();
  } catch (err) { showToast(err.message, 'error'); }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  // Enter key handlers for login/register forms
  document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  document.getElementById('register-password').addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); });

  if (token) {
    try {
      const data = await api('/api/auth/me');
      currentUser = data.user;
      showApp();
    } catch (err) {
      localStorage.removeItem('token');
      token = null;
    }
  }
});
