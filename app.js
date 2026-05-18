const STORAGE_KEY = "arabic_invoice_suite_v2";
const LEGACY_STORAGE_KEY = "arabic_invoice_suite_v1";
const USE_BACKEND = typeof location !== "undefined" && /^https?:$/.test(location.protocol);
const today = new Date().toISOString().slice(0, 10);
const dayMs = 24 * 60 * 60 * 1000;
const VIEW_STORAGE_KEY = "hesabi_active_view";

const demoData = {
  settings: {
    businessName: "مؤسسة حسابي التجارية",
    businessAddress: "رام الله - شارع الإرسال",
    businessPhone: "0590000000",
    taxNumber: "VAT-123456",
    invoiceFooter: "شكرًا لتعاملكم معنا",
    currency: "₪",
    primaryColor: "#4f46e5",
    moneyInColor: "#167947",
    moneyOutColor: "#b42318",
    mode: "light",
    logoUrl: "",
    invoiceTemplate: "official",
  },
  currentUserId: "u-admin",
  users: [
    { id: "u-admin", name: "المدير", email: "admin@example.com", role: "admin", active: true },
    { id: "u-accountant", name: "المحاسب", email: "accountant@example.com", role: "accountant", active: true },
    { id: "u-cashier", name: "الكاشير", email: "cashier@example.com", role: "cashier", active: true },
    { id: "u-employee", name: "موظف", email: "employee@example.com", role: "employee", active: true },
  ],
  categories: {
    expenses: ["إيجار", "رواتب", "كهرباء", "صيانة", "نقل"],
    income: ["مبيعات", "خدمات", "أخرى"],
  },
  contacts: [
    { id: "c-1", name: "شركة الهدى", type: "customer", phone: "022400001", email: "", address: "الخليل", openingBalance: 0 },
    { id: "c-2", name: "محمد سالم", type: "customer", phone: "0599000002", email: "", address: "نابلس", openingBalance: 0 },
    { id: "c-3", name: "مورد التقنية", type: "supplier", phone: "022400003", email: "", address: "رام الله", openingBalance: 0 },
    { id: "c-4", name: "شركة الإمداد", type: "supplier", phone: "022400004", email: "", address: "بيت لحم", openingBalance: 0 },
  ],
  accounts: [
    { id: "acc-cash", name: "الصندوق الرئيسي", type: "cash", openingBalance: 1500 },
    { id: "acc-bank", name: "حساب البنك", type: "bank", openingBalance: 5000 },
  ],
  products: [
    { id: "p-1", sku: "MOB-A15", name: "جوال A15", category: "إلكترونيات", stock: 18, openingStock: 15, minStock: 6, cost: 480, baseCost: 480, price: 620 },
    { id: "p-2", sku: "BT-01", name: "سماعة بلوتوث", category: "إكسسوارات", stock: 9, openingStock: 2, minStock: 10, cost: 35, baseCost: 35, price: 65 },
    { id: "p-3", sku: "CH-20W", name: "شاحن سريع", category: "إكسسوارات", stock: 33, openingStock: 17, minStock: 12, cost: 18, baseCost: 18, price: 35 },
    { id: "p-4", sku: "LAP-01", name: "لابتوب مكتبي", category: "حواسيب", stock: 4, openingStock: 5, minStock: 3, cost: 1900, baseCost: 1900, price: 2450 },
  ],
  invoices: [
    {
      id: "S-1001",
      type: "sale",
      contactId: "c-1",
      party: "شركة الهدى",
      date: dateOffset(-5),
      status: "paid",
      notes: "",
      lines: [
        { productId: "p-1", qty: 2, price: 620, cost: 480 },
        { productId: "p-3", qty: 4, price: 35, cost: 18 },
      ],
    },
    {
      id: "S-1002",
      type: "sale",
      contactId: "c-2",
      party: "محمد سالم",
      date: dateOffset(-2),
      status: "partial",
      notes: "",
      lines: [
        { productId: "p-2", qty: 3, price: 65, cost: 35 },
        { productId: "p-4", qty: 1, price: 2450, cost: 1900 },
      ],
    },
    {
      id: "P-5001",
      type: "purchase",
      contactId: "c-3",
      party: "مورد التقنية",
      date: dateOffset(-6),
      status: "paid",
      notes: "",
      lines: [
        { productId: "p-1", qty: 5, price: 480, cost: 480 },
        { productId: "p-2", qty: 10, price: 35, cost: 35 },
      ],
    },
    {
      id: "P-5002",
      type: "purchase",
      contactId: "c-4",
      party: "شركة الإمداد",
      date: dateOffset(-1),
      status: "paid",
      notes: "",
      lines: [{ productId: "p-3", qty: 20, price: 18, cost: 18 }],
    },
  ],
  payments: [
    { id: "PAY-1", invoiceId: "S-1001", accountId: "acc-bank", date: dateOffset(-4), amount: 1380, method: "bank", reference: "TR-1001", notes: "دفعة كاملة" },
    { id: "PAY-2", invoiceId: "S-1002", accountId: "acc-cash", date: dateOffset(-1), amount: 1200, method: "cash", reference: "", notes: "دفعة أولى" },
    { id: "PAY-3", invoiceId: "P-5001", accountId: "acc-bank", date: dateOffset(-6), amount: 2750, method: "bank", reference: "SUP-5001", notes: "" },
    { id: "PAY-4", invoiceId: "P-5002", accountId: "acc-cash", date: dateOffset(-1), amount: 360, method: "cash", reference: "", notes: "" },
  ],
  expenses: [
    { id: "EXP-1", date: dateOffset(-3), category: "نقل", description: "توصيل بضاعة", accountId: "acc-cash", amount: 85, notes: "" },
    { id: "EXP-2", date: dateOffset(-1), category: "كهرباء", description: "فاتورة كهرباء", accountId: "acc-bank", amount: 210, notes: "" },
  ],
  credits: [],
  activityLog: [],
};

let state = loadState();
let authToken = typeof localStorage !== "undefined" ? localStorage.getItem("invoice_auth_token") || "" : "";
let authUser = null;
let activeView = "dashboard";
let editingInvoiceId = null;
let editingProductId = null;
let editingContactId = null;
let editingAccountId = null;
let chartMode = "net";
let reportRange = { from: dateOffset(-30), to: today };
let syncTimer = null;
let isSyncingState = false;
let lastSyncedSignature = "";
let stateStream = null;
let streamReconnectTimer = null;
let streamConnected = false;
let visibilitySyncBound = false;

const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();
  if (USE_BACKEND) {
    const ready = await bootstrapBackendSession();
    if (!ready) return;
  }
  bindEvents();
  hydrateSettings();
  applyTheme();
  switchView(getInitialView(), { persist: false, skipRender: true });
  recalculateInventory();
  render();
  registerPwa();
  startRealtimeSync();
});

function cacheElements() {
  [
    "saveState",
    "viewKicker",
    "viewTitle",
    "globalSearch",
    "logoutBtn",
    "exportBtn",
    "quickSaleBtn",
    "metrics",
    "trendChart",
    "stockAlerts",
    "salesTable",
    "purchasesTable",
    "paymentMetrics",
    "paymentsTable",
    "recentPayments",
    "paymentTypeFilter",
    "paymentStatusFilter",
    "contactMetrics",
    "contactsTable",
    "inventoryGrid",
    "expenseMetrics",
    "expensesTable",
    "accountGrid",
    "accountTransactionsTable",
    "activityTable",
    "modalBackdrop",
    "closeModal",
    "modalKicker",
    "modalTitle",
    "modalBody",
    "invoiceFormTemplate",
    "paymentFormTemplate",
    "contactFormTemplate",
    "expenseFormTemplate",
    "accountFormTemplate",
    "productFormTemplate",
    "toast",
    "salesStatusFilter",
    "clearSalesFilter",
    "reportFrom",
    "reportTo",
    "applyReport",
    "reportSummary",
    "topProductsTable",
    "businessName",
    "businessAddress",
    "businessPhone",
    "taxNumber",
    "currencySymbol",
    "invoiceFooter",
    "logoUrl",
    "invoiceTemplate",
    "primaryColor",
    "moneyInColor",
    "moneyOutColor",
    "modeSelect",
    "currentUserSelect",
    "usersTable",
    "saveSettings",
    "backupBtn",
    "restoreBackup",
    "resetDemo",
    "addProductBtn",
    "addGeneralPaymentBtn",
    "addContactBtn",
    "addExpenseBtn",
    "addAccountBtn",
    "clearActivityBtn",
  ].forEach((id) => (els[id] = document.getElementById(id)));
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((btn) => btn.addEventListener("click", () => switchView(btn.dataset.view)));
  document.querySelectorAll("[data-open-invoice]").forEach((btn) => btn.addEventListener("click", () => openInvoiceModal(btn.dataset.openInvoice)));

  on(els.quickSaleBtn, "click", () => openInvoiceModal("sale"));
  on(els.addProductBtn, "click", () => openProductModal());
  on(els.addContactBtn, "click", () => openContactModal());
  on(els.addExpenseBtn, "click", () => openExpenseModal());
  on(els.addAccountBtn, "click", () => openAccountModal());
  on(els.addGeneralPaymentBtn, "click", () => openPaymentModal());
  on(els.closeModal, "click", closeModal);
  on(els.modalBackdrop, "click", (event) => {
    if (event.target === els.modalBackdrop) closeModal();
  });

  on(els.globalSearch, "input", render);
  on(els.salesStatusFilter, "change", renderSales);
  on(els.clearSalesFilter, "click", () => {
    els.salesStatusFilter.value = "all";
    renderSales();
  });
  on(els.paymentTypeFilter, "change", renderPayments);
  on(els.paymentStatusFilter, "change", renderPayments);

  document.querySelectorAll("#chartMode button").forEach((btn) => {
    btn.addEventListener("click", () => {
      chartMode = btn.dataset.mode;
      document.querySelectorAll("#chartMode button").forEach((item) => item.classList.toggle("selected", item === btn));
      drawChart();
    });
  });
  document.querySelectorAll("[data-open-report]").forEach((btn) => btn.addEventListener("click", () => openDetailedReport(btn.dataset.openReport)));

  on(els.exportBtn, "click", exportData);
  on(els.logoutBtn, "click", logoutUser);
  on(els.backupBtn, "click", exportData);
  on(els.restoreBackup, "change", restoreData);
  on(els.applyReport, "click", () => {
    reportRange.from = els.reportFrom.value || dateOffset(-30);
    reportRange.to = els.reportTo.value || today;
    renderReports();
  });
  on(els.saveSettings, "click", saveSettings);
  on(els.resetDemo, "click", resetDemoData);
  on(els.clearActivityBtn, "click", clearActivityLog);
  window.addEventListener("hashchange", () => switchView(getInitialView(), { persist: false }));
}

function on(element, event, handler) {
  if (element) element.addEventListener(event, handler);
}

function logoutUser() {
  authToken = "";
  authUser = null;
  closeStateStream();
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
  try {
    localStorage.removeItem("invoice_auth_token");
  } catch {}
  location.reload();
}

async function bootstrapBackendSession() {
  if (!authToken) {
    showLoginScreen();
    return false;
  }
  try {
    const session = await apiFetch("/api/session");
    authUser = session.user;
    state = normalizeState(await apiFetch("/api/state"));
    return true;
  } catch {
    localStorage.removeItem("invoice_auth_token");
    authToken = "";
    showLoginScreen();
    return false;
  }
}

function showLoginScreen() {
  document.body.innerHTML = `
    <main class="login-screen" dir="rtl">
      <form class="login-card" id="loginForm">
        <div class="brand login-brand">
          <div class="brand-mark">ح</div>
          <div>
            <strong>حسابي</strong>
            <span>تسجيل الدخول</span>
          </div>
        </div>
        <label>
          البريد الإلكتروني
          <input name="email" type="email" value="admin@example.com" required />
        </label>
        <label>
          كلمة المرور
          <input name="password" type="password" value="admin123" required />
        </label>
        <button class="primary-btn" type="submit">دخول</button>
        <button class="ghost-btn" type="button" id="openSignupBtn">إنشاء حساب جديد</button>
        <button class="ghost-btn" type="button" id="openVerifyBtn">تفعيل حساب</button>
        <p id="loginError"></p>
      </form>
      <form class="login-card" id="signupForm" hidden>
        <h3>إنشاء حساب جديد</h3>
        <label>
          الاسم
          <input name="name" type="text" required />
        </label>
        <label>
          البريد الإلكتروني
          <input name="email" type="email" required />
        </label>
        <label>
          كلمة المرور
          <input name="password" type="password" minlength="6" required />
        </label>
        <button class="primary-btn" type="submit">إرسال كود التحقق</button>
        <button class="ghost-btn" type="button" id="backToLoginFromSignup">رجوع للدخول</button>
        <p id="signupMsg"></p>
      </form>
      <form class="login-card" id="verifyForm" hidden>
        <h3>تفعيل الحساب</h3>
        <label>
          البريد الإلكتروني
          <input name="email" type="email" required />
        </label>
        <label>
          كود التحقق
          <input name="code" type="text" inputmode="numeric" required />
        </label>
        <button class="primary-btn" type="submit">تفعيل الحساب</button>
        <button class="ghost-btn" type="button" id="backToLoginFromVerify">رجوع للدخول</button>
        <p id="verifyMsg"></p>
      </form>
    </main>
  `;
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const verifyForm = document.getElementById("verifyForm");
  const showForm = (target) => {
    loginForm.hidden = target !== "login";
    signupForm.hidden = target !== "signup";
    verifyForm.hidden = target !== "verify";
  };
  document.getElementById("openSignupBtn").addEventListener("click", () => showForm("signup"));
  document.getElementById("openVerifyBtn").addEventListener("click", () => showForm("verify"));
  document.getElementById("backToLoginFromSignup").addEventListener("click", () => showForm("login"));
  document.getElementById("backToLoginFromVerify").addEventListener("click", () => showForm("login"));

  document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const result = await apiFetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ email: form.email.value, password: form.password.value }),
      });
      authToken = result.token;
      authUser = result.user;
      localStorage.setItem("invoice_auth_token", authToken);
      location.reload();
    } catch (error) {
      document.getElementById("loginError").textContent = error.message || "فشل تسجيل الدخول";
    }
  });
  document.getElementById("signupForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const msg = document.getElementById("signupMsg");
    msg.textContent = "";
    try {
      const result = await apiFetch("/api/signup", {
        method: "POST",
        body: JSON.stringify({ name: form.name.value, email: form.email.value, password: form.password.value }),
      });
      msg.textContent = result.delivery === "code" && result.debugCode ? `كود التفعيل: ${result.debugCode}` : (result.message || "تم إرسال كود التحقق");
      verifyForm.email.value = form.email.value;
      showForm("verify");
    } catch (error) {
      msg.textContent = error.message || "تعذر إنشاء الحساب";
    }
  });
  document.getElementById("verifyForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const msg = document.getElementById("verifyMsg");
    msg.textContent = "";
    try {
      const result = await apiFetch("/api/verify-email", {
        method: "POST",
        body: JSON.stringify({ email: form.email.value, code: form.code.value }),
      });
      msg.textContent = result.message || "تم التفعيل. يمكنك تسجيل الدخول الآن.";
      showForm("login");
      loginForm.email.value = form.email.value;
      loginForm.password.focus();
    } catch (error) {
      msg.textContent = error.message || "فشل التفعيل";
    }
  });
}

async function apiFetch(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "حدث خطأ في الاتصال");
  return data;
}

function switchView(view, options = {}) {
  const { persist = true, skipRender = false } = options;
  if (!canView(view)) {
    toast("ليس لديك صلاحية فتح هذه الشاشة");
    view = "dashboard";
  }
  activeView = view;
  document.querySelectorAll(".nav-item").forEach((btn) => btn.classList.toggle("active", btn.dataset.view === view));
  document.querySelectorAll(".view").forEach((section) => section.classList.remove("active"));
  document.getElementById(`${view}View`)?.classList.add("active");

  const titles = {
    dashboard: ["نظرة عامة", "لوحة التحكم"],
    sales: ["إدارة الفواتير", "المبيعات"],
    purchases: ["إدارة الفواتير", "المشتريات"],
    payments: ["الدفعات والذمم", "موقف المدفوعات"],
    contacts: ["ملفات الأطراف", "العملاء والموردين"],
    inventory: ["إدارة الأصناف", "المخزون"],
    expenses: ["المصاريف التشغيلية", "المصروفات"],
    cash: ["حركة النقد", "الصندوق والبنك"],
    reports: ["تحليل الأداء", "التقارير"],
    activity: ["التدقيق الداخلي", "سجل النشاط"],
    settings: ["تهيئة النظام", "الإعدادات"],
  };
  els.viewKicker.textContent = titles[view]?.[0] || "";
  els.viewTitle.textContent = titles[view]?.[1] || "";
  if (persist) {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {}
    if (typeof location !== "undefined" && location.hash !== `#${view}`) {
      history.replaceState(null, "", `#${view}`);
    }
  }
  if (!skipRender) render();
}

function getInitialView() {
  const fromHash = typeof location !== "undefined" ? (location.hash || "").replace("#", "").trim() : "";
  const fromStorage = (() => {
    try {
      return localStorage.getItem(VIEW_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  })();
  const candidate = fromHash || fromStorage || activeView || "dashboard";
  return canView(candidate) ? candidate : "dashboard";
}

function hydrateSettings() {
  els.businessName.value = state.settings.businessName;
  els.businessAddress.value = state.settings.businessAddress || "";
  els.businessPhone.value = state.settings.businessPhone || "";
  els.taxNumber.value = state.settings.taxNumber || "";
  els.currencySymbol.value = state.settings.currency;
  els.invoiceFooter.value = state.settings.invoiceFooter || "";
  els.logoUrl.value = state.settings.logoUrl || "";
  els.primaryColor.value = state.settings.primaryColor || "#4f46e5";
  els.moneyInColor.value = state.settings.moneyInColor || "#167947";
  els.moneyOutColor.value = state.settings.moneyOutColor || "#b42318";
  els.modeSelect.value = state.settings.mode || "light";
  els.invoiceTemplate.value = state.settings.invoiceTemplate || "official";
  els.reportFrom.value = reportRange.from;
  els.reportTo.value = reportRange.to;
  hydrateUserSelect();
}

function hydrateUserSelect() {
  if (!els.currentUserSelect) return;
  if (USE_BACKEND && authUser) {
    els.currentUserSelect.innerHTML = `<option value="${authUser.id}">${escapeHtml(authUser.name)} - ${roleLabel(authUser.role)}</option>`;
    els.currentUserSelect.disabled = true;
    return;
  }
  els.currentUserSelect.disabled = false;
  els.currentUserSelect.innerHTML = state.users.map((user) => `<option value="${user.id}" ${user.id === state.currentUserId ? "selected" : ""}>${escapeHtml(user.name)} - ${roleLabel(user.role)}</option>`).join("");
  els.currentUserSelect.onchange = () => {
    state.currentUserId = els.currentUserSelect.value;
    logActivity("تبديل مستخدم", `المستخدم الحالي: ${currentUser().name}`);
    persist("تم تبديل المستخدم");
    render();
  };
}

function render() {
  recalculateInventory();
  applyTheme();
  updateNavigationAccess();
  renderMetrics();
  renderStockAlerts();
  renderSales();
  renderPurchases();
  renderPayments();
  renderContacts();
  renderInventory();
  renderExpenses();
  renderCash();
  renderReports();
  renderActivity();
  renderUsers();
  drawChart();
  applyResponsiveTableLabels();
}

function applyResponsiveTableLabels() {
  document.querySelectorAll(".table-wrap table").forEach((table) => {
    table.classList.add("responsive-table");
    const headers = Array.from(table.querySelectorAll("thead th")).map((th) => (th.textContent || "").trim());
    if (!headers.length) return;
    table.querySelectorAll("tbody tr").forEach((row) => {
      const cells = Array.from(row.children).filter((cell) => cell.tagName === "TD");
      if (cells.length <= 1) return;
      cells.forEach((cell, index) => {
        if (cell.hasAttribute("colspan")) return;
        cell.setAttribute("data-label", headers[index] || "");
      });
    });
  });
}

function updateNavigationAccess() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.hidden = !canView(btn.dataset.view);
  });
}

function applyTheme() {
  const root = document.documentElement;
  root.style.setProperty("--primary", state.settings.primaryColor || "#4f46e5");
  root.style.setProperty("--primary-dark", shadeColor(state.settings.primaryColor || "#4f46e5", -22));
  root.style.setProperty("--money-in", state.settings.moneyInColor || "#167947");
  root.style.setProperty("--money-out", state.settings.moneyOutColor || "#b42318");
  document.body.classList.toggle("dark-mode", state.settings.mode === "dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", state.settings.primaryColor || "#4f46e5");
}

function registerPwa() {
  if (!("serviceWorker" in navigator)) return;
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });
  navigator.serviceWorker.register("/sw.js?v=20260517-2").then((registration) => registration.update()).catch(() => {});
}

function renderMetrics() {
  const sales = invoicesByType("sale");
  const purchases = invoicesByType("purchase");
  const grossProfit = sum(sales.map(invoiceProfit));
  const expenses = expensesTotal();
  const netProfit = grossProfit - expenses;
  const stockValue = sum(state.products.map((product) => number(product.stock) * number(product.cost)));
  const reservedValue = sum(state.products.map((product) => number(product.reserved) * number(product.cost)));
  const receivable = sum(sales.map(invoiceRemaining));
  const payable = sum(purchases.map(invoiceRemaining));

  const cards = [
    ["إجمالي المبيعات", money(sum(sales.map(invoiceTotal))), `${sales.length} فاتورة`],
    ["إجمالي المشتريات", money(sum(purchases.map(invoiceTotal))), `${purchases.length} فاتورة`],
    ["صافي الربح", money(netProfit), `بعد مصروفات ${money(expenses)}`],
    ["ذمم العملاء", money(receivable), "مستحق لي", "in"],
    ["ذمم الموردين", money(payable), "مستحق علي", "out"],
    ["قيمة المخزون", money(stockValue), `محجوز ${money(reservedValue)}`],
  ];

  els.metrics.innerHTML = metricCards(cards);
}

function renderStockAlerts() {
  const alerts = state.products
    .filter((product) => number(product.available) <= number(product.minStock))
    .sort((a, b) => number(a.available) - number(b.available));

  els.stockAlerts.innerHTML = alerts.length
    ? alerts
        .map((product) => {
          const level = number(product.available) < number(product.minStock) ? "low" : "warn";
          return `<div class="alert-item ${level}"><span>${escapeHtml(product.name)}</span><strong>متاح ${formatNumber(product.available)} / حد ${formatNumber(product.minStock)}</strong></div>`;
        })
        .join("")
    : `<div class="alert-item"><span>لا توجد تنبيهات</span><strong>المخزون جيد</strong></div>`;
}

function renderSales() {
  const filter = els.salesStatusFilter.value;
  const rows = invoicesByType("sale")
    .filter((invoice) => filter === "all" || paymentStatus(invoice) === filter)
    .filter((invoice) => matchesInvoice(invoice, searchQuery()))
    .sort((a, b) => b.date.localeCompare(a.date));

  els.salesTable.innerHTML = rows.length
    ? rows
        .map(
          (invoice) => `
        <tr>
          <td>${invoice.id}</td>
          <td>${partyName(invoice)}</td>
          <td>${invoice.date}</td>
          <td>${statusBadge(paymentStatus(invoice))}</td>
          <td>${money(invoiceTotal(invoice))}</td>
          <td>${money(invoicePaid(invoice))}</td>
          <td>${moneyIn(invoiceRemaining(invoice))}</td>
          <td>${money(invoiceProfit(invoice))}</td>
          <td class="actions">${rowActions(invoice.id)}</td>
        </tr>`
        )
        .join("")
    : emptyRow(9, "لا توجد فواتير مبيعات مطابقة");
  bindRowActions();
}

function renderPurchases() {
  const rows = invoicesByType("purchase")
    .filter((invoice) => matchesInvoice(invoice, searchQuery()))
    .sort((a, b) => b.date.localeCompare(a.date));

  els.purchasesTable.innerHTML = rows.length
    ? rows
        .map(
          (invoice) => `
        <tr>
          <td>${invoice.id}</td>
          <td>${partyName(invoice)}</td>
          <td>${invoice.date}</td>
          <td>${invoice.lines.length}</td>
          <td>${money(invoiceTotal(invoice))}</td>
          <td>${money(invoicePaid(invoice))}</td>
          <td>${moneyOut(invoiceRemaining(invoice))}</td>
          <td class="actions">${rowActions(invoice.id)}</td>
        </tr>`
        )
        .join("")
    : emptyRow(8, "لا توجد فواتير مشتريات مطابقة");
  bindRowActions();
}

function renderPayments() {
  const typeFilter = els.paymentTypeFilter.value;
  const statusFilter = els.paymentStatusFilter.value;
  const query = searchQuery();
  const invoices = state.invoices
    .filter((invoice) => typeFilter === "all" || invoice.type === typeFilter)
    .filter((invoice) => statusFilter === "all" || paymentStatus(invoice) === statusFilter)
    .filter((invoice) => matchesInvoice(invoice, query))
    .sort((a, b) => invoiceRemaining(b) - invoiceRemaining(a));

  const sales = invoicesByType("sale");
  const purchases = invoicesByType("purchase");
  els.paymentMetrics.innerHTML = metricCards([
    ["مقبوض من العملاء", money(sum(sales.map(invoicePaid))), "دفعات مبيعات"],
    ["مدفوع للموردين", money(sum(purchases.map(invoicePaid))), "دفعات مشتريات"],
    ["متبقي على العملاء", money(sum(sales.map(invoiceRemaining))), "مستحق لي", "in"],
    ["متبقي للموردين", money(sum(purchases.map(invoiceRemaining))), "مستحق علي", "out"],
  ]);

  els.paymentsTable.innerHTML = invoices.length
    ? invoices
        .map(
          (invoice) => `
        <tr>
          <td>${invoice.id}</td>
          <td>${invoice.type === "sale" ? "مبيعات" : "مشتريات"}</td>
          <td>${partyName(invoice)}</td>
          <td>${money(invoiceTotal(invoice))}</td>
          <td>${money(invoicePaid(invoice))}</td>
          <td>${invoice.type === "sale" ? moneyIn(invoiceRemaining(invoice)) : moneyOut(invoiceRemaining(invoice))}</td>
          <td>${statusBadge(paymentStatus(invoice))}</td>
          <td class="actions">
            ${can("payment:create") && invoiceRemaining(invoice) > 0 ? `<button class="ghost-btn" data-add-payment="${invoice.id}">دفعة</button>` : ""}
            <button class="ghost-btn" data-edit-invoice="${invoice.id}">الفاتورة</button>
          </td>
        </tr>`
        )
        .join("")
    : emptyRow(8, "لا توجد فواتير مطابقة");

  const recent = state.payments
    .filter((payment) => {
      const invoice = findInvoice(payment.invoiceId);
      return invoice && (typeFilter === "all" || invoice.type === typeFilter) && matchesInvoice(invoice, query);
    })
    .sort((a, b) => paymentOrderValue(b) - paymentOrderValue(a))
    .slice(0, 10);

  els.recentPayments.innerHTML = recent.length
    ? recent.map((payment) => paymentListItemV2(payment)).join("")
    : `<div class="payment-item"><div><strong>لا توجد دفعات</strong><span>سجل دفعة من أي فاتورة</span></div></div>`;
  bindRowActions();
  bindPaymentActions();
}

function renderContacts() {
  const query = searchQuery();
  const contacts = state.contacts.filter((contact) => matchesText(`${contact.name} ${contact.phone} ${contact.address}`, query));
  const customerBalance = sum(state.contacts.filter((contact) => contact.type !== "supplier").map((contact) => contactBalance(contact).customer));
  const supplierBalance = sum(state.contacts.filter((contact) => contact.type !== "customer").map((contact) => contactBalance(contact).supplier));
  els.contactMetrics.innerHTML = metricCards([
    ["عدد العملاء", state.contacts.filter((contact) => contact.type !== "supplier").length, "ملفات بيع"],
    ["عدد الموردين", state.contacts.filter((contact) => contact.type !== "customer").length, "ملفات شراء"],
    ["ذمم العملاء", money(customerBalance), "مستحق لي", "in"],
    ["ذمم الموردين", money(supplierBalance), "مستحق علي", "out"],
  ]);

  els.contactsTable.innerHTML = contacts.length
    ? contacts
        .map((contact) => {
          const balance = contactBalance(contact);
          const totalBalance = contact.type === "supplier" ? balance.supplier : contact.type === "customer" ? balance.customer : balance.customer - balance.supplier;
          return `
          <tr>
            <td>${escapeHtml(contact.name)}</td>
            <td>${contactTypeLabel(contact.type)}</td>
            <td>${escapeHtml(contact.phone || "-")}</td>
          <td>${signedMoney(totalBalance)}</td>
            <td>${lastContactActivity(contact.id)}</td>
            <td class="actions">
              <button class="ghost-btn" data-statement-contact="${contact.id}">كشف</button>
              ${can("contact:manage") ? `<button class="ghost-btn" data-edit-contact="${contact.id}">تعديل</button>` : ""}
              ${can("contact:manage") ? `<button class="ghost-btn danger" data-delete-contact="${contact.id}">حذف</button>` : ""}
            </td>
          </tr>`;
        })
        .join("")
    : emptyRow(6, "لا توجد أطراف مطابقة");
  bindContactActions();
}

function renderInventory() {
  const products = state.products.filter((product) => matchesText(`${product.sku || ""} ${product.name} ${product.category}`, searchQuery()));
  els.inventoryGrid.innerHTML = products.length
    ? products
        .map((product) => {
          const percent = Math.min(100, Math.max(4, Math.round((number(product.available) / Math.max(number(product.minStock) * 3, 1)) * 100)));
          return `
          <article class="product-card">
            <header>
              <div>
                <h3>${escapeHtml(product.name)}</h3>
                <p>${escapeHtml(product.category)} · ${escapeHtml(product.sku || "بدون SKU")}</p>
              </div>
              <span class="status ${number(product.available) <= number(product.minStock) ? "due" : "paid"}">متاح ${formatNumber(product.available)}</span>
            </header>
            <div class="stock-bar"><span style="width:${percent}%"></span></div>
            <div class="product-meta">
              <div><p>على الرف</p><strong>${formatNumber(product.stock)}</strong></div>
              <div><p>محجوز</p><strong>${formatNumber(product.reserved)}</strong></div>
              <div><p>الكلفة</p><strong>${money(product.cost)}</strong></div>
              <div><p>القيمة</p><strong>${money(number(product.stock) * number(product.cost))}</strong></div>
            </div>
            <div class="product-actions">
              <button class="ghost-btn" data-ledger-product="${product.id}">حركة</button>
              ${can("inventory:manage") ? `<button class="ghost-btn" data-edit-product="${product.id}">تعديل</button>` : ""}
              ${can("inventory:manage") ? `<button class="ghost-btn danger" data-delete-product="${product.id}">حذف</button>` : ""}
            </div>
          </article>`;
        })
        .join("")
    : `<section class="panel">لا توجد أصناف مطابقة</section>`;
  bindProductActions();
}

function renderExpenses() {
  const expenses = state.expenses.filter((expense) => matchesText(`${expense.category} ${expense.description} ${expense.notes}`, searchQuery())).sort((a, b) => b.date.localeCompare(a.date));
  els.expenseMetrics.innerHTML = metricCards([
    ["مصروفات الفترة", money(expensesTotal(reportRange.from, reportRange.to)), "ضمن التقرير"],
    ["كل المصروفات", money(expensesTotal()), `${state.expenses.length} حركة`],
    ["أكبر تصنيف", topExpenseCategory(), "حسب القيمة"],
    ["صافي الربح", money(sum(invoicesByType("sale").map(invoiceProfit)) - expensesTotal()), "بعد المصروفات"],
  ]);
  els.expensesTable.innerHTML = expenses.length
    ? expenses
        .map(
          (expense) => `
        <tr>
          <td>${expense.date}</td>
          <td>${escapeHtml(expense.category)}</td>
          <td>${escapeHtml(expense.description)}</td>
          <td>${escapeHtml(findAccount(expense.accountId)?.name || "-")}</td>
          <td>${money(expense.amount)}</td>
          <td class="actions">${can("expense:delete") ? `<button class="ghost-btn danger" data-delete-expense="${expense.id}">حذف</button>` : ""}</td>
        </tr>`
        )
        .join("")
    : emptyRow(6, "لا توجد مصروفات");
  bindExpenseActions();
}

function renderCash() {
  els.accountGrid.innerHTML = state.accounts
    .map(
      (account) => `
    <article class="product-card">
      <header>
        <div>
          <h3>${escapeHtml(account.name)}</h3>
          <p>${account.type === "bank" ? "بنك" : "صندوق"}</p>
        </div>
        <span class="status paid">${money(accountBalance(account.id))}</span>
      </header>
      <div class="product-meta">
        <div><p>رصيد افتتاحي</p><strong>${money(account.openingBalance)}</strong></div>
        <div><p>حركات</p><strong>${accountTransactions(account.id).length}</strong></div>
      </div>
      <div class="product-actions">
        ${can("account:manage") ? `<button class="ghost-btn" data-edit-account="${account.id}">تعديل</button>` : ""}
      </div>
    </article>`
    )
    .join("");

  const rows = allAccountTransactions().filter((row) => matchesText(`${row.accountName} ${row.memo} ${row.reference}`, searchQuery()));
  els.accountTransactionsTable.innerHTML = rows.length
    ? rows
        .slice(0, 100)
        .map(
          (row) => `
        <tr>
          <td>${row.date}</td>
          <td>${escapeHtml(row.accountName)}</td>
          <td>${escapeHtml(row.memo)}</td>
          <td>${row.in ? moneyIn(row.in) : "-"}</td>
          <td>${row.out ? moneyOut(row.out) : "-"}</td>
          <td>${escapeHtml(row.reference || "-")}</td>
        </tr>`
        )
        .join("")
    : emptyRow(6, "لا توجد حركات");
  bindAccountActions();
}

function renderReports() {
  const from = reportRange.from;
  const to = reportRange.to;
  const sales = invoicesByType("sale").filter((invoice) => inDateRange(invoice.date, from, to));
  const purchases = invoicesByType("purchase").filter((invoice) => inDateRange(invoice.date, from, to));
  const grossProfit = sum(sales.map(invoiceProfit));
  const expenses = expensesTotal(from, to);
  const netProfit = grossProfit - expenses;

  const summary = [
    ["المبيعات", money(sum(sales.map(invoiceTotal)))],
    ["المشتريات", money(sum(purchases.map(invoiceTotal)))],
    ["المقبوض من العملاء", moneyIn(sum(sales.map(invoicePaid)))],
    ["المدفوع للموردين", moneyOut(sum(purchases.map(invoicePaid)))],
    ["المصروفات", moneyOut(expenses)],
    ["مجمل الربح", money(grossProfit)],
    ["صافي الربح", money(netProfit)],
    ["قيمة المخزون", money(sum(state.products.map((product) => number(product.stock) * number(product.cost))))],
  ];
  els.reportSummary.innerHTML = summary.map(([label, value]) => `<div class="summary-item"><span>${label}</span><strong>${value}</strong></div>`).join("");

  const productMap = new Map();
  sales.forEach((invoice) => {
    invoice.lines.forEach((line) => {
      const product = findProduct(line.productId);
      const current = productMap.get(line.productId) || { name: product?.name || "صنف محذوف", qty: 0, revenue: 0, profit: 0 };
      current.qty += number(line.qty);
      current.revenue += number(line.qty) * number(line.price);
      current.profit += number(line.qty) * (number(line.price) - number(line.cost));
      productMap.set(line.productId, current);
    });
  });
  const topRows = [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  els.topProductsTable.innerHTML = topRows.length
    ? topRows.map((row) => `<tr><td>${escapeHtml(row.name)}</td><td>${formatNumber(row.qty)}</td><td>${money(row.revenue)}</td><td>${money(row.profit)}</td></tr>`).join("")
    : emptyRow(4, "لا توجد مبيعات ضمن الفترة");
}

function renderActivity() {
  const rows = state.activityLog.filter((entry) => matchesText(`${entry.userName} ${entry.action} ${entry.detail}`, searchQuery())).slice().reverse();
  els.activityTable.innerHTML = rows.length
    ? rows
        .slice(0, 200)
        .map((entry) => `<tr><td>${entry.time}</td><td>${escapeHtml(entry.userName)}</td><td>${escapeHtml(entry.action)}</td><td>${escapeHtml(entry.detail)}</td></tr>`)
        .join("")
    : emptyRow(4, "لا يوجد نشاط مسجل");
}

function openDetailedReport(kind) {
  const rows = reportRows(kind, reportRange.from, reportRange.to, searchQuery());
  const totals = reportTotals(kind, rows);
  const title = reportTitle(kind);
  els.modalKicker.textContent = "تقرير مفصل";
  els.modalTitle.textContent = title;
  els.modalBody.innerHTML = `
    <div class="report-modal-tools">
      <input id="reportModalFrom" type="date" value="${reportRange.from}" />
      <input id="reportModalTo" type="date" value="${reportRange.to}" />
      <input id="reportModalSearch" type="search" placeholder="بحث" value="${escapeHtml(searchQuery())}" />
      <button class="ghost-btn" id="reportRefreshBtn">تطبيق</button>
      <button class="ghost-btn" id="reportPrintBtn">طباعة</button>
      <button class="ghost-btn" id="reportCsvBtn">Excel/CSV</button>
    </div>
    <div class="metric-grid report-total-grid">${metricCards(totals)}</div>
    <div class="table-wrap plain">
      <table>
        <thead><tr>${reportHeaders(kind).map((header) => `<th>${header}</th>`).join("")}</tr></thead>
        <tbody>${rows.length ? rows.map((row) => `<tr>${row.cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("") : emptyRow(reportHeaders(kind).length, "لا توجد بيانات")}</tbody>
      </table>
    </div>
  `;
  document.getElementById("reportRefreshBtn").addEventListener("click", () => {
    reportRange.from = document.getElementById("reportModalFrom").value || reportRange.from;
    reportRange.to = document.getElementById("reportModalTo").value || reportRange.to;
    els.globalSearch.value = document.getElementById("reportModalSearch").value;
    openDetailedReport(kind);
  });
  document.getElementById("reportPrintBtn").addEventListener("click", () => window.print());
  document.getElementById("reportCsvBtn").addEventListener("click", () => exportReportCsv(kind, rows));
  els.modalBackdrop.hidden = false;
}

function renderUsers() {
  els.usersTable.innerHTML = state.users
    .map((user) => `<tr><td>${escapeHtml(user.name)}<br><small>${escapeHtml(user.email || "")}</small></td><td>${roleLabel(user.role)}</td><td>${rolePermissions(user.role)}<br><small>${user.active === false ? "غير فعال" : "فعال"}</small></td></tr>`)
    .join("");
}

function drawChart() {
  const canvas = els.trendChart;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const theme = getComputedStyle(document.body);
  const isDark = document.body.classList.contains("dark-mode");
  const chartBg = theme.getPropertyValue("--surface-solid").trim() || (isDark ? "#121d19" : "#ffffff");
  const gridColor = isDark ? "rgba(183, 197, 189, 0.22)" : "rgba(93, 108, 125, 0.2)";
  const axisTextColor = isDark ? "#d1ddd6" : "#5d6c7d";
  const salesColor = theme.getPropertyValue("--primary").trim() || "#0d7a6b";
  const purchasesColor = theme.getPropertyValue("--accent").trim() || "#c7741e";
  const netColor = isDark ? "#8b7dff" : "#4f46e5";

  const modeColor = chartMode === "purchases"
    ? purchasesColor
    : chartMode === "sales"
      ? salesColor
      : netColor;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = chartBg;
  ctx.fillRect(0, 0, width, height);

  const days = Array.from({ length: 7 }, (_, index) => dateOffset(index - 6));
  const values = days.map((date) => {
    const sales = invoicesByType("sale").filter((invoice) => invoice.date === date);
    const purchases = invoicesByType("purchase").filter((invoice) => invoice.date === date);
    const expenses = state.expenses.filter((expense) => expense.date === date);
    if (chartMode === "sales") return sum(sales.map(invoiceTotal));
    if (chartMode === "purchases") return sum(purchases.map(invoiceTotal));
    return sum(sales.map(invoiceProfit)) - sum(expenses.map((expense) => expense.amount));
  });
  const max = Math.max(...values, 100);
  const padding = 42;
  const barWidth = (width - padding * 2) / values.length - 14;

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const y = padding + (i * (height - padding * 2)) / 3;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }
  values.forEach((value, index) => {
    const barHeight = Math.max(6, (value / max) * (height - padding * 2));
    const x = padding + index * (barWidth + 14);
    const y = height - padding - barHeight;
    const barGradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
    barGradient.addColorStop(0, isDark ? lightenColor(modeColor, 10) : lightenColor(modeColor, 4));
    barGradient.addColorStop(1, isDark ? darkenColor(modeColor, 8) : darkenColor(modeColor, 2));
    ctx.fillStyle = barGradient;
    roundRect(ctx, x, y, barWidth, barHeight, 8);
    ctx.fill();
    ctx.fillStyle = axisTextColor;
    ctx.font = "600 14px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText(days[index].slice(5), x + barWidth / 2, height - 16);
  });
}

function lightenColor(hex, percent) {
  return shadeColor(hex, Math.abs(percent));
}

function darkenColor(hex, percent) {
  return shadeColor(hex, -Math.abs(percent));
}

function openInvoiceModal(type, invoiceId = null) {
  if (!can(invoiceId ? "invoice:edit" : "invoice:create")) return toast("ليس لديك صلاحية تعديل الفواتير");
  editingInvoiceId = invoiceId;
  const invoice = invoiceId ? findInvoice(invoiceId) : null;
  els.modalKicker.textContent = type === "sale" ? "فاتورة بيع" : "فاتورة شراء";
  els.modalTitle.textContent = invoice ? `تعديل ${invoice.id}` : type === "sale" ? "فاتورة بيع جديدة" : "فاتورة شراء جديدة";
  els.modalBody.innerHTML = "";
  els.modalBody.appendChild(els.invoiceFormTemplate.content.cloneNode(true));

  const form = document.getElementById("invoiceForm");
  form.contactId.innerHTML = contactOptions(type, invoice?.contactId);
  form.contactId.value = invoice?.contactId || "";
  form.party.value = invoice?.party || "";
  form.date.value = invoice?.date || today;
  form.status.value = invoice ? paymentStatus(invoice) : "due";
  form.notes.value = invoice?.notes || "";
  form.discount.value = number(invoice?.discount);
  form.taxRate.value = number(invoice?.taxRate);
  form.status.closest("label").style.display = "none";
  form.contactId.addEventListener("change", () => {
    const contact = findContact(form.contactId.value);
    if (contact) form.party.value = contact.name;
    refreshPrintableInvoice(type);
  });
  form.party.addEventListener("input", () => refreshPrintableInvoice(type));
  form.date.addEventListener("input", () => refreshPrintableInvoice(type));
  form.notes.addEventListener("input", () => refreshPrintableInvoice(type));
  form.discount.addEventListener("input", () => refreshInvoiceTotal(type));
  form.taxRate.addEventListener("input", () => refreshInvoiceTotal(type));

  const linesContainer = document.getElementById("linesContainer");
  let lastQtyEnterAt = 0;
  const doubleEnterMs = 700;
  const appendNewLine = (seedLine = { productId: state.products[0]?.id || "", qty: 1, price: 0, cost: 0 }, focusProduct = false) => {
    const row = addInvoiceLine(linesContainer, type, seedLine);
    refreshInvoiceTotal(type);
    if (focusProduct) {
      const productSelect = row?.querySelector(".line-product");
      productSelect?.focus();
    }
    return row;
  };
  const sourceLines = invoice?.lines?.length ? invoice.lines : [{ productId: state.products[0]?.id || "", qty: 1, price: 0, cost: 0 }];
  sourceLines.forEach((line) => addInvoiceLine(linesContainer, type, line));
  refreshInvoiceTotal(type);
  refreshInvoicePaymentSnapshot(invoice);

  document.getElementById("addLine").addEventListener("click", () => {
    appendNewLine(undefined, true);
  });
  linesContainer.addEventListener("keydown", (event) => {
    if (!(event.target instanceof HTMLElement)) return;
    if (!event.target.classList.contains("line-qty")) return;
    if (event.key !== "Enter") return;
    event.preventDefault();
    const now = Date.now();
    if (now - lastQtyEnterAt <= doubleEnterMs) {
      form.requestSubmit();
      return;
    }
    lastQtyEnterAt = now;
    appendNewLine(undefined, true);
  });
  document.getElementById("printInvoice").addEventListener("click", () => {
    const draft = buildInvoiceFromForm(type, form);
    printInvoiceDocument(draft);
  });
  document.getElementById("closeInvoiceForm")?.addEventListener("click", closeModal);
  const addPaymentBtn = document.getElementById("addPaymentFromInvoice");
  if (invoice && invoiceRemaining(invoice) > 0 && can("payment:create")) {
    addPaymentBtn.hidden = false;
    addPaymentBtn.addEventListener("click", () => openPaymentModal(invoice.id));
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveInvoice(type, form);
  });
  els.modalBackdrop.hidden = false;
  form.contactId.focus();
}

function addInvoiceLine(container, type, line) {
  const row = document.createElement("div");
  row.className = "line-row";
  row.innerHTML = `
    <label>
      الصنف
      <select class="line-product" required>${productOptions(line.productId)}</select>
    </label>
    <label>
      الكمية
      <input class="line-qty" type="number" min="1" step="1" value="${line.qty || 1}" required />
    </label>
    <label>
      ${type === "sale" ? "سعر البيع" : "كلفة الشراء"}
      <input class="line-price" type="number" min="0" step="0.01" value="${line.price || defaultLinePrice(type, line.productId)}" required />
    </label>
    <div>
      <span class="field-label">الإجمالي</span>
      <div class="line-total">0</div>
    </div>
    <button type="button" class="icon-btn" title="حذف السطر">×</button>
  `;
  const productSelect = row.querySelector(".line-product");
  const qtyInput = row.querySelector(".line-qty");
  const priceInput = row.querySelector(".line-price");
  productSelect.addEventListener("change", () => {
    priceInput.value = defaultLinePrice(type, productSelect.value);
    qtyInput?.focus();
    qtyInput?.select();
    refreshInvoiceTotal(type);
  });
  row.querySelectorAll("input, select").forEach((input) => input.addEventListener("input", () => refreshInvoiceTotal(type)));
  row.querySelector(".icon-btn").addEventListener("click", () => {
    row.remove();
    refreshInvoiceTotal(type);
  });
  container.appendChild(row);
  return row;
}

function refreshInvoiceTotal(type) {
  const form = document.getElementById("invoiceForm");
  const draft = buildInvoiceFromForm(type, form);
  const total = invoiceTotal(draft);
  document.querySelectorAll(".line-row").forEach((row) => {
    const qty = number(row.querySelector(".line-qty").value);
    const price = number(row.querySelector(".line-price").value);
    row.querySelector(".line-total").textContent = money(qty * price);
  });
  document.getElementById("invoiceTotal").textContent = money(total);
  refreshPrintableInvoice(type);
}

function saveInvoice(type, form) {
  const previous = editingInvoiceId ? findInvoice(editingInvoiceId) : null;
  const lines = invoiceLinesFromDom(type);
  if (!lines.length) return toast("أضف صنفًا واحدًا على الأقل");

  const requested = new Map();
  if (type === "sale") {
    lines.forEach((line) => requested.set(line.productId, (requested.get(line.productId) || 0) + number(line.qty)));
    for (const [productId, qty] of requested.entries()) {
      const available = availableStockForSale(productId, previous);
      if (qty > available) return toast(`الكمية المطلوبة من ${findProduct(productId)?.name || "الصنف"} أكبر من المتاح (${formatNumber(available)})`);
    }
  }

  const contactId = ensureInvoiceContact(type, form.contactId.value, form.party.value.trim());
  const invoice = {
    id: previous?.id || nextInvoiceId(type),
    type,
    contactId,
    party: findContact(contactId)?.name || form.party.value.trim(),
    date: form.date.value,
    status: "due",
    notes: form.notes.value.trim(),
    discount: number(form.discount.value),
    taxRate: number(form.taxRate.value),
    template: state.settings.invoiceTemplate || "official",
    lines,
  };

  const currentPaid = previous ? invoicePaid(previous) : 0;
  if (currentPaid > invoiceTotal(invoice) + 0.001) return toast(`قيمة الفاتورة الجديدة أقل من الدفعات المسجلة (${money(currentPaid)})`);

  if (previous) {
    state.invoices = state.invoices.map((item) => (item.id === previous.id ? invoice : item));
    logActivity("تعديل فاتورة", `${invoice.id} - ${invoice.party}`);
  } else {
    state.invoices.push(invoice);
    logActivity("إضافة فاتورة", `${invoice.id} - ${invoice.party}`);
  }
  recalculateInventory();
  persist("تم حفظ الفاتورة");
  closeModal();
  render();
}

function refreshInvoicePaymentSnapshot(invoice) {
  const snapshot = document.getElementById("invoicePaymentSnapshot");
  if (!snapshot) return;
  if (!invoice) {
    snapshot.innerHTML = `<div><span>الدفعات</span><strong>احفظ الفاتورة أولًا لتسجيل الدفعات</strong></div>`;
    return;
  }
  const payments = paymentsForInvoice(invoice.id).sort((a, b) => paymentOrderValue(b) - paymentOrderValue(a));
  snapshot.innerHTML = `
    <div><span>إجمالي الفاتورة</span><strong>${money(invoiceTotal(invoice))}</strong></div>
    <div><span>المدفوع</span><strong>${money(invoicePaid(invoice))}</strong></div>
    <div><span>المتبقي</span><strong>${invoice.type === "sale" ? moneyIn(invoiceRemaining(invoice)) : moneyOut(invoiceRemaining(invoice))}</strong></div>
    <div class="payment-history">${payments.length ? payments.map((payment) => `<p>${payment.date} - ${money(payment.amount)} - ${methodLabel(payment.method)}</p>`).join("") : "<p>لا توجد دفعات مسجلة</p>"}</div>
  `;
}

function refreshPrintableInvoice(type) {
  const target = document.getElementById("printableInvoice");
  const form = document.getElementById("invoiceForm");
  if (!target || !form) return;
  const invoice = buildInvoiceFromForm(type, form);
  target.innerHTML = buildPrintableInvoice(invoice);
}

function buildInvoiceFromForm(type, form) {
  return {
    id: editingInvoiceId || (type === "sale" ? "فاتورة بيع جديدة" : "فاتورة شراء جديدة"),
    type,
    party: findContact(form.contactId.value)?.name || form.party.value || "-",
    contactId: form.contactId.value,
    date: form.date.value || today,
    notes: form.notes.value || "",
    discount: number(form.discount.value),
    taxRate: number(form.taxRate.value),
    lines: invoiceLinesFromDom(type),
    template: state.settings.invoiceTemplate || "official",
  };
}

function printInvoiceDocument(invoice) {
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>Invoice ${escapeHtml(invoice.id)}</title><style>${invoicePrintCss(state.settings.invoiceTemplate || "official")}</style></head><body class="tpl-${escapeHtml(state.settings.invoiceTemplate || "official")}">${buildPrintableInvoice(invoice)}</body></html>`;
  const win = window.open("", "_blank", "width=1000,height=900");
  if (!win) return toast("يرجى السماح بفتح نافذة الطباعة");
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 220);
}

function invoicePrintCss(template) {
  const base = `
    body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;padding:18px}
    .print-header{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:start;padding-bottom:12px}
    .print-header h1,.print-header p{margin:0 0 6px}
    .print-stamp{padding:10px 14px;font-weight:800;min-width:140px;text-align:center}
    .print-logo{max-width:95px;max-height:72px;object-fit:contain;margin-bottom:8px}
    .print-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0}
    .print-table{width:100%;border-collapse:collapse;margin-top:8px}
    .print-table th,.print-table td{padding:10px;text-align:right}
    .print-totals{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0}
    .money-in{color:#167947;font-weight:700}
    .money-out{color:#b42318;font-weight:700}
    .print-footer{margin-top:16px;padding-top:10px}
    @page{size:A4;margin:10mm}
  `;
  const official = `
    .print-header{border-bottom:2px solid #222}
    .print-stamp{border:2px solid #111}
    .print-meta div,.print-totals div{padding:10px;border:1px solid #999}
    .print-meta span,.print-totals span{display:block;color:#555;font-size:12px}
    .print-table th,.print-table td{border:1px solid #999}
    .print-table th{background:#f1f1f1}
    .print-footer{border-top:1px solid #999}
  `;
  const modern = `
    body{background:#f8faf9}
    .print-header{border-bottom:0}
    .print-stamp{background:#4f46e5;color:#fff;border-radius:10px}
    .print-meta div,.print-totals div{padding:12px;border-radius:10px;background:#eef4f0;border:0}
    .print-meta span,.print-totals span{display:block;color:#5b6a62;font-size:12px}
    .print-table{overflow:hidden;border-radius:10px}
    .print-table th{background:#dce9e2}
    .print-table th,.print-table td{border-bottom:1px solid #d6e1db}
    .print-footer{border-top:0;background:#eef4f0;padding:12px;border-radius:10px}
  `;
  const minimal = `
    body{padding:10px}
    .print-header{border-bottom:1px solid #111}
    .print-stamp{border:1px dashed #111}
    .print-meta{grid-template-columns:repeat(2,minmax(0,1fr))}
    .print-meta div,.print-totals div{padding:8px;border:0;border-bottom:1px dotted #999}
    .print-meta span,.print-totals span{display:block;color:#666;font-size:11px}
    .print-table th{border-bottom:2px solid #111}
    .print-table td{border-bottom:1px solid #ddd}
    .print-footer{border-top:1px dashed #888}
  `;
  const map = { official, modern, minimal };
  return `
    ${base}
    ${map[template] || official}
  `;
}

function buildPrintableInvoice(invoice) {
  const subtotal = invoiceSubtotal(invoice);
  const discount = number(invoice.discount);
  const taxRate = number(invoice.taxRate);
  const baseAfterDiscount = Math.max(0, subtotal - discount);
  const taxValue = (baseAfterDiscount * taxRate) / 100;
  const total = baseAfterDiscount + taxValue;
  const paid = findInvoice(invoice.id) ? invoicePaid(invoice) : 0;
  const remaining = Math.max(0, total - paid);
  const contact = findContact(invoice.contactId);
  return `
    <div class="print-header">
      <div>
        ${state.settings.logoUrl ? `<img class="print-logo" src="${escapeHtml(state.settings.logoUrl)}" alt="logo" />` : ""}
        <h1>${escapeHtml(state.settings.businessName)}</h1>
        <p>${escapeHtml(state.settings.businessAddress || "")}</p>
        <p>${escapeHtml(state.settings.businessPhone || "")}${state.settings.taxNumber ? ` · ضريبي: ${escapeHtml(state.settings.taxNumber)}` : ""}</p>
      </div>
      <div class="print-stamp">${invoice.type === "sale" ? "فاتورة بيع" : "فاتورة شراء"}</div>
    </div>
    <div class="print-meta">
      <div><span>رقم الفاتورة</span><strong>${escapeHtml(invoice.id)}</strong></div>
      <div><span>التاريخ</span><strong>${invoice.date}</strong></div>
      <div><span>الطرف</span><strong>${escapeHtml(invoice.party)}</strong></div>
      <div><span>الحالة</span><strong>${findInvoice(invoice.id) ? statusText(paymentStatus(invoice)) : "مسودة"}</strong></div>
      <div><span>الهاتف</span><strong>${escapeHtml(contact?.phone || "-")}</strong></div>
      <div><span>العنوان</span><strong>${escapeHtml(contact?.address || "-")}</strong></div>
    </div>
    <table class="print-table">
      <thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
      <tbody>
        ${invoice.lines.map((line) => `<tr><td>${escapeHtml(findProduct(line.productId)?.name || "صنف")}</td><td>${formatNumber(line.qty)}</td><td>${money(line.price)}</td><td>${money(number(line.qty) * number(line.price))}</td></tr>`).join("")}
      </tbody>
    </table>
    <div class="print-totals">
      <div><span>قبل الضريبة</span><strong>${money(subtotal)}</strong></div>
      <div><span>الخصم</span><strong>${money(discount)}</strong></div>
      <div><span>الضريبة (${formatNumber(taxRate)}%)</span><strong>${money(taxValue)}</strong></div>
      <div><span>الإجمالي النهائي</span><strong>${money(total)}</strong></div>
      <div><span>المدفوع</span><strong>${money(paid)}</strong></div>
      <div><span>المتبقي</span><strong>${invoice.type === "sale" ? moneyIn(remaining) : moneyOut(remaining)}</strong></div>
    </div>
    <div class="print-footer">
      <p>${escapeHtml(invoice.notes || "")}</p>
      <strong>${escapeHtml(state.settings.invoiceFooter || "")}</strong>
    </div>
  `;
}

function openPaymentModal(invoiceId = null) {
  if (!can("payment:create")) return toast("ليس لديك صلاحية تسجيل الدفعات");
  const openInvoices = state.invoices.filter((invoice) => invoiceRemaining(invoice) > 0 || invoice.id === invoiceId);
  if (!openInvoices.length) return toast("لا توجد فواتير عليها مبالغ متبقية");

  const selectedInvoice = findInvoice(invoiceId) || openInvoices[0];
  els.modalKicker.textContent = selectedInvoice.type === "sale" ? "قبض من عميل" : "دفع لمورد";
  els.modalTitle.textContent = `تسجيل دفعة - ${selectedInvoice.id}`;
  els.modalBody.innerHTML = "";
  els.modalBody.appendChild(els.paymentFormTemplate.content.cloneNode(true));

  const form = document.getElementById("paymentForm");
  form.invoiceId.innerHTML = openInvoices.map((invoice) => `<option value="${invoice.id}" ${invoice.id === selectedInvoice.id ? "selected" : ""}>${invoice.id} - ${partyName(invoice)} - متبقي ${money(invoiceRemaining(invoice))}</option>`).join("");
  form.accountId.innerHTML = accountOptions(defaultAccountForMethod("cash"));
  form.date.value = today;
  form.method.value = "cash";

  const refreshCard = () => {
    const invoice = findInvoice(form.invoiceId.value);
    const remaining = invoiceRemaining(invoice);
    document.getElementById("paymentInvoiceCard").innerHTML = `
      <div><span>الطرف</span><strong>${partyName(invoice)}</strong></div>
      <div><span>نوع الفاتورة</span><strong>${invoice.type === "sale" ? "مبيعات" : "مشتريات"}</strong></div>
      <div><span>الإجمالي</span><strong>${money(invoiceTotal(invoice))}</strong></div>
      <div><span>المتبقي</span><strong>${invoice.type === "sale" ? moneyIn(remaining) : moneyOut(remaining)}</strong></div>
    `;
    form.amount.removeAttribute("max");
    form.amount.setAttribute("inputmode", "decimal");
    form.amount.setAttribute("placeholder", `المتبقي الحالي ${remaining}`);
    form.amount.value = remaining > 0 ? roundMoney(remaining) : 0;
  };
  form.method.addEventListener("change", () => (form.accountId.value = defaultAccountForMethod(form.method.value)));
  form.invoiceId.addEventListener("change", refreshCard);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    savePayment(form);
  });
  refreshCard();
  els.modalBackdrop.hidden = false;
  form.amount.focus();
}

function openInvoiceViewModal(invoiceId) {
  const invoice = findInvoice(invoiceId);
  if (!invoice) return;
  els.modalKicker.textContent = invoice.type === "sale" ? "استعراض فاتورة بيع" : "استعراض فاتورة شراء";
  els.modalTitle.textContent = invoice.id;
  els.modalBody.innerHTML = `
    <div class="invoice-preview">${buildPrintableInvoice(invoice)}</div>
    <div class="modal-actions">
      <button class="ghost-btn" id="previewPrintBtn">طباعة</button>
      ${can("invoice:edit") ? `<button class="primary-btn" id="previewEditBtn">تعديل</button>` : ""}
    </div>
  `;
  document.getElementById("previewPrintBtn").addEventListener("click", () => printInvoiceDocument(invoice));
  document.getElementById("previewEditBtn")?.addEventListener("click", () => openInvoiceModal(invoice.type, invoice.id));
  els.modalBackdrop.hidden = false;
}

function savePayment(form) {
  const invoice = findInvoice(form.invoiceId.value);
  let amount = number(form.amount.value);
  const remaining = invoiceRemaining(invoice);
  if (!invoice) return toast("الفاتورة غير موجودة");
  if (amount <= 0) return toast("أدخل مبلغ دفعة صحيح");
  let overpay = 0;
  if (amount > remaining + 0.001) {
    overpay = roundMoney(amount - remaining);
    const accepted = confirm(`المبلغ المدفوع أكبر من قيمة الفاتورة. الفرق ${money(overpay)}. هل تريد إضافة الفرق إلى رصيد ${invoice.type === "sale" ? "العميل" : "المورد"}؟`);
    if (!accepted) {
      if (!confirm(`هل تريد حفظ المتبقي فقط بقيمة ${money(remaining)} وإلغاء الزيادة؟`)) return;
      amount = remaining;
      overpay = 0;
    }
  }

  state.payments.push({
    id: nextPaymentId(),
    paymentNo: nextPaymentNo(),
    invoiceId: invoice.id,
    accountId: form.accountId.value,
    date: form.date.value,
    createdAt: new Date().toISOString(),
    createdAtMs: Date.now(),
    amount,
    method: form.method.value,
    reference: form.reference.value.trim(),
    notes: form.notes.value.trim(),
  });
  if (overpay > 0) {
    state.credits.push({
      id: `CR-${Date.now()}`,
      contactId: invoice.contactId,
      invoiceId: invoice.id,
      date: form.date.value,
      amount: overpay,
      direction: invoice.type === "sale" ? "out" : "in",
      notes: `فرق دفعة زائدة على ${invoice.id}`,
    });
  }
  recalculateInventory();
  logActivity("تسجيل دفعة", `${invoice.id} - ${money(amount)}${overpay ? `، فرق ${money(overpay)}` : ""} - ${findAccount(form.accountId.value)?.name || ""}`);
  persist("تم حفظ الدفعة");
  closeModal();
  render();
}

function deletePayment(paymentId) {
  if (!can("payment:delete")) return toast("ليس لديك صلاحية حذف الدفعات");
  const payment = state.payments.find((item) => item.id === paymentId);
  if (!payment || !confirm(`حذف دفعة بقيمة ${money(payment.amount)}؟`)) return;
  state.payments = state.payments.filter((item) => item.id !== paymentId);
  recalculateInventory();
  logActivity("حذف دفعة", `${payment.invoiceId} - ${money(payment.amount)}`);
  persist("تم حذف الدفعة");
  render();
}

function openContactModal(contactId = null) {
  if (!can("contact:manage")) return toast("ليس لديك صلاحية إدارة الأطراف");
  editingContactId = contactId;
  const contact = contactId ? findContact(contactId) : null;
  els.modalKicker.textContent = "ملف طرف";
  els.modalTitle.textContent = contact ? `تعديل ${contact.name}` : "طرف جديد";
  els.modalBody.innerHTML = "";
  els.modalBody.appendChild(els.contactFormTemplate.content.cloneNode(true));
  const form = document.getElementById("contactForm");
  form.name.value = contact?.name || "";
  form.type.value = contact?.type || "customer";
  form.phone.value = contact?.phone || "";
  form.email.value = contact?.email || "";
  form.address.value = contact?.address || "";
  form.openingBalance.value = contact?.openingBalance || 0;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveContact(form);
  });
  els.modalBackdrop.hidden = false;
  form.name.focus();
}

function saveContact(form) {
  const contact = {
    id: editingContactId || `c-${Date.now()}`,
    name: form.name.value.trim(),
    type: form.type.value,
    phone: form.phone.value.trim(),
    email: form.email.value.trim(),
    address: form.address.value.trim(),
    openingBalance: number(form.openingBalance.value),
  };
  if (editingContactId) {
    state.contacts = state.contacts.map((item) => (item.id === editingContactId ? contact : item));
    logActivity("تعديل طرف", contact.name);
  } else {
    state.contacts.push(contact);
    logActivity("إضافة طرف", contact.name);
  }
  persist("تم حفظ الطرف");
  closeModal();
  render();
}

function deleteContact(contactId) {
  if (!can("contact:manage")) return toast("ليس لديك صلاحية حذف الأطراف");
  const used = state.invoices.some((invoice) => invoice.contactId === contactId);
  if (used) return toast("لا يمكن حذف طرف عليه فواتير. يمكن تعديل بياناته بدل الحذف.");
  const contact = findContact(contactId);
  if (!contact || !confirm(`حذف ${contact.name}؟`)) return;
  state.contacts = state.contacts.filter((item) => item.id !== contactId);
  logActivity("حذف طرف", contact.name);
  persist("تم حذف الطرف");
  render();
}

function openContactStatement(contactId) {
  const contact = findContact(contactId);
  if (!contact) return;
  els.modalKicker.textContent = "كشف حساب";
  els.modalTitle.textContent = contact.name;
  const rows = contactStatementRows(contactId);
  els.modalBody.innerHTML = `
    <div class="statement-head">
      <div><span>الهاتف</span><strong>${escapeHtml(contact.phone || "-")}</strong></div>
      <div><span>العنوان</span><strong>${escapeHtml(contact.address || "-")}</strong></div>
      <div><span>الرصيد</span><strong>${signedMoney(contactBalance(contact).net)}</strong></div>
    </div>
    <div class="table-wrap plain">
      <table>
        <thead><tr><th>التاريخ</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead>
        <tbody>${rows.length ? rows.map((row) => `<tr><td>${row.date}</td><td>${escapeHtml(row.memo)}</td><td>${row.debit ? money(row.debit) : "-"}</td><td>${row.credit ? money(row.credit) : "-"}</td><td>${money(row.balance)}</td></tr>`).join("") : emptyRow(5, "لا توجد حركات")}</tbody>
      </table>
    </div>
    <div class="modal-actions"><button class="ghost-btn" onclick="window.print()">طباعة</button></div>
  `;
  els.modalBackdrop.hidden = false;
}

function openExpenseModal() {
  if (!can("expense:create")) return toast("ليس لديك صلاحية تسجيل المصروفات");
  els.modalKicker.textContent = "مصروف";
  els.modalTitle.textContent = "مصروف جديد";
  els.modalBody.innerHTML = "";
  els.modalBody.appendChild(els.expenseFormTemplate.content.cloneNode(true));
  const form = document.getElementById("expenseForm");
  form.date.value = today;
  form.accountId.innerHTML = accountOptions(defaultAccountForMethod("cash"));
  const list = document.getElementById("expenseCategoryList");
  if (list) list.innerHTML = state.categories.expenses.map((category) => `<option value="${escapeHtml(category)}"></option>`).join("");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveExpense(form);
  });
  els.modalBackdrop.hidden = false;
  form.description.focus();
}

function saveExpense(form) {
  const expense = {
    id: `EXP-${Date.now()}`,
    date: form.date.value,
    category: form.category.value.trim() || "عام",
    description: form.description.value.trim(),
    accountId: form.accountId.value,
    amount: number(form.amount.value),
    notes: form.notes.value.trim(),
  };
  if (expense.amount <= 0) return toast("أدخل مبلغ مصروف صحيح");
  rememberCategory("expenses", expense.category);
  state.expenses.push(expense);
  logActivity("إضافة مصروف", `${expense.category} - ${money(expense.amount)}`);
  persist("تم حفظ المصروف");
  closeModal();
  render();
}

function deleteExpense(expenseId) {
  if (!can("expense:delete")) return toast("ليس لديك صلاحية حذف المصروفات");
  const expense = state.expenses.find((item) => item.id === expenseId);
  if (!expense || !confirm(`حذف مصروف ${money(expense.amount)}؟`)) return;
  state.expenses = state.expenses.filter((item) => item.id !== expenseId);
  logActivity("حذف مصروف", `${expense.category} - ${money(expense.amount)}`);
  persist("تم حذف المصروف");
  render();
}

function openAccountModal(accountId = null) {
  if (!can("account:manage")) return toast("ليس لديك صلاحية إدارة الحسابات");
  editingAccountId = accountId;
  const account = accountId ? findAccount(accountId) : null;
  els.modalKicker.textContent = "حساب نقدي";
  els.modalTitle.textContent = account ? `تعديل ${account.name}` : "حساب جديد";
  els.modalBody.innerHTML = "";
  els.modalBody.appendChild(els.accountFormTemplate.content.cloneNode(true));
  const form = document.getElementById("accountForm");
  form.name.value = account?.name || "";
  form.type.value = account?.type || "cash";
  form.openingBalance.value = account?.openingBalance ?? 0;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveAccount(form);
  });
  els.modalBackdrop.hidden = false;
  form.name.focus();
}

function saveAccount(form) {
  const account = {
    id: editingAccountId || `acc-${Date.now()}`,
    name: form.name.value.trim(),
    type: form.type.value,
    openingBalance: number(form.openingBalance.value),
  };
  if (editingAccountId) {
    state.accounts = state.accounts.map((item) => (item.id === editingAccountId ? account : item));
    logActivity("تعديل حساب", account.name);
  } else {
    state.accounts.push(account);
    logActivity("إضافة حساب", account.name);
  }
  persist("تم حفظ الحساب");
  closeModal();
  render();
}

function openProductModal(productId = null) {
  if (!can("inventory:manage")) return toast("ليس لديك صلاحية إدارة المخزون");
  editingProductId = productId;
  const product = productId ? findProduct(productId) : null;
  els.modalKicker.textContent = "بطاقة صنف";
  els.modalTitle.textContent = product ? `تعديل ${product.name}` : "صنف جديد";
  els.modalBody.innerHTML = "";
  els.modalBody.appendChild(els.productFormTemplate.content.cloneNode(true));
  const form = document.getElementById("productForm");
  form.sku.value = product?.sku || "";
  form.name.value = product?.name || "";
  form.category.value = product?.category || "";
  form.stock.value = product?.stock ?? 0;
  form.minStock.value = product?.minStock ?? 5;
  form.cost.value = product?.cost ?? 0;
  form.price.value = product?.price ?? 0;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveProduct(form);
  });
  els.modalBackdrop.hidden = false;
  form.name.focus();
}

function saveProduct(form) {
  const product = {
    id: editingProductId || `p-${Date.now()}`,
    sku: form.sku.value.trim(),
    name: form.name.value.trim(),
    category: form.category.value.trim(),
    stock: number(form.stock.value),
    openingStock: number(form.stock.value) - currentInvoiceNet(editingProductId),
    minStock: number(form.minStock.value),
    cost: number(form.cost.value),
    baseCost: number(form.cost.value),
    price: number(form.price.value),
    reserved: 0,
    available: number(form.stock.value),
  };
  if (editingProductId) {
    state.products = state.products.map((item) => (item.id === editingProductId ? product : item));
    logActivity("تعديل صنف", product.name);
  } else {
    state.products.push(product);
    logActivity("إضافة صنف", product.name);
  }
  recalculateInventory();
  persist("تم حفظ الصنف");
  closeModal();
  render();
}

function deleteProduct(productId) {
  if (!can("inventory:manage")) return toast("ليس لديك صلاحية حذف الأصناف");
  const used = state.invoices.some((invoice) => invoice.lines.some((line) => line.productId === productId));
  if (used) return toast("لا يمكن حذف صنف مستخدم في فواتير. عدّل اسمه بدل الحذف.");
  const product = findProduct(productId);
  if (!product || !confirm(`حذف ${product.name}؟`)) return;
  state.products = state.products.filter((item) => item.id !== productId);
  logActivity("حذف صنف", product.name);
  persist("تم حذف الصنف");
  render();
}

function openStockLedger(productId) {
  const product = findProduct(productId);
  if (!product) return;
  const rows = stockLedgerRows(productId);
  els.modalKicker.textContent = "حركة مخزون";
  els.modalTitle.textContent = product.name;
  els.modalBody.innerHTML = `
    <div class="statement-head">
      <div><span>على الرف</span><strong>${formatNumber(product.stock)}</strong></div>
      <div><span>محجوز</span><strong>${formatNumber(product.reserved)}</strong></div>
      <div><span>متاح</span><strong>${formatNumber(product.available)}</strong></div>
    </div>
    <div class="table-wrap plain">
      <table>
        <thead><tr><th>التاريخ</th><th>البيان</th><th>داخل</th><th>خارج</th><th>محجوز</th><th>الرصيد</th></tr></thead>
        <tbody>${rows.map((row) => `<tr><td>${row.date}</td><td>${escapeHtml(row.memo)}</td><td>${row.inQty ? formatNumber(row.inQty) : "-"}</td><td>${row.outQty ? formatNumber(row.outQty) : "-"}</td><td>${row.reservedQty ? formatNumber(row.reservedQty) : "-"}</td><td>${formatNumber(row.balance)}</td></tr>`).join("")}</tbody>
      </table>
    </div>`;
  els.modalBackdrop.hidden = false;
}

function closeModal() {
  els.modalBackdrop.hidden = true;
  els.modalBody.innerHTML = "";
  editingInvoiceId = null;
  editingProductId = null;
  editingContactId = null;
  editingAccountId = null;
}

function bindRowActions() {
  document.querySelectorAll("[data-edit-invoice]").forEach((btn) => btn.addEventListener("click", () => {
    const invoice = findInvoice(btn.dataset.editInvoice);
    openInvoiceModal(invoice.type, invoice.id);
  }));
  document.querySelectorAll("[data-view-invoice]").forEach((btn) => btn.addEventListener("click", () => openInvoiceViewModal(btn.dataset.viewInvoice)));
  document.querySelectorAll("[data-delete-invoice]").forEach((btn) => btn.addEventListener("click", () => deleteInvoice(btn.dataset.deleteInvoice)));
  document.querySelectorAll("[data-print-invoice]").forEach((btn) => btn.addEventListener("click", () => {
    const invoice = findInvoice(btn.dataset.printInvoice);
    printInvoiceDocument(invoice);
  }));
  document.querySelectorAll("[data-add-payment]").forEach((btn) => btn.addEventListener("click", () => openPaymentModal(btn.dataset.addPayment)));
}

function bindPaymentActions() {
  document.querySelectorAll("[data-delete-payment]").forEach((btn) => btn.addEventListener("click", () => deletePayment(btn.dataset.deletePayment)));
}

function bindContactActions() {
  document.querySelectorAll("[data-edit-contact]").forEach((btn) => btn.addEventListener("click", () => openContactModal(btn.dataset.editContact)));
  document.querySelectorAll("[data-delete-contact]").forEach((btn) => btn.addEventListener("click", () => deleteContact(btn.dataset.deleteContact)));
  document.querySelectorAll("[data-statement-contact]").forEach((btn) => btn.addEventListener("click", () => openContactStatement(btn.dataset.statementContact)));
}

function bindProductActions() {
  document.querySelectorAll("[data-edit-product]").forEach((btn) => btn.addEventListener("click", () => openProductModal(btn.dataset.editProduct)));
  document.querySelectorAll("[data-delete-product]").forEach((btn) => btn.addEventListener("click", () => deleteProduct(btn.dataset.deleteProduct)));
  document.querySelectorAll("[data-ledger-product]").forEach((btn) => btn.addEventListener("click", () => openStockLedger(btn.dataset.ledgerProduct)));
}

function bindExpenseActions() {
  document.querySelectorAll("[data-delete-expense]").forEach((btn) => btn.addEventListener("click", () => deleteExpense(btn.dataset.deleteExpense)));
}

function bindAccountActions() {
  document.querySelectorAll("[data-edit-account]").forEach((btn) => btn.addEventListener("click", () => openAccountModal(btn.dataset.editAccount)));
}

function deleteInvoice(invoiceId) {
  if (!can("invoice:delete")) return toast("ليس لديك صلاحية حذف الفواتير");
  const invoice = findInvoice(invoiceId);
  if (!invoice || !confirm(`حذف الفاتورة ${invoiceId}؟`)) return;
  state.invoices = state.invoices.filter((item) => item.id !== invoiceId);
  state.payments = state.payments.filter((payment) => payment.invoiceId !== invoiceId);
  recalculateInventory();
  logActivity("حذف فاتورة", `${invoice.id} - ${partyName(invoice)}`);
  persist("تم حذف الفاتورة");
  render();
}

function recalculateInventory() {
  state.products.forEach((product) => {
    const openingStock = number(product.openingStock);
    let stock = openingStock;
    let costValue = openingStock * number(product.baseCost ?? product.cost);
    let reserved = 0;

    state.invoices.forEach((invoice) => {
      invoice.lines
        .filter((line) => line.productId === product.id)
        .forEach((line) => {
          if (invoice.type === "purchase") {
            stock += number(line.qty);
            costValue += number(line.qty) * number(line.price);
          } else if (paymentStatus(invoice) === "paid") {
            stock -= number(line.qty);
          } else {
            reserved += number(line.qty);
          }
        });
    });

    product.stock = stock;
    product.reserved = reserved;
    product.available = stock - reserved;
    if (stock > 0) product.cost = costValue / stock;
  });
}

function currentInvoiceNet(productId) {
  if (!productId) return 0;
  return state.invoices.reduce((total, invoice) => {
    return (
      total +
      invoice.lines
        .filter((line) => line.productId === productId)
        .reduce((lineTotal, line) => {
          if (invoice.type === "purchase") return lineTotal + number(line.qty);
          return paymentStatus(invoice) === "paid" ? lineTotal - number(line.qty) : lineTotal;
        }, 0)
    );
  }, 0);
}

function availableStockForSale(productId, previousInvoice) {
  const product = findProduct(productId);
  let available = number(product?.available);
  if (previousInvoice?.type === "sale") {
    available += sum(previousInvoice.lines.filter((line) => line.productId === productId).map((line) => line.qty));
  }
  return available;
}

function saveSettings() {
  if (!can("settings:manage")) return toast("ليس لديك صلاحية تعديل الإعدادات");
  state.settings.businessName = els.businessName.value.trim() || "منشأتي";
  state.settings.businessAddress = els.businessAddress.value.trim();
  state.settings.businessPhone = els.businessPhone.value.trim();
  state.settings.taxNumber = els.taxNumber.value.trim();
  state.settings.currency = els.currencySymbol.value.trim() || "₪";
  state.settings.invoiceFooter = els.invoiceFooter.value.trim();
  state.settings.logoUrl = els.logoUrl.value.trim();
  state.settings.primaryColor = els.primaryColor.value || "#4f46e5";
  state.settings.moneyInColor = els.moneyInColor.value || "#167947";
  state.settings.moneyOutColor = els.moneyOutColor.value || "#b42318";
  state.settings.mode = els.modeSelect.value || "light";
  state.settings.invoiceTemplate = els.invoiceTemplate.value || "official";
  logActivity("تعديل الإعدادات", state.settings.businessName);
  persist("تم حفظ الإعدادات");
  applyTheme();
  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `invoice-suite-backup-${today}.json`;
  link.click();
  URL.revokeObjectURL(url);
  logActivity("نسخة احتياطية", "تصدير ملف JSON");
  persist("تم تجهيز النسخة الاحتياطية");
}

function restoreData(event) {
  if (!can("backup:restore")) {
    toast("ليس لديك صلاحية استرجاع النسخ");
    event.target.value = "";
    return;
  }
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const restored = normalizeState(JSON.parse(reader.result));
      state = restored;
      recalculateInventory();
      logActivity("استرجاع نسخة", file.name);
      persist("تم استرجاع النسخة");
      hydrateSettings();
      render();
    } catch {
      toast("ملف النسخة غير صالح");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function resetDemoData() {
  if (!can("settings:manage")) return toast("ليس لديك صلاحية إعادة البيانات");
  if (!confirm("سيتم استبدال البيانات الحالية بالبيانات التجريبية. هل تريد المتابعة؟")) return;
  state = normalizeState(clone(demoData));
  logActivity("إعادة بيانات", "تحميل البيانات التجريبية");
  persist("تمت إعادة البيانات التجريبية");
  hydrateSettings();
  render();
}

function clearActivityLog() {
  if (!can("activity:clear")) return toast("ليس لديك صلاحية مسح سجل النشاط");
  if (!confirm("مسح سجل النشاط؟")) return;
  state.activityLog = [];
  persist("تم مسح سجل النشاط");
  render();
}

function persist(message = "تم الحفظ") {
  if (USE_BACKEND) {
    saveStateToBackend(message);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  els.saveState.textContent = "تم الحفظ";
  toast(message);
  setTimeout(() => (els.saveState.textContent = "جاهز"), 1200);
}

async function saveStateToBackend(message) {
  try {
    els.saveState.textContent = "جار الحفظ";
    await apiFetch("/api/state", { method: "PUT", body: JSON.stringify(state) });
    lastSyncedSignature = stateSignature(state);
    els.saveState.textContent = "تم الحفظ";
    toast(message);
    setTimeout(() => (els.saveState.textContent = "جاهز"), 1200);
  } catch (error) {
    els.saveState.textContent = "فشل الحفظ";
    toast(error.message || "فشل الحفظ على الخادم");
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    return normalizeState(saved ? JSON.parse(saved) : clone(demoData));
  } catch {
    return normalizeState(clone(demoData));
  }
}

function stateSignature(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function startRealtimeSync() {
  if (!USE_BACKEND) return;
  if (syncTimer) clearInterval(syncTimer);
  if (streamReconnectTimer) {
    clearTimeout(streamReconnectTimer);
    streamReconnectTimer = null;
  }
  closeStateStream();
  lastSyncedSignature = stateSignature(state);
  connectStateStream();
  syncTimer = setInterval(() => {
    if (!streamConnected) syncStateFromBackend();
  }, 1000);
  if (!visibilitySyncBound) {
    visibilitySyncBound = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") syncStateFromBackend();
    });
  }
}

function connectStateStream() {
  if (!USE_BACKEND || !authToken || stateStream) return;
  try {
    stateStream = new EventSource(`/api/stream?token=${encodeURIComponent(authToken)}`);
    stateStream.addEventListener("ready", () => {
      streamConnected = true;
    });
    stateStream.addEventListener("state", () => {
      syncStateFromBackend();
    });
    stateStream.onerror = () => {
      streamConnected = false;
      closeStateStream();
      if (!streamReconnectTimer) {
        streamReconnectTimer = setTimeout(() => {
          streamReconnectTimer = null;
          connectStateStream();
        }, 1200);
      }
    };
  } catch {
    streamConnected = false;
  }
}

function closeStateStream() {
  if (!stateStream) return;
  try {
    stateStream.close();
  } catch {}
  stateStream = null;
  streamConnected = false;
}

async function syncStateFromBackend() {
  if (!USE_BACKEND || isSyncingState || !authToken) return;
  if (!els.modalBackdrop?.hidden) return;
  isSyncingState = true;
  try {
    const remote = normalizeState(await apiFetch("/api/state"));
    const remoteSignature = stateSignature(remote);
    if (!remoteSignature || remoteSignature === lastSyncedSignature) return;
    state = remote;
    hydrateSettings();
    render();
    lastSyncedSignature = remoteSignature;
  } catch {
  } finally {
    isSyncingState = false;
  }
}

function normalizeState(data) {
  data.settings = { ...clone(demoData.settings), ...(data.settings || {}) };
  if (data.settings.primaryColor === "#146c5c") data.settings.primaryColor = "#4f46e5";
  if (!["official", "modern", "minimal"].includes(data.settings.invoiceTemplate)) data.settings.invoiceTemplate = "official";
  data.users = data.users?.length ? data.users : clone(demoData.users);
  data.currentUserId = data.currentUserId || data.users[0]?.id || "u-admin";
  data.contacts ||= [];
  data.accounts ||= clone(demoData.accounts);
  data.products ||= [];
  data.invoices ||= [];
  data.payments ||= [];
  data.expenses ||= [];
  data.credits ||= [];
  data.categories ||= clone(demoData.categories);
  data.categories.expenses ||= [];
  data.categories.income ||= [];
  data.activityLog ||= [];

  data.products.forEach((product) => {
    const net = data.invoices.reduce((total, invoice) => {
      return total + invoice.lines.filter((line) => line.productId === product.id).reduce((lineTotal, line) => lineTotal + (invoice.type === "purchase" ? number(line.qty) : -number(line.qty)), 0);
    }, 0);
    product.sku ||= "";
    if (product.openingStock === undefined) product.openingStock = number(product.stock) - net;
    if (product.baseCost === undefined) product.baseCost = number(product.cost);
    product.reserved ||= 0;
    product.available ||= product.stock;
  });

  data.invoices.forEach((invoice) => {
    if (invoice.discount === undefined) invoice.discount = 0;
    if (invoice.taxRate === undefined) invoice.taxRate = 0;
    if (!invoice.contactId) invoice.contactId = ensureContactInData(data, invoice.type, invoice.party);
    invoice.party = findContactInData(data, invoice.contactId)?.name || invoice.party || "طرف غير محدد";
    if (!data.payments.some((payment) => payment.invoiceId === invoice.id)) {
      const total = rawInvoiceTotal(invoice);
      const status = invoice.status || "due";
      const amount = status === "paid" ? total : status === "partial" ? total * 0.5 : 0;
      if (amount > 0) {
        data.payments.push({
          id: `PAY-MIG-${invoice.id}`,
          paymentNo: `PAY-MIG-${invoice.id}`,
          invoiceId: invoice.id,
          accountId: data.accounts[0]?.id || "acc-cash",
          date: invoice.date || today,
          createdAt: new Date(Date.parse(`${invoice.date || today}T00:00:00`) || Date.now()).toISOString(),
          createdAtMs: Date.parse(`${invoice.date || today}T00:00:00`) || Date.now(),
          amount,
          method: "cash",
          reference: "",
          notes: "دفعة مرحلة من حالة الفاتورة القديمة",
        });
      }
    }
  });
  data.payments.forEach((payment) => {
    payment.accountId ||= defaultAccountForMethod(payment.method, data);
    payment.paymentNo ||= payment.id || `PAY-${Date.now()}`;
    if (!payment.createdAtMs) {
      const ms = payment.createdAt ? Date.parse(payment.createdAt) : Date.parse(`${payment.date || today}T00:00:00`);
      payment.createdAtMs = !Number.isNaN(ms) ? ms : Date.now();
    }
    payment.createdAt ||= new Date(payment.createdAtMs).toISOString();
  });
  data.expenses.forEach((expense) => {
    expense.accountId ||= data.accounts[0]?.id || "acc-cash";
  });
  return data;
}

function ensureContactInData(data, type, name) {
  const cleanName = (name || (type === "sale" ? "عميل نقدي" : "مورد عام")).trim();
  const existing = data.contacts.find((contact) => contact.name === cleanName);
  if (existing) return existing.id;
  const contact = {
    id: `c-${Date.now()}-${data.contacts.length}`,
    name: cleanName,
    type: type === "sale" ? "customer" : "supplier",
    phone: "",
    email: "",
    address: "",
    openingBalance: 0,
  };
  data.contacts.push(contact);
  return contact.id;
}

function ensureInvoiceContact(type, contactId, party) {
  if (contactId && findContact(contactId)) return contactId;
  const cleanName = party || (type === "sale" ? "عميل نقدي" : "مورد عام");
  const existing = state.contacts.find((contact) => contact.name === cleanName);
  if (existing) return existing.id;
  const contact = {
    id: `c-${Date.now()}`,
    name: cleanName,
    type: type === "sale" ? "customer" : "supplier",
    phone: "",
    email: "",
    address: "",
    openingBalance: 0,
  };
  state.contacts.push(contact);
  logActivity("إضافة طرف تلقائي", cleanName);
  return contact.id;
}

function invoicesByType(type) {
  return state.invoices.filter((invoice) => invoice.type === type);
}

function rawInvoiceTotal(invoice) {
  return sum((invoice.lines || []).map((line) => number(line.qty) * number(line.price)));
}

function invoiceTotal(invoice) {
  const subtotal = invoiceSubtotal(invoice);
  const discount = Math.max(0, number(invoice.discount));
  const base = Math.max(0, subtotal - discount);
  const taxValue = (base * Math.max(0, number(invoice.taxRate))) / 100;
  return base + taxValue;
}

function invoiceSubtotal(invoice) {
  return rawInvoiceTotal(invoice);
}

function invoiceProfit(invoice) {
  if (invoice.type !== "sale") return 0;
  return sum(invoice.lines.map((line) => number(line.qty) * (number(line.price) - number(line.cost))));
}

function paymentsForInvoice(invoiceId) {
  return state.payments.filter((payment) => payment.invoiceId === invoiceId);
}

function invoicePaid(invoice) {
  if (!invoice) return 0;
  return Math.min(invoiceTotal(invoice), sum(paymentsForInvoice(invoice.id).map((payment) => payment.amount)));
}

function invoiceRemaining(invoice) {
  if (!invoice) return 0;
  return Math.max(0, invoiceTotal(invoice) - invoicePaid(invoice));
}

function paymentStatus(invoice) {
  const total = invoiceTotal(invoice);
  const paid = invoicePaid(invoice);
  if (total <= 0 || paid >= total - 0.001) return "paid";
  if (paid > 0) return "partial";
  return "due";
}

function expensesTotal(from = null, to = null) {
  return sum(state.expenses.filter((expense) => !from || inDateRange(expense.date, from, to)).map((expense) => expense.amount));
}

function accountBalance(accountId) {
  const account = findAccount(accountId);
  return number(account?.openingBalance) + sum(accountTransactions(accountId).map((row) => number(row.in) - number(row.out)));
}

function accountTransactions(accountId) {
  return allAccountTransactions().filter((row) => row.accountId === accountId);
}

function allAccountTransactions() {
  const rows = [];
  state.payments.forEach((payment) => {
    const invoice = findInvoice(payment.invoiceId);
    const account = findAccount(payment.accountId);
    if (!invoice || !account) return;
    rows.push({
      date: payment.date,
      accountId: account.id,
      accountName: account.name,
      memo: `${invoice.type === "sale" ? "قبض من" : "دفع إلى"} ${partyName(invoice)}`,
      in: invoice.type === "sale" ? payment.amount : 0,
      out: invoice.type === "purchase" ? payment.amount : 0,
      reference: payment.reference || invoice.id,
    });
  });
  state.expenses.forEach((expense) => {
    const account = findAccount(expense.accountId);
    if (!account) return;
    rows.push({
      date: expense.date,
      accountId: account.id,
      accountName: account.name,
      memo: `${expense.category} - ${expense.description}`,
      in: 0,
      out: expense.amount,
      reference: expense.id,
    });
  });
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

function contactBalance(contact) {
  const invoices = state.invoices.filter((invoice) => invoice.contactId === contact.id);
  const salesDue = sum(invoices.filter((invoice) => invoice.type === "sale").map(invoiceRemaining));
  const purchasesDue = sum(invoices.filter((invoice) => invoice.type === "purchase").map(invoiceRemaining));
  const creditImpact = sum(state.credits.filter((credit) => credit.contactId === contact.id).map((credit) => credit.direction === "in" ? credit.amount : -credit.amount));
  const net = number(contact.openingBalance) + salesDue - purchasesDue + creditImpact;
  return { net, customer: Math.max(net, 0), supplier: Math.max(-net, 0) };
}

function contactStatementRows(contactId) {
  const contact = findContact(contactId);
  let balance = number(contact?.openingBalance);
  const rows = [{ date: "-", memo: "رصيد افتتاحي", debit: balance > 0 ? balance : 0, credit: balance < 0 ? Math.abs(balance) : 0, balance }];
  const entries = [];
  state.invoices.filter((invoice) => invoice.contactId === contactId).forEach((invoice) => {
    entries.push({ date: invoice.date, memo: `${invoice.type === "sale" ? "فاتورة بيع" : "فاتورة شراء"} ${invoice.id}`, debit: invoice.type === "sale" ? invoiceTotal(invoice) : 0, credit: invoice.type === "purchase" ? invoiceTotal(invoice) : 0 });
    paymentsForInvoice(invoice.id).forEach((payment) => {
      entries.push({ date: payment.date, memo: `دفعة ${invoice.id}`, debit: invoice.type === "purchase" ? payment.amount : 0, credit: invoice.type === "sale" ? payment.amount : 0 });
    });
  });
  state.credits.filter((credit) => credit.contactId === contactId).forEach((credit) => {
    entries.push({
      date: credit.date,
      memo: credit.notes || "رصيد دائن",
      debit: credit.direction === "in" ? credit.amount : 0,
      credit: credit.direction === "out" ? credit.amount : 0,
    });
  });
  entries.sort((a, b) => a.date.localeCompare(b.date)).forEach((entry) => {
    balance += number(entry.debit) - number(entry.credit);
    rows.push({ ...entry, balance });
  });
  return rows;
}

function stockLedgerRows(productId) {
  const product = findProduct(productId);
  let balance = number(product?.openingStock);
  const rows = [{ date: "-", memo: "رصيد افتتاحي", inQty: balance, outQty: 0, reservedQty: 0, balance }];
  const entries = [];
  state.invoices.forEach((invoice) => {
    invoice.lines.filter((line) => line.productId === productId).forEach((line) => {
      if (invoice.type === "purchase") {
        entries.push({ date: invoice.date, memo: `شراء ${invoice.id} - ${partyName(invoice)}`, inQty: number(line.qty), outQty: 0, reservedQty: 0 });
      } else if (paymentStatus(invoice) === "paid") {
        entries.push({ date: invoice.date, memo: `بيع مدفوع ${invoice.id} - ${partyName(invoice)}`, inQty: 0, outQty: number(line.qty), reservedQty: 0 });
      } else {
        entries.push({ date: invoice.date, memo: `حجز بيع ${invoice.id} - ${partyName(invoice)}`, inQty: 0, outQty: 0, reservedQty: number(line.qty) });
      }
    });
  });
  entries.sort((a, b) => a.date.localeCompare(b.date)).forEach((entry) => {
    balance += number(entry.inQty) - number(entry.outQty);
    rows.push({ ...entry, balance });
  });
  return rows;
}

function invoiceLinesFromDom(type) {
  return [...document.querySelectorAll(".line-row")].map((row) => {
    const productId = row.querySelector(".line-product").value;
    const product = findProduct(productId);
    const qty = number(row.querySelector(".line-qty").value);
    const price = number(row.querySelector(".line-price").value);
    return { productId, qty, price, cost: type === "purchase" ? price : number(product?.cost) };
  });
}

function findProduct(id) {
  return state.products.find((product) => product.id === id);
}

function findInvoice(id) {
  return state.invoices.find((invoice) => invoice.id === id);
}

function findContact(id) {
  return state.contacts.find((contact) => contact.id === id);
}

function findContactInData(data, id) {
  return data.contacts.find((contact) => contact.id === id);
}

function findAccount(id) {
  return state.accounts.find((account) => account.id === id);
}

function partyName(invoice) {
  return escapeHtml(findContact(invoice.contactId)?.name || invoice.party || "طرف غير محدد");
}

function productOptions(selectedId) {
  return state.products.map((product) => `<option value="${product.id}" ${product.id === selectedId ? "selected" : ""}>${escapeHtml(product.name)} - متاح ${formatNumber(product.available)}</option>`).join("");
}

function contactOptions(invoiceType, selectedId) {
  const needed = invoiceType === "sale" ? "customer" : "supplier";
  const options = state.contacts.filter((contact) => contact.type === needed || contact.type === "both");
  return `<option value="">اسم يدوي / طرف جديد</option>` + options.map((contact) => `<option value="${contact.id}" ${contact.id === selectedId ? "selected" : ""}>${escapeHtml(contact.name)}</option>`).join("");
}

function accountOptions(selectedId) {
  return state.accounts.map((account) => `<option value="${account.id}" ${account.id === selectedId ? "selected" : ""}>${escapeHtml(account.name)} - ${money(accountBalance(account.id))}</option>`).join("");
}

function defaultLinePrice(type, productId) {
  const product = findProduct(productId);
  if (!product) return 0;
  return type === "sale" ? product.price : product.cost;
}

function defaultAccountForMethod(method, source = state) {
  const wanted = method === "bank" || method === "card" || method === "check" ? "bank" : "cash";
  return source.accounts?.find((account) => account.type === wanted)?.id || source.accounts?.[0]?.id || "acc-cash";
}

function paymentListItem(payment) {
  const invoice = findInvoice(payment.invoiceId);
  return `
    <div class="payment-item">
      <div>
        <strong>${money(payment.amount)}</strong>
        <span>${invoice?.id || "فاتورة محذوفة"} - ${invoice ? partyName(invoice) : ""}</span>
        <small>${payment.date} · ${methodLabel(payment.method)} · ${escapeHtml(findAccount(payment.accountId)?.name || "-")}</small>
      </div>
      ${can("payment:delete") ? `<button class="icon-btn" data-delete-payment="${payment.id}" title="حذف الدفعة">×</button>` : ""}
    </div>`;
}

function paymentListItemV2(payment) {
  const invoice = findInvoice(payment.invoiceId);
  const serial = escapeHtml(payment.paymentNo || payment.id || "-");
  return `
    <div class="payment-item">
      <div>
        <strong>${money(payment.amount)}</strong>
        <span>${serial} - ${invoice?.id || "فاتورة محذوفة"} - ${invoice ? partyName(invoice) : ""}</span>
        <small>${paymentTimestampLabel(payment)} · ${methodLabel(payment.method)} · ${escapeHtml(findAccount(payment.accountId)?.name || "-")}</small>
      </div>
      ${can("payment:delete") ? `<button class="icon-btn" data-delete-payment="${payment.id}" title="حذف الدفعة">×</button>` : ""}
    </div>`;
}

function rowActions(id) {
  return `
    <button class="ghost-btn" data-view-invoice="${id}">عرض</button>
    ${can("payment:create") && invoiceRemaining(findInvoice(id)) > 0 ? `<button class="ghost-btn" data-add-payment="${id}">دفعة</button>` : ""}
    ${can("invoice:edit") ? `<button class="ghost-btn" data-edit-invoice="${id}">تعديل</button>` : ""}
    <button class="ghost-btn" data-print-invoice="${id}">طباعة</button>
    ${can("invoice:delete") ? `<button class="ghost-btn danger" data-delete-invoice="${id}">حذف</button>` : ""}
  `;
}

function nextInvoiceId(type) {
  const prefix = type === "sale" ? "S" : "P";
  const floor = type === "sale" ? 1000 : 5000;
  const current = state.invoices.filter((invoice) => invoice.type === type).map((invoice) => Number(String(invoice.id).split("-")[1]) || 0);
  return `${prefix}-${Math.max(...current, floor) + 1}`;
}

function nextPaymentNo() {
  const max = state.payments.reduce((m, payment) => {
    const digits = String(payment.paymentNo || payment.id || "").replace(/[^\d]/g, "");
    return Math.max(m, Number(digits) || 0);
  }, 0);
  return `PAY-${String(max + 1).padStart(6, "0")}`;
}

function nextPaymentId() {
  return `PMT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function paymentOrderValue(payment) {
  if (Number.isFinite(Number(payment.createdAtMs))) return Number(payment.createdAtMs);
  if (payment.createdAt) {
    const ms = Date.parse(payment.createdAt);
    if (!Number.isNaN(ms)) return ms;
  }
  if (payment.date) {
    const ms = Date.parse(`${payment.date}T00:00:00`);
    if (!Number.isNaN(ms)) return ms;
  }
  return 0;
}

function paymentTimestampLabel(payment) {
  const ms = paymentOrderValue(payment);
  if (!ms) return payment.date || "-";
  return new Intl.DateTimeFormat("ar", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

function statusBadge(status) {
  return `<span class="status ${status}">${statusText(status)}</span>`;
}

function statusText(status) {
  return { paid: "مسددة", partial: "جزئية", due: "غير مدفوعة" }[status] || status;
}

function contactTypeLabel(type) {
  return { customer: "عميل", supplier: "مورد", both: "عميل ومورد" }[type] || type;
}

function methodLabel(method) {
  return { cash: "نقدًا", card: "بطاقة", bank: "تحويل بنكي", check: "شيك" }[method] || method || "غير محدد";
}

function roleLabel(role) {
  return { admin: "مدير", accountant: "محاسب", cashier: "كاشير", viewer: "مشاهد" }[role] || role;
}

function rolePermissions(role) {
  return {
    admin: "كل الصلاحيات",
    accountant: "فواتير، دفعات، مصروفات، تقارير",
    cashier: "بيع ودفعات فقط",
    viewer: "مشاهدة فقط",
  }[role] || "-";
}

function reportTitle(kind) {
  return { sales: "تقرير المبيعات", purchases: "تقرير المشتريات", expenses: "تقرير المصروفات", profit: "تقرير الأرباح", customers: "تقرير العملاء", suppliers: "تقرير الموردين" }[kind] || "تقرير";
}

function reportHeaders(kind) {
  if (kind === "expenses") return ["التاريخ", "التصنيف", "الوصف", "الحساب", "المبلغ"];
  if (kind === "profit") return ["البند", "القيمة"];
  if (kind === "customers" || kind === "suppliers") return ["الاسم", "الهاتف", "الرصيد", "آخر حركة"];
  return ["رقم", "التاريخ", "الطرف", "الإجمالي", "المدفوع", "المتبقي", "الحالة"];
}

function reportRows(kind, from, to, query) {
  if (kind === "sales" || kind === "purchases") {
    const type = kind === "sales" ? "sale" : "purchase";
    return invoicesByType(type)
      .filter((invoice) => inDateRange(invoice.date, from, to))
      .filter((invoice) => matchesInvoice(invoice, query))
      .map((invoice) => ({
        raw: invoice,
        cells: [invoice.id, invoice.date, partyName(invoice), money(invoiceTotal(invoice)), money(invoicePaid(invoice)), type === "sale" ? moneyIn(invoiceRemaining(invoice)) : moneyOut(invoiceRemaining(invoice)), statusText(paymentStatus(invoice))],
      }));
  }
  if (kind === "expenses") {
    return state.expenses
      .filter((expense) => inDateRange(expense.date, from, to) && matchesText(`${expense.category} ${expense.description}`, query))
      .map((expense) => ({ raw: expense, cells: [expense.date, escapeHtml(expense.category), escapeHtml(expense.description || "-"), escapeHtml(findAccount(expense.accountId)?.name || "-"), moneyOut(expense.amount)] }));
  }
  if (kind === "customers" || kind === "suppliers") {
    const type = kind === "customers" ? "customer" : "supplier";
    return state.contacts
      .filter((contact) => contact.type === type || contact.type === "both")
      .filter((contact) => matchesText(`${contact.name} ${contact.phone}`, query))
      .map((contact) => ({ raw: contact, cells: [escapeHtml(contact.name), escapeHtml(contact.phone || "-"), signedMoney(contactBalance(contact).net), lastContactActivity(contact.id)] }));
  }
  const sales = sum(invoicesByType("sale").filter((invoice) => inDateRange(invoice.date, from, to)).map(invoiceTotal));
  const costs = sum(invoicesByType("sale").filter((invoice) => inDateRange(invoice.date, from, to)).map((invoice) => invoiceTotal(invoice) - invoiceProfit(invoice)));
  const expenses = expensesTotal(from, to);
  return [
    { cells: ["المبيعات", moneyIn(sales)] },
    { cells: ["تكلفة البضاعة", moneyOut(costs)] },
    { cells: ["المصروفات", moneyOut(expenses)] },
    { cells: ["صافي الربح", signedMoney(sales - costs - expenses)] },
  ];
}

function reportTotals(kind, rows) {
  if (kind === "sales" || kind === "purchases") {
    const total = sum(rows.map((row) => invoiceTotal(row.raw)));
    const paid = sum(rows.map((row) => invoicePaid(row.raw)));
    const remaining = sum(rows.map((row) => invoiceRemaining(row.raw)));
    return [["الإجمالي", money(total)], ["المدفوع", money(paid)], ["المتبقي", kind === "sales" ? moneyIn(remaining) : moneyOut(remaining), kind === "sales" ? "مستحق لي" : "مستحق علي", kind === "sales" ? "in" : "out"]];
  }
  if (kind === "expenses") return [["إجمالي المصروفات", moneyOut(sum(rows.map((row) => row.raw.amount))), "مستحق علي", "out"]];
  if (kind === "customers" || kind === "suppliers") {
    const total = sum(rows.map((row) => Math.abs(contactBalance(row.raw).net)));
    return [[kind === "customers" ? "إجمالي العملاء" : "إجمالي الموردين", kind === "customers" ? moneyIn(total) : moneyOut(total), kind === "customers" ? "مستحق لي" : "مستحق علي", kind === "customers" ? "in" : "out"]];
  }
  return [["بنود التقرير", rows.length]];
}

function exportReportCsv(kind, rows) {
  const headers = reportHeaders(kind);
  const csv = [headers.join(","), ...rows.map((row) => row.cells.map((cell) => `"${String(cell).replace(/<[^>]+>/g, "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${kind}-report-${today}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function currentUser() {
  if (USE_BACKEND && authUser) return authUser;
  return state.users.find((user) => user.id === state.currentUserId) || state.users[0] || { name: "مستخدم", role: "admin" };
}

function can(action) {
  const role = currentUser().role;
  if (role === "admin") return true;
  if (role === "viewer") return false;
  if (role === "cashier") return ["invoice:create", "invoice:edit", "payment:create"].includes(action);
  if (role === "employee") return ["invoice:create", "invoice:edit", "payment:create"].includes(action);
  if (role === "accountant") return !["settings:manage", "backup:restore", "activity:clear", "account:manage", "contact:manage", "inventory:manage"].includes(action);
  return false;
}

function canView(view) {
  const role = currentUser().role;
  if (role === "admin") return true;
  const views = {
    accountant: ["dashboard", "sales", "purchases", "payments", "contacts", "expenses", "cash", "reports", "activity"],
    cashier: ["dashboard", "sales", "payments"],
    employee: ["dashboard", "sales", "payments"],
    viewer: ["dashboard", "reports"],
  };
  return (views[role] || []).includes(view);
}

function logActivity(action, detail) {
  state.activityLog ||= [];
  state.activityLog.push({
    time: new Date().toLocaleString("ar"),
    userId: currentUser().id,
    userName: currentUser().name,
    action,
    detail,
  });
  if (state.activityLog.length > 500) state.activityLog = state.activityLog.slice(-500);
}

function metricCards(cards) {
  return cards.map(([label, value, hint, tone]) => `<article class="metric-card ${tone ? `tone-${tone}` : ""}"><span>${label}</span><strong>${value}</strong><small>${hint}</small></article>`).join("");
}

function topExpenseCategory() {
  const map = new Map();
  state.expenses.forEach((expense) => map.set(expense.category, (map.get(expense.category) || 0) + number(expense.amount)));
  const top = [...map.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? `${top[0]} (${money(top[1])})` : "-";
}

function lastContactActivity(contactId) {
  const dates = [
    ...state.invoices.filter((invoice) => invoice.contactId === contactId).map((invoice) => invoice.date),
    ...state.payments.filter((payment) => findInvoice(payment.invoiceId)?.contactId === contactId).map((payment) => payment.date),
  ].sort((a, b) => b.localeCompare(a));
  return dates[0] || "-";
}

function matchesInvoice(invoice, query) {
  if (!query) return true;
  const productNames = invoice.lines.map((line) => findProduct(line.productId)?.name || "").join(" ");
  return matchesText(`${invoice.id} ${partyName(invoice)} ${invoice.date} ${productNames}`, query);
}

function matchesText(value, query) {
  return !query || String(value).toLowerCase().includes(query);
}

function searchQuery() {
  return (els.globalSearch?.value || "").trim().toLowerCase();
}

function inDateRange(date, from, to) {
  return date >= from && date <= to;
}

function money(value) {
  return `${formatNumber(value)} ${state.settings.currency}`;
}

function moneyIn(value) {
  return `<span class="money-in">${money(value)}</span>`;
}

function moneyOut(value) {
  return `<span class="money-out">${money(value)}</span>`;
}

function signedMoney(value) {
  if (number(value) > 0) return `<span class="money-in">${money(value)} إلي</span>`;
  if (number(value) < 0) return `<span class="money-out">${money(Math.abs(value))} علي</span>`;
  return `<span class="money-neutral">${money(0)}</span>`;
}

function roundMoney(value) {
  return Math.round(number(value) * 100) / 100;
}

function formatNumber(value) {
  return new Intl.NumberFormat("ar", { maximumFractionDigits: 2 }).format(number(value));
}

function number(value) {
  return Number(value) || 0;
}

function sum(values) {
  return values.reduce((total, value) => total + number(value), 0);
}

function dateOffset(offset) {
  return new Date(Date.now() + offset * dayMs).toISOString().slice(0, 10);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rememberCategory(group, category) {
  state.categories ||= clone(demoData.categories);
  state.categories[group] ||= [];
  if (category && !state.categories[group].includes(category)) state.categories[group].push(category);
}

function shadeColor(color, percent) {
  const value = String(color || "#4f46e5").replace("#", "");
  const num = parseInt(value.length === 3 ? value.split("").map((c) => c + c).join("") : value, 16);
  const amount = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount));
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}

function emptyRow(colspan, text) {
  return `<tr><td colspan="${colspan}">${text}</td></tr>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
