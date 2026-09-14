(function () {
  'use strict';

  const emailDomains = [
    '@gmail.com',
    '@outlook.com',
    '@hotmail.com',
    '@yahoo.com',
    '@icloud.com',
    '@proton.me'
  ];

  const phoneCodes = [
    ['+966', 'السعودية'],
    ['+971', 'الإمارات'],
    ['+965', 'الكويت'],
    ['+974', 'قطر'],
    ['+973', 'البحرين'],
    ['+968', 'عُمان'],
    ['+20', 'مصر'],
    ['+962', 'الأردن'],
    ['+90', 'تركيا'],
    ['+44', 'المملكة المتحدة'],
    ['+1', 'الولايات المتحدة']
  ];

  function createIcon(src, alt) {
    const image = document.createElement('img');
    image.src = src;
    image.alt = alt;
    image.className = 'password-toggle-icon';
    return image;
  }

  function enhancePassword(input) {
    if (input.dataset.passwordEnhanced === 'true' || input.disabled || input.readOnly) return;
    input.dataset.passwordEnhanced = 'true';

    const wrapper = document.createElement('span');
    wrapper.className = 'password-field';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'password-toggle';
    toggle.setAttribute('aria-label', 'إظهار كلمة المرور');
    toggle.appendChild(createIcon('/assets/ui/password-show.png', 'إظهار كلمة المرور'));
    wrapper.appendChild(toggle);

    toggle.addEventListener('click', function () {
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      toggle.setAttribute('aria-label', visible ? 'إظهار كلمة المرور' : 'إخفاء كلمة المرور');
      toggle.querySelector('img').replaceWith(
        createIcon(
          visible ? '/assets/ui/password-show.png' : '/assets/ui/password-hide.png',
          visible ? 'إظهار كلمة المرور' : 'إخفاء كلمة المرور'
        )
      );
    });
  }

  function enhanceEmail(input) {
    if (input.dataset.emailEnhanced === 'true' || input.disabled || input.readOnly) return;
    input.dataset.emailEnhanced = 'true';

    const wrapper = document.createElement('div');
    wrapper.className = 'email-field';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const suggestions = document.createElement('div');
    suggestions.className = 'email-suggestions';
    suggestions.setAttribute('aria-label', 'اقتراحات نطاق البريد الإلكتروني');

    const label = document.createElement('span');
    label.className = 'email-suggestions-label';
    label.textContent = 'اقتراح سريع';
    suggestions.appendChild(label);

    emailDomains.forEach(function (domain) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'email-domain';
      button.textContent = domain;
      button.addEventListener('click', function () {
        const current = input.value.trim();
        const localPart = current.split('@')[0].trim();
        input.value = (localPart || '') + domain;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
      });
      suggestions.appendChild(button);
    });

    wrapper.appendChild(suggestions);
  }

  function enhancePhone(input) {
    if (input.dataset.phoneEnhanced === 'true' || input.disabled || input.readOnly) return;
    input.dataset.phoneEnhanced = 'true';

    const wrapper = document.createElement('span');
    wrapper.className = 'phone-field';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const select = document.createElement('select');
    select.className = 'phone-code';
    select.setAttribute('aria-label', 'رمز الدولة');
    select.setAttribute('dir', 'ltr');

    phoneCodes.forEach(function (item) {
      const option = document.createElement('option');
      option.value = item[0];
      option.textContent = item[0] + ' ' + item[1];
      select.appendChild(option);
    });
    wrapper.insertBefore(select, input);
  }

  function enhanceForms(root) {
    const scope = root || document;
    scope.querySelectorAll('input[type="password"]').forEach(enhancePassword);
    scope.querySelectorAll('input[type="email"]').forEach(enhanceEmail);
    scope.querySelectorAll('input[type="tel"], input[data-phone]').forEach(enhancePhone);
  }

  function init() {
    enhanceForms(document);
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) enhanceForms(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();