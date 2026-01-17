// =====================
// DATABASE + SETTINGS
// =====================
const defaultDB = {
  accounts: [
    { id: 1, name: "Cash", balance: 0 },
    { id: 2, name: "Bank", balance: 0 },
    { id: 3, name: "UPI", balance: 0 }
  ],
  categories: [
    { name: "Food", icon: "🍔", color: "#ef4444" },
    { name: "Transport", icon: "🚌", color: "#f59e0b" },
    { name: "Desserts", icon: "🍨", color: "#a78bfa" },
    { name: "Recharge", icon: "📱", color: "#06b6d4" },
    { name: "Health", icon: "💊", color: "#10b981" },
    { name: "Shopping", icon: "🛍️", color: "#f472b6" },
    { name: "Utilities", icon: "💡", color: "#f59e0b" },
    { name: "Entertainment", icon: "🎉", color: "#f43f5e" },
    { name: "Rent", icon: "🏠", color: "#22c55e" },
    { name: "Bills", icon: "🧾", color: "#60a5fa" },
    { name: "Groceries", icon: "🥦", color: "#22c55e" },
    { name: "Education", icon: "📚", color: "#06b6d4" },
    { name: "Travel", icon: "✈️", color: "#f97316" },
    { name: "Fuel", icon: "⛽", color: "#fb7185" },
    { name: "Insurance", icon: "🛡️", color: "#64748b" },
    { name: "Investments", icon: "📈", color: "#84cc16" },
    { name: "Gifts", icon: "🎁", color: "#e879f9" },
    { name: "Subscriptions", icon: "🔁", color: "#a78bfa" },
    { name: "Pets", icon: "🐾", color: "#fb923c" },
    { name: "Kids", icon: "🧸", color: "#f472b6" },
    { name: "Taxes", icon: "💸", color: "#f43f5e" },
    { name: "Maintenance", icon: "🔧", color: "#94a3b8" },
    { name: "Dining Out", icon: "🍽️", color: "#ef4444" },
    { name: "Coffee", icon: "☕", color: "#a16207" },
    { name: "Other", icon: "🎯", color: "#475569" }
  ],
  transactions: [],
  budgetsMonthly: {},
  settings: { currency: "₹" }
};

let db = JSON.parse(localStorage.getItem("smartspend")) || defaultDB;

// Ensure new fields exist in older saved DBs
function ensureCompat() {
  if (!db.accounts) db.accounts = JSON.parse(JSON.stringify(defaultDB.accounts));
  if (!db.categories) db.categories = JSON.parse(JSON.stringify(defaultDB.categories));
  // add color and id for any categories missing it
  db.categories.forEach((c, i) => {
    if (!('color' in c)) c.color = "#64748b";
    if (!('id' in c)) c.id = Number(`${Date.now()}${i}`);
  });
  if (!db.transactions) db.transactions = [];
  if (!db.settings) db.settings = { currency: "₹" };
  if (!db.budgetsMonthly) db.budgetsMonthly = {};
}

// run once on load
ensureCompat();

function saveDB() {
  localStorage.setItem("smartspend", JSON.stringify(db));
}

function cur(n) {
  return db.settings.currency + " " + Number(n || 0).toLocaleString();
}

// =====================
// STATE: MONTH + SEARCH
// =====================
function currentMonthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

let filterMonth = localStorage.getItem('filterMonth') || currentMonthKey();
let searchQuery = '';

function formatMonthKey(key) {
  const [y, m] = key.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleString(undefined, { month: 'short', year: 'numeric' });
}

function getMonthFilteredTransactions() {
  const [y, m] = filterMonth.split('-').map(Number);
  return db.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === y && (d.getMonth() + 1) === m;
  });
}

function getUniqueMonthKeys() {
  const keys = new Set(db.transactions.map(t => {
    const d = new Date(t.date);
    return currentMonthKey(d);
  }));
  keys.add(currentMonthKey());
  return Array.from(keys).sort().reverse();
}

// =====================
// PAGE SWITCH
// =====================
function showPage(name) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const page = document.getElementById("page-" + name);
  if (page) page.classList.add("active");

  // Update bottom nav active state
  document.querySelectorAll(".bottomnav button").forEach(btn => btn.classList.remove("active"));
  const navBtn = document.querySelector(`.bottomnav button[onclick*="showPage('${name}')"]`);
  if (navBtn) navBtn.classList.add("active");

  // Search only active on Records
  const sb = document.getElementById('searchBar');
  if (sb) sb.style.display = (name === 'records' && sb.dataset.open === '1') ? 'block' : 'none';

  if (name === 'records') {
    renderRecords();
    renderSummary();
  } else if (name === 'analysis') {
    renderAnalysis();
  } else if (name === 'ai') {
    generateAIInsights();
  } else if (name === 'accounts') {
    renderAccounts();
  } else if (name === 'budgets') {
    renderBudgets();
  } else if (name === 'categories') {
    renderCategories();
  }
}

// =====================
// MODAL: ADD TRANSACTION
// =====================
let currentTxType = "expense";

function openAddModal() {
  const modal = document.getElementById("addModal");
  if (!modal) return;
  modal.style.display = "flex";

  // Fill accounts
  const accSel = document.getElementById("txAccount");
  if (accSel) {
    accSel.innerHTML = '<option value="">Select Account</option>';
    db.accounts.forEach(a => {
      const opt = document.createElement("option");
      opt.value = a.name;
      opt.textContent = a.name;
      accSel.appendChild(opt);
    });
  }

  // Fill categories
  const catSel = document.getElementById("txCategory");
  if (catSel) {
    catSel.innerHTML = '<option value="">Select Category</option>';
    db.categories.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.name;
      opt.textContent = `${c.icon} ${c.name}`;
      catSel.appendChild(opt);
    });
    const addOpt = document.createElement("option");
    addOpt.value = "__add__";
    addOpt.textContent = "➕ Add Category…";
    catSel.appendChild(addOpt);
    catSel.onchange = (e) => {
      if (e.target.value === "__add__") {
        if (typeof openCustomCategoryModal === 'function') openCustomCategoryModal();
        e.target.value = "";
      }
    };
  }

  // Today
  const dateEl = document.getElementById("txDate");
  if (dateEl) dateEl.valueAsDate = new Date();

  setType("expense");
}

function closeAddModal() {
  const modal = document.getElementById("addModal");
  if (modal) modal.style.display = "none";
}

function setType(t) {
  currentTxType = t;

  const expBtn = document.getElementById("typeExpense");
  const incBtn = document.getElementById("typeIncome");
  const catSel = document.getElementById("txCategory");
  const srcInp = document.getElementById("txSource");

  if (expBtn) expBtn.classList.toggle("active", t === "expense");
  if (incBtn) incBtn.classList.toggle("active", t === "income");
  if (catSel) catSel.style.display = (t === "expense") ? "block" : "none";
  if (srcInp) srcInp.style.display = (t === "income") ? "block" : "none";
}

function saveTx() {
  const amount = Number(document.getElementById("txAmount")?.value || 0);
  const account = document.getElementById("txAccount")?.value || '';
  const date = document.getElementById("txDate")?.value || '';
  const desc = document.getElementById("txDesc")?.value?.trim() || '';

  if (!amount || amount <= 0) { toast('Enter a valid amount'); return; }
  if (!account) { toast('Select an account'); return; }
  if (!date) { toast('Select a date'); return; }

  let category = "Income";
  let icon = "💰";

  if (currentTxType === "expense") {
    category = document.getElementById("txCategory")?.value || '';
    if (!category) { toast('Select a category'); return; }
    const cat = db.categories.find(c => c.name === category);
    icon = cat ? cat.icon : "❓";
  } else {
    category = document.getElementById("txSource")?.value || "Income";
    if (!category.trim()) { toast('Enter income source'); return; }
    icon = "💰";
  }

  const tx = {
    id: Date.now(),
    type: currentTxType,
    amount,
    category,
    icon,
    account,
    date: new Date(date).toISOString(),
    desc
  };

  db.transactions.unshift(tx);

  const acc = db.accounts.find(a => a.name === account);
  if (acc) {
    if (currentTxType === "expense") acc.balance -= amount;
    else acc.balance += amount;
  }

  saveDB();
  closeAddModal();

  // Reset form
  const amountEl = document.getElementById("txAmount");
  const sourceEl = document.getElementById("txSource");
  const imageEl = document.getElementById("txImage");
  const descEl = document.getElementById("txDesc");
  if (amountEl) amountEl.value = "";
  if (sourceEl) sourceEl.value = "";
  if (imageEl) imageEl.value = "";
  if (descEl) descEl.value = "";

  // Keep current filters and re-render
  renderAll();
  syncMonthSelectors();
}

// =====================
// CALCULATIONS
// =====================
function calcTotals() {
  let income = 0, expense = 0;
  getMonthFilteredTransactions().forEach(t => {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  });
  return { income, expense };
}

// =====================
// RENDER RECORDS
// =====================
function matchSearch(t) {
  const q = (searchQuery || '').trim().toLowerCase();
  if (!q) return true;
  const fields = [
    t.desc || '',
    String(t.amount),
    t.category || '',
    t.account || ''
  ].join(' ').toLowerCase();
  return fields.includes(q);
}

function formatDateShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

function openCategoryHistory(name) {
  const modal = document.getElementById('categoryHistoryModal');
  const title = document.getElementById('categoryHistoryTitle');
  const list = document.getElementById('categoryHistoryList');
  if (!modal || !title || !list) return;
  title.textContent = `History: ${name}`;
  const items = db.transactions.filter(t => t.category === name && t.type === 'expense');
  list.innerHTML = '';
  if (items.length === 0) {
    list.innerHTML = '<div class="row">No records.</div>';
  } else {
    items
      .sort((a,b)=> new Date(b.date) - new Date(a.date))
      .forEach(t => {
        const row = document.createElement('div');
        row.className = 'row';
        const amountStr = `-${cur(t.amount)}`;
        const desc = t.desc ? ` <small style='opacity:.7'>• ${t.desc}</small>` : '';
        row.innerHTML = `
          <span>${t.icon} ${t.category}${desc} <small>(${t.account}) • ${formatDateShort(t.date)}</small></span>
          <span class="neg">${amountStr}</span>
        `;
        list.appendChild(row);
      });
  }
  modal.style.display = 'flex';
}

function renderRecords() {
  const list = document.getElementById("recordsList");
  if (!list) return;

  list.innerHTML = "";

  const monthTx = getMonthFilteredTransactions();
  const items = monthTx.filter(matchSearch);

  if (items.length === 0) {
    list.innerHTML = "<div class='row'>No records found</div>";
    return;
  }

  items.forEach(t => {
    const row = document.createElement("div");
    row.className = "row";
    const amountStr = `${t.type === "expense" ? "-" : "+"}${cur(t.amount)}`;
    const desc = t.desc ? ` <small style='opacity:.7'>• ${t.desc}</small>` : '';
    row.innerHTML = `
      <span>${t.icon} ${t.category}${desc} <small>(${t.account}) • ${formatDateShort(t.date)}</small></span>
      <span class="${t.type === "expense" ? "neg" : "pos"}">${amountStr}</span>
    `;
    list.appendChild(row);
  });
}

// =====================
// SUMMARY
// =====================
function renderSummary() {
  const exp = document.querySelector(".sum.exp span");
  const inc = document.querySelector(".sum.inc span");

  if (!exp || !inc) return;

  const { income, expense } = calcTotals();
  exp.textContent = cur(expense);
  inc.textContent = cur(income);
}

// =====================
// ACCOUNTS
// =====================
function renderAccounts() {
  const box = document.getElementById("accountsList");
  if (!box) return;

  box.innerHTML = "";

  db.accounts.forEach(a => {
    const div = document.createElement("div");
    div.className = "card accrow";
    div.innerHTML = `${a.name} <span class="${a.balance < 0 ? "neg" : ""}">${cur(a.balance)}</span>`;
    div.onclick = () => openAccountModal(a);
    box.appendChild(div);
  });

  const btn = document.createElement("button");
  btn.className = "fullbtn";
  btn.textContent = "➕ ADD NEW ACCOUNT";
  btn.onclick = () => openAccountModal();
  box.appendChild(btn);
}

function openAccountModal(acc) {
  const modal = document.getElementById('accountModal');
  if (!modal) return;
  document.getElementById('accountModalTitle').textContent = acc ? 'Edit Account' : 'Add Account';
  document.getElementById('accountId').value = acc?.id || '';
  document.getElementById('accountName').value = acc?.name || '';
  document.getElementById('accountBalance').value = (typeof acc?.balance === 'number') ? acc.balance : '';
  const btns = modal.querySelector('.buttons');
  if (btns) {
    let del = document.getElementById('accountDeleteBtn');
    if (acc && !del) {
      del = document.createElement('button');
      del.id = 'accountDeleteBtn';
      del.className = 'saveBtn';
      del.style.background = '#ef4444';
      del.textContent = 'Delete';
      del.onclick = () => confirmAccountDelete(acc);
      btns.insertBefore(del, btns.firstChild);
    } else if (!acc && del) {
      del.remove();
    }
  }
  modal.style.display = 'flex';
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'none';
}

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(()=> t.style.display='none', 1800);
}

function saveAccountFromModal() {
  const id = document.getElementById('accountId').value;
  const name = document.getElementById('accountName').value.trim();
  const balStr = document.getElementById('accountBalance').value;
  const balance = balStr === '' ? 0 : Number(balStr);
  if (!name) { toast('Name required'); return; }
  if (db.accounts.some(a => a.name.toLowerCase() === name.toLowerCase() && String(a.id) !== String(id || ''))) {
    toast('Account name exists');
    return;
  }
  if (id) {
    const acc = db.accounts.find(a => String(a.id) === String(id));
    if (acc) { acc.name = name; if (!isNaN(balance)) acc.balance = balance; }
    toast('Account updated');
  } else {
    db.accounts.push({ id: Date.now(), name, balance: isNaN(balance) ? 0 : balance });
    toast('Account added');
  }
  saveDB();
  closeModal('accountModal');
  renderAccounts();
}

let accountToDeleteId = null;
function confirmAccountDelete(acc) {
  accountToDeleteId = acc.id;
  const txt = document.getElementById('accountDeleteText');
  if (txt) txt.textContent = `Delete account "${acc.name}"? Transactions will remain but won't reference this account.`;
  const modal = document.getElementById('accountDeleteModal');
  if (modal) modal.style.display = 'flex';
}

function performAccountDelete() {
  if (!accountToDeleteId) return;
  db.accounts = db.accounts.filter(a => a.id !== accountToDeleteId);
  // Optionally, you can reassign transactions' account field
  db.transactions.forEach(t => { if (!db.accounts.find(a => a.name === t.account)) t.account = 'Cash'; });
  saveDB();
  closeModal('accountDeleteModal');
  renderAccounts();
  toast('Account deleted');
}

// =====================
// CATEGORIES
// =====================
function categoryTotalsMap() {
  const map = {};
  getMonthFilteredTransactions().forEach(t => {
    if (t.type !== 'expense') return;
    map[t.category] = (map[t.category] || 0) + t.amount;
  });
  return map;
}

function renderCategories() {
  const box = document.getElementById("categoriesList");
  if (!box) return;

  box.innerHTML = "";

  const totals = categoryTotalsMap();

  db.categories.forEach((c, index) => {
    const row = document.createElement("div");
    row.className = "row";
    const colorDot = `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c.color};margin-right:8px"></span>`;
    const total = totals[c.name] || 0;
    row.innerHTML = `
      <span>${colorDot}${c.icon} ${c.name}</span>
      <span>
        <b style="margin-right:10px;">${cur(total)}</b>
        <button class="iconBtn" onclick="openCategoryHistory('${c.name}')">📜</button>
        <button class="iconBtn" onclick="editCategory(${index})">✏️</button>
        <button class="iconBtn danger" onclick="deleteCategory(${index})">🗑️</button>
      </span>
    `;
    box.appendChild(row);
  });

  const btn = document.createElement("button");
  btn.className = "fullbtn";
  btn.textContent = "➕ ADD CUSTOM CATEGORY";
  btn.onclick = openCustomCategoryModal;
  box.appendChild(btn);
}

function deleteCategory(index) {
  const deleted = db.categories[index];
  openConfirm(`Delete category "${deleted.name}"? Transactions using it will be moved to Other.`, () => {
    db.transactions.forEach(t => {
      if (t.category === deleted.name) {
        t.category = "Other";
        t.icon = "🎯";
      }
    });
    db.categories.splice(index, 1);
    saveDB();
    renderAll();
    toast('Category deleted');
  });
}

function addCategorySimple() {}

function editCategory(index) {
  openCategoryEditModal(index);
}

// =====================
// CUSTOM CATEGORY MODAL
// =====================
const defaultColors = [
  '#ef4444','#f97316','#f59e0b','#84cc16','#22c55e','#06b6d4','#3b82f6','#a78bfa','#f472b6','#64748b'
];

function openCustomCategoryModal() {
  openCategoryAddModal();
}

function closeCustomCategoryModal() {
  const modal = document.getElementById('customCategoryModal');
  if (modal) modal.style.display = 'none';
}

let editingCategoryIndex = null;
function openCategoryAddModal() {
  editingCategoryIndex = null;
  const modal = document.getElementById('customCategoryModal');
  if (!modal) return;
  document.getElementById('customCatName').value = '';
  document.getElementById('customCatColor').value = '#64748b';
  document.getElementById('customCatIcon').value = '🎯';
  populateCustomCategoryPickers();
  modal.style.display = 'flex';
}

function openCategoryEditModal(index) {
  editingCategoryIndex = index;
  const modal = document.getElementById('customCategoryModal');
  if (!modal) return;
  const cat = db.categories[index];
  document.getElementById('customCatName').value = cat.name;
  document.getElementById('customCatColor').value = cat.color || '#64748b';
  document.getElementById('customCatIcon').value = cat.icon || '🎯';
  populateCustomCategoryPickers();
  modal.style.display = 'flex';
}

function populateCustomCategoryPickers() {
  const colorGrid = document.getElementById('colorGrid');
  if (colorGrid) {
    colorGrid.innerHTML = '';
    defaultColors.forEach(c => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.style = `width:28px;height:28px;border-radius:50%;border:none;background:${c};cursor:pointer;`;
      btn.setAttribute('aria-label', c);
      btn.onclick = () => {
        document.getElementById('customCatColor').value = c;
        Array.from(colorGrid.children).forEach(ch => ch.style.outline = 'none');
        btn.style.outline = '2px solid #22c55e';
      };
      if (document.getElementById('customCatColor').value === c) btn.style.outline = '2px solid #22c55e';
      colorGrid.appendChild(btn);
    });
  }
  const iconGrid = document.getElementById('customIconGrid');
  if (iconGrid) {
    iconGrid.innerHTML = '';
    icons.forEach(ic => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = ic;
      b.style = 'padding:10px;border:none;border-radius:8px;background:rgba(255,255,255,0.1);cursor:pointer;';
      b.onclick = () => {
        document.getElementById('customCatIcon').value = ic;
        Array.from(iconGrid.children).forEach(ch => ch.style.outline = 'none');
        b.style.outline = '2px solid #22c55e';
      };
      if (document.getElementById('customCatIcon').value === ic) b.style.outline = '2px solid #22c55e';
      iconGrid.appendChild(b);
    });
  }
}

function saveCustomCategory() {
  const name = document.getElementById('customCatName')?.value?.trim();
  const color = document.getElementById('customCatColor')?.value || '#64748b';
  const icon = document.getElementById('customCatIcon')?.value || '🎯';

  if (!name) { toast('Category name required'); return; }
  if (db.categories.some((c, i) => c.name.toLowerCase() === name.toLowerCase() && i !== (editingCategoryIndex ?? -1))) {
    toast('Category name exists');
    return;
  }

  if (editingCategoryIndex !== null) {
    const cat = db.categories[editingCategoryIndex];
    cat.name = name; cat.color = color; cat.icon = icon;
    toast('Category updated');
  } else {
    db.categories.push({ id: Number(`${Date.now()}${Math.floor(Math.random()*1000)}`), name, color, icon });
    toast('Category added');
  }
  saveDB();
  closeCustomCategoryModal();
  renderAll();
}

// =====================
// BUDGETS (Monthly per category)
// =====================
function getBudgetForCategory(cat, month = filterMonth) {
  const m = db.budgetsMonthly?.[month] || {};
  const val = m[cat];
  return typeof val === 'number' ? val : 0;
}

function setBudgetForCategory(cat, amount, month = filterMonth) {
  if (!db.budgetsMonthly[month]) db.budgetsMonthly[month] = {};
  db.budgetsMonthly[month][cat] = Math.max(0, Number(amount) || 0);
  saveDB();
  renderBudgets();
}

function calcCategorySpendForMonth(cat, month = filterMonth) {
  const [y, m] = month.split('-').map(Number);
  let sum = 0;
  db.transactions.forEach(t => {
    if (t.type !== 'expense' || t.category !== cat) return;
    const d = new Date(t.date);
    if (d.getFullYear() === y && (d.getMonth() + 1) === m) sum += t.amount;
  });
  return sum;
}

function getBudgetsSummary(month = filterMonth) {
  let totalBudget = 0;
  let totalSpent = 0;
  db.categories.forEach(c => {
    totalBudget += getBudgetForCategory(c.name, month);
    totalSpent += calcCategorySpendForMonth(c.name, month);
  });
  return { totalBudget, totalSpent, totalRemaining: Math.max(0, totalBudget - totalSpent) };
}

function promptSetBudget(cat) {
  const current = getBudgetForCategory(cat);
  const val = prompt(`Set monthly budget for ${cat}`, current ? String(current) : '');
  if (val === null) return;
  const num = Number(val);
  if (isNaN(num) || num < 0) { toast('Enter a valid non-negative number'); return; }
  setBudgetForCategory(cat, num);
}

function renderBudgets() {
  const list = document.getElementById('budgetsList');
  const totalBudgetEl = document.getElementById('totalBudget');
  const totalSpentEl = document.getElementById('totalSpent');
  const totalRemainingEl = document.getElementById('totalRemaining');
  if (!list) return;

  list.innerHTML = '';

  db.categories.forEach(c => {
    const budget = getBudgetForCategory(c.name);
    const spent = calcCategorySpendForMonth(c.name);
    const remaining = Math.max(0, budget - spent);
    const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
    const row = document.createElement('div');
    row.className = 'card';
    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c.color}"></span>
          <b>${c.icon} ${c.name}</b>
        </div>
        <div style="display:flex;gap:12px;align-items:center">
          <span>Budget: <b>${cur(budget)}</b></span>
          <span>Spent: <b>${cur(spent)}</b></span>
          <span>Left: <b ${remaining===0 && budget>0 ? 'class="neg"' : ''}>${cur(remaining)}</b></span>
          <button class="iconBtn" onclick="promptSetBudget('${c.name}')">${budget>0 ? 'Edit' : 'Set'}</button>
        </div>
      </div>
      <div style="margin-top:10px;height:8px;border-radius:999px;background:rgba(255,255,255,0.15);overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${c.color};opacity:0.9"></div>
      </div>
    `;
    list.appendChild(row);
  });

  if (totalBudgetEl && totalSpentEl && totalRemainingEl) {
    const s = getBudgetsSummary();
    totalBudgetEl.textContent = cur(s.totalBudget);
    totalSpentEl.textContent = cur(s.totalSpent);
    totalRemainingEl.textContent = cur(s.totalRemaining);
  }
}

// =====================
// ICON PICKER (for edit and legacy add)
// =====================
const icons = ["🍔", "🚌", "🍨", "📱", "💊", "🛍️", "🎯", "🍕", "🚗", "🏥", "📚", "🎉", "💡", "🔧", "🏠", "✈️", "☕", "🥦", "📈", "🧾", "🎁", "🔁", "🐾", "⛽", "💸", "🛡️"];

function openIconPicker(callback) {
  const grid = document.getElementById("iconGrid");
  if (!grid) return;
  grid.innerHTML = "";
  icons.forEach(icon => {
    const btn = document.createElement("button");
    btn.textContent = icon;
    btn.onclick = () => selectIcon(icon, callback);
    grid.appendChild(btn);
  });
  const picker = document.getElementById("iconPicker");
  if (picker) picker.style.display = "flex";
}

function closeIconPicker() {
  const picker = document.getElementById("iconPicker");
  if (picker) picker.style.display = "none";
}

function selectIcon(icon, callback) {
  if (typeof callback === 'function') callback(icon);
  closeIconPicker();
}

// =====================
// ANALYSIS PIE
// =====================
let pieChart = null;

function renderAnalysis() {
  const ctx = document.getElementById("pieChart");
  const breakdown = document.getElementById('analysisBreakdown');
  if (!ctx) return;

  const map = {};
  const catMeta = {};

  // Build totals and meta
  getMonthFilteredTransactions().forEach(t => {
    if (t.type !== "expense") return;
    map[t.category] = (map[t.category] || 0) + t.amount;
    if (!catMeta[t.category]) {
      const cat = db.categories.find(c => c.name === t.category) || { icon: '❓', color: '#64748b' };
      catMeta[t.category] = { icon: cat.icon, color: cat.color };
    }
  });

  const labels = Object.keys(map);
  const data = labels.map(k => map[k]);
  const total = data.reduce((a,b)=>a+b,0) || 1;

  if (pieChart) pieChart.destroy();

  pieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data }]
    },
    options: {
      cutout: '60%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = ctx.parsed;
              const pct = ((val/total)*100).toFixed(1);
              const name = ctx.label;
              return `${name}: ${cur(val)} (${pct}%)`;
            }
          }
        }
      }
    }
  });

  // Breakdown list
  if (breakdown) {
    breakdown.innerHTML = '';
    labels
      .sort((a,b)=> map[b]-map[a])
      .forEach(name => {
        const amt = map[name];
        const pct = ((amt/total)*100).toFixed(1);
        const meta = catMeta[name] || { icon: '❓', color: '#64748b' };
        const row = document.createElement('div');
        row.className = 'row';
        row.style.cursor = 'pointer';
        row.onclick = () => openCategoryHistory(name);
        row.innerHTML = `
          <div style="flex:1;display:flex;flex-direction:column;gap:6px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span><span style=\"display:inline-block;width:10px;height:10px;border-radius:50%;background:${meta.color};margin-right:8px\"></span>${meta.icon} ${name}</span>
              <span><b>${cur(amt)}</b> <small style=\"opacity:.7\">(${pct}%)</small></span>
            </div>
            <div style="height:6px;border-radius:999px;background:rgba(255,255,255,0.15);overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${meta.color};opacity:0.9"></div>
            </div>
          </div>
        `;
        breakdown.appendChild(row);
      });
    if (labels.length === 0) breakdown.innerHTML = '<div class="row">No expenses this month</div>';
  }
}

// =====================
// AI ENGINE
// =====================
function generateAIInsights() {
  const box = document.getElementById("aiBox");
  if (!box) return;
  box.innerHTML = "";

  const all = db.transactions;
  if (all.length < 5) {
    box.innerHTML = `<div class="card">🤖 Not enough data yet. Add more transactions to unlock smart insights.</div>`;
    return;
  }

  const now = new Date();

  function isSameMonth(d, ref) {
    return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
  }

  const thisMonth = [];
  const lastMonth = [];

  all.forEach(t => {
    const d = new Date(t.date);
    if (t.type !== "expense") return;

    if (isSameMonth(d, now)) thisMonth.push(t);
    else {
      const prev = new Date(now);
      prev.setMonth(prev.getMonth() - 1);
      if (isSameMonth(d, prev)) lastMonth.push(t);
    }
  });

  function sum(list) {
    return list.reduce((a, b) => a + b.amount, 0);
  }

  const thisTotal = sum(thisMonth);
  const lastTotal = sum(lastMonth);

  // 1️⃣ Month trend
  if (lastTotal > 0) {
    const change = ((thisTotal - lastTotal) / lastTotal) * 100;

    if (change > 15) {
      box.innerHTML += `<div class="card">⚠️ Your spending increased by <b>${change.toFixed(1)}%</b> compared to last month.</div>`;
    } else if (change < -15) {
      box.innerHTML += `<div class="card">✅ Good job! You reduced spending by <b>${Math.abs(change).toFixed(1)}%</b> this month.</div>`;
    }
  }

  // 2️⃣ Category trend detection
  function groupByCat(list) {
    const m = {};
    list.forEach(t => {
      m[t.category] = (m[t.category] || 0) + t.amount;
    });
    return m;
  }

  const curMap = groupByCat(thisMonth);
  const prevMap = groupByCat(lastMonth);

  for (let c in curMap) {
    if (prevMap[c]) {
      const diff = ((curMap[c] - prevMap[c]) / prevMap[c]) * 100;
      if (diff > 30) {
        box.innerHTML += `<div class="card">📈 Your <b>${c}</b> expenses increased by <b>${diff.toFixed(0)}%</b> this month.</div>`;
      }
    }
  }

  // 3️⃣ Habit detection (frequent categories)
  const freq = {};
  thisMonth.forEach(t => {
    freq[t.category] = (freq[t.category] || 0) + 1;
  });

  for (let c in freq) {
    if (freq[c] >= 6) {
      box.innerHTML += `<div class="card">🔁 You spend very frequently on <b>${c}</b>. This looks like a habit.</div>`;
    }
  }

  // 4️⃣ Burn rate prediction
  const daysPassed = new Date().getDate();
  const avgPerDay = thisTotal / Math.max(daysPassed, 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projected = avgPerDay * daysInMonth;

  box.innerHTML += `<div class="card">📊 At this rate, you may spend around <b>${cur(projected.toFixed(0))}</b> this month.</div>`;

  // 5️⃣ Account drain detection
  const accMap = {};
  thisMonth.forEach(t => {
    accMap[t.account] = (accMap[t.account] || 0) + t.amount;
  });

  let topAcc = null, max = 0;
  for (let a in accMap) {
    if (accMap[a] > max) {
      max = accMap[a];
      topAcc = a;
    }
  }

  if (topAcc) {
    box.innerHTML += `<div class="card">🏦 Your <b>${topAcc}</b> account is draining the fastest this month.</div>`;
  }

  // 6️⃣ Smart saving tip (data driven)
  if (thisTotal > 0) {
    const save10 = thisTotal * 0.1;
    box.innerHTML += `<div class="card">💡 If you cut just 10% spending, you could save <b>${cur(save10.toFixed(0))}</b> this month.</div>`;
  }

  if (box.innerHTML.trim() === "") {
    box.innerHTML = `<div class="card">🤖 Your spending looks stable. No unusual patterns detected.</div>`;
  }
}

// =====================
// MONTH SELECTORS + SEARCH BAR
// =====================
function populateMonthSelectors() {
  const keys = getUniqueMonthKeys();
  const hdr = document.getElementById('monthSelectHeader');
  const drw = document.getElementById('monthSelectDrawer');

  function fill(sel) {
    if (!sel) return;
    sel.innerHTML = '';
    keys.forEach(k => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = formatMonthKey(k);
      sel.appendChild(opt);
    });
    sel.value = filterMonth;
    sel.onchange = (e) => updateFilterMonth(e.target.value);
  }

  fill(hdr);
  fill(drw);

  // Update Records title suffix if element exists
  const monthbar = document.querySelector('#page-records .monthbar');
  if (monthbar && !document.getElementById('monthSelectHeader')) {
    // no-op, header select missing
  }
}

function syncMonthSelectors() {
  const hdr = document.getElementById('monthSelectHeader');
  const drw = document.getElementById('monthSelectDrawer');
  if (hdr) hdr.value = filterMonth;
  if (drw) drw.value = filterMonth;
}

function updateFilterMonth(val) {
  filterMonth = val || currentMonthKey();
  localStorage.setItem('filterMonth', filterMonth);
  renderAll();
  syncMonthSelectors();
}

function toggleSearch() {
  const sb = document.getElementById('searchBar');
  const recordsActive = document.getElementById('page-records')?.classList.contains('active');
  if (!sb) return;
  if (!recordsActive) {
    // Only show search on records page
    sb.style.display = 'none';
    sb.dataset.open = '0';
    return;
  }
  const nowOpen = sb.style.display !== 'block';
  sb.style.display = nowOpen ? 'block' : 'none';
  sb.dataset.open = nowOpen ? '1' : '0';
  const inp = document.getElementById('searchInput');
  if (nowOpen && inp) inp.focus();
}

function initSearchHandlers() {
  const iconBtn = document.querySelector('.topbar .search');
  if (iconBtn) iconBtn.onclick = toggleSearch;
  const inp = document.getElementById('searchInput');
  if (inp) inp.oninput = (e) => { searchQuery = e.target.value; renderRecords(); };
}

// =====================
// DRAWER
// =====================
function toggleDrawer() {
  const d = document.getElementById("drawer");
  const o = document.getElementById("drawerOverlay");
  if (!d || !o) return;
  d.classList.toggle("open");
  o.classList.toggle('show');
}

// =====================
// THEME
// =====================
function toggleTheme() {
  const isDark = document.getElementById("darkToggle")?.checked;
  if (typeof isDark !== 'boolean') return;
  document.body.classList.toggle("dark", isDark);
  document.body.classList.toggle("light", !isDark);
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

// Load theme on startup
(function() {
  const t = localStorage.getItem("theme") || "dark"; // Default to dark as per HTML
  document.body.classList.add(t);
  const dt = document.getElementById("darkToggle");
  if (dt) dt.checked = (t === "dark");
})();

// =====================
// CURRENCY
// =====================
function changeCurrency(curSym) {
  db.settings.currency = curSym;
  saveDB();
  renderAll();
}

// Set initial currency (if element exists)
(function(){
  const sel = document.getElementById("currencySelect");
  if (sel) sel.value = db.settings.currency;
})();

// =====================
// RESET
// =====================
function resetApp() {
  openConfirm('This will delete all data. Continue?', () => {
    localStorage.removeItem('smartspend');
    location.reload();
  });
}

// =====================
// IMPORT / EXPORT
// =====================
function exportData() {
  const data = JSON.stringify(db, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  a.download = `smartspend-backup-${ts}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  toast('Exported');
}

function triggerImport() {
  const input = document.getElementById('importFile');
  if (input) input.click();
}

function importData(ev) {
  const file = ev?.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      if (!obj || typeof obj !== 'object') throw new Error('Invalid file');
      const next = {
        accounts: Array.isArray(obj.accounts) ? obj.accounts : defaultDB.accounts,
        categories: Array.isArray(obj.categories) ? obj.categories : defaultDB.categories,
        transactions: Array.isArray(obj.transactions) ? obj.transactions : [],
        budgetsMonthly: obj.budgetsMonthly && typeof obj.budgetsMonthly === 'object' ? obj.budgetsMonthly : {},
        settings: obj.settings && typeof obj.settings === 'object' ? obj.settings : { currency: '₹' }
      };
      db = next;
      // compat
      ensureCompat();
      saveDB();
      renderAll();
      populateMonthSelectors();
      syncMonthSelectors();
      toast('Import successful');
    } catch (e) {
      toast('Import failed');
    } finally {
      ev.target.value = '';
    }
  };
  reader.readAsText(file);
}

// =====================
// MAIN RENDER
// =====================
function renderAll() {
  renderRecords();
  renderSummary();
  renderAccounts();
  renderCategories();
  renderBudgets();
  renderAnalysis();
  generateAIInsights();
}

// Initial render and UI wiring
(function init(){
  renderAll();
  populateMonthSelectors();
  syncMonthSelectors();
  initSearchHandlers();
})();

// Confirm modal controller
let confirmYesCallback = null;
function openConfirm(text, yesCb) {
  confirmYesCallback = yesCb;
  const m = document.getElementById('confirmModal');
  const t = document.getElementById('confirmText');
  const y = document.getElementById('confirmYesBtn');
  if (!m || !t || !y) return;
  t.textContent = text;
  y.onclick = () => { const fn = confirmYesCallback; confirmYesCallback = null; closeModal('confirmModal'); if (typeof fn === 'function') fn(); };
  m.style.display = 'flex';
}

// =====================
// FORCE BINDINGS (CRITICAL)
// =====================
window.openAddModal = openAddModal;
window.closeAddModal = closeAddModal;
window.saveTx = saveTx;
window.setType = setType;
// removed prompt-based addAccount binding
window.openIconPicker = openIconPicker;
window.closeIconPicker = closeIconPicker;
window.selectIcon = selectIcon;
window.showPage = showPage;
window.toggleDrawer = toggleDrawer;
window.toggleTheme = toggleTheme;
window.changeCurrency = changeCurrency;
window.resetApp = resetApp;
window.exportData = exportData;
window.importData = importData;
window.triggerImport = triggerImport;
window.openCustomCategoryModal = openCustomCategoryModal;
window.openCategoryHistory = openCategoryHistory;
window.closeModal = closeModal;
window.saveAccountFromModal = saveAccountFromModal;
window.performAccountDelete = performAccountDelete;
window.closeCustomCategoryModal = closeCustomCategoryModal;
window.saveCustomCategory = saveCustomCategory;
window.updateFilterMonth = updateFilterMonth;
window.toggleSearch = toggleSearch;
window.openCategoryAddModal = openCategoryAddModal;
window.openCategoryEditModal = openCategoryEditModal;
window.openConfirm = openConfirm;
window.renderBudgets = renderBudgets;
window.setBudgetForCategory = setBudgetForCategory;
window.promptSetBudget = promptSetBudget;
