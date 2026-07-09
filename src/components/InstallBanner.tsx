import React, { useState, useEffect, ReactNode, Component, ErrorInfo } from 'react';

// TypeScript Declarations
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
  interface Window {
    MSStream?: any;
  }
  interface Navigator {
    standalone?: boolean;
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
}

class BannerErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
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

const DISMISS_KEY = 'rbs_pwa_install_dismissed_v1.2';
const DISMISS_DAYS = 14;

type Platform = 'ios' | 'android' | 'desktop' | 'unknown';

// Listen for the prompt event globally, as early as possible.
// We now rely on the inline script in index.html to catch the very first event.
declare global {
  interface Window {
    __deferredPrompt?: BeforeInstallPromptEvent | null;
    __promptListeners?: ((e: BeforeInstallPromptEvent) => void)[];
  }
}

function InstallBannerInner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    (typeof window !== 'undefined' ? window.__deferredPrompt : null) as BeforeInstallPromptEvent | null
  );
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    try {
      // 1. Check if already installed
      const isStandaloneCheck =
        window.matchMedia?.('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.startsWith('android-app://');

      setIsStandalone(!!isStandaloneCheck);
      if (isStandaloneCheck) return;

      // 2. Check if dismissed recently
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const daysSince = (Date.now() - parseInt(dismissedAt, 10)) / 86400000;
        if (daysSince < DISMISS_DAYS) return;
      }

      // 3. Detect Platform
      const ua = window.navigator.userAgent || '';
      const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
      const isIOS = /iPhone|iPad|iPod/i.test(ua) && !window.MSStream || isIPadOS;
      const isAndroid = /Android/i.test(ua);
      
      let detectedPlatform: Platform = 'desktop';
      if (isIOS) detectedPlatform = 'ios';
      else if (isAndroid) detectedPlatform = 'android';
      
      setPlatform(detectedPlatform);

      // Show banner after delay
      const showTimer = setTimeout(() => {
        setShow(true);
        // On iOS, if we show, we might want to automatically show instructions since native prompt won't work
        if (detectedPlatform === 'ios') {
          setShowInstructions(true);
        }
      }, 2500);

      // 4. Listen for native prompt
      const promptHandler = (e: BeforeInstallPromptEvent) => {
        setDeferredPrompt(e);
        setShowInstructions(false); // Hide instructions if prompt becomes available
      };

      if (window.__deferredPrompt) {
        setDeferredPrompt(window.__deferredPrompt);
      }
      if (window.__promptListeners) {
        window.__promptListeners.push(promptHandler);
      } else {
        window.__promptListeners = [promptHandler];
      }

      const installedHandler = () => {
        setShow(false);
        setDeferredPrompt(null);
        if (window) {
          window.__deferredPrompt = null;
        }
        setIsStandalone(true);
      };

      window.addEventListener('appinstalled', installedHandler);

      return () => {
        clearTimeout(showTimer);
        if (window.__promptListeners) {
          window.__promptListeners = window.__promptListeners.filter(l => l !== promptHandler);
        }
        window.removeEventListener('appinstalled', installedHandler);
      };
    } catch (err) {
      console.warn('[InstallBanner] init failed:', err);
    }
  }, []);

  const handleInstallClick = async () => {
    try {
      if (!deferredPrompt) {
        setShowInstructions(true);
        return;
      }
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'dismissed') {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setShow(false);
      } else if (choice.outcome === 'accepted') {
        setShow(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('[InstallBanner] install prompt failed:', err);
      setShowInstructions(true);
    }
  };

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (_) {}
    setShow(false);
  };

  if (isStandalone) return null;
  if (!show) return null;

  const getInstructionText = () => {
    if (platform === 'ios') {
      return "לחץ על כפתור השיתוף ⬆️ ואז בחר 'הוסף למסך הבית' / Add to Home Screen";
    } else if (platform === 'android') {
      return "פתח את תפריט הדפדפן ⋮ ובחר 'התקן אפליקציה' או 'הוסף למסך הבית'";
    } else {
      return "בדוק את אייקון ההתקנה בשורת הכתובת או פתח את תפריט הדפדפן ובחר Install app";
    }
  };

  const hasNativePrompt = !!deferredPrompt;

  const containerStyle: React.CSSProperties = {
    position: 'fixed', 
    bottom: 'calc(16px + env(safe-area-inset-bottom))', 
    left: '16px', 
    zIndex: 9999, 
    background: '#ffffff', 
    color: '#0c2d57',
    border: '1px solid #e5e7eb',
    borderRadius: '16px', 
    padding: '20px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    direction: 'rtl', 
    fontFamily: 'system-ui, -apple-system, sans-serif',
    width: 'calc(100% - 32px)', 
    maxWidth: '400px', 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '12px'
  };

  const titleStyle: React.CSSProperties = { 
    fontSize: '18px', 
    fontWeight: 800, 
    margin: 0, 
    color: '#004387',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };
  
  const textStyle: React.CSSProperties = { 
    fontSize: '14px', 
    lineHeight: 1.5, 
    margin: 0, 
    color: '#4b5563',
    fontWeight: 500
  };
  
  const instructionBoxStyle: React.CSSProperties = {
    background: '#f3f4f6',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '13px',
    color: '#0c2d57',
    fontWeight: 600,
    lineHeight: 1.5,
    borderRight: '4px solid #004387'
  };

  const buttonsRow: React.CSSProperties = { 
    display: 'flex', 
    gap: '12px', 
    justifyContent: 'flex-start',
    marginTop: '4px'
  };

  const primaryBtn: React.CSSProperties = {
    background: '#ff7a00', 
    color: '#fff', 
    border: 'none',
    padding: '12px 20px', 
    borderRadius: '10px',
    fontSize: '14px', 
    fontWeight: 700, 
    cursor: 'pointer',
    flex: 1,
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(255, 122, 0, 0.3)'
  };

  const instructionBtn: React.CSSProperties = {
    background: '#004387', 
    color: '#fff', 
    border: 'none',
    padding: '12px 20px', 
    borderRadius: '10px',
    fontSize: '14px', 
    fontWeight: 700, 
    cursor: 'pointer',
    flex: 1,
    textAlign: 'center'
  };

  const secondaryBtn: React.CSSProperties = {
    background: 'transparent', 
    color: '#6b7280',
    border: 'none',
    padding: '12px 16px', 
    borderRadius: '10px',
    fontSize: '14px', 
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
    textDecoration: 'underline'
  };

  return (
    <div style={containerStyle} role="dialog" aria-label="הצעת התקנה">
      <h3 style={titleStyle}>
        <span style={{ fontSize: '24px' }}>📲</span> גישה מהירה לקטלוג RBS
      </h3>
      
      <p style={textStyle}>
        התקן את הקטלוג כאפליקציה וקבל גישה מהירה מהמחשב או מהטלפון.
      </p>

      {showInstructions && (
        <div style={instructionBoxStyle}>
          {getInstructionText()}
        </div>
      )}

      <div style={buttonsRow}>
        {!showInstructions && !hasNativePrompt && platform !== 'ios' ? (
          <button style={instructionBtn} onClick={() => setShowInstructions(true)}>
            איך מתקינים?
          </button>
        ) : hasNativePrompt ? (
          <button style={primaryBtn} onClick={handleInstallClick}>
            התקן עכשיו
          </button>
        ) : null}

        <button style={secondaryBtn} onClick={handleDismiss}>
          המשך בדפדפן
        </button>
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
