import { registerSW } from 'virtual:pwa-register';

/** Registriert den Service Worker (nur im Produktions-Build), damit die App offline läuft. */
export function registerServiceWorker(): void {
  if (import.meta.env.DEV) return;
  if (!('serviceWorker' in navigator)) return;
  registerSW({ immediate: true });
}
