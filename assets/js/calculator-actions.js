'use strict';

(() => {
  const context = window.CALCULATOR_CONTEXT;
  const root = document.querySelector('#integrated-tools .tool-screen');
  const dialog = document.getElementById('calculator-share-dialog');
  if (!context || !root || !dialog) return;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const api = (...args) => window.CalculatorCloud.request(...args);
  const submit = document.getElementById('share-submit-btn');
  const status = document.createElement('p');
  status.id = 'calculator-share-status';
  status.setAttribute('role', 'status');
  submit.after(status);
  let returnFocus, shareRequest = 0;
  async function loadShares() {
    const requestId = ++shareRequest;
    const result = await api('shares', null, true);
    if (requestId !== shareRequest) return;
    document.getElementById('share-points-display').textContent = result.points;
    [5, 10, 25].forEach((limit, index) => {
      document.getElementById('badge-' + (index + 1)).style.opacity = result.points >= limit ? '1' : '.4';
    });
    document.getElementById('share-history').innerHTML = result.entries.length
      ? result.entries.map(entry => `<article class="card" style="padding:12px;margin-bottom:8px">
          <strong>${escape(entry.product)}</strong>
          <p>${escape(entry.price)} ${escape(entry.currency_code)} · ${escape(entry.unit)}</p>
          <small>${escape(entry.sector)} · ${escape(entry.city)} · ${escape(entry.created_at)}</small>
        </article>`).join('')
      : '<p>لا توجد مشاركات محفوظة في حسابك بعد.</p>';
  }
  window.closeCalculatorShare = () => dialog.close();
  dialog.addEventListener('close', () => returnFocus?.focus());
  window.classicOpenTool = tool => {
    if (tool !== 'share') {
      const slug = tool === 'ds' ? 'design' : tool;
      if (slug === context.slug) return window.scrollTo(0, 0);
      if (['services', 'packages', 'menu', 'retail', 'tech', 'saas', 'design'].includes(slug)) {
        location.href = '/calculator/' + slug;
      }
      return;
    }
    returnFocus = document.activeElement;
    status.textContent = 'جارٍ تحميل مشاركات حسابك…';
    const results = window.CalculatorReadResults?.() || [];
    const choice = Number(document.getElementById('cloudResultChoice')?.value || 0);
    const result = results[choice] || results[0];
    if (result) {
      document.getElementById('share-product').value = result.title;
      document.getElementById('share-price').value = result.price;
    }
    const priceLabel = document.getElementById('share-price').closest('.f').querySelector('label');
    priceLabel.textContent = `السعر (${window.ToolCurrency?.current?.code || 'SAR'})`;
    if (!dialog.open) dialog.showModal();
    loadShares().then(() => {
      if (status.textContent === 'جارٍ تحميل مشاركات حسابك…') status.textContent = '';
    }).catch(error => { if (!submit.disabled) status.textContent = error.message; });
  };
  window.submitSharePrice = async () => {
    if (submit.disabled) return;
    const participant = document.getElementById('share-type-merchant').classList.contains('picked') ? 'merchant'
      : document.getElementById('share-type-consumer').classList.contains('picked') ? 'consumer' : '';
    submit.disabled = true;
    status.textContent = 'جارٍ حفظ المشاركة…';
    try {
      await api('share_price', {
        participant_type: participant, sector: document.getElementById('share-sector').value,
        city: document.getElementById('share-city').value, product: document.getElementById('share-product').value.trim(),
        price: document.getElementById('share-price').value, unit: document.getElementById('share-unit').value,
        currency_code: window.ToolCurrency?.current?.code || 'SAR',
      });
      try {
        await loadShares();
        status.textContent = 'تم حفظ المشاركة في قاعدة بيانات المنصة.';
      } catch {
        status.textContent = 'تم حفظ المشاركة، لكن تعذر تحديث السجل. أعد فتح نافذة المشاركة للاطلاع عليها.';
      }
    } catch (error) { status.textContent = error.message; }
    finally { submit.disabled = false; }
  };
  const report = document.createElement('section');
  report.id = 'print-report';
  report.setAttribute('role', 'dialog');
  report.setAttribute('aria-modal', 'true');
  report.setAttribute('aria-label', 'تقرير التسعير');
  document.body.append(report);
  window.closePrintReport = () => {
    report.classList.remove('show');
    report.replaceChildren();
    returnFocus?.focus();
  };
  window.printSimpleReport = data => {
    returnFocus = document.activeElement;
    const rows = [...(data.extraLines || []), ['التكلفة الإجمالية', data.cost],
      [data.marginLabel || 'هامش الربح', data.marginValue]];
    report.innerHTML = `<article class="calculator-report">
      <div class="calculator-report-controls">
        <button id="calculatorReportPrint" type="button" class="btn btn-primary">طباعة / حفظ PDF</button>
        <button id="calculatorReportClose" type="button" class="btn btn-ghost">إغلاق</button>
      </div>
      <header class="calculator-report-header"><img src="/assets/logo.png" alt="تسعيرة"><h2>تقرير التسعير</h2>
        <p>${escape(new Date().toLocaleDateString('ar-SA'))}</p></header>
      <h3>${escape(data.title)}</h3><p>${escape(data.subtitle)}</p>
      ${data.packages ? `<table><thead><tr>${['الباقة', 'المشتركون', 'الهامش', 'الحد الأدنى', 'السعر النهائي المقترح']
        .map(label => `<th>${escape(label)}</th>`).join('')}</tr></thead><tbody>${data.packages.map(item =>
        `<tr>${item.map(value => `<td>${escape(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>` :
      `<table><tbody>${rows.map(row => `<tr><td>${escape(row[0])}</td><td>${escape(row[1])}</td></tr>`).join('')}
        <tr class="calculator-report-final"><td>السعر النهائي المقترح</td><td>${escape(data.price)}</td></tr></tbody></table>
      `}
      ${data.comparison ? `<p>${escape(String(data.comparison).replace(/<[^>]*>/g, ''))}</p>` : ''}
      <p class="calculator-report-note">السعر المقترح لا يشمل ضريبة القيمة المضافة. هذا تقرير تسعير وليس مستندًا محاسبيًا رسميًا.</p>
    </article>`;
    report.querySelector('#calculatorReportPrint').onclick = () => window.print();
    report.querySelector('#calculatorReportClose').onclick = window.closePrintReport;
    report.classList.add('show');
    report.querySelector('#calculatorReportPrint').focus();
  };
  window.printPkgReport = () => {
    const results = window.CalculatorReadResults?.() || [];
    if (!results.length) { window.alert('أكمل بيانات الباقات حتى تظهر نتيجة صالحة'); return; }
    const currency = window.ToolCurrency?.current?.code || 'SAR';
    const amount = value => Number.isFinite(Number(value))
      ? `${Number(value).toLocaleString('ar-SA', { maximumFractionDigits: 2 })} ${currency}` : '—';
    window.printSimpleReport({
      title: 'مقارنة الباقات والاشتراكات',
      packages: pkgLast.filter(item => Number.isFinite(Number(item.suggested)) && Number(item.suggested) > 0)
        .map(item => [item.name, item.subs, item.margin + '٪', amount(item.minPrice), amount(item.suggested)]),
    });
  };
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && report.classList.contains('show')) window.closePrintReport();
  });
  const labelButtons = () => {
    root.querySelectorAll('[onclick]').forEach(button => {
      if (button.textContent.trim()) return;
      const action = button.getAttribute('onclick');
      if (/^save(Retail|Menu)RowToLog/.test(action)) button.textContent = 'حفظ';
      else if (/^print(Retail|Menu)Report/.test(action)) button.textContent = 'طباعة';
      else if (/^toggle(Retail|Menu)Detail/.test(action)) button.textContent = 'تفصيل';
    });
  };
  labelButtons();
  new MutationObserver(labelButtons).observe(root, { childList: true, subtree: true });
})();
