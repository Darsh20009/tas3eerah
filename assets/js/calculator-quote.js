'use strict';

(function () {
  const context = window.CALCULATOR_CONTEXT;
  if (!context) return;

  const overlay = document.getElementById('calculatorQuoteOverlay');
  const form = document.getElementById('calculatorQuoteForm');
  const resultSelect = document.getElementById('calculatorQuoteResult');
  const titleInput = document.getElementById('calculatorQuoteName');
  const message = document.getElementById('calculatorQuoteMessage');
  const saveButton = document.getElementById('calculatorQuoteSave');
  const clientSelect = document.getElementById('calculatorQuoteClient');
  let results = [];

  function validResult(title, price) {
    const amount = Number(price);
    const label = String(title || '').trim();
    return label && !['—', 'undefined', 'null'].includes(label.toLowerCase()) &&
      Number.isFinite(amount) && amount > 0
      ? { title: label, price: amount }
      : null;
  }

  function rowResults(prefix, namePrefix, calculator) {
    const rows = document.querySelectorAll(`#${prefix}-rows > tr[id^="${prefix}-row-"]`);
    return [...rows].map(row => {
      const index = row.id.replace(`${prefix}-row-`, '');
      calculator(index);
      let detail;
      try { detail = JSON.parse(row.dataset.detail || 'null'); } catch { detail = null; }
      return validResult(document.getElementById(`${namePrefix}-${index}`)?.value, detail?.suggested);
    }).filter(Boolean);
  }

  function currentResults() {
    switch (context.slug) {
      case 'services':
        calc();
        return document.querySelector('#res-wrap.show')
          ? [validResult(svcLast?.title, svcLast?.price)].filter(Boolean) : [];
      case 'packages':
        classicCalcPkg();
        return (Array.isArray(pkgLast) ? pkgLast : [])
          .map(item => validResult(item.name, item.suggested)).filter(Boolean);
      case 'menu':
        return rowResults('menu', 'mname', calcMenuRow);
      case 'retail':
        return rowResults('ret', 'rname', calcRetailRow);
      case 'tech':
        calcTech();
        return [validResult(techLast?.type, techLast?.price)].filter(Boolean);
      case 'saas':
        calcSaas();
        return [validResult(saasLast?.type, saasLast?.price)].filter(Boolean);
      case 'design':
        calcDesign();
        return [validResult(
          dsLast?.type && dsLast?.scope ? `${dsLast.type} — ${dsLast.scope}` : '',
          dsLast?.price,
        )].filter(Boolean);
      default:
        return [];
    }
  }

  function notice(text, error = false) {
    message.textContent = text;
    message.classList.toggle('is-error', error);
  }

  function updateTitle() {
    const result = results[Number(resultSelect.value)];
    if (result) titleInput.value = result.title;
  }

  async function loadClients() {
    if (!clientSelect) return;
    const response = await fetch('/api/quotes?action=clients', { credentials: 'same-origin' });
    const payload = await response.json();
    if (!response.ok || !payload.success || !Array.isArray(payload.data)) {
      throw new Error(payload.error || 'تعذر تحميل قائمة العملاء');
    }
    clientSelect.replaceChildren(new Option('اختر العميل', ''));
    for (const client of payload.data) {
      clientSelect.add(new Option(`${client.name} (${client.email})`, String(client.id)));
    }
    if (payload.data.length === 0) notice('لا يوجد عميل متاح. أضف عميلاً قبل حفظ العرض.', true);
  }

  document.getElementById('calculatorQuoteOpen').addEventListener('click', async () => {
    try {
      results = currentResults();
      if (!results.length) {
        window.alert('أكمل بيانات الحاسبة أولاً حتى تظهر نتيجة صالحة للحفظ.');
        return;
      }
      resultSelect.replaceChildren();
      results.forEach((result, index) => resultSelect.add(
        new Option(`${result.title} — ${result.price.toLocaleString('ar-SA', { maximumFractionDigits: 2 })} ر.س`, String(index))
      ));
      updateTitle();
      notice('');
      overlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      await loadClients();
      titleInput.focus();
    } catch (error) {
      if (!overlay.classList.contains('hidden')) notice(error.message || 'تعذر قراءة نتيجة التسعير', true);
      else window.alert(error.message || 'تعذر قراءة نتيجة التسعير');
    }
  });

  resultSelect.addEventListener('change', updateTitle);
  function close() {
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
    notice('');
  }
  document.getElementById('calculatorQuoteClose').addEventListener('click', close);
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !overlay.classList.contains('hidden')) close();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const selected = results[Number(resultSelect.value)];
    if (!selected || !titleInput.value.trim()) return notice('اختر نتيجة وأدخل عنواناً للعرض.', true);
    if (clientSelect && !clientSelect.value) return notice('اختر العميل أولاً.', true);
    if (saveButton.disabled) return;
    saveButton.disabled = true;
    notice('جارٍ حفظ العرض...');
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.content || '';
      const response = await fetch('/api/quotes?action=create', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body: JSON.stringify({
          title: titleInput.value.trim(),
          client_id: clientSelect?.value,
          notes: document.getElementById('calculatorQuoteNotes').value.trim(),
          items: [{ description: selected.title, qty: 1, unit_price: selected.price }],
          tax_rate: 0,
          discount: 0,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'تعذر حفظ العرض');
      notice(payload.data?.email_sent === false
        ? (payload.message || 'تم حفظ العرض، لكن تعذر إرسال تأكيد البريد.')
        : `تم حفظ العرض رقم ${payload.data?.number || ''} كمسودة. يمكنك مراجعته من لوحة التحكم.`,
        payload.data?.email_sent === false);
      saveButton.textContent = 'حُفظ العرض';
      form.reset();
    } catch (error) {
      notice(error.message || 'تعذر حفظ العرض', true);
    } finally {
      saveButton.disabled = false;
      setTimeout(() => { saveButton.textContent = 'حفظ العرض'; }, 1800);
    }
  });
})();