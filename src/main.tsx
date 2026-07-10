import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AppErrorBoundary from './AppErrorBoundary.tsx';
import { Analytics } from '@vercel/analytics/react';
import './index.css';

// Automated PWA Update & Hot-Reload Orchestrator
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  let isRefreshing = false;

  // Track if this window session was already controlled by a Service Worker on initial load.
  // This allows us to avoid a redundant blink/reload on first-time installation.
  const hasControllerOnLoad = !!navigator.serviceWorker.controller;

  // 1. Detect service worker updates taking control -> Reload page to apply immediately
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isRefreshing) return;
    if (!hasControllerOnLoad) {
      // First-time registration, skip reload as they already have the absolute latest assets
      return;
    }
    isRefreshing = true;
    console.log('[PWA Manager] Core updates detected. Hot-reloading application...');
    window.location.reload();
  });

  // Helper helper to query all active registrations and force an update check
  const checkForUpdates = () => {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        for (const registration of registrations) {
          registration.update().catch(err => {
            console.debug('[PWA Manager] Error updating registration:', err);
          });
        }
      })
      .catch(err => {
        console.warn('[PWA Manager] Failed to retrieve registrations for updates:', err);
      });
  };

  // 2. Schedule update queries on page load and periodically every 2 minutes
  window.addEventListener('load', () => {
    // Wait briefly after load to not block important primary render network calls
    setTimeout(checkForUpdates, 3000);

    setInterval(checkForUpdates, 120000); // 2 minutes (120,000ms)
  });

  // 3. Focus/Wake trigger: Update checks when user returns to the app tab/PWA
  window.addEventListener('focus', checkForUpdates);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
      <Analytics />
    </AppErrorBoundary>
  </StrictMode>,
);

// Clear the chunk-reload guard once the app has loaded healthily.
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => { try { sessionStorage.removeItem('rbs-chunk-reloaded'); } catch {} }, 4000);
  });
}
