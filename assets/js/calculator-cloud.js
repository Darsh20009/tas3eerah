'use strict';

(async () => {
  const context = window.CALCULATOR_CONTEXT;
  const root = document.querySelector('#integrated-tools .tool-screen');
  if (!context || !root) return;
  let actions = [], restoring = true, timer, pending = Promise.resolve(), csrf, revision = 0, savedRevision = 0;
  const toolbar = document.createElement('section');
  toolbar.className = 'card';
  toolbar.style.cssText = 'padding:16px;margin-bottom:16px';
  toolbar.innerHTML = `<label for="cloudResultTitle">اسم النتيجة المحفوظة</label>
    <input id="cloudResultTitle" class="form-control" maxlength="160" placeholder="اكتب اسم المشروع">
    <select id="cloudResultChoice" class="form-control" aria-label="النتيجة المراد حفظها" hidden></select>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
      <button id="cloudSave" type="button" class="btn btn-primary">حفظ النتيجة في حسابي</button>
      <a href="/dashboard?panel=project-log&sector=${encodeURIComponent(context.slug)}" class="btn btn-ghost">السجل المحفوظ</a>
    </div><p id="cloudStateStatus" role="status" aria-live="polite">جارٍ استعادة بيانات حسابك…</p>`;
  document.getElementById('integrated-tools').before(toolbar);
  const status = toolbar.querySelector('#cloudStateStatus');
  const saveButton = toolbar.querySelector('#cloudSave');
  const title = toolbar.querySelector('#cloudResultTitle');
  const choice = toolbar.querySelector('#cloudResultChoice');
  root.inert = true;
  saveButton.disabled = true;
  const message = text => { status.textContent = text; };
  async function request(action, data, get = false) {
    if (!csrf && !get) {
      const result = await (await fetch('/api/auth?action=csrf')).json();
      if (!result.success) throw new Error(result.error || 'تعذر التحقق من الجلسة');
      csrf = result.data.csrf_token;
    }
    const url = get ? `/api/calculators?action=${action}&tool=${encodeURIComponent(context.slug)}` : '/api/calculators';
    const body = JSON.stringify({ action, tool: context.slug, ...data });
    const response = await fetch(url, get ? {} : {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body, keepalive: new Blob([body]).size < 60000,
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'تعذر الاتصال بالخادم');
    return result.data;
  }
  function selector(node) {
    if (node.id) return '#' + CSS.escape(node.id);
    const parts = [];
    for (let current = node; current && current !== root; current = current.parentElement) {
      if (current.id) { parts.unshift('#' + CSS.escape(current.id)); break; }
      const siblings = [...current.parentElement.children].filter(other => other.tagName === current.tagName);
      parts.unshift(current.tagName.toLowerCase() + `:nth-of-type(${siblings.indexOf(current) + 1})`);
    }
    return parts.join(' > ');
  }
  function safeAction(node, signature) {
    return node && node.getAttribute('onclick') === signature &&
      !/save|print|report|share|copy|log|history|clearAll|goHome|openTool|location|window\.open/i.test(signature);
  }
  function snapshot() {
    return {
      version: 1, tool: context.slug, actions: [...actions],
      currency_code: window.ToolCurrency?.current?.code || 'SAR',
      fields: [...root.querySelectorAll('input,select,textarea')].filter(node =>
        !['button', 'submit', 'password', 'file'].includes(node.type)).map(node => ({
        selector: selector(node), value: node.value, checked: node.checked,
      })),
    };
  }
  async function restore(state) {
    if (!state) return;
    if (state.version !== 1 || state.tool !== context.slug || !Array.isArray(state.actions) || !Array.isArray(state.fields)) {
      throw new Error('تعذر استعادة البيانات المحفوظة: صيغة غير مدعومة');
    }
    for (const action of state.actions) {
      let node;
      try { node = root.querySelector(action.selector); } catch {}
      if (!safeAction(node, action.signature)) throw new Error('تغيّرت بنية الحاسبة. لم تُحذف نتيجتك المحفوظة.');
      node.click();
    }
    for (const field of state.fields) {
      let node;
      try { node = root.querySelector(field.selector); } catch {}
      if (!node || !node.matches('input,select,textarea') || ['file','password'].includes(node.type)) continue;
      node.value = String(field.value ?? '');
      if (['checkbox', 'radio'].includes(node.type)) node.checked = Boolean(field.checked);
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const currency = document.getElementById('global-currency');
    if (currency && state.currency_code) {
      const option = [...currency.options].find(option => option.value.split('|')[1] === state.currency_code);
      if (option) { currency.value = option.value; currency.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    actions = state.actions;
    window.CalculatorReadResults?.();
  }
  function saveState() {
    if (restoring || revision === savedRevision) return pending;
    const capturedRevision = revision;
    const state = snapshot();
    if (state.actions.length > 600) {
      message('وصلت إلى حد خطوات الحاسبة. احفظ نتيجتك ثم ابدأ جلسة جديدة.');
      return pending;
    }
    // Preserve edit order even if a previous network request is slow.
    pending = pending.catch(() => {}).then(() => request('save_state', { state }))
      .then(() => {
        savedRevision = capturedRevision;
        message(revision === capturedRevision ? 'تم حفظ بيانات الحاسبة في حسابك' : 'جارٍ حفظ التغييرات…');
      })
      .catch(error => message(error.message));
    return pending;
  }
  function schedule() {
    if (restoring) return;
    revision++;
    message('جارٍ حفظ التغييرات…');
    clearTimeout(timer);
    timer = setTimeout(saveState, 450);
  }
  let selectedResults = [];
  async function updateHistoryBadge() {
    const records = await request('list', null, true);
    const prefix = context.slug === 'design' ? 'ds' : context.slug;
    const badge = document.getElementById(prefix + '-log-count') ||
      (context.slug === 'services' ? document.getElementById('log-count') : null);
    if (badge) badge.textContent = records.length;
  }
  function resultChoices() {
    selectedResults = window.CalculatorReadResults?.() || [];
    choice.replaceChildren();
    selectedResults.forEach((result, index) => choice.add(new Option(
      `${result.title} (${result.price} ${result.currency_code})`, String(index))));
    choice.hidden = selectedResults.length < 2;
    return selectedResults;
  }
  async function save(rowIndex, prefix) {
    if (saveButton.disabled) return;
    try {
      const previous = choice.value;
      const results = resultChoices();
      if (!results.length) throw new Error('أكمل بيانات الحاسبة حتى تظهر نتيجة صالحة');
      if (prefix) {
        const rows = [...root.querySelectorAll(`#${prefix}-rows > tr`)];
        const position = rows.findIndex(row => row.id === `${prefix}-row-${rowIndex}`);
        if (position >= 0) choice.value = String(position);
      } else if (previous && results[Number(previous)]) choice.value = previous;
      if (!title.value.trim()) { title.focus(); throw new Error('اكتب اسم النتيجة قبل الحفظ'); }
      saveButton.disabled = true;
      const result = results[Number(choice.value)] || results[0];
      const state = snapshot();
      await request('save', { state, title: title.value.trim(), price: result.price, currency_code: result.currency_code });
      try {
        await updateHistoryBadge();
        message('تم حفظ نتيجة جديدة في سجل حسابك. يمكنك استعادتها أو حذفها من السجل.');
      } catch {
        message('تم حفظ نتيجة جديدة في سجل حسابك، لكن تعذر تحديث العداد. افتح السجل للاطلاع عليها.');
      }
    } catch (error) { message(error.message); } finally { saveButton.disabled = false; }
  }
  window.CalculatorCloud = {
    snapshot, flush: saveState, save, ready: false,
    async openHistory() {
      clearTimeout(timer);
      await saveState();
      location.href = `/dashboard?panel=project-log&sector=${encodeURIComponent(context.slug)}`;
    },
  };
  saveButton.addEventListener('click', () => save());
  // Replace the standalone document's browser-only save actions.
  window.saveProject = () => save();
  window.saveGenericProject = () => save();
  window.saveRetailRowToLog = index => save(index, 'ret');
  window.saveMenuRowToLog = index => save(index, 'menu');
  const nativePrint = window.print.bind(window);
  window.print = async () => {
    try { await request('reserve_pdf'); nativePrint(); }
    catch (error) { message(error.message); window.alert(error.message); }
  };
  try {
    const saved = await request('state', null, true);
    await restore(saved.state);
    await updateHistoryBadge();
    message(saved.state ? 'تمت استعادة بيانات الحاسبة من حسابك' : 'بيانات هذه الحاسبة تُحفظ تلقائياً في حسابك');
  } catch (error) { message(error.message); }
  finally {
    restoring = false; root.inert = false; saveButton.disabled = false;
    window.CalculatorCloud.ready = true;
  }
  root.addEventListener('click', event => {
    if (restoring) return;
    const node = event.target.closest('[onclick]');
    const signature = node?.getAttribute('onclick');
    if (node && root.contains(node) && safeAction(node, signature)) {
      actions.push({ selector: selector(node), signature });
      schedule();
    }
  }, true);
  root.addEventListener('input', schedule);
  root.addEventListener('change', schedule);
  document.getElementById('global-currency')?.addEventListener('change', schedule);
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || restoring || actions.length > 600) return;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin || event.ctrlKey || event.metaKey || link.target === '_blank') return;
    event.preventDefault();
    clearTimeout(timer);
    saveState().finally(() => { location.href = destination.href; });
  });
  window.addEventListener('pagehide', () => {
    clearTimeout(timer);
    if (!restoring && csrf && revision !== savedRevision) fetch('/api/calculators', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ action: 'save_state', tool: context.slug, state: snapshot() }), keepalive: true,
    }).catch(() => {});
  });
})();
