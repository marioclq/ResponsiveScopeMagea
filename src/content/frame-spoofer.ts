// Hides the fact that the page is framed. Idempotent across re-injection.
(() => {
  if (!window.name.startsWith('responsivescope-frame')) return;
  try {
    const d = Object.getOwnPropertyDescriptor(window, 'frameElement');
    const already = d && d.configurable === false && typeof d.get === 'function';
    if (!already) {
      Object.defineProperty(window, 'frameElement', {
        get: () => null,
        configurable: false,
      });
    }
  } catch {
    /* already frozen by a prior injection */
  }
})();
