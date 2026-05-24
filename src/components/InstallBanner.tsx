import React, { useState, useEffect, ReactNode, Component, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class BannerErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[InstallBanner] suppressed error:', error, info);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const DISMISS_KEY = 'rbs_pwa_install_dismissed_v1';
const DISMISS_DAYS = 14;

declare global {
  interface Window {
    MSStream?: any;
  }
  interface Navigator {
    standalone?: boolean;
  }
}

function InstallBannerInner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState('unknown');
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    try {
      const standaloneCheck =
        window.matchMedia?.('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
      setIsStandalone(standaloneCheck);
      if (standaloneCheck) return;

      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const daysSince = (Date.now() - parseInt(dismissedAt, 10)) / 86400000;
        if (daysSince < DISMISS_DAYS) return;
      }

      const ua = window.navigator.userAgent || '';
      const isIOS = /iPhone|iPad|iPod/i.test(ua) && !window.MSStream;
      const isAndroid = /Android/i.test(ua);

      if (isIOS) {
        setPlatform('ios');
        setTimeout(() => setShow(true), 1500);
      } else if (isAndroid) {
        setPlatform('android');
        setTimeout(() => setShow(true), 2500);
      } else {
        setPlatform('desktop');
      }

      const handler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShow(true);
      };
      window.addEventListener('beforeinstallprompt', handler);

      const installedHandler = () => {
        setShow(false);
        setDeferredPrompt(null);
      };
      window.addEventListener('appinstalled', installedHandler);

      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        window.removeEventListener('appinstalled', installedHandler);
      };
    } catch (err) {
      console.warn('[InstallBanner] init failed:', err);
    }
  }, []);

  const handleInstallClick = async () => {
    try {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'dismissed') {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      }
      setDeferredPrompt(null);
      setShow(false);
    } catch (err) {
      console.warn('[InstallBanner] install prompt failed:', err);
      setShow(false);
    }
  };

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (_) {}
    setShow(false);
  };

  if (isStandalone) return null;
  if (!show) return null;

  const containerStyle: React.CSSProperties = {
    position: 'fixed', bottom: '16px', left: '16px', right: '16px',
    zIndex: 9999, background: '#1a1a1a', color: '#fff',
    borderRadius: '14px', padding: '16px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '480px', margin: '0 auto',
    display: 'flex', flexDirection: 'column', gap: '12px'
  };
  const titleStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, margin: 0 };
  const textStyle: React.CSSProperties = { fontSize: '14px', lineHeight: 1.5, margin: 0, opacity: 0.9 };
  const buttonsRow: React.CSSProperties = { display: 'flex', gap: '8px', justifyContent: 'flex-end' };
  const primaryBtn: React.CSSProperties = {
    background: '#ff7a00', color: '#fff', border: 'none',
    padding: '10px 16px', borderRadius: '8px',
    fontSize: '14px', fontWeight: 600, cursor: 'pointer'
  };
  const secondaryBtn: React.CSSProperties = {
    background: 'transparent', color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
    padding: '10px 16px', borderRadius: '8px',
    fontSize: '14px', cursor: 'pointer'
  };

  return (
    <div style={containerStyle} role="dialog" aria-label="הצעת התקנה">
      <h3 style={titleStyle}>📲 התקן את קטלוג RBS למסך הבית</h3>
      {platform === 'ios' ? (
        <p style={textStyle}>
          כדי להוסיף את הקטלוג למסך הבית: לחץ על כפתור השיתוף ⬆️ בתחתית הדפדפן,
          ואז בחר "הוסף למסך הבית" (Add to Home Screen).
        </p>
      ) : platform === 'android' && !deferredPrompt ? (
        <p style={textStyle}>
          כדי להוסיף את הקטלוג למסך הבית: פתח את תפריט הדפדפן (שלוש נקודות למעלה)
          ובחר "הוסף למסך הבית" (Add to Home Screen) או "התקן אפליקציה".
        </p>
      ) : (
        <p style={textStyle}>
          גישה מהירה לקטלוג ישירות ממסך הבית, ללא צורך בפתיחת דפדפן.
        </p>
      )}
      <div style={buttonsRow}>
        <button style={secondaryBtn} onClick={handleDismiss}>המשך לגלוש בדפדפן</button>
        {platform !== 'ios' && deferredPrompt && (
          <button style={primaryBtn} onClick={handleInstallClick}>התקן עכשיו</button>
        )}
      </div>
    </div>
  );
}

export default function InstallBanner() {
  return (
    <BannerErrorBoundary>
      <InstallBannerInner />
    </BannerErrorBoundary>
  );
}
