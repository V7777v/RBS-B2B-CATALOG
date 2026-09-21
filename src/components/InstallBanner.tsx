import React, { useState, useEffect, ReactNode, Component, ErrorInfo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  Share2, 
  PlusSquare, 
  X, 
  Smartphone, 
  CheckCircle2, 
  Sparkles,
  Zap
} from 'lucide-react';

// TypeScript Declarations for beforeinstallprompt event
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
    __deferredPrompt?: BeforeInstallPromptEvent | null;
    __promptListeners?: ((e: BeforeInstallPromptEvent) => void)[];
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

const DISMISS_KEY = 'rbs_pwa_install_dismissed_v3';
const DISMISS_DAYS = 2;

type Platform = 'ios' | 'android' | 'desktop' | 'unknown';

export interface InstallBannerProps {
  disabled?: boolean;
}

function InstallBannerInner({ disabled = false }: InstallBannerProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    typeof window !== 'undefined' ? (window.__deferredPrompt || null) : null
  );
  const [isVisible, setIsVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    try {
      // 1. Check if already running in standalone mode (already installed)
      const isStandaloneMode =
        window.matchMedia?.('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.startsWith('android-app://');

      setIsStandalone(!!isStandaloneMode);
      if (isStandaloneMode) return;

      // 2. Detect Client Platform
      const ua = window.navigator.userAgent || '';
      const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
      const isIOS = (/iPhone|iPad|iPod/i.test(ua) && !(window as any).MSStream) || isIPadOS;
      const isAndroid = /Android/i.test(ua);

      const detectedPlatform: Platform = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';
      setPlatform(detectedPlatform);

      // 3. Listen for browser native install prompt
      const promptHandler = (e: BeforeInstallPromptEvent) => {
        setDeferredPrompt(e);
      };

      if (window.__deferredPrompt) {
        setDeferredPrompt(window.__deferredPrompt);
      }
      if (window.__promptListeners) {
        window.__promptListeners.push(promptHandler);
      } else {
        window.__promptListeners = [promptHandler];
      }
      window.addEventListener('beforeinstallprompt', promptHandler);

      // 4. Listen for successful app installation
      const installedHandler = () => {
        setIsVisible(false);
        setDeferredPrompt(null);
        if (window) {
          window.__deferredPrompt = null;
        }
        setIsStandalone(true);
      };
      window.addEventListener('appinstalled', installedHandler);

      // 5. Custom event allowing other buttons in the app to trigger this prompt anytime
      const manualShowHandler = () => {
        setIsVisible(true);
        if (detectedPlatform === 'ios') {
          setShowIOSGuide(true);
        }
      };
      window.addEventListener('show-install-prompt', manualShowHandler);

      return () => {
        if (window.__promptListeners) {
          window.__promptListeners = window.__promptListeners.filter((l) => l !== promptHandler);
        }
        window.removeEventListener('beforeinstallprompt', promptHandler);
        window.removeEventListener('appinstalled', installedHandler);
        window.removeEventListener('show-install-prompt', manualShowHandler);
      };
    } catch (err) {
      console.warn('[InstallBanner] init error:', err);
    }
  }, []);

  // Display timer & dismissal persistence check
  useEffect(() => {
    if (disabled || isStandalone) {
      setIsVisible(false);
      return;
    }

    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const daysSince = (Date.now() - parseInt(dismissedAt, 10)) / 86400000;
        if (daysSince < DISMISS_DAYS) {
          return;
        }
      }
    } catch (_) {}

    // Show banner after brief delay so user context settles
    const timer = setTimeout(() => {
      setIsVisible(true);
      if (platform === 'ios') {
        setShowIOSGuide(true);
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [disabled, isStandalone, platform]);

  const handleInstallClick = async () => {
    if (platform === 'ios') {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) {
      setShowIOSGuide(true);
      return;
    }

    try {
      setIsInstalling(true);
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsVisible(false);
      } else {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('[InstallBanner] prompt error:', err);
      setShowIOSGuide(true);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch (_) {}
    setIsVisible(false);
  };

  if (disabled || isStandalone) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="pwa-install-banner"
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-5 sm:bottom-5 sm:w-[420px] z-[9999] bg-white/95 backdrop-blur-md rounded-2xl border border-blue-100 shadow-[0_12px_40px_rgba(12,45,87,0.22)] p-4 sm:p-5 text-right font-sans select-none"
          dir="rtl"
          role="dialog"
          aria-label="התקנת אפליקציה למסך הבית"
        >
          {/* Header Row: Logo, Title & Close Button */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <img
                  src="/rbs-touch-icon.png?v=rbs-logo-1"
                  alt="קטלוג RBS"
                  className="w-12 h-12 rounded-xl object-cover shadow-md border border-gray-100"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    if (!img.dataset.triedGoogle) {
                      img.dataset.triedGoogle = 'true';
                      img.src = 'https://lh3.googleusercontent.com/d/1bYu1HOoH9IzcCRruDwKXWN2wV_Z0B2Ge=w180-h180';
                    } else {
                      img.src = '/apple-touch-icon.png';
                    }
                  }}
                />
                <span className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5 shadow-xs">
                  <Sparkles size={11} className="stroke-[2.5]" />
                </span>
              </div>
              <div>
                <h3 className="text-[#0c2d57] font-extrabold text-base sm:text-lg leading-tight flex items-center gap-1.5">
                  <span>התקנת קטלוג RBS</span>
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm font-medium mt-0.5">
                  גישה מהירה ישירות ממסך הבית
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="סגור הצעה"
              title="סגור"
            >
              <X size={18} />
            </button>
          </div>

          {/* Feature Highlights */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#004387] bg-blue-50/80 px-2.5 py-1 rounded-full border border-blue-100">
              <Zap size={12} className="text-[#ff7a00]" />
              פתיחה מהירה בלחיצה
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50/80 px-2.5 py-1 rounded-full border border-emerald-100">
              <CheckCircle2 size={12} className="text-emerald-600" />
              ללא צורך בחנות אפליקציות
            </span>
          </div>

          {/* iOS Specific Step-by-Step Instructions */}
          {platform === 'ios' && showIOSGuide && (
            <div className="mt-3 p-3 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 rounded-xl border border-blue-100 text-xs text-gray-700 space-y-2">
              <p className="font-bold text-[#004387] flex items-center gap-1.5 text-xs sm:text-sm">
                <Smartphone size={15} />
                <span>הוספה פשוטה למסך הבית באייפון:</span>
              </p>
              <div className="grid grid-cols-1 gap-1.5 text-[12px]">
                <div className="flex items-center gap-2 bg-white/80 p-2 rounded-lg border border-blue-50 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-[#004387] text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                    1
                  </span>
                  <span>לחץ על כפתור השיתוף בתחתית הדפדפן</span>
                  <Share2 size={15} className="text-[#004387] mr-auto flex-shrink-0" />
                </div>
                <div className="flex items-center gap-2 bg-white/80 p-2 rounded-lg border border-blue-50 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-[#004387] text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                    2
                  </span>
                  <span>גלול ובחר באפשרות <strong>״הוסף למסך הבית״</strong></span>
                  <PlusSquare size={15} className="text-[#004387] mr-auto flex-shrink-0" />
                </div>
                <div className="flex items-center gap-2 bg-white/80 p-2 rounded-lg border border-blue-50 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-[#004387] text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                    3
                  </span>
                  <span>אשר בלחיצה על <strong>״הוסף״</strong> בצד שמאל למעלה</span>
                </div>
              </div>
            </div>
          )}

          {/* Desktop manual tip when native prompt isn't fired */}
          {platform === 'desktop' && !deferredPrompt && showIOSGuide && (
            <div className="mt-3 p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700">
              ניתן ללחוץ על סמל ההתקנה בשורת הכתובת של הדפדפן (סמל מסך או חץ למטה) או לפתוח את תפריט הדפדפן ולבחור <strong>"התקן אפליקציה"</strong>.
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-4 pt-1">
            {platform !== 'ios' && deferredPrompt && (
              <button
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#ff7a00] to-[#ea580c] hover:from-[#f97316] hover:to-[#c2410c] text-white font-bold text-sm py-2.5 px-4 rounded-xl shadow-md hover:shadow-lg active:scale-98 transition-all cursor-pointer disabled:opacity-60"
              >
                <Download size={17} className="stroke-[2.5]" />
                <span>{isInstalling ? 'מתקין...' : 'התקן עכשיו'}</span>
              </button>
            )}

            {platform === 'ios' && !showIOSGuide && (
              <button
                onClick={() => setShowIOSGuide(true)}
                className="flex-1 flex items-center justify-center gap-2 bg-[#004387] hover:bg-[#0c2d57] text-white font-bold text-sm py-2.5 px-4 rounded-xl shadow-md active:scale-98 transition-all cursor-pointer"
              >
                <Smartphone size={17} />
                <span>איך מתקינים באייפון?</span>
              </button>
            )}

            <button
              onClick={handleDismiss}
              className="px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              המשך בדפדפן
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function InstallBanner({ disabled = false }: InstallBannerProps) {
  return (
    <BannerErrorBoundary>
      <InstallBannerInner disabled={disabled} />
    </BannerErrorBoundary>
  );
}
