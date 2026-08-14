const isMobileDevice = () => window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

const clearMobileServiceWorkerState = async () => {
  if (!('serviceWorker' in navigator) || !window.caches) return;

  const guardKey = 'chordCharts.mobileSwCleared.v1';
  try {
    if (sessionStorage.getItem(guardKey) === '1') return;
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    sessionStorage.setItem(guardKey, '1');
  } catch (error) {
    console.warn('[pwa] mobile service worker cleanup failed', error);
  }
};

if (isMobileDevice()) {
  clearMobileServiceWorkerState();
} else if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=20260814.3').catch((error) => {
      console.warn('[pwa] service worker registration failed', error);
    });
  });
}
