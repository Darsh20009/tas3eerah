/* ═══════════════════════════════════════
   Tas3eerah Main App JS
   ═══════════════════════════════════════ */

'use strict';

// ─── LANGUAGE ────────────────────────────
const L = { current: 'ar' };
// ─── MOBILE SIDEBAR ──────────────────────
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  const ov = document.getElementById('sbOverlay');
  if (ov) { ov.classList.add('open'); }
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  const ov = document.getElementById('sbOverlay');
  if (ov) { ov.classList.remove('open'); }
  document.body.style.overflow = '';
}
// Close sidebar on wider screens if accidentally left open
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) closeSidebar();
});

function toggleLang() {
  L.current = L.current === 'ar' ? 'en' : 'ar';
  document.documentElement.lang = L.current;
  document.documentElement.dir  = L.current === 'ar' ? 'rtl' : 'ltr';
  const btn = document.getElementById('langBtn');
  if (btn) btn.textContent = L.current === 'ar' ? 'EN' : 'AR';
  document.querySelectorAll('[data-ar]').forEach(el => {
    const v = el.getAttribute('data-' + L.current);
    if (v) el.innerHTML = v;
  });
}

// ─── API ─────────────────────────────────
async function api(endpoint, data = null, method = null) {
  const isGet = data === null;
  const csrf  = document.querySelector('meta[name="csrf-token"]')?.content || '';
  const opts = {
    method : method || (isGet ? 'GET' : 'POST'),
    headers: {
      'Content-Type': 'application/json',
      ...(isGet ? {} : { 'X-CSRF-Token': csrf }),
    },
  };
  if (!isGet) opts.body = JSON.stringify(data);
  try {
    const r = await fetch('/api/' + endpoint, opts);
    const j = await r.json();
    return j;
  } catch (e) {
    return { success: false, error: 'خطأ في الاتصال بالخادم' };
  }
}

// ─── NAVIGATION ──────────────────────────
const panelTitles = {
  overview        : 'نظرة عامة',
  quotes          : 'عروض الأسعار',
  'quote-new'     : 'عرض سعر جديد',
  clients         : 'العملاء',
  messages        : 'الرسائل',
  tools           : 'أدوات التسعير',
  users           : 'إدارة المستخدمين',
  subscriptions   : 'الاشتراكات',
  'contact-inbox' : 'رسائل التواصل',
  activity        : 'سجل النشاط',
  settings        : 'إعدادات النظام',
  account         : 'حسابي',
};

function nav(btn) {
  closeSidebar();
  if (!btn) return;
  const panel = btn.getAttribute('data-panel');
  if (!panel) return;

  document.querySelectorAll('.sb-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('panel-' + panel);
  if (target) target.classList.add('active');

  const titleEl = document.getElementById('topbarTitle');
  if (titleEl) titleEl.textContent = panelTitles[panel] || '';

  if (panel === 'quotes')          loadQuotes();
  if (panel === 'clients')         loadClients();
  if (panel === 'messages')        loadInbox();
  if (panel === 'users')           loadUsers();
  if (panel === 'subscriptions')   loadSubscriptions();
  if (panel === 'contact-inbox')   loadContactInbox();
  if (panel === 'activity')        loadActivity();
  if (panel === 'settings')        loadSettings();
  if (panel === 'quote-new')       initQuoteForm();
}

// ─── DIRECT NAVIGATION (by panel id, no sidebar button required) ─────
function navDirect(panelId) {
  closeSidebar();
  document.querySelectorAll('.sb-item').forEach(b => b.classList.remove('active'));
  const sideBtn = document.querySelector(`[data-panel="${panelId}"]`);
  if (sideBtn) sideBtn.classList.add('active');

  document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('panel-' + panelId);
  if (panel) panel.classList.add('active');

  const titleEl = document.getElementById('topbarTitle');
  if (titleEl) titleEl.textContent = panelTitles[panelId] || '';

  if (panelId === 'quote-new')     initQuoteForm();
  if (panelId === 'quotes')        loadQuotes();
  if (panelId === 'messages')      loadInbox();
  if (panelId === 'users')         loadUsers();
  if (panelId === 'subscriptions') loadSubscriptions();
  if (panelId === 'activity')      loadActivity();
  if (panelId === 'settings')      loadSettings();
}

// ─── AUTH ────────────────────────────────
async function doLogout() {
  await api('auth', { action: 'logout' });
  window.location.href = '/';
}

// ─── QUOTES ──────────────────────────────
let quotes = [];
async function loadQuotes() {
  const status = (document.getElementById('qStatusFilter') || {}).value || '';
  const search = (document.getElementById('qSearch') || {}).value || '';
  const r = await api(`quotes?action=list&status=${status}&q=${encodeURIComponent(search)}`);
  if (!r.success) return;
  quotes = r.data;
  renderQuotes();
}

function renderQuotes() {
  const tb = document.getElementById('quotesTbody');
  if (!tb) return;
  if (!quotes.length) {
    tb.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--muted)">لا توجد عروض أسعار</td></tr>';
    return;
  }
  tb.innerHTML = quotes.map(q => `
    <tr>
      <td><code style="font-size:11px">${q.number}</code></td>
      <td>${esc(q.title)}</td>
      ${APP.role !== 'client'   ? `<td>${esc(q.client_name || '-')}</td>` : ''}
      ${APP.role !== 'employee' ? `<td>${esc(q.employee_name || '-')}</td>` : ''}
      <td>${fmt(q.total)} ر.س</td>
      <td><span class="badge badge-${q.status}">${statusLabel(q.status)}</span></td>
      <td style="font-size:11px;color:var(--muted)">${q.created_at ? q.created_at.slice(0,10) : ''}</td>
      <td>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" onclick="viewQuote(${q.id})">عرض</button>
          ${APP.role !== 'client' && q.status === 'draft' ? `<button class="btn btn-outline btn-sm" onclick="editQuote(${q.id})">تعديل</button>` : ''}
          ${q.status === 'sent' && APP.role === 'client' ? `
            <button class="btn btn-success btn-sm" onclick="changeStatus(${q.id},'accepted')">قبول</button>
            <button class="btn btn-danger btn-sm"  onclick="changeStatus(${q.id},'rejected')">رفض</button>
          ` : ''}
          ${q.status === 'draft' && APP.role !== 'client' ? `<button class="btn btn-primary btn-sm" onclick="changeStatus(${q.id},'sent')">إرسال</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

async function viewQuote(id) {
  const r = await api(`quotes?action=get&id=${id}`);
  if (!r.success) { alert(r.error); return; }
  const q = r.data;
  const itemsHtml = (q.items || []).map(it => `
    <tr>
      <td>${esc(it.description)}</td>
      <td style="text-align:center">${it.qty}</td>
      <td style="text-align:left">${fmt(it.unit_price)}</td>
      <td style="text-align:left">${fmt(it.total)}</td>
    </tr>
  `).join('');
  const subtotal = q.subtotal || 0;
  const discount = q.discount || 0;
  const taxAmt   = (subtotal - discount) * (q.tax_rate / 100);
  document.getElementById('pdfDoc').innerHTML = `
    <div class="pdf-header">
      <div><img src="/assets/brand-logo-transparent.png" class="pdf-logo" alt="تسعيرة"></div>
      <div style="text-align:left">
        <h1>عرض سعر</h1>
        <div class="pdf-meta">رقم: ${q.number}</div>
        <div class="pdf-meta">التاريخ: ${(q.created_at||'').slice(0,10)}</div>
        <div class="pdf-meta"><span class="badge badge-${q.status}">${statusLabel(q.status)}</span></div>
      </div>
    </div>
    <div class="pdf-parties">
      <div class="pdf-party"><label>مُقدَّم من</label><p>${esc(q.employee_name || 'الشركة')}</p></div>
      <div class="pdf-party"><label>مُقدَّم إلى</label><p>${esc(q.client_name || '-')}</p></div>
    </div>
    <h3 style="margin-bottom:12px">${esc(q.title)}</h3>
    <table>
      <thead><tr><th>الوصف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="pdf-totals">
      <div class="pdf-total-row"><span>المجموع الفرعي</span><span>${fmt(subtotal)} ر.س</span></div>
      ${discount > 0 ? `<div class="pdf-total-row"><span>خصم</span><span>- ${fmt(discount)} ر.س</span></div>` : ''}
      <div class="pdf-total-row"><span>ضريبة القيمة المضافة (${q.tax_rate}%)</span><span>${fmt(taxAmt)} ر.س</span></div>
      <div class="pdf-total-row grand"><span>الإجمالي</span><span>${fmt(q.total)} ر.س</span></div>
    </div>
    ${q.notes ? `<div style="margin-top:16px;padding:12px;background:var(--paper);border-radius:8px;font-size:13px"><strong>ملاحظات:</strong> ${esc(q.notes)}</div>` : ''}
    <div class="pdf-footer">تسعيرة منصة التسعير الذكي</div>
  `;
  document.getElementById('pdfOverlay').classList.remove('hidden');
}

async function editQuote(id) {
  const r = await api(`quotes?action=get&id=${id}`);
  if (!r.success) { alert(r.error); return; }
  const q = r.data;
  const btn = document.querySelector('[data-panel="quote-new"]');
  if (btn) nav(btn); else return;

  document.getElementById('qEditId').value   = q.id;
  document.getElementById('qFormTitle').textContent = 'تعديل عرض السعر';
  document.getElementById('qTitle').value    = q.title;
  document.getElementById('qTax').value      = q.tax_rate;
  document.getElementById('qDiscount').value = q.discount;
  document.getElementById('qNotes').value    = q.notes || '';
  await ensureClientsLoaded();
  document.getElementById('qClient').value = q.client_id;
  document.getElementById('itemsBody').innerHTML = '';
  (q.items || []).forEach(it => addItem(it.description, it.qty, it.unit_price));
  calcTotals();
}

async function changeStatus(id, status) {
  const r = await api('quotes', { action: 'status', id, status });
  if (r.success) loadQuotes();
  else alert(r.error);
}

// ─── QUOTE BUILDER ───────────────────────
let clientsCache = null;

async function initQuoteForm() {
  await ensureClientsLoaded();
  if (!document.getElementById('itemsBody').children.length) addItem();
}

async function ensureClientsLoaded() {
  if (clientsCache) { populateClientSelect(clientsCache); return; }
  const r = await api('quotes?action=clients');
  if (r.success) { clientsCache = r.data; populateClientSelect(clientsCache); }
}

function populateClientSelect(clients) {
  const sel = document.getElementById('qClient');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">اختر العميل...</option>' +
    clients.map(c => `<option value="${c.id}" ${c.id == cur ? 'selected' : ''}>${esc(c.name)} ${esc(c.email)}</option>`).join('');
}

function addItem(desc = '', qty = 1, price = 0) {
  const tbody = document.getElementById('itemsBody');
  const row   = document.createElement('tr');
  row.innerHTML = `
    <td><input type="text"   value="${esc(desc)}"  placeholder="وصف البند..." oninput="calcTotals()"></td>
    <td><input type="number" value="${qty}"   min="0.01" step="0.01" oninput="calcTotals()" style="text-align:center"></td>
    <td><input type="number" value="${price}" min="0"    step="0.01" oninput="calcTotals()"></td>
    <td class="row-total" style="font-weight:700;padding:8px 10px">${fmt(qty * price)}</td>
    <td><button class="del-item" onclick="this.closest('tr').remove();calcTotals()">✕</button></td>
  `;
  tbody.appendChild(row);
  calcTotals();
}

function calcTotals() {
  let subtotal = 0;
  document.querySelectorAll('#itemsBody tr').forEach(row => {
    const inputs = row.querySelectorAll('input');
    if (inputs.length < 3) return;
    const qty   = parseFloat(inputs[1].value) || 0;
    const price = parseFloat(inputs[2].value) || 0;
    const tot   = qty * price;
    subtotal += tot;
    const td = row.querySelector('.row-total');
    if (td) td.textContent = fmt(tot);
  });
  const tax      = parseFloat(document.getElementById('qTax')?.value) || 0;
  const discount = parseFloat(document.getElementById('qDiscount')?.value) || 0;
  const taxAmt   = (subtotal - discount) * tax / 100;
  const total    = subtotal - discount + taxAmt;

  setText('totSub',   fmt(subtotal) + ' ر.س');
  setText('totDis',   fmt(discount) + ' ر.س');
  setText('totTax',   fmt(taxAmt)   + ' ر.س');
  setText('totFinal', fmt(total)    + ' ر.س');
  setText('taxLbl',   `ضريبة (${tax}%)`);
}

async function saveQuote() {
  const editId   = document.getElementById('qEditId').value;
  const title    = document.getElementById('qTitle').value.trim();
  const clientId = document.getElementById('qClient').value;
  const taxRate  = parseFloat(document.getElementById('qTax').value) || 0;
  const discount = parseFloat(document.getElementById('qDiscount').value) || 0;
  const notes    = document.getElementById('qNotes').value.trim();

  const items = [];
  document.querySelectorAll('#itemsBody tr').forEach(row => {
    const inputs = row.querySelectorAll('input');
    if (inputs.length < 3) return;
    const desc  = inputs[0].value.trim();
    const qty   = parseFloat(inputs[1].value) || 0;
    const price = parseFloat(inputs[2].value) || 0;
    if (desc) items.push({ description: desc, qty, unit_price: price });
  });

  const msgEl = document.getElementById('quoteMsg');
  const showMsg = (txt, isErr) => {
    msgEl.className = `alert alert-${isErr ? 'danger' : 'success'} mb-8`;
    msgEl.textContent = txt;
  };

  const action = editId ? 'update' : 'create';
  const payload = { action, title, client_id: clientId, items, tax_rate: taxRate, discount, notes };
  if (editId) payload.id = parseInt(editId);

  const r = await api('quotes', payload);
  if (r.success) {
    showMsg(r.message || 'تم الحفظ', false);
    setTimeout(() => {
      resetQuoteForm();
      nav(document.querySelector('[data-panel="quotes"]'));
    }, 1200);
  } else {
    showMsg(r.error || 'حدث خطأ', true);
  }
}

function resetQuoteForm() {
  document.getElementById('qEditId').value = '';
  document.getElementById('qFormTitle').textContent = 'عرض سعر جديد';
  ['qTitle','qNotes'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('qTax').value = '15';
  document.getElementById('qDiscount').value = '0';
  document.getElementById('itemsBody').innerHTML = '';
  document.getElementById('quoteMsg').className = 'hidden';
  addItem();
  calcTotals();
}

// ─── CLIENTS ─────────────────────────────
async function loadClients() {
  const r = await api('quotes?action=clients');
  const tb = document.getElementById('clientsTbody');
  if (!tb) return;
  if (!r.success) { tb.innerHTML = `<tr><td colspan="5">${r.error}</td></tr>`; return; }
  const clients = r.data;
  if (!clients.length) {
    tb.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--muted)">لا يوجد عملاء بعد</td></tr>';
    return;
  }
  tb.innerHTML = clients.map(c => `
    <tr>
      <td>${esc(c.name)}</td>
      <td style="direction:ltr;text-align:right">${esc(c.email)}</td>
      <td><span class="badge badge-${c.plan}">${planLabel(c.plan)}</span></td>
      <td style="font-size:11px;color:var(--muted)">${(c.created_at||'').slice(0,10)}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="composeToUser(${JSON.stringify(c)})">رسالة</button></td>
    </tr>
  `).join('');
}

// ─── MESSAGES ────────────────────────────
let currentThreadId = null;

async function loadInbox() {
  const r = await api('messages?action=inbox');
  const list = document.getElementById('inboxList');
  if (!list) return;
  if (!r.success) { list.innerHTML = `<div style="padding:16px;color:var(--muted)">${r.error}</div>`; return; }
  const msgs = r.data;
  if (!msgs.length) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:13px">لا توجد رسائل بعد</div>';
    return;
  }
  list.innerHTML = msgs.map(m => `
    <div class="msg-item ${m.unread > 0 ? 'unread' : ''}" onclick="openThread(${m.id})">
      <div class="msg-item-name">${esc(m.sender_id == APP.uid ? m.receiver_name : m.sender_name)}</div>
      <div class="msg-item-preview">${esc(m.subject || m.body)}</div>
      <div class="msg-item-time">${(m.created_at||'').slice(0,10)}</div>
    </div>
  `).join('');
  loadUnreadCount();
}

async function openThread(id) {
  currentThreadId = id;
  document.querySelectorAll('.msg-item').forEach(el => el.classList.remove('active'));
  const r = await api('messages', { action: 'thread', id });
  if (!r.success) return;
  const msgs = r.data;
  const title = document.getElementById('threadTitle');
  if (title && msgs.length) {
    const other = msgs[0].sender_id == APP.uid ? 'المستلم' : esc(msgs[0].sender_name);
    title.textContent = msgs[0].subject || 'محادثة مع ' + other;
  }
  const bubbles = document.getElementById('threadBubbles');
  if (bubbles) {
    bubbles.innerHTML = msgs.map(m => `
      <div>
        <div class="bubble ${m.sender_id == APP.uid ? 'mine' : 'theirs'}">${esc(m.body)}</div>
        <div class="bubble-meta" style="${m.sender_id == APP.uid ? 'text-align:right' : ''}">
          ${esc(m.sender_name)} ${(m.created_at||'').slice(0,16).replace('T',' ')}
        </div>
      </div>
    `).join('');
    bubbles.scrollTop = bubbles.scrollHeight;
  }
  const compose = document.getElementById('msgCompose');
  if (compose) compose.style.display = 'flex';
  loadUnreadCount();
}

async function sendReply() {
  if (!currentThreadId) return;
  const body = document.getElementById('replyBody').value.trim();
  if (!body) return;
  const r2 = await api('messages', { action: 'thread', id: currentThreadId });
  if (!r2.success) return;
  const other = r2.data.find(m => m.sender_id != APP.uid) || r2.data[0];
  const receiverId = other.sender_id == APP.uid ? other.receiver_id : other.sender_id;
  const r = await api('messages', { action: 'send', receiver_id: receiverId, body, parent_id: currentThreadId });
  if (r.success) {
    document.getElementById('replyBody').value = '';
    openThread(currentThreadId);
  }
}

function openCompose() {
  loadContacts();
  document.getElementById('composeModal').classList.remove('hidden');
}

async function loadContacts() {
  const r = await api('messages?action=contacts');
  const sel = document.getElementById('cmTo');
  if (!sel || !r.success) return;
  sel.innerHTML = r.data.map(u => `<option value="${u.id}">${esc(u.name)} (${u.role === 'admin' ? 'مدير' : u.role === 'employee' ? 'موظف' : 'عميل'})</option>`).join('');
}

async function sendNewMsg() {
  const to      = document.getElementById('cmTo').value;
  const subject = document.getElementById('cmSubject').value.trim();
  const body    = document.getElementById('cmBody').value.trim();
  if (!body) { showInModal('cmMsg', 'يرجى كتابة نص الرسالة', true); return; }
  const r = await api('messages', { action: 'send', receiver_id: parseInt(to), subject, body });
  if (r.success) {
    document.getElementById('composeModal').classList.add('hidden');
    ['cmSubject','cmBody'].forEach(id => { document.getElementById(id).value = ''; });
    loadInbox();
  } else {
    showInModal('cmMsg', r.error, true);
  }
}

function composeToUser(user) {
  loadContacts().then(() => {
    document.getElementById('cmTo').value = user.id;
  });
  document.getElementById('composeModal').classList.remove('hidden');
  nav(document.querySelector('[data-panel="messages"]'));
}

async function loadUnreadCount() {
  const r = await api('messages?action=unread_count');
  if (!r.success) return;
  const badge = document.getElementById('unreadBadge');
  if (!badge) return;
  if (r.data.count > 0) {
    badge.textContent = r.data.count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// ─── TOOLS ───────────────────────────────
function openTool(slug) {
  document.getElementById('toolsMenu').style.display = 'none';
  document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('tool-' + slug);
  if (panel) panel.classList.add('active');
  // Restore sessionStorage state
  restoreToolState(slug);
  // Trigger initial calculation
  if (slug === 'calc_pkg')    calcPkg();
  if (slug === 'calc_labor')  calcLabor();
  if (slug === 'calc_store')  calcStore();
  if (slug === 'calc_office') calcOffice();
  if (slug === 'calc_custom') {
    if (!document.getElementById('custItemsBody').children.length) addCustomItem();
    calcCustom();
  }
}

function closeTool() {
  document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('toolsMenu').style.display = '';
}

// Update client info card label when name is typed
function updateCicLabel(toolId) {
  const name = (document.getElementById('ci_name_' + toolId)?.value || '').trim();
  const lbl  = document.getElementById('cic_label_' + toolId);
  if (!lbl) return;
  lbl.innerHTML = name
    ? `👤 <strong>${esc(name)}</strong>`
    : `👤 بيانات العميل <small style="font-weight:400;color:var(--muted)">اختياري</small>`;
}

function showPlanUpgrade() {
  document.getElementById('upgradeModal').classList.remove('hidden');
}

// ─── TOOL STATE (sessionStorage) ─────────
function saveToolState(slug) {
  const panel = document.getElementById('tool-' + slug);
  if (!panel) return;
  const state = {};
  panel.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
    if (el.type !== 'button' && el.id) state[el.id] = el.value;
  });
  try { sessionStorage.setItem('tool_state_' + slug, JSON.stringify(state)); } catch (_) {}
}

function restoreToolState(slug) {
  try {
    const raw = sessionStorage.getItem('tool_state_' + slug);
    if (!raw) return;
    const state = JSON.parse(raw);
    const panel = document.getElementById('tool-' + slug);
    if (!panel) return;
    Object.entries(state).forEach(([id, val]) => {
      const el = panel.querySelector('#' + id);
      if (el && el.type !== 'button') el.value = val;
    });
  } catch (_) {}
}

// Tool: Basic
const svcMap = {
  'موقع إلكتروني': ['تصميم الواجهة','تطوير الصفحات','SEO أساسي','لوحة تحكم','نماذج تواصل','تهيئة الاستضافة'],
  'تطبيق موبايل':  ['تصميم UX/UI','تطوير iOS','تطوير Android','API Backend','اختبار وتجربة','نشر المتجر'],
  'هوية بصرية':    ['شعار رئيسي','دليل الهوية','قرطاسية','سوشيال ميديا','موك أب','ملف ختم'],
  'فيديو وإنتاج':  ['كتابة السيناريو','تصوير','مونتاج','تصميم جرافيك','ترجمة','نشر ومشاركة'],
  'تصوير':         ['تصوير المنتجات','بورتريه','تصوير جوي','تعديل الصور','تسليم عالي الجودة','حقوق ملكية'],
  'محتوى & سوشيال':['استراتيجية المحتوى','كتابة نصوص','تصميم منشورات','إدارة حسابات','تقارير شهرية','إعلانات'],
  'استشارة':       ['تحليل الوضع الحالي','وضع الاستراتيجية','خطة تنفيذية','ورش عمل','متابعة شهرية','تقرير ختامي'],
  'برمجة خاصة':   ['تحليل المتطلبات','تصميم قاعدة البيانات','تطوير Backend','تطوير Frontend','اختبار','توثيق'],
  'ترجمة':         ['ترجمة بشرية','مراجعة لغوية','تدقيق إملائي','تعريب','ترجمة تقنية','ترجمة تسويقية'],
  'أخرى':          ['استشارة أولية','إعداد خطة العمل','تنفيذ المهام','مراجعة وتسليم','دعم ما بعد التسليم','أخرى'],
};

let selectedField = '';
let selectedSvcs  = [];

function selectField(btn, field) {
  document.querySelectorAll('.field-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedField = field;
  selectedSvcs  = [];

  const svcs = svcMap[field] || [];
  document.getElementById('svcGrid').innerHTML = svcs.map(s => `
    <div class="svc-btn" onclick="toggleSvc(this,'${s}')">${s}</div>
  `).join('');
  document.getElementById('svcSection').style.display = '';
  document.getElementById('costsSection').style.display = '';
  document.getElementById('basicResult').style.display = '';
  calcBasic();
  saveToolState('calc_basic');
}

function toggleSvc(btn, svc) {
  btn.classList.toggle('active');
  if (btn.classList.contains('active')) selectedSvcs.push(svc);
  else selectedSvcs = selectedSvcs.filter(s => s !== svc);
  calcBasic();
}

function calcBasic() {
  const labor  = parseFloat(document.getElementById('cLbr')?.value)    || 0;
  const tools  = parseFloat(document.getElementById('cTools')?.value)   || 0;
  const ops    = parseFloat(document.getElementById('cOps')?.value)     || 0;
  const profit = parseFloat(document.getElementById('cProfit')?.value)  || 30;
  const tax    = parseFloat(document.getElementById('cTax')?.value)     || 15;

  const cost     = labor + tools + ops;
  const profAmt  = cost * profit / 100;
  const taxAmt   = (cost + profAmt) * tax / 100;
  const total    = cost + profAmt + taxAmt;

  setText('rCost',   fmt(cost)    + ' ر.س');
  setText('rProfit', fmt(profAmt) + ' ر.س');
  setText('rTax',    fmt(taxAmt)  + ' ر.س');
  setText('rFinal',  fmt(total)   + ' ر.س');

  const el = document.getElementById('basicResult');
  if (el) el.setAttribute('data-amount', total.toFixed(2));
  saveToolState('calc_basic');
}

// Tool: Packages
function calcPkg() {
  const rent     = parseFloat(document.getElementById('pkg_rent')?.value)     || 0;
  const salaries = parseFloat(document.getElementById('pkg_salaries')?.value) || 0;
  const tech     = parseFloat(document.getElementById('pkg_tech')?.value)     || 0;
  const other    = parseFloat(document.getElementById('pkg_other')?.value)    || 0;
  const s1       = parseFloat(document.getElementById('pkg_s1')?.value)       || 1;
  const s2       = parseFloat(document.getElementById('pkg_s2')?.value)       || 1;
  const s3       = parseFloat(document.getElementById('pkg_s3')?.value)       || 1;
  const profit   = parseFloat(document.getElementById('pkg_profit')?.value)   || 40;
  const ratio    = parseFloat(document.getElementById('pkg_ratio')?.value)    || 2;

  const cost   = rent + salaries + tech + other;
  const target = cost * (1 + profit / 100);
  const denom  = s1 + s2 * ratio + s3 * ratio * ratio;
  const r1     = denom > 0 ? target / denom : 0;
  const r2     = r1 * ratio;
  const r3     = r2 * ratio;

  setText('pkg_rCost',   fmt(cost)   + ' ر.س');
  setText('pkg_rTarget', fmt(target) + ' ر.س');
  setText('pkg_r1',      fmt(r1)     + ' ر.س');
  setText('pkg_r2',      fmt(r2)     + ' ر.س');
  setText('pkg_r3',      fmt(r3)     + ' ر.س');

  const el = document.getElementById('pkgResult');
  if (el) el.setAttribute('data-amount', r1.toFixed(2));
  saveToolState('calc_pkg');
}

// Tool: Labor
function calcLabor() {
  const salary   = parseFloat(document.getElementById('lb_salary')?.value)   || 0;
  const hrs      = parseFloat(document.getElementById('lb_hrs')?.value)      || 8;
  const days     = parseFloat(document.getElementById('lb_days')?.value)     || 22;
  const overhead = parseFloat(document.getElementById('lb_overhead')?.value) || 30;
  const extra    = parseFloat(document.getElementById('lb_extra')?.value)    || 0;
  const profit   = parseFloat(document.getElementById('lb_profit')?.value)   || 30;

  const totalCost   = salary + extra;
  const billableHrs = hrs * days * (1 - overhead / 100);
  const costPerHr   = billableHrs > 0 ? totalCost / billableHrs : 0;
  const finalHr     = costPerHr * (1 + profit / 100);

  setText('lb_rCost',  fmt(totalCost)   + ' ر.س');
  setText('lb_rHrs',   fmt(billableHrs) + ' ساعة');
  setText('lb_rBase',  fmt(costPerHr)   + ' ر.س/ساعة');
  setText('lb_rFinal', fmt(finalHr)     + ' ر.س/ساعة');

  const el = document.getElementById('laborResult');
  if (el) el.setAttribute('data-amount', finalHr.toFixed(2));
  saveToolState('calc_labor');
}

// Tool: Store
function calcStore() {
  const hrs     = parseFloat(document.getElementById('st_hrs')?.value)     || 0;
  const rate    = parseFloat(document.getElementById('st_rate')?.value)    || 150;
  const hosting = parseFloat(document.getElementById('st_hosting')?.value) || 0;
  const plugins = parseFloat(document.getElementById('st_plugins')?.value) || 0;
  const prods   = parseFloat(document.getElementById('st_products')?.value)|| 0;
  const perProd = parseFloat(document.getElementById('st_perProd')?.value) || 10;
  const profit  = parseFloat(document.getElementById('st_profit')?.value)  || 30;
  const tax     = parseFloat(document.getElementById('st_tax')?.value)     || 15;

  const work    = hrs * rate;
  const setup   = hosting + plugins + prods * perProd;
  const cost    = work + setup;
  const profAmt = cost * profit / 100;
  const taxAmt  = (cost + profAmt) * tax / 100;
  const total   = cost + profAmt + taxAmt;

  setText('st_rWork',   fmt(work)    + ' ر.س');
  setText('st_rSetup',  fmt(setup)   + ' ر.س');
  setText('st_rCost',   fmt(cost)    + ' ر.س');
  setText('st_rProfit', fmt(profAmt) + ' ر.س');
  setText('st_rFinal',  fmt(total)   + ' ر.س');

  const el = document.getElementById('storeResult');
  if (el) el.setAttribute('data-amount', total.toFixed(2));
  saveToolState('calc_store');
}

// Tool: Office
function calcOffice() {
  const rent     = parseFloat(document.getElementById('of_rent')?.value)     || 0;
  const salaries = parseFloat(document.getElementById('of_salaries')?.value) || 0;
  const tools    = parseFloat(document.getElementById('of_tools')?.value)    || 0;
  const other    = parseFloat(document.getElementById('of_other')?.value)    || 0;
  const proj     = parseFloat(document.getElementById('of_proj')?.value)     || 1;
  const profit   = parseFloat(document.getElementById('of_profit')?.value)   || 35;

  const cost     = rent + salaries + tools + other;
  const perProj  = proj > 0 ? cost / proj : 0;
  const minPrice = perProj * (1 + profit / 100);

  setText('of_rCost',    fmt(cost)     + ' ر.س');
  setText('of_rPerProj', fmt(perProj)  + ' ر.س');
  setText('of_rMin',     fmt(minPrice) + ' ر.س');

  const el = document.getElementById('officeResult');
  if (el) el.setAttribute('data-amount', minPrice.toFixed(2));
  saveToolState('calc_office');
}

// Tool: Custom (free-form)
function addCustomItem(desc = '', qty = 1, price = 0) {
  const tbody = document.getElementById('custItemsBody');
  if (!tbody) return;
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="text"   value="${esc(desc)}"  placeholder="وصف البند..." oninput="calcCustom()" style="width:100%"></td>
    <td><input type="number" value="${qty}"   min="0.01" step="0.01" oninput="calcCustom()" style="text-align:center;width:100%"></td>
    <td><input type="number" value="${price}" min="0"    step="0.01" oninput="calcCustom()" style="width:100%"></td>
    <td class="cu-row-total" style="font-weight:700;padding:8px 10px;white-space:nowrap">${fmt(qty * price)}</td>
    <td style="width:32px"><button class="del-item" onclick="this.closest('tr').remove();calcCustom()">✕</button></td>
  `;
  tbody.appendChild(row);
  calcCustom();
}

function calcCustom() {
  let subtotal = 0;
  document.querySelectorAll('#custItemsBody tr').forEach(row => {
    const inputs = row.querySelectorAll('input');
    if (inputs.length < 3) return;
    const qty   = parseFloat(inputs[1].value) || 0;
    const price = parseFloat(inputs[2].value) || 0;
    const tot   = qty * price;
    subtotal += tot;
    const td = row.querySelector('.cu-row-total');
    if (td) td.textContent = fmt(tot) + ' ر.س';
  });
  const taxPct  = parseFloat(document.getElementById('cu_tax')?.value)      || 0;
  const discount= parseFloat(document.getElementById('cu_discount')?.value) || 0;
  const taxAmt  = (subtotal - discount) * taxPct / 100;
  const total   = subtotal - discount + taxAmt;

  setText('cu_rSub',    fmt(subtotal) + ' ر.س');
  setText('cu_rDis',    fmt(discount) + ' ر.س');
  setText('cu_rTax',    fmt(taxAmt)   + ' ر.س');
  setText('cu_rFinal',  fmt(total)    + ' ر.س');
  setText('cu_rTaxLbl', `ضريبة (${taxPct}%)`);

  const el = document.getElementById('customResult');
  if (el) el.setAttribute('data-amount', total.toFixed(2));
  saveToolState('calc_custom');
}

// ─── TOOL → QUOTE ────────────────────────
async function openToolQuote(slug, toolName) {
  const resultEl = document.getElementById(
    slug === 'basic'  ? 'basicResult'  :
    slug === 'pkg'    ? 'pkgResult'    :
    slug === 'labor'  ? 'laborResult'  :
    slug === 'store'  ? 'storeResult'  :
    slug === 'office' ? 'officeResult' : 'customResult'
  );
  const amount = parseFloat(resultEl?.getAttribute('data-amount') || '0');
  if (!amount) {
    alert('أدخل بيانات التسعير أولاً لظهور قيمة محسوبة.');
    return;
  }

  document.getElementById('tqmSlug').value   = slug;
  document.getElementById('tqmAmount').value = amount;
  document.getElementById('tqmTitle').textContent = `حفظ نتيجة ${toolName} كعرض سعر`;
  document.getElementById('tqmQuoteTitle').value  = toolName;
  document.getElementById('tqmNotes').value = '';
  document.getElementById('tqmMsg').className = 'hidden';

  // Load clients into the select
  await ensureClientsLoaded();
  const sel = document.getElementById('tqmClient');
  if (sel && clientsCache) {
    sel.innerHTML = '<option value="">اختر العميل...</option>' +
      clientsCache.map(c => `<option value="${c.id}">${esc(c.name)} ${esc(c.email)}</option>`).join('');
  }

  document.getElementById('toolQuoteModal').classList.remove('hidden');
}

async function saveToolQuote() {
  const slug     = document.getElementById('tqmSlug').value;
  const amount   = parseFloat(document.getElementById('tqmAmount').value) || 0;
  const title    = document.getElementById('tqmQuoteTitle').value.trim();
  const clientId = document.getElementById('tqmClient').value;
  const notes    = document.getElementById('tqmNotes').value.trim();
  const msgEl    = document.getElementById('tqmMsg');

  const showMsg = (txt, isErr) => {
    msgEl.className = `alert alert-${isErr ? 'danger' : 'success'}`;
    msgEl.textContent = txt;
  };

  if (!title) { showMsg('عنوان العرض مطلوب', true); return; }
  if (!clientId) { showMsg('يرجى اختيار العميل', true); return; }

  const toolLabel = {
    basic: 'التسعير الأساسي', pkg: 'باقات الاشتراك',
    labor: 'تكلفة الساعة',    store: 'المتجر الإلكتروني',
    office: 'تكلفة المكتب',   custom: 'تسعيرة مخصصة',
  };

  // For custom tool, use actual items; otherwise single summary item
  let items, taxRate = 0, discount = 0;
  if (slug === 'custom') {
    items = [];
    document.querySelectorAll('#custItemsBody tr').forEach(row => {
      const ins = row.querySelectorAll('input');
      if (ins.length < 3) return;
      const desc = ins[0].value.trim();
      const qty  = parseFloat(ins[1].value) || 0;
      const uprice = parseFloat(ins[2].value) || 0;
      if (desc) items.push({ description: desc, qty, unit_price: uprice });
    });
    taxRate  = parseFloat(document.getElementById('cu_tax')?.value) || 0;
    discount = parseFloat(document.getElementById('cu_discount')?.value) || 0;
  } else {
    items = [{ description: toolLabel[slug] || title, qty: 1, unit_price: amount }];
    taxRate = 0; // amount already includes tax
  }

  if (!items.length) { showMsg('لا توجد بنود في التسعيرة', true); return; }

  const r = await api('quotes', {
    action: 'create', title, client_id: clientId,
    items, tax_rate: taxRate, discount, notes,
  });

  if (r.success) {
    showMsg('✅ تم حفظ العرض كمسودة بنجاح', false);
    setTimeout(() => {
      document.getElementById('toolQuoteModal').classList.add('hidden');
      // Switch to quotes panel
      nav(document.querySelector('[data-panel="quotes"]'));
    }, 1500);
  } else {
    showMsg(r.error || 'حدث خطأ', true);
  }
}

// ─── ADMIN: USERS ────────────────────────
async function loadUsers() {
  const role   = (document.getElementById('uRoleFilter') || {}).value || '';
  const plan   = (document.getElementById('uPlanFilter') || {}).value || '';
  const search = (document.getElementById('uSearch')     || {}).value || '';
  const r = await api(`admin?action=users&role=${role}&plan=${plan}&q=${encodeURIComponent(search)}`);
  const tb = document.getElementById('usersTbody');
  if (!tb) return;
  if (!r.success) { tb.innerHTML = `<tr><td colspan="7">${r.error}</td></tr>`; return; }
  const users = r.data;
  if (!users.length) {
    tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--muted)">لا يوجد مستخدمون</td></tr>';
    return;
  }
  tb.innerHTML = users.map(u => `
    <tr>
      <td>${esc(u.name)}</td>
      <td style="direction:ltr;text-align:right;font-size:12px">${esc(u.email)}</td>
      <td><span class="badge badge-${u.role}">${roleLabel(u.role)}</span></td>
      <td><span class="badge badge-${u.plan}">${planLabel(u.plan)}</span></td>
      <td>
        <span class="badge" style="${u.is_active ? 'background:rgba(92,186,150,.12);color:#2a8a60' : 'background:rgba(216,107,114,.1);color:var(--danger)'}">
          ${u.is_active ? 'فعّال' : 'معطّل'}
        </span>
      </td>
      <td style="font-size:11px;color:var(--muted)">${(u.created_at||'').slice(0,10)}</td>
      <td>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" onclick="editUser(${JSON.stringify(u).replace(/"/g,'&quot;')})">تعديل</button>
          <button class="btn btn-ghost btn-sm" onclick="toggleUser(${u.id})">${u.is_active ? 'تعطيل' : 'تفعيل'}</button>
          <button class="btn btn-primary btn-sm" data-uid="${u.id}" data-uname="${esc(u.name)}" data-uplan="${esc(u.plan)}" onclick="openPlanModal(+this.dataset.uid,this.dataset.uname,this.dataset.uplan)">الخطة</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openUserModal() {
  document.getElementById('umId').value = '';
  document.getElementById('userModalTitle').textContent = 'مستخدم جديد';
  ['umName','umEmail','umPass'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('umRole').value = 'client';
  document.getElementById('umPlan').value = 'free';
  document.getElementById('umMsg').className = 'hidden';
  document.getElementById('userModal').classList.remove('hidden');
}

function editUser(u) {
  document.getElementById('umId').value   = u.id;
  document.getElementById('userModalTitle').textContent = 'تعديل المستخدم';
  document.getElementById('umName').value = u.name;
  document.getElementById('umEmail').value= u.email;
  document.getElementById('umPass').value = '';
  document.getElementById('umRole').value = u.role;
  document.getElementById('umPlan').value = u.plan;
  document.getElementById('umMsg').className = 'hidden';
  document.getElementById('userModal').classList.remove('hidden');
}

function closeUserModal() {
  document.getElementById('userModal').classList.add('hidden');
}

async function saveUser() {
  const id   = document.getElementById('umId').value;
  const name = document.getElementById('umName').value.trim();
  const email= document.getElementById('umEmail').value.trim();
  const pass = document.getElementById('umPass').value;
  const role = document.getElementById('umRole').value;
  const plan = document.getElementById('umPlan').value;

  let r;
  if (id) {
    r = await api('admin', { action: 'user_update', id: parseInt(id), name, role, password: pass || undefined });
    if (r.success) {
      await api('admin', { action: 'set_plan', id: parseInt(id), plan });
    }
  } else {
    r = await api('admin', { action: 'user_create', name, email, role, plan, password: pass || 'Demo@2025' });
  }
  if (r.success) {
    showInModal('umMsg', r.message || 'تم الحفظ', false);
    setTimeout(() => { closeUserModal(); loadUsers(); }, 1200);
  } else {
    showInModal('umMsg', r.error, true);
  }
}

async function toggleUser(id) {
  const r = await api('admin', { action: 'user_toggle', id });
  if (r.success) loadUsers();
  else alert(r.error);
}

function openPlanModal(id, name, currentPlan) {
  document.getElementById('pmUserId').value = id;
  document.getElementById('pmUserName').textContent = name;
  document.getElementById('pmPlan').value = currentPlan;
  document.getElementById('pmExpires').value = '';
  document.getElementById('pmMsg').className = 'hidden';
  document.getElementById('planModal').classList.remove('hidden');
}

async function savePlan() {
  const id      = parseInt(document.getElementById('pmUserId').value);
  const plan    = document.getElementById('pmPlan').value;
  const expires = document.getElementById('pmExpires').value || null;
  const r = await api('admin', { action: 'set_plan', id, plan, expires_at: expires });
  if (r.success) {
    showInModal('pmMsg', 'تم تغيير الخطة', false);
    setTimeout(() => {
      document.getElementById('planModal').classList.add('hidden');
      loadUsers();
      loadSubscriptions();
    }, 1000);
  } else {
    showInModal('pmMsg', r.error, true);
  }
}

// ─── ADMIN: SUBSCRIPTIONS ────────────────
async function loadSubscriptions() {
  const r = await api('admin?action=stats');
  if (r.success) {
    setText('planCount_free',       r.data.plan_free);
    setText('planCount_pro',        r.data.plan_pro);
    setText('planCount_enterprise', r.data.plan_enterprise);
  }

  const r2 = await api('admin?action=users');
  const tb = document.getElementById('subsTbody');
  if (!tb || !r2.success) return;
  tb.innerHTML = r2.data.map(u => `
    <tr>
      <td>${esc(u.name)}</td>
      <td style="direction:ltr;text-align:right;font-size:12px">${esc(u.email)}</td>
      <td><span class="badge badge-${u.role}">${roleLabel(u.role)}</span></td>
      <td><span class="badge badge-${u.plan}">${planLabel(u.plan)}</span></td>
      <td style="font-size:12px;color:var(--muted)">${u.plan_expires_at || ''}</td>
      <td>
        <select class="form-control" style="width:110px" onchange="quickPlan(${u.id},this.value)">
          <option value="free"       ${u.plan==='free'       ?'selected':''}>مجاني</option>
          <option value="pro"        ${u.plan==='pro'        ?'selected':''}>محترف</option>
          <option value="enterprise" ${u.plan==='enterprise' ?'selected':''}>مؤسسة</option>
        </select>
      </td>
    </tr>
  `).join('');
}

async function quickPlan(id, plan) {
  await api('admin', { action: 'set_plan', id, plan });
  loadSubscriptions();
}

// ─── ADMIN: ACTIVITY ─────────────────────
async function loadActivity() {
  const r  = await api('admin?action=activity_log&limit=50');
  const tb = document.getElementById('activityTbody');
  if (!tb || !r.success) return;
  const actionLabels = {
    login:'تسجيل دخول', logout:'تسجيل خروج', register:'تسجيل جديد',
    quote_created:'إنشاء عرض', quote_status_changed:'تغيير حالة عرض',
    message_sent:'رسالة مُرسلة',
    admin_user_create:'إنشاء مستخدم', admin_user_update:'تعديل مستخدم',
    user_activated:'تفعيل مستخدم', user_deactivated:'تعطيل مستخدم',
    plan_changed:'تغيير خطة', system_init:'تهيئة النظام',
  };
  tb.innerHTML = r.data.map(l => `
    <tr>
      <td>${esc(l.user_name || 'النظام')}</td>
      <td>${l.user_role ? `<span class="badge badge-${l.user_role}">${roleLabel(l.user_role)}</span>` : ''}</td>
      <td>${actionLabels[l.action] || l.action}</td>
      <td style="font-size:12px;color:var(--muted)">${esc(l.details || '')}</td>
      <td style="font-size:11px;direction:ltr">${esc(l.ip || '')}</td>
      <td style="font-size:11px;color:var(--muted)">${(l.created_at||'').slice(0,16).replace('T',' ')}</td>
    </tr>
  `).join('');
}

// ─── ADMIN: CONTACT INBOX ────────────────
async function loadContactInbox() {
  const r = await api('admin?action=contact_messages');
  const tb = document.getElementById('contactInboxTbody');
  const badge = document.getElementById('contactBadge');
  if (!tb || !r.success) return;
  const msgs = r.data;
  const unread = msgs.filter(m => !m.is_read).length;
  if (badge) { badge.textContent = unread; badge.classList.toggle('hidden', unread === 0); }
  if (!msgs.length) { tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:32px">لا توجد رسائل بعد</td></tr>'; return; }
  tb.innerHTML = msgs.map(m => `
    <tr style="${m.is_read ? '' : 'background:var(--surface);font-weight:600'}">
      <td>${esc(m.name)}</td>
      <td style="direction:ltr;font-size:12px">${esc(m.email)}</td>
      <td style="max-width:260px;white-space:pre-wrap;font-size:13px">${esc(m.message)}</td>
      <td style="font-size:11px;color:var(--muted)">${(m.created_at||'').slice(0,16).replace('T',' ')}</td>
      <td>
        <div class="actions">
          ${!m.is_read ? `<button class="btn btn-ghost btn-sm" onclick="markContactRead(${m.id})">قُرئت</button>` : '<span style="font-size:11px;color:var(--muted)">✓</span>'}
          <button class="btn btn-ghost btn-sm" style="color:var(--red,#e53e3e)" onclick="deleteContact(${m.id})">حذف</button>
        </div>
      </td>
    </tr>`).join('');
}
async function markContactRead(id) {
  const r = await api('admin', { action: 'contact_mark_read', id });
  if (r.success) loadContactInbox();
}
async function deleteContact(id) {
  if (!confirm('تأكيد حذف الرسالة؟')) return;
  const r = await api('admin', { action: 'contact_delete', id });
  if (r.success) loadContactInbox();
}

// ─── ADMIN: SETTINGS ─────────────────────
async function loadSettings() {
  const r = await api('admin?action=get_settings');
  if (!r.success) return;
  const s = r.data;
  const f = id => document.getElementById(id);
  if (f('setContactEmail'))   f('setContactEmail').value   = s.contact_email   || '';
  if (f('setWhatsapp'))       f('setWhatsapp').value       = s.whatsapp        || '';
  if (f('setSiteName'))       f('setSiteName').value       = s.site_name       || 'تسعيرة';
  if (f('setWelcomeMsg'))     f('setWelcomeMsg').value     = s.welcome_message || '';
}
async function saveSettings() {
  const val = id => (document.getElementById(id)||{}).value || '';
  const payload = {
    action: 'save_settings',
    contact_email:   val('setContactEmail'),
    whatsapp:        val('setWhatsapp'),
    site_name:       val('setSiteName'),
    welcome_message: val('setWelcomeMsg'),
  };
  const r = await api('admin', payload);
  const msg = document.getElementById('settingsMsg');
  if (!msg) return;
  msg.className = r.success ? 'alert alert-success' : 'alert alert-danger';
  msg.textContent = r.success ? 'تم حفظ الإعدادات بنجاح ✓' : (r.error || 'فشل الحفظ');
  setTimeout(() => { msg.className = 'hidden'; }, 3000);
}

// ─── ACCOUNT ─────────────────────────────
async function saveAccount() {
  const name = document.getElementById('accName').value.trim();
  const pass  = document.getElementById('accPass')?.value || '';
  const msg   = document.getElementById('accMsg');
  if (!name) { msg.className='alert alert-danger mb-8'; msg.textContent='الاسم مطلوب'; return; }

  const payload = { action: 'update_account', name };
  if (pass) payload.password = pass;

  const r = await api('auth', payload);
  if (r && r.success) {
    msg.className = 'alert alert-success mb-8';
    msg.textContent = 'تم حفظ التغييرات بنجاح';
  } else {
    msg.className = 'alert alert-danger mb-8';
    msg.textContent = (r && r.error) ? r.error : 'تعذّر الحفظ في الوقت الحالي';
  }
  setTimeout(() => msg.className = 'hidden', 2500);
}

// ─── HELPERS ─────────────────────────────
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmt(n) {
  const num = parseFloat(n) || 0;
  return num.toLocaleString('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}
function statusLabel(s) {
  return { draft:'مسودة', sent:'مُرسل', accepted:'مقبول', rejected:'مرفوض', cancelled:'ملغي' }[s] || s;
}
function roleLabel(r) {
  return { admin:'مدير', employee:'موظف', client:'عميل' }[r] || r;
}
function planLabel(p) {
  return { free:'مجاني', pro:'محترف', enterprise:'مؤسسة' }[p] || p;
}
function showInModal(id, msg, isErr) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `alert alert-${isErr ? 'danger' : 'success'}`;
  el.textContent = msg;
}

// ─── SPLASH SCREEN ───────────────────────
(function initSplash() {
  const splash   = document.getElementById('splash-screen');
  if (!splash) return;
  const icon     = document.getElementById('splashIcon');
  const spinner  = document.getElementById('splashSpinner');
  const brand    = document.getElementById('splashBrand');

  // Phase 2 at 1.4s — clear blur, show brand text
  setTimeout(() => {
    if (icon)    icon.classList.add('clear');
    if (spinner) spinner.classList.add('done');
    if (brand)   brand.classList.add('show');
  }, 1400);

  // Phase 3 at 2.8s — fade out
  setTimeout(() => {
    splash.classList.add('fade-out');
    setTimeout(() => { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 650);
  }, 2800);
})();

// ─── INIT ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadUnreadCount();
  setInterval(loadUnreadCount, 60000);
});
