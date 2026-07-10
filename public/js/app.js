// ---------- State ----------
let currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
let categoryChart, budgetChart;

// ---------- Helpers ----------
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ---------- Navigation ----------
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`view-${tab.dataset.view}`).classList.add('active');
  });
});

const monthPicker = document.getElementById('monthPicker');
monthPicker.value = currentMonth;
monthPicker.addEventListener('change', () => {
  currentMonth = monthPicker.value;
  loadAll();
});

window.addEventListener('load', () => {
  loadAll();
});

// ---------- Dashboard ----------
async function loadDashboard() {
  const [expenses, budgets, savings] = await Promise.all([
    api(`/expenses?month=${currentMonth}`),
    api(`/budgets?month=${currentMonth}`),
    api('/savings')
  ]);

  const totals = {};
  let totalSpent = 0;
  expenses.forEach(e => {
    totals[e.category] = (totals[e.category] || 0) + e.amount;
    totalSpent += e.amount;
  });

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSaved = savings.reduce((sum, s) => sum + s.currentAmount, 0);

  document.getElementById('statTotalSpent').textContent = inr(totalSpent);
  document.getElementById('statTotalBudget').textContent = inr(totalBudget);
  document.getElementById('statRemaining').textContent = inr(totalBudget - totalSpent);
  document.getElementById('statSaved').textContent = inr(totalSaved);

  renderCategoryChart(totals);
  renderBudgetChart(totals, budgets);
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(Math.floor(rect.width || 300), 280);
  canvas.height = Math.max(Math.floor(rect.height || 280), 220);
  return canvas.getContext('2d');
}

function drawEmptyChart(canvas, message) {
  const ctx = resizeCanvas(canvas);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

function renderCategoryChart(totals) {
  const canvas = document.getElementById('categoryChart');
  const shell = canvas.parentElement;
  const emptyState = shell.querySelector('.chart-empty');
  if (categoryChart && categoryChart.destroy) {
    categoryChart.destroy();
    categoryChart = null;
  }

  const labels = Object.keys(totals);
  const data = Object.values(totals);

  if (labels.length === 0) {
    if (!emptyState) {
      shell.insertAdjacentHTML('beforeend', '<p class="chart-empty">No expense data for this month yet.</p>');
    }
    drawEmptyChart(canvas, 'No expense data for this month yet.');
    return;
  }

  if (emptyState) emptyState.remove();

  const ctx = resizeCanvas(canvas);
  const palette = ['#f2b84b', '#60a5fa', '#34d399', '#fb7185', '#a78bfa', '#f59e0b', '#2dd4bf', '#f472b6', '#fb923c'];
  const total = data.reduce((sum, value) => sum + value, 0);
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2 - 10;
  const radius = Math.min(centerX, centerY) - 38;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(7, 17, 31, 0.62)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let startAngle = -Math.PI / 2;
  data.forEach((value, index) => {
    const sliceAngle = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = palette[index % palette.length];
    ctx.fill();
    ctx.strokeStyle = '#07111f';
    ctx.lineWidth = 2;
    ctx.stroke();
    startAngle += sliceAngle;
  });

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.56, 0, Math.PI * 2);
  ctx.fillStyle = '#07111f';
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.font = '600 13px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Spending', centerX, centerY - 4);
  ctx.font = '11px Inter, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('by category', centerX, centerY + 12);

  const legendStartX = 18;
  const legendY = canvas.height - 44;
  labels.forEach((label, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = legendStartX + column * 132;
    const y = legendY + row * 18;
    ctx.fillStyle = palette[index % palette.length];
    ctx.fillRect(x, y, 10, 10);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 14, y + 9);
  });
}

function renderBudgetChart(totals, budgets) {
  const canvas = document.getElementById('budgetChart');
  const shell = canvas.parentElement;
  const emptyState = shell.querySelector('.chart-empty');
  if (budgetChart && budgetChart.destroy) {
    budgetChart.destroy();
    budgetChart = null;
  }

  const categories = [...new Set([...Object.keys(totals), ...budgets.map(b => b.category)])];

  if (categories.length === 0) {
    if (!emptyState) {
      shell.insertAdjacentHTML('beforeend', '<p class="chart-empty">Set a budget to compare spending.</p>');
    }
    drawEmptyChart(canvas, 'Set a budget to compare spending.');
    return;
  }

  if (emptyState) emptyState.remove();

  const ctx = resizeCanvas(canvas);
  const spentData = categories.map(c => totals[c] || 0);
  const budgetData = categories.map(c => (budgets.find(b => b.category === c) || {}).amount || 0);
  const maxValue = Math.max(...spentData, ...budgetData, 1);
  const chartHeight = canvas.height - 70;
  const chartWidth = canvas.width - 44;
  const groupWidth = chartWidth / categories.length;
  const chartTop = 24;
  const chartBottom = canvas.height - 48;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(7, 17, 31, 0.62)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = chartTop + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(18, y);
    ctx.lineTo(canvas.width - 18, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#fb7185';
  ctx.fillRect(canvas.width - 96, 10, 10, 10);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText('Spent', canvas.width - 82, 19);

  ctx.fillStyle = '#34d399';
  ctx.fillRect(canvas.width - 96, 28, 10, 10);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('Budget', canvas.width - 82, 37);

  categories.forEach((category, index) => {
    const x = 24 + index * groupWidth + 8;
    const barWidth = Math.max(18, groupWidth / 3.3);
    const spentHeight = (spentData[index] / maxValue) * chartHeight;
    const budgetHeight = (budgetData[index] / maxValue) * chartHeight;

    ctx.fillStyle = '#fb7185';
    ctx.fillRect(x, chartBottom - spentHeight, barWidth, spentHeight);
    ctx.fillStyle = '#34d399';
    ctx.fillRect(x + barWidth + 6, chartBottom - budgetHeight, barWidth, budgetHeight);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(x + barWidth / 2 + 3, chartBottom + 16);
    ctx.rotate(categories.length > 4 ? -20 * Math.PI / 180 : 0);
    ctx.fillText(category, 0, 0);
    ctx.restore();
  });
}

document.getElementById('runAnalysis').addEventListener('click', async () => {
  const btn = document.getElementById('runAnalysis');
  const adviceText = document.getElementById('adviceText');
  btn.disabled = true;
  btn.textContent = 'Analyzing…';
  try {
    const result = await api('/analyze', {
      method: 'POST',
      body: JSON.stringify({ month: currentMonth })
    });
    adviceText.textContent = result.advice;
  } catch (err) {
    adviceText.textContent = 'Could not run the analysis: ' + err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Analyze this month';
  }
});

// ---------- Expenses ----------
async function loadExpenses() {
  const expenses = await api(`/expenses?month=${currentMonth}`);
  const tbody = document.querySelector('#expenseTable tbody');
  tbody.innerHTML = expenses.map(e => `
    <tr>
      <td>${new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
      <td>${e.category}</td>
      <td>${e.note || '—'}</td>
      <td class="right mono">${inr(e.amount)}</td>
      <td><button class="row-delete" data-id="${e._id}" data-type="expense">✕</button></td>
    </tr>
  `).join('') || '<tr><td colspan="5" style="color:var(--muted)">No expenses this month yet.</td></tr>';

  const categoryList = document.getElementById('categoryList');
  const categories = [...new Set(expenses.map(e => e.category))];
  categoryList.innerHTML = categories.map(c => `<option value="${c}">`).join('');
}

document.getElementById('expenseForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  await api('/expenses', {
    method: 'POST',
    body: JSON.stringify({
      amount: document.getElementById('expAmount').value,
      category: document.getElementById('expCategory').value,
      date: document.getElementById('expDate').value,
      note: document.getElementById('expNote').value
    })
  });
  e.target.reset();
  loadAll();
});

// ---------- Budgets ----------
async function loadBudgets() {
  const [budgets, expenses] = await Promise.all([
    api(`/budgets?month=${currentMonth}`),
    api(`/expenses?month=${currentMonth}`)
  ]);

  const totals = {};
  expenses.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });

  const tbody = document.querySelector('#budgetTable tbody');
  tbody.innerHTML = budgets.map(b => {
    const spent = totals[b.category] || 0;
    const over = spent > b.amount;
    return `
      <tr>
        <td>${b.category}</td>
        <td class="right mono">${inr(b.amount)}</td>
        <td class="right mono ${over ? 'amount-over' : 'amount-under'}">${inr(spent)}</td>
        <td><button class="row-delete" data-id="${b._id}" data-type="budget">✕</button></td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="4" style="color:var(--muted)">No budgets set for this month yet.</td></tr>';
}

document.getElementById('budgetForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  await api('/budgets', {
    method: 'POST',
    body: JSON.stringify({
      category: document.getElementById('budCategory').value,
      amount: document.getElementById('budAmount').value,
      month: currentMonth
    })
  });
  e.target.reset();
  loadAll();
});

// ---------- Savings ----------
async function loadSavings() {
  const savings = await api('/savings');
  const grid = document.getElementById('goalsGrid');
  grid.innerHTML = savings.map(s => {
    const pct = Math.min(100, Math.round((s.currentAmount / s.targetAmount) * 100));
    const deadline = s.deadline ? new Date(s.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No deadline';
    return `
      <div class="goal-card">
        <h3>${s.title}</h3>
        <div class="goal-meta">${inr(s.currentAmount)} of ${inr(s.targetAmount)} · ${deadline}</div>
        <div class="goal-bar-track"><div class="goal-bar-fill" style="width:${pct}%"></div></div>
        <div class="goal-actions">
          <input type="number" placeholder="Add ₹" min="0" data-goal="${s._id}">
          <button data-add="${s._id}">Add</button>
          <button class="row-delete" data-id="${s._id}" data-type="saving">✕</button>
        </div>
      </div>
    `;
  }).join('') || '<p style="color:var(--muted)">No savings goals yet. Create one above.</p>';
}

document.getElementById('savingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  await api('/savings', {
    method: 'POST',
    body: JSON.stringify({
      title: document.getElementById('savTitle').value,
      targetAmount: document.getElementById('savTarget').value,
      deadline: document.getElementById('savDeadline').value || null
    })
  });
  e.target.reset();
  loadAll();
});

// ---------- Delegated click handlers (delete + add-to-goal) ----------
document.addEventListener('click', async (e) => {
  if (e.target.matches('.row-delete')) {
    const { id, type } = e.target.dataset;
    const endpoint = type === 'expense' ? 'expenses' : type === 'budget' ? 'budgets' : 'savings';
    await api(`/${endpoint}/${id}`, { method: 'DELETE' });
    loadAll();
  }
  if (e.target.matches('[data-add]')) {
    const id = e.target.dataset.add;
    const input = document.querySelector(`[data-goal="${id}"]`);
    const addAmount = Number(input.value);
    if (!addAmount) return;
    await api(`/savings/${id}`, { method: 'PUT', body: JSON.stringify({ addAmount }) });
    loadAll();
  }
});

// ---------- Load everything ----------
function loadAll() {
  loadDashboard();
  loadExpenses();
  loadBudgets();
  loadSavings();
}

document.getElementById('expDate').valueAsDate = new Date();
loadAll();
