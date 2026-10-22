import * as storage from './storage.js';

let deferred = null;
let installBtn = null;

// Registers the service worker and wires the install button and the iOS "Add to Home Screen" hint.
export function initPWA(installEl, hintEl) {
  installBtn = installEl;

  // Skip on localhost so dev edits aren't served from the cache (add ?sw to test it there).
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if ('serviceWorker' in navigator && (!local || location.search.includes('sw'))) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    installBtn.hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installBtn.hidden = true;
  });

  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (ios && !standalone && !storage.hasSeenInstallHint()) {
    hintEl.hidden = false;
    storage.setSeenInstallHint();
  }
}

export async function promptInstall() {
  if (!deferred) return;
  deferred.prompt();
  await deferred.userChoice;
  deferred = null;
  installBtn.hidden = true;
}
