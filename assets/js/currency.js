/* Tas3eerah currency mark
 * Replaces written currency labels with the Saudi Riyal symbol artwork.
 */
(function () {
  const SYMBOL_SRC = '/assets/riyal-symbol.png?v=2';
  // Match currency labels only. Do not treat the adjacent letters "ر" and "س"
  // inside normal Arabic words such as "أرسل" or "الرسالة" as currency.
  const TOKEN_RE = /ر\.س|(?<![\u0600-\u06ff])ر\s+س(?![\u0600-\u06ff])|(?<![A-Za-z])SAR(?![A-Za-z])|(?<![\u0600-\u06ff])ريال(?![\u0600-\u06ff])|﷼/g;
  let currencyObserver = null;

  function replace(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (
        parent &&
        !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName) &&
        !parent.closest('.user-content, .riyal-symbol') &&
        TOKEN_RE.test(node.nodeValue)
      ) {
        nodes.push(node);
      }
      TOKEN_RE.lastIndex = 0;
    }

    nodes.forEach(node => {
      const value = node.nodeValue;
      const fragment = document.createDocumentFragment();
      let cursor = 0;
      let match;

      TOKEN_RE.lastIndex = 0;
      while ((match = TOKEN_RE.exec(value)) !== null) {
        if (match.index > cursor) {
          fragment.appendChild(document.createTextNode(value.slice(cursor, match.index)));
        }

        const symbol = document.createElement('img');
        symbol.className = 'riyal-symbol';
        symbol.src = SYMBOL_SRC;
        symbol.alt = 'ريال سعودي';
        symbol.title = 'ريال سعودي';
        fragment.appendChild(symbol);
        cursor = match.index + match[0].length;
      }

      if (cursor < value.length) {
        fragment.appendChild(document.createTextNode(value.slice(cursor)));
      }
      node.parentNode.replaceChild(fragment, node);
    });

    TOKEN_RE.lastIndex = 0;
  }

  function watch(root) {
    if (!root || currencyObserver) return;
    currencyObserver = new MutationObserver(mutations => {
      currencyObserver.disconnect();
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            replace(node);
          } else if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
            replace(node.parentElement);
          }
        });
      });
      currencyObserver.observe(root, { childList: true, subtree: true });
    });
    currencyObserver.observe(root, { childList: true, subtree: true });
  }

  function boot() {
    if (!document.body) return;
    replace(document.body);
    watch(document.body);
  }

  window.Tas3Currency = { replace, boot };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();