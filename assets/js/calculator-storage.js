'use strict';

const calculatorOwner = document.body.dataset.calculatorUser;
window.CalculatorStorage = {
  key(key) {
    if (!calculatorOwner) throw new Error('Calculator account missing');
    if (key === 'tas3eerah.currency') return key;
    return `tas3:${calculatorOwner}:${key}`;
  },
  getItem(key) { return localStorage.getItem(this.key(key)); },
  setItem(key, value) { localStorage.setItem(this.key(key), value); },
  removeItem(key) { localStorage.removeItem(this.key(key)); },
};
// A malformed browser history must not abort the shared calculator script.
window.readCalculatorHistory = function (key) {
  try {
    const value = JSON.parse(window.CalculatorStorage.getItem(key) || '[]');
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
