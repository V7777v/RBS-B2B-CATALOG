import React from 'react';

// App-level Error Boundary — catches any render/runtime error in the tree and
// shows a branded recovery screen instead of a blank white page.
// Inline styles only (no Tailwind) so the fallback renders even if the CSS
// bundle or a cached chunk failed to load. Includes a "clear cache" recovery
// that unregisters the Service Worker + clears Cache Storage (the exact remedy
// for the stale-bundle white screens we hit during rollout).

type State = { hasError: boolean; message?: string };

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    try {
      console.error('[RBS] Application crashed:', error, info?.componentStack);
    } catch {}
  }

  handleReload = () => {
    try { window.location.reload(); } catch {}
  };

  handleHardReset = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
      }
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k).catch(() => {})));
      }
    } catch {}
    try { window.location.reload(); } catch {}
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        dir="rtl"
        style={{
          position: 'fixed', inset: 0, zIndex: 999999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f4f6f9', padding: '24px', boxSizing: 'border-box',
          fontFamily: '"Assistant", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        }}
      >
        <div
          style={{
            background: '#ffffff', borderRadius: '18px', maxWidth: '440px', width: '100%',
            padding: '32px 26px', textAlign: 'center',
            boxShadow: '0 12px 40px rgba(12,45,87,0.14)', border: '1px solid #e6eaf0',
          }}
        >
          <img
            src="https://rbs-telecom.com/wp-content/uploads/2021/01/LOGO-RBS_FINAL.png"
            alt="RBS Telecom"
            referrerPolicy="no-referrer"
            style={{ height: '38px', width: 'auto', objectFit: 'contain', marginBottom: '18px' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          <div style={{ fontSize: '46px', lineHeight: 1, marginBottom: '12px' }}>⚠️</div>
          <h1 style={{ fontSize: '21px', fontWeight: 800, color: '#0c2d57', margin: '0 0 8px' }}>
            אירעה שגיאה בלתי צפויה
          </h1>
          <p style={{ fontSize: '15px', color: '#5b6675', lineHeight: 1.6, margin: '0 0 22px' }}>
            משהו השתבש בטעינת העמוד. אפשר לרענן — ואם זה חוזר, נקו את המטמון וטענו מחדש.
          </p>

          <button
            onClick={this.handleReload}
            style={{
              display: 'block', width: '100%', padding: '13px 16px', marginBottom: '10px',
              background: '#004387', color: '#fff', border: 'none', borderRadius: '12px',
              fontSize: '16px', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            רענן את העמוד
          </button>

          <button
            onClick={this.handleHardReset}
            style={{
              display: 'block', width: '100%', padding: '12px 16px',
              background: '#fff', color: '#004387', border: '1px solid #cdd6e2',
              borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            נקה מטמון וטען מחדש
          </button>

          <div style={{ fontSize: '12px', color: '#9aa4b2', marginTop: '20px' }}>
            נתקלים בבעיה חוזרת? צרו קשר: 077-2045522
          </div>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
