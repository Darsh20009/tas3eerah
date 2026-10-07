'use strict';

// A malformed browser history must not abort the shared calculator script.
window.readCalculatorHistory = function (key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(value)) throw new Error('Invalid calculator history');
    return value.filter(record => record && typeof record === 'object' && !Array.isArray(record));
  } catch {
    console.warn('تعذر قراءة سجل الحاسبة المحلي');
    const currencyControl = document.getElementById('global-currency')?.parentElement;
    if (currencyControl && !document.getElementById('calculatorStorageWarning')) {
      const notice = document.createElement('p');
      notice.id = 'calculatorStorageWarning';
      notice.setAttribute('role', 'status');
      notice.textContent = 'تعذر قراءة بعض السجلات المحلية. البيانات الأصلية لم تُحذف، ويمكنك متابعة استخدام الحاسبة.';
      currencyControl.append(notice);
    }
    return [];
  }
};
