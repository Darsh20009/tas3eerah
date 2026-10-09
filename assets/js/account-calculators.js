'use strict';

(() => {
  const sectors = [
    { slug: 'services', code: 'calc_basic', label: 'الخدمات' },
    { slug: 'packages', code: 'calc_pkg', label: 'الباقات' },
    { slug: 'menu', code: 'calc_menu', label: 'القائمة' },
    { slug: 'retail', code: 'calc_store', label: 'التجزئة' },
    { slug: 'tech', code: 'calc_labor', label: 'التقنية' },
    { slug: 'saas', code: 'calc_custom', label: 'الاشتراكات' },
    { slug: 'design', code: 'calc_office', label: 'التصميم' }
  ];
  const labels = Object.fromEntries(sectors.map(item => [item.slug, item.label]));
  let accessInfo = null;
  let selected = new Set();
  let ledgerRequest = 0;
  let ledgerRecords = [];
  const accessPanel = () => document.getElementById('calculatorAccessPanel');
  const role = () => accessPanel()?.dataset.role || '';
  const plan = () => accessPanel()?.dataset.plan || '';
  const isAdmin = () => accessPanel()?.dataset.admin === 'true';
  const isOpenAccess = () => accessPanel()?.dataset.open === 'true';
  const isNoSelectionPlan = () => isAdmin() || isOpenAccess() || role() === 'admin' || plan() === 'free';

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const arNumber = value => Number(value || 0).toLocaleString('ar-SA');
  const setStatus = (id, text, error = false) => {
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = text;
    node.style.color = error ? 'var(--danger)' : 'var(--muted)';
  };
  const responseError = result => result?.error || result?.message || 'تعذر إكمال الطلب. حاول مرة أخرى.';

  function updateSelectionCount() {
    const limit = Number(accessInfo?.tool_limit) || 0;
    const count = document.getElementById('calculatorSelectionCount');
    if (count) count.textContent = `${selected.size} / ${limit}`;
    const choices = document.getElementById('calculatorToolChoices');
    if (choices) {
      choices.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.checked = selected.has(input.value);
        input.disabled = !input.checked && selected.size >= limit;
      });
    }
  }

  function applyToolPermissions() {
    if (isNoSelectionPlan()) return;
    const allToolsAvailable = Number(accessInfo?.tool_limit) === -1;
    const enabled = slug => allToolsAvailable || selected.has(slug);
    document.querySelectorAll('.quick-tool[data-tool], .sector-card[data-tool], .quote-tool-link[data-tool]').forEach(node => {
      const slug = node.dataset.tool;
      const allowed = enabled(slug);
      node.classList.toggle('is-locked', !allowed);
      node.classList.toggle('locked', !allowed);
      if (node.matches('.quick-tool')) {
        node.onclick = () => allowed ? window.navToQuickTool(slug) : window.showPlanUpgrade();
        let lock = node.querySelector('.quick-tool-lock');
        if (!allowed && !lock) {
          lock = document.createElement('span');
          lock.className = 'quick-tool-lock';
          lock.setAttribute('aria-label', 'مقفل بالخطة');
          node.append(lock);
        }
        if (allowed && lock) lock.remove();
      } else if (node.matches('.sector-card')) {
        node.onclick = () => allowed ? window.openTool(slug === 'services' ? 'calc_basic' :
          sectors.find(item => item.slug === slug)?.code) : window.showPlanUpgrade();
        const lock = node.querySelector('.tool-lock');
        if (lock) lock.classList.toggle('hidden', allowed);
        const action = node.querySelector('.sector-action');
        if (action) action.firstChild.textContent = allowed ? 'فتح الحاسبة الكاملة' : 'ترقية الخطة';
        const tag = node.querySelector('.tool-tag');
        if (tag) tag.textContent = allowed
          ? node.dataset.sectors || tag.dataset.original || tag.textContent
          : 'مقفل في باقتك';
      } else {
        node.onclick = () => allowed
          ? window.closeQuoteAndOpenTool(slug)
          : window.showPlanUpgrade();
      }
    });
  }

  function renderToolChoices() {
    const panel = document.getElementById('calculatorAccessPanel');
    const choices = document.getElementById('calculatorToolChoices');
    if (!panel || !choices || !accessInfo) return;
    const limit = Number(accessInfo.tool_limit);
    const needsChoice = !isNoSelectionPlan() && Number.isFinite(limit) && limit > 0;
    panel.hidden = !needsChoice;
    if (needsChoice) {
      const available = Array.isArray(accessInfo.tools) ? accessInfo.tools : [];
      choices.innerHTML = available.map(tool => {
        const slug = escapeHtml(tool.slug);
        const title = escapeHtml(tool.title);
        return `<label style="display:flex;align-items:center;gap:8px;padding:9px 11px;border:1px solid var(--line);border-radius:var(--r);background:var(--card);font-size:13px">
          <input type="checkbox" value="${slug}" aria-label="${title}" style="accent-color:var(--p)">
          <span>${title}</span>
        </label>`;
      }).join('');
      choices.querySelectorAll('input').forEach(input => input.addEventListener('change', () => {
        if (input.checked) selected.add(input.value);
        else selected.delete(input.value);
        updateSelectionCount();
      }));
    }
    const summary = document.getElementById('calculatorQuotaSummary');
    if (summary) {
      const historyLimit = accessInfo.history_limit === -1 ? 'غير محدود' : arNumber(accessInfo.history_limit);
      const pdfLimit = accessInfo.pdf_limit === -1 ? 'غير محدود' : arNumber(accessInfo.pdf_limit);
      summary.textContent = `السجل: ${historyLimit} نتيجة محفوظة · PDF هذا الشهر: ${arNumber(accessInfo.pdf_used)} / ${pdfLimit}`;
    }
    updateSelectionCount();
  }

  async function loadCalculatorAccess() {
    setStatus('calculatorAccessStatus', 'جارٍ تحميل صلاحيات الأدوات...');
    const result = await window.api('calculators?action=access');
    if (!result?.success || !result.data) {
      setStatus('calculatorAccessStatus', responseError(result), true);
      return;
    }
    accessInfo = result.data;
    selected = new Set(Array.isArray(accessInfo.selected_tools) ? accessInfo.selected_tools : []);
    renderToolChoices();
    const historyLimit = accessInfo.history_limit === -1 ? 'غير محدود' : arNumber(accessInfo.history_limit);
    const pdfLimit = accessInfo.pdf_limit === -1 ? 'غير محدود' : arNumber(accessInfo.pdf_limit);
    const quota = document.getElementById('calculatorHistoryQuota');
    if (quota) quota.textContent = `السجل: ${historyLimit} نتيجة محفوظة · PDF هذا الشهر: ${arNumber(accessInfo.pdf_used)} / ${pdfLimit}`;
    applyToolPermissions();
    setStatus('calculatorAccessStatus', 'تم تحميل أدوات خطتك وحدود الاستخدام.');
  }

  async function saveCalculatorSelection() {
    if (!accessInfo) return;
    const button = document.getElementById('calculatorSelectionSave');
    const limit = Number(accessInfo.tool_limit) || 0;
    if (selected.size > limit) {
      setStatus('calculatorAccessStatus', `اختر ${arNumber(limit)} أدوات كحد أقصى.`, true);
      return;
    }
    if (button) button.disabled = true;
    setStatus('calculatorAccessStatus', 'جارٍ حفظ اختيارك...');
    const result = await window.api('calculators', { action: 'select_tools', tools: [...selected] });
    if (button) button.disabled = false;
    if (!result?.success) {
      setStatus('calculatorAccessStatus', responseError(result), true);
      return;
    }
    setStatus('calculatorAccessStatus', 'تم حفظ اختيار الأدوات.');
    applyToolPermissions();
    if (button) button.disabled = true;
    window.setTimeout(() => window.location.reload(), 500);
  }

  function renderLedgerRows(records) {
    const list = document.getElementById('projectLedgerList');
    const empty = document.getElementById('projectLedgerEmpty');
    if (!list || !empty) return;
    if (!records.length) {
      list.innerHTML = '';
      const searching = Boolean(document.getElementById('projectLedgerSearch')?.value.trim());
      const heading = empty.querySelector('h3');
      const detail = empty.querySelector('p');
      if (heading) heading.textContent = searching ? 'لا توجد نتائج مطابقة' : 'لا توجد مشاريع محفوظة بعد';
      if (detail) detail.textContent = searching
        ? 'جرّب كلمة بحث مختلفة أو غيّر القطاع.'
        : 'احسب نتيجة من إحدى الحاسبات ثم احفظها لتظهر هنا.';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    list.innerHTML = records.map(record => {
      const title = escapeHtml(record.title || 'نتيجة محفوظة');
      const tool = escapeHtml(labels[record.tool] || record.tool || 'أداة تسعير');
      const date = escapeHtml(record.created_at || '—');
      const price = escapeHtml(arNumber(record.price));
      const currency = escapeHtml(record.currency_code || '');
      const id = escapeHtml(record.id);
      const slug = escapeHtml(record.tool);
      return `<article class="card project-ledger-item">
        <div class="project-ledger-item-head">
          <div><h3>${title}</h3><p>${tool} · ${date}</p></div>
          <strong>${price} ${currency}</strong>
        </div>
        <div class="flex gap-8" style="margin-top:12px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" type="button" data-restore-id="${id}" data-tool="${slug}">استعادة النتيجة</button>
          <button class="btn btn-danger btn-sm" type="button" data-delete-id="${id}">حذف</button>
        </div>
      </article>`;
    }).join('');
    list.querySelectorAll('[data-restore-id]').forEach(button => button.addEventListener('click', restoreCalculation));
    list.querySelectorAll('[data-delete-id]').forEach(button => button.addEventListener('click', deleteCalculation));
  }

  function setLedgerSummary(records) {
    const sums = new Map();
    records.forEach(record => {
      const currency = String(record.currency_code || '');
      sums.set(currency, (sums.get(currency) || 0) + Number(record.price || 0));
    });
    const revenue = [...sums.entries()].map(([currency, amount]) =>
      `${arNumber(amount)} ${escapeHtml(currency)}`).join(' · ') || '0';
    const count = document.getElementById('projectLedgerCount');
    const total = document.getElementById('projectLedgerRevenue');
    const latest = document.getElementById('projectLedgerLatest');
    if (count) count.textContent = arNumber(records.length);
    if (total) total.innerHTML = revenue;
    if (latest) latest.textContent = records[0]?.created_at || '—';
    const badge = document.getElementById('projectLogBadge');
    if (badge) {
      badge.textContent = arNumber(records.length);
      badge.classList.toggle('hidden', records.length === 0);
    }
  }

  function filterProjectLedger() {
    const input = document.getElementById('projectLedgerSearch');
    const query = String(input?.value || '').trim().toLocaleLowerCase('ar');
    const matches = query
      ? ledgerRecords.filter(record => [
        record.title, labels[record.tool] || record.tool, record.created_at,
        record.currency_code, record.price,
      ].some(value => String(value ?? '').toLocaleLowerCase('ar').includes(query)))
      : ledgerRecords;
    setLedgerSummary(matches);
    renderLedgerRows(matches);
    const status = document.getElementById('projectLedgerStatus');
    if (status) {
      status.style.color = 'var(--muted)';
      status.textContent = query
        ? `${arNumber(matches.length)} من ${arNumber(ledgerRecords.length)} نتيجة محفوظة تطابق البحث`
        : ledgerRecords.length ? `${arNumber(ledgerRecords.length)} نتيجة محفوظة` : 'لا توجد نتائج محفوظة لهذا القطاع.';
    }
  }

  async function loadProjectLedger() {
    const sectorSelect = document.getElementById('projectLedgerFilter');
    if (sectorSelect && !sectorSelect.dataset.initialized) {
      const sector = new URLSearchParams(location.search).get('sector');
      if (sectors.some(item => item.slug === sector)) sectorSelect.value = sector;
      sectorSelect.dataset.initialized = 'true';
    }
    const list = document.getElementById('projectLedgerList');
    const empty = document.getElementById('projectLedgerEmpty');
    if (!list || !empty) return;
    const requestId = ++ledgerRequest;
    const filter = document.getElementById('projectLedgerFilter')?.value || '';
    const status = document.getElementById('projectLedgerStatus');
    if (status) status.textContent = 'جارٍ تحميل السجل...';
    list.innerHTML = '<div class="card" role="status" style="color:var(--muted);padding:18px">جارٍ تحميل النتائج المحفوظة...</div>';
    empty.classList.add('hidden');
    const query = filter ? `calculators?action=list&tool=${encodeURIComponent(filter)}` : 'calculators?action=list';
    const result = await window.api(query);
    if (requestId !== ledgerRequest) return;
    if (!result?.success || !Array.isArray(result.data)) {
      ledgerRecords = [];
      list.innerHTML = '';
      empty.classList.add('hidden');
      setLedgerSummary([]);
      if (status) {
        status.textContent = responseError(result);
        status.style.color = 'var(--danger)';
      }
      return;
    }
    ledgerRecords = result.data;
    filterProjectLedger();
  }

  async function restoreCalculation(event) {
    const button = event.currentTarget;
    const id = button.dataset.restoreId;
    button.disabled = true;
    const result = await window.api('calculators', { action: 'restore', id });
    button.disabled = false;
    const tool = result?.data?.tool;
    if (!result?.success || !sectors.some(item => item.slug === tool)) {
      setStatus('projectLedgerStatus', responseError(result), true);
      return;
    }
    window.location.href = `/calculator/${encodeURIComponent(tool)}`;
  }

  async function deleteCalculation(event) {
    const button = event.currentTarget;
    if (!window.confirm('هل تريد حذف هذه النتيجة من سجل حسابك؟')) return;
    button.disabled = true;
    const result = await window.api('calculators', { action: 'delete', id: button.dataset.deleteId });
    if (!result?.success) {
      button.disabled = false;
      setStatus('projectLedgerStatus', responseError(result), true);
      return;
    }
    await loadProjectLedger();
  }

  window.loadProjectLedger = loadProjectLedger;
  window.filterProjectLedger = filterProjectLedger;
  window.saveCalculatorSelection = saveCalculatorSelection;
  document.addEventListener('DOMContentLoaded', () => {
    loadCalculatorAccess();
    const requestedPanel = new URLSearchParams(window.location.search).get('panel');
    if ((requestedPanel === 'project-log' || requestedPanel === 'tools') &&
        typeof window.navDirect === 'function') {
      window.navDirect(requestedPanel);
    }
  });
})();
