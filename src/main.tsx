import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AppErrorBoundary from './AppErrorBoundary.tsx';
import { Analytics } from '@vercel/analytics/react';
import { loadGoogleAnalytics } from './lib/analytics.ts';
import './index.css';

// Call loadGoogleAnalytics() only when localStorage 'rbs_cookie_consent' === '1' — on app start and on the 'rbs_cookie_consent_accepted' event.
if (typeof window !== 'undefined') {
  try {
    if (localStorage.getItem('rbs_cookie_consent') === '1') {
      loadGoogleAnalytics();
    }
  } catch {}

  window.addEventListener('rbs_cookie_consent_accepted', () => {
    try {
      if (localStorage.getItem('rbs_cookie_consent') === '1') {
        loadGoogleAnalytics();
      }
    } catch {
      loadGoogleAnalytics();
    }
  });
}

function ConsentAnalytics() {
  const [hasConsent, setHasConsent] = useState(() => {
    try {
      return localStorage.getItem('rbs_cookie_consent') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleConsent = () => {
      try {
        setHasConsent(localStorage.getItem('rbs_cookie_consent') === '1');
      } catch {
        setHasConsent(true);
      }
    };
    window.addEventListener('rbs_cookie_consent_accepted', handleConsent);
    return () => window.removeEventListener('rbs_cookie_consent_accepted', handleConsent);
  }, []);

  if (!hasConsent) return null;
  return <Analytics />;
}

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

  // Verify icon fetch status (distinguish image/png 200 OK vs HTML homepage / fallback)
  const verifyPwaIconFetch = async () => {
    try {
      const res = await fetch('/apple-touch-icon.png', { cache: 'no-cache' });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('image')) {
        console.log(`[PWA Icon Check] /apple-touch-icon.png fetched successfully: ${res.status} OK (${contentType})`);
      } else {
        console.warn(`[PWA Icon Check] Warning: /apple-touch-icon.png returned status ${res.status} with content-type "${contentType}" instead of image/png (HTML homepage or challenge received).`);
      }
    } catch (err) {
      console.error('[PWA Icon Check] Failed to fetch /apple-touch-icon.png:', err);
    }
  };

  // 2. Schedule update queries on page load and periodically every 2 minutes
  window.addEventListener('load', () => {
    // Check if apple-touch-icon returns an image or HTML fallback
    verifyPwaIconFetch();

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
      <ConsentAnalytics />
    </AppErrorBoundary>
  </StrictMode>,
);

// Clear the chunk-reload guard once the app has loaded healthily.
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => { try { sessionStorage.removeItem('rbs-chunk-reloaded'); } catch {} }, 4000);
  });
}
