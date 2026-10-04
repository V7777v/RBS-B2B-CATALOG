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

// Automated PWA Update Orchestrator
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Helper to query all active registrations and force an update check
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

  // Schedule update queries on page load and periodically every 30 minutes
  window.addEventListener('load', () => {
    // Wait briefly after load to not block important primary render network calls
    setTimeout(checkForUpdates, 3000);

    setInterval(checkForUpdates, 1800000); // 30 minutes (1,800,000ms)
  });
}

function PwaUpdateToast() {
  const [waitingRegistration, setWaitingRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const attachedRegistrations = new WeakSet<ServiceWorkerRegistration>();

    const checkRegistration = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting) {
        setWaitingRegistration(reg);
        return;
      }

      if (!attachedRegistrations.has(reg)) {
        attachedRegistrations.add(reg);
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingRegistration(reg);
            }
          });
        });
      }
    };

    const scan = () => {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          checkRegistration(reg);
        }
      }).catch(() => {});
    };

    scan();

    navigator.serviceWorker.ready.then((reg) => {
      checkRegistration(reg);
    }).catch(() => {});

    const interval = setInterval(scan, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!waitingRegistration) return null;

  const handleUpdate = () => {
    if (waitingRegistration.waiting) {
      waitingRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

  return (
    <div
      role="alert"
      dir="rtl"
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center justify-between gap-4 px-4 py-2.5 bg-slate-900/95 text-white rounded-xl shadow-2xl border border-slate-700/60 backdrop-blur-md text-sm font-sans max-w-[90vw] animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <div className="flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
        <span className="font-semibold text-slate-100">גרסה חדשה זמינה</span>
      </div>
      <button
        onClick={handleUpdate}
        type="button"
        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors shadow-sm cursor-pointer whitespace-nowrap"
      >
        עדכון
      </button>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
      <ConsentAnalytics />
      <PwaUpdateToast />
    </AppErrorBoundary>
  </StrictMode>,
);

// Clear the chunk-reload guard once the app has loaded healthily.
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => { try { sessionStorage.removeItem('rbs-chunk-reloaded'); } catch {} }, 4000);
  });
}
