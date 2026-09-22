declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

const MEASUREMENT_ID = 'G-NZLQG68M22';

export const isAnalyticsReady = (): boolean => {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
};

const isDebugMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('ga_debug') === '1';
};

export const trackPageView = (path: string, title?: string) => {
  if (!isAnalyticsReady()) {
    if (// @ts-ignore
import.meta.env.DEV) {
      console.warn('Google Analytics is not ready. Skipping page_view track:', path);
    }
    return;
  }

  const params: any = {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  };

  if (isDebugMode()) {
    params.debug_mode = true;
  }

  window.gtag('event', 'page_view', params);
};

export const trackEvent = (eventName: string, params: Record<string, unknown> = {}) => {
  if (!isAnalyticsReady()) {
    if (// @ts-ignore
import.meta.env.DEV) {
      console.warn('Google Analytics is not ready. Skipping event track:', eventName);
    }
    return;
  }

  const eventParams: any = { ...params };
  
  if (isDebugMode()) {
    eventParams.debug_mode = true;
  }

  window.gtag('event', eventName, eventParams);
};
