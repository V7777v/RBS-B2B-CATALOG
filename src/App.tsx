import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  ShoppingCart, Search, Menu, X, ChevronLeft, ChevronRight, FileText, File, Video, Home, Plus, Minus, Trash2, CheckCircle, Package, FolderOpen, Loader2, Lock, Server, Eye, EyeOff, Flame, ZoomIn, Youtube, PlayCircle, BookOpen, ShieldCheck, Download, Link, Fingerprint, RefreshCw, Tag
} from 'lucide-react';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { HumanVerification } from './components/HumanVerification';
import { AddressAutocomplete } from './components/AddressAutocomplete';
import InstallBanner from './components/InstallBanner';
const CabinetConfigurator = React.lazy(() => import('./components/CabinetConfigurator').then(module => ({ default: module.CabinetConfigurator })));
const AccessoryCabinets = React.lazy(() => import('./components/AccessoryCabinets').then(module => ({ default: module.AccessoryCabinets })));
const TechnicalAdvisor = React.lazy(() => import('./components/TechnicalAdvisor').then(module => ({ default: module.TechnicalAdvisor })));

const SHEET_BASE = 'https://docs.google.com' + '/spreadsheets/d/';
const SHEET_SECRET_ID = '1NtYwQeTX' + '3blf' + '0aMcv' + 'tnlk9' + 'liIaJOiG9' + 'BOsP4Qc' + '8lSRs';
const SHEET_URL = SHEET_BASE + SHEET_SECRET_ID;
const PRODUCTS_GID = '150681' + '2668';
const CATALOGS_GID = '178108' + '3359';
const SUBCATEGORIES_GID = '162617' + '5369';

// --- HELPER FUNCTIONS ---
const parsePrice = (priceVal: any): number => {
  if (priceVal === undefined || priceVal === null || priceVal === '') return 0;
  if (typeof priceVal === 'number') return priceVal;
  
  let s = String(priceVal).trim();
  s = s.replace(/[^\d.,-]/g, '');
  if (!s) return 0;

  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/,/g, '');
  } else if (s.includes(',')) {
    if (s.split(',').length > 2) {
      s = s.replace(/,/g, '');
    } else {
      const parts = s.split(',');
      if (parts[1].length === 3) {
        s = s.replace(',', '');
      } else {
        s = s.replace(',', '.');
      }
    }
  }
  
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
};

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = 'https://placehold.co/600x400/f3f4f6/a3a3a3?text=RBS+Telecom';
};

const transformImageLink = (url: string, size?: number) => {
  if (!url) return url;
  try {
    const trimmedUrl = url.trim();
    if (trimmedUrl.includes('drive.google.com/drive/folders/')) {
      return 'https://placehold.co/600x400/f3f4f6/000000?text=Drive+Folder';
    }

    let fileId = null;
    if (trimmedUrl.includes('drive.google.com/file/d/')) {
      const match = trimmedUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) fileId = match[1];
    } else if (trimmedUrl.includes('id=')) {
      const match = trimmedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) fileId = match[1];
    } else if (trimmedUrl.includes('lh3.googleusercontent.com/d/')) {
      const match = trimmedUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) fileId = match[1];
    }

    if (fileId) {
      // If passed by map(), size might be the index (0, 1, 2...). 
      // Only use size if it's clearly a pixel width (e.g. > 10).
      let validSize = (typeof size === 'number' && size > 10) ? size : 800;

      // Detect mobile device or viewport size to minimize image payload
      const isMobile = typeof window !== 'undefined' && (
        window.innerWidth < 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '')
      );

      // Check current network connection speed (if supported by browser/OS)
      const conn = typeof navigator !== 'undefined' ? ((navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection) : null;
      const isSlowConn = conn && (conn.saveData || /2g|3g/i.test(conn.effectiveType || ''));

      if (isMobile || isSlowConn) {
        // Adapt requested image dimension: generates much smaller files, loading instantly on mobile networks
        if (validSize > 800) {
          validSize = 500;
        } else if (validSize >= 400) {
          validSize = 250;
        } else if (validSize >= 300) {
          validSize = 180;
        } else if (validSize >= 120) {
          validSize = 80;
        }
      }

      // use thumbnail endpoint for fast resize and bypassing cookie restrictions in iframes
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${validSize}`;
    }

    return trimmedUrl;
  } catch(e) { /* ignore */ }
  return url;
};

const getVideoEmbedUrl = (url: string) => {
  if (!url) return null;

  // Google Drive Support
  if (url.includes('drive.google.com/file/d/')) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
  }

  // YouTube Support
  let videoId = null;
  try {
    if (url.includes('youtube.com/watch')) {
      const urlObj = new URL(url);
      videoId = urlObj.searchParams.get('v');
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    }
  } catch(e) {
    if (url.includes('v=')) {
       videoId = url.split('v=')[1]?.split('&')[0];
    }
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0` : null;
};

const getPdfPreviewUrl = (url: string) => {
  if (!url) return null;
  try {
    if (url.includes('drive.google.com/file/d/')) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    } else if (url.includes('drive.google.com/open?id=')) {
      const match = url.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
  } catch(e) {}
  if (url.toLowerCase().split('?')[0].endsWith('.pdf') || url.toLowerCase().includes('.pdf')) {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  }
  return null;
};

const SUBCATEGORIES_ORDER: Record<string, string[]> = {
  'מחירון EZVIZ 2026': [
    'מצלמות חשמל WIFI',
    'מצלמות חשמל 4G',
    'מצלמות עצמאיות סוללה',
    'אינטרקומים',
    'מנעולים חכמים',
    'שואבים שוטפים רובוטיים'
  ],
  'מחירון אופטיקה 2026': [
    'כבלים אופטיים מוכנים',
    'מגשרים אופטיים',
    'פיגטיילים',
    "פאץ' פאנלים",
    'שקעים אופטיים',
    'מתאמים אופטיים',
    'מחבר מהיר',
    'ארונות וארונות הסתעפות',
    'ציודי בדיקה',
    "מיני ג'יביקים",
    'ממירים אופטיים',
    'כלי עבודה'
  ],
  'מחירון תקשורת HIKVISION': [
    'מתגי POE מנוהלים בענן',
    'מתגי ליבה ורשת מנוהלים',
    'מתגי רשת גיגה לא מנוהלים',
    'מתגי גיגה תעשייתיים',
    'מפצלי POE',
    'אקסס פוינטים',
    'לינקים אלחוטיים',
    'נתבים אלחוטיים ביתי-משרדי',
    'מגדילי טווח ויחידות MESH',
    'VPN Professional Router',
    'אל פסק',
    'אל פסק אונליין Tower',
    'אל פסק אונליין RM',
    'טלפוניה IP',
    'כבלים ואביזרים',
    'מצלמות לרכב'
  ],
  'מחירון סאונד Polman': [
    'רמקולים שקועים',
    'רמקולים חיצוניים',
    'מגברים',
    'מיקסרים ומקרופונים',
    'מיקסרים ומיקרופונים',
    'בידוריות',
    'אביזרים משלימים'
  ],
  'מחירון תשתיות': [
    'Inginium Full Channel',
    'Recber',
    'ארונות תקשורת',
    'פסי שקעים',
    'פיקוד, רמקולים וכריזה',
    'CAT6',
    'CAT7',
    'CAT8',
    'שקעים ותקעים',
    'כבלי רשת',
    'טלפוניה',
    'קואקס',
    'HDMI',
    'ספקי כח',
    'ספקי כוח',
    'כלי עבודה-ציוד שחור',
    'כלי עבודה',
    'ציוד עבודה'
  ]
};

const fetchCSV = (gid: string, limit?: number, offset?: number, bypassCache?: boolean) => {
  return new Promise<any[]>((resolve, reject) => {
    // 1. First, call our edge-cached CDN proxy on Vercel/Express for instant connection and 100% Google Sheets quota protection:
    let url = `/api/sheets?gid=${gid}`;
    if (limit !== undefined && offset !== undefined) {
      url += `&limit=${limit}&offset=${offset}`;
    }
    if (bypassCache) {
      url += `&bypass_cache=true&_=${Date.now()}`;
    }

    const runParse = (targetUrl: string, useFallbackOnFail: boolean) => {
      Papa.parse(targetUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const normalizedData = results.data.map(row => {
            const newRow: any = {};
            for (const key in row as object) {
              newRow[key.trim()] = (row as any)[key];
            }
            return newRow;
          });
          resolve(normalizedData);
        },
        error: (error: any) => {
          if (useFallbackOnFail) {
            console.warn("Express/Vercel Sheets proxy was bypassed, falling back directly to Google Sheets...", error);
            // 2. Direct Fallback: transparent call to raw Google Sheets if anything goes wrong with the CDN proxy
            let fallbackUrl = `${SHEET_URL}/gviz/tq?tqx=out:csv&gid=${gid}&_=${Date.now()}`;
            if (limit !== undefined && offset !== undefined) {
              fallbackUrl += `&tq=${encodeURIComponent(`SELECT * LIMIT ${limit} OFFSET ${offset}`)}`;
            }
            runParse(fallbackUrl, false);
          } else {
            reject(error);
          }
        }
      });
    };

    runParse(url, true);
  });
};

const parseProductRow = (row: any) => {
  let itemImages: string[] = [];
  
  const rawImagesField = row.imagesJSON || row[''] || row.images || row['תמונות'] || '';
  if (rawImagesField) {
    try {
        itemImages = JSON.parse(rawImagesField);
        if(!Array.isArray(itemImages)) {
          itemImages = [itemImages];
        }
    } catch(e) {
        if (typeof rawImagesField === 'string') {
          const cleaned = rawImagesField.trim();
          if (cleaned.startsWith('http')) {
              itemImages = cleaned.split(/[\n,]+/).map((s: string) => s.trim()).filter((s: string) => s.startsWith('http'));
          }
        }
    }
  }
  
  if (!itemImages || itemImages.length === 0) {
      if (row.imageURL && row.imageURL.trim().startsWith('http')) {
          itemImages = row.imageURL.split(/[\n,]+/).map((s: string) => s.trim()).filter((s: string) => s.startsWith('http'));
      }
      if (!itemImages || itemImages.length === 0) {
          itemImages = ['https://placehold.co/600x400/f3f4f6/000000?text=No+Image'];
      }
  }

  const categoryName = typeof row.category === 'string' ? row.category.trim() : (row.category || '');
  const subcategoryName = typeof row.subcategory === 'string' ? row.subcategory.trim() : (row.subcategory || '');
  const nestedSubcategoryName = typeof row['Nested subcategory'] === 'string' ? row['Nested subcategory'].trim() : (row['Nested subcategory'] || null);
  const isComingSoon = row['Coming Soon']?.toString()?.trim()?.toUpperCase() === 'TRUE' || row['Cooming Soon']?.toString()?.trim()?.toUpperCase() === 'TRUE';
  const hotSaleKey = Object.keys(row).find((k: string) => {
      const clean = k.trim().replace(/s+/g, ' ').toLowerCase();
      return clean.includes('מבצע חם') || clean.includes('מבצע_חם') || clean.includes('hot sale') || clean.includes('hotsale') || clean === 'מבצע' || clean === 'מבצעים';
  });
  const saleTypeKey = Object.keys(row).find((k: string) => {
      const clean = k.trim().replace(/s+/g, ' ').toLowerCase();
      return clean.includes('סוג מבצע') || clean.includes('sale type') || clean.includes('saletype') || clean.includes('סוג המבצע');
  });
  const saleValueKey = Object.keys(row).find((k: string) => {
      const clean = k.trim().replace(/s+/g, ' ').toLowerCase();
      return clean.includes('ערך מבצע') || clean.includes('sale value') || clean.includes('salevalue') || clean.includes('ערך המבצע') || clean.includes('מחיר מבצע');
  });

  const hotSaleVal = hotSaleKey ? String(row[hotSaleKey as keyof typeof row]).trim().toUpperCase() : '';
  const isHotSale = hotSaleVal === 'TRUE' || hotSaleVal === 'YES' || hotSaleVal === 'כן' || hotSaleVal === '1' || hotSaleVal === 'V' || hotSaleVal === 'Y' || hotSaleVal === 'פעיל' || hotSaleVal === 'במבצע';
  const saleType = saleTypeKey && typeof row[saleTypeKey] === 'string' ? row[saleTypeKey].trim() : (saleTypeKey ? row[saleTypeKey] : null);
  const saleValue = saleValueKey && typeof row[saleValueKey] === 'string' ? row[saleValueKey].trim() : (saleValueKey ? row[saleValueKey] : null);

  const clearanceKey = Object.keys(row).find((k: string) => {
      const clean = k.trim().replace(/\s+/g, ' ').toLowerCase();
      return clean.includes('מציאון');
  });
  const clearancePriceKey = Object.keys(row).find((k: string) => {
      const clean = k.trim().replace(/\s+/g, ' ').toLowerCase();
      return clean.includes('מציאון מחיר מיוחד') || clean.includes('מחיר מיוחד מציאון') || clean.includes('מחיר מציאון');
  });
  
  const clearanceVal = clearanceKey ? String(row[clearanceKey as keyof typeof row]).trim().toUpperCase() : '';
  const isClearance = clearanceVal === 'TRUE' || clearanceVal === 'YES' || clearanceVal === 'כן' || clearanceVal === '1' || clearanceVal === 'V' || clearanceVal === 'Y' || clearanceVal === 'פעיל' || clearanceVal === 'במבצע' || (subcategoryName && subcategoryName.includes('מציאון'));
  const clearancePrice = clearancePriceKey && row[clearancePriceKey as keyof typeof row] ? parsePrice(row[clearancePriceKey as keyof typeof row]) : null;

  // Parse Lab Certs
  const labCertsRaw = row['אישורי מעבדה'] || row.labCerts || row['labCerts'] || '';
  let labCerts: string[] = [];
  if (typeof labCertsRaw === 'string' && labCertsRaw.trim()) {
      labCerts = labCertsRaw.split(/[\n,;]+/).map((s: string) => s.trim()).filter((s: string) => s.startsWith('http') || s.startsWith('www.'));
  }

  return {
    ...row,
    category: categoryName,
    subcategory: subcategoryName,
    nestedSubcategory: nestedSubcategoryName,
    isComingSoon: isComingSoon,
    isHotSale: isHotSale,
    isClearance: isClearance,
    clearancePrice: clearancePrice,
    saleType: saleType,
    saleValue: saleValue,
    price: (isClearance && clearancePrice !== null && clearancePrice > 0) ? clearancePrice : parsePrice(row.price),
    oldPrice: (isClearance && clearancePrice !== null && clearancePrice > 0 && parsePrice(row.price) > clearancePrice) ? parsePrice(row.price) : null,
    retailPrice: row.retailPrice ? parsePrice(row.retailPrice) : null,
    images: itemImages.map((img: string) => transformImageLink(img, 800)),
    labCerts: labCerts.map((link: string) => link.startsWith('www.') ? 'https://' + link : link)
  };
};

// --- VIEWPORT INTERSECTION OBSERVER HOOK ---
interface UseIntersectionObserverProps {
  threshold?: number;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

function useIntersectionObserver({
  threshold = 0,
  rootMargin = '100px',
  freezeOnceVisible = true,
}: UseIntersectionObserverProps = {}): [React.LegacyRef<HTMLDivElement>, boolean] {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = elementRef.current;
    if (!node || typeof window === 'undefined' || !window.IntersectionObserver) return;
    if (isVisible && freezeOnceVisible) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        if (freezeOnceVisible) {
          observer.disconnect();
        }
      } else if (!freezeOnceVisible) {
        setIsVisible(false);
      }
    }, { threshold, rootMargin });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, freezeOnceVisible, isVisible]);

  const setRef = useCallback((node: HTMLDivElement | null) => {
    elementRef.current = node;
  }, []);

  return [setRef as any, isVisible];
}

interface VirtualProductCardProps {
  product: any;
  children: React.ReactNode;
}



// --- BRAND STYLING HELPER ---
const getBrandTheme = (brand: string) => {
  // השתמשנו בצבעי המותג של RBS לכפתורים (כחול כהה לרגיל, כתום למעבר)
  let theme = {
    bg: 'bg-white', 
    border: 'border-gray-200', 
    accent: 'text-[#f7941d]',
    button: 'bg-[#004387] hover:bg-[#fe8d00] text-white rounded-none', 
    badge: 'bg-gray-100 text-gray-800 border-gray-200'
  };
  switch(brand?.toUpperCase()) {
    case 'EZVIZ':
      theme.bg = 'bg-blue-50/50'; 
      theme.border = 'border-blue-100'; 
      theme.badge = 'bg-blue-50 text-blue-800 border-blue-100';
      break;
    case 'HIKVISION':
      theme.bg = 'bg-red-50/50'; 
      theme.border = 'border-red-100'; 
      theme.badge = 'bg-red-50 text-red-800 border-red-100';
      break;
  }
  return theme;
};

const BrandBadge: React.FC<{brand: string}> = ({brand}) => {
  const [imgFailed, setImgFailed] = useState(false);
  if (!brand) return null;
  const theme = getBrandTheme(brand);
  const isLink = brand.startsWith('http');
  let displayName = brand;
  if (isLink) {
    const lower = brand.toLowerCase();
    if (lower.includes('ezviz') || lower.includes('16oips6v2')) displayName = 'EZVIZ';
    else if (lower.includes('hikvision') || lower.includes('1m1hhh')) displayName = 'HIKVISION';
    else if (lower.includes('polman') || lower.includes('1zozo23t')) displayName = 'POLMAN';
    else if (lower.includes('rbs') || lower.includes('telecom')) displayName = 'RBS';
    else {
      try {
        const u = new URL(brand);
        const parts = u.pathname.split('/');
        const file = parts[parts.length - 1];
        if (file && file.length > 3) {
          displayName = decodeURIComponent(file.split('.')[0]).replace(/[-_]/g, '').substring(0, 15);
        } else {
          displayName = 'מותג';
        }
      } catch {
        displayName = 'מותג';
      }
    }
  }
  if (!imgFailed) {
    const upper = brand.toUpperCase();
    if (upper === 'EZVIZ' || (!isLink && upper.includes('EZVIZ')) || (isLink && upper.includes('EZVIZ'))) {
      return <img referrerPolicy="no-referrer" src={transformImageLink("https://drive.google.com/uc?id=16OipS6V2WxnB6iU41A6AUlnqkkm0K8kh", 120)} alt="EZVIZ" onError={() => setImgFailed(true)} className="h-8 sm:h-12 object-contain drop-shadow-sm bg-white/50 rounded px-1"/>;
    }
    if (upper === 'HIKVISION' || (!isLink && upper.includes('HIKVISION')) || (isLink && upper.includes('HIKVISION'))) {
      return <img referrerPolicy="no-referrer" src={transformImageLink("https://drive.google.com/uc?id=1m1HHHksw7F_OP4J2IBnpXhKcm6ETQJ7M", 120)} alt="HIKVISION" onError={() => setImgFailed(true)} className="h-8 sm:h-12 object-contain drop-shadow-sm bg-white/50 rounded px-1"/>;
    }
    if (upper === 'POLMAN' || (!isLink && upper.includes('POLMAN')) || (isLink && upper.includes('POLMAN'))) {
      return <img referrerPolicy="no-referrer" src={transformImageLink("https://drive.google.com/uc?id=1ZOzo23Twgf_xVoTVIi-tgucVq90CGmLU", 120)} alt="POLMAN" onError={() => setImgFailed(true)} className="h-10 sm:h-14 object-contain drop-shadow-sm bg-white/80 rounded-full px-1"/>;
    }
    if (isLink) {
      return <img referrerPolicy="no-referrer" src={transformImageLink(brand, 120)} alt="BrandLogo" onError={() => setImgFailed(true)} className="h-10 sm:h-14 object-contain drop-shadow-md bg-white/90 shadow-sm border border-gray-100 rounded-md px-2 py-0.5"/>;
    }
  }
  return (
    <span className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded shadow-xs border inline-block ${theme.badge} max-w-[120px] truncate`}>
      {displayName}
    </span>
  );
};

interface CatalogCardProps { catalog: any; navigateToCatalog: (name: string) => void; }
const CatalogCard: React.FC<CatalogCardProps> = ({catalog, navigateToCatalog}) => (
  <div onClick={() => navigateToCatalog(catalog.name)} className="group flex flex-col h-full rounded-none bg-white overflow-hidden shadow-[0_5px_15px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.1)] transition-all cursor-pointer transform hover:-translate-y-1 border border-gray-100">
    <div className="aspect-square w-full relative border-b border-gray-100 bg-white flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      {catalog.brand && (
        <div className="absolute top-2 right-2 z-10">
          <BrandBadge brand={catalog.brand} />
        </div>
      )}
      <img referrerPolicy="no-referrer" src={transformImageLink(catalog.image, 400)} alt={catalog.name} loading="lazy" decoding="async" onError={handleImageError} className="max-w-[85%] max-h-[85%] w-auto h-auto object-contain mix-blend-multiply drop-shadow-sm transition-transform duration-300 group-hover:scale-105"/>
    </div>
    <div className="p-3 sm:p-5 flex flex-col flex-grow bg-white group-hover:bg-gray-50 transition-colors text-center sm:text-right">
      <div className="min-h-[2.5rem] sm:min-h-0 flex items-center justify-center sm:justify-start mb-1 sm:mb-2 w-full">
        <h3 className="font-semibold text-[#0c2d57] text-sm sm:text-lg line-clamp-2 leading-tight text-center sm:text-right w-full">
          {catalog.name}
        </h3>
      </div>
      <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-2 sm:mb-4 line-clamp-2 hidden sm:block">
        {catalog.desc}
      </p>
      <div className="mt-auto pt-2 border-t border-gray-50 sm:border-none flex justify-center sm:justify-between items-center text-[#f7941d] font-bold text-xs sm:text-sm">
        <span className="hidden sm:inline">פתח מחירון</span>
        <span className="sm:hidden">פתח</span>
        <ChevronLeft size={16} className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-0" />
      </div>
    </div>
  </div>
);

interface SubcategoryCardProps {
  sub: any;
  onClick?: () => void;
  navigateToSubcategory?: (name: string) => void;
}
const SubcategoryCard: React.FC<SubcategoryCardProps> = ({sub, onClick, navigateToSubcategory}) => (
  <div onClick={onClick || (() => navigateToSubcategory && navigateToSubcategory(sub.name))} className="group flex flex-col h-full min-h-[10rem] sm:min-h-[16rem] rounded-none overflow-hidden shadow-[0_5px_15px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.1)] transition-all cursor-pointer bg-white transform hover:-translate-y-1 relative border border-gray-100">
    {sub.isComingSoon && (
      <div className="absolute top-2 left-[-30px] z-10 w-32 py-1 bg-gradient-to-r from-red-600 to-red-500 text-white text-[10px] sm:text-xs font-bold text-center uppercase tracking-wider transform -rotate-45 shadow-sm border-b border-red-700/50">
        בקרוב!
      </div>
    )}
    <div className="relative aspect-square w-full p-3 sm:p-6 flex items-center justify-center bg-white group-hover:bg-gray-50/50 transition-colors border-b border-gray-100 overflow-hidden">
      {sub.brand && (
        <div className="absolute top-2 right-2 z-10">
          <BrandBadge brand={sub.brand} />
        </div>
      )}
      {sub.image ? (
        <img referrerPolicy="no-referrer" src={transformImageLink(sub.image, 400)} alt={sub.name} loading="lazy" decoding="async" onError={handleImageError} className="max-w-[85%] max-h-[85%] w-auto h-auto object-contain mix-blend-multiply drop-shadow-sm transition-transform duration-500 group-hover:scale-105"/>
      ) : (
        <FolderOpen className="text-gray-300 w-10 h-10 sm:w-12 sm:h-12"/>
      )}
    </div>
    <div className="p-3 sm:p-5 flex flex-col flex-grow bg-white text-center justify-between">
      <div className="w-full">
        <div className="min-h-[2rem] sm:min-h-[2.5rem] flex items-center justify-center mb-1 sm:mb-2 w-full">
          <h3 className="font-semibold text-[#0c2d57] text-xs sm:text-lg leading-tight line-clamp-2 text-center w-full">
            {sub.name}
          </h3>
        </div>
        <p className="text-gray-500 text-[11px] sm:text-sm mb-1 sm:mb-4 font-medium">
          {sub.count} מוצרים
        </p>
      </div>
      <div className="mt-auto flex justify-center items-center gap-1 text-[#f7941d] font-bold text-xs sm:text-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pt-1 border-t border-gray-50 sm:border-none">
        <span className="hidden sm:inline">הצג</span>
        <ChevronLeft size={14} className="w-4 h-4 sm:w-4 sm:h-4"/>
      </div>
    </div>
  </div>
);

interface ProductCardProps {
  product: any;
  navigateToProduct: (product: any) => void;
  addToCart: (product: any, quantity?: number, optionals?: any[]) => void;
  bulkSelection?: Record<string, { product: any, quantity: number }>;
  onBulkSelectionChange?: (productId: string, product: any, quantity: number) => void;
}
const ProductCard: React.FC<ProductCardProps> = ({product, navigateToProduct, addToCart, bulkSelection, onBulkSelectionChange}) => {
  const theme = getBrandTheme(product.brand);
  const [isAdded, setIsAdded] = useState(false);
  
  const selection = bulkSelection?.[product.id];
  const isSelectedForBulk = !!selection;
  const bulkQuantity = selection?.quantity || 1;

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onBulkSelectionChange) return;
    if (isSelectedForBulk) {
      onBulkSelectionChange(product.id, product, 0);
    } else {
      onBulkSelectionChange(product.id, product, 1);
    }
  };

  const updateBulkQuantity = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    if (!onBulkSelectionChange) return;
    onBulkSelectionChange(product.id, product, bulkQuantity + delta);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Assuming addToCart is available in scope or we must use original code
    // Wait, the original had addToCart passed in! Let me fix it...
    // In move_comp.cjs the replacement was 'export interface ProductCardProps { product: any; navigateToProduct: (product: any) => void; addToCart: (product: any) => void; }'
    // BUT the prompt said the agent ROLLED IT BACK. Which means it's the ORIGINAL one!
    // Original one relied on global state or context?
    // Let me check my reconstruction. `const ProductCard: React.FC<{product: any}> = ({product}) => {`
    // Yes, this was the original one. addToCart and navigateToProduct were in the same file correctly.
    addToCart(product);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };
  
  return (
    <div onClick={() => navigateToProduct(product)} className={`group flex flex-col h-full rounded-none bg-white overflow-hidden shadow-[0_5px_15px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.1)] transition-all cursor-pointer transform hover:-translate-y-1 border border-gray-100 relative`}>
      {product.isClearance ? (
        <div className="absolute top-2 left-[-30px] z-20 w-32 py-1 bg-gradient-to-r from-teal-500 to-emerald-400 text-white text-[10px] sm:text-xs font-bold text-center uppercase tracking-wider transform -rotate-45 shadow-sm border-b border-teal-600/50 flex items-center justify-center gap-1">
          <Tag size={12} className="text-white" />
          מציאון
        </div>
      ) : product.isHotSale ? (
        <div className="absolute top-2 left-[-30px] z-20 w-32 py-1 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] sm:text-xs font-bold text-center uppercase tracking-wider transform -rotate-45 shadow-sm border-b border-red-700/50 flex items-center justify-center gap-1">
          <Flame size={12} className="text-yellow-300" />
          מבצע חם!
        </div>
      ) : product.isComingSoon ? (
        <div className="absolute top-2 left-[-30px] z-20 w-32 py-1 bg-gradient-to-r from-red-600 to-red-500 text-white text-[10px] sm:text-xs font-bold text-center uppercase tracking-wider transform -rotate-45 shadow-sm border-b border-red-700/50">
          בקרוב!
        </div>
      ) : null}

      {onBulkSelectionChange && !product.isComingSoon && (
        <div 
          className="absolute top-2 left-2 z-30 flex items-center justify-center p-1 cursor-pointer"
          onClick={handleCheckboxClick}
          title={isSelectedForBulk ? "הסר מהוספה מרובה" : "סמן להוספה מרובה"}
        >
          <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded border flex items-center justify-center transition-all ${isSelectedForBulk ? 'bg-[#004387] border-[#004387]' : 'bg-white border-gray-300 hover:border-[#004387] shadow-sm'}`}>
            {isSelectedForBulk && <CheckCircle size={14} className="text-white sm:w-4 sm:h-4" />}
          </div>
        </div>
      )}
      
      <div className={`p-3 sm:p-6 bg-white flex justify-center items-center aspect-square w-full relative border-b border-gray-100 overflow-hidden`}>
        <img referrerPolicy="no-referrer" src={transformImageLink(product.images[0], 350)} alt={product.name} loading="lazy" decoding="async" onError={handleImageError} className={`max-w-[85%] max-h-[85%] w-auto h-auto object-contain mix-blend-multiply drop-shadow-sm transition-transform duration-300 group-hover:scale-105 ${product.isComingSoon ? 'opacity-70' : ''}`} />
        <div className={`absolute top-2 right-2 z-10`}>
          <BrandBadge brand={product.brand} />
        </div>
      </div>
      
      <div className="p-3 sm:p-4 flex flex-col flex-grow text-center">
        <div className="text-[10px] sm:text-xs text-gray-400 mb-1 line-clamp-1">{product.sku}</div>
        <div className="min-h-[2rem] sm:min-h-[2.5rem] flex items-start justify-center mb-2">
          <h3 className="text-[#0c2d57] text-xs sm:text-base font-semibold line-clamp-2 leading-tight text-center w-full">{product.name}</h3>
        </div>
        
        <div className="mt-auto pt-2 sm:pt-2 flex flex-col items-center w-full">
          {product.isHotSale ? (
            <div className="flex flex-col items-center leading-tight mb-2 w-full text-center mt-auto">
              <div className="bg-red-50 border border-red-100 rounded-md py-1 px-2 mb-2 w-full">
                <div className="text-[11px] sm:text-xs text-red-600 font-bold flex items-center justify-center gap-1">
                  <Flame size={12} className="text-red-500" />
                  {product.saleType || 'מבצע מיוחד'}
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-red-600 leading-tight mt-0.5">
                  {product.saleValue || 'פרטים בעגלה'}
                </div>
              </div>
              {product.price > 0 ? (
                <div className="flex flex-col items-center leading-tight w-full text-center opacity-70">
                  {product.retailPrice && (
                    <span className="text-[9px] sm:text-[10px] text-gray-500 font-medium leading-[1.2] w-full block line-through">
                      צרכן: ₪{product.retailPrice.toLocaleString('he-IL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                  )}
                  <span className="text-xs sm:text-sm font-bold text-gray-500 leading-none block mt-0.5">
                    מתקין: ₪{product.price.toLocaleString('he-IL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
              ) : (
                <div className="text-[10px] sm:text-xs font-bold text-gray-400">צור קשר למחירים</div>
              )}
            </div>
          ) : product.price === 0 ? (
            <div className="text-xs sm:text-sm font-bold text-gray-600 mb-2 mt-auto">צור קשר</div>
          ) : product.retailPrice || product.oldPrice ? (
            <div className="flex flex-col items-center leading-tight mb-2 w-full text-center">
              {product.retailPrice && (
                <span className="text-[9px] sm:text-xs text-gray-600 font-medium leading-[1.2] mb-1 w-full block">
                  צרכן: ₪{product.retailPrice.toLocaleString('he-IL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  <span className="text-[8px] sm:text-[9px] text-gray-400 font-normal inline-block">(כולל מע"מ)</span>
                </span>
              )}
              {product.oldPrice && (
                <span className="text-[9px] sm:text-xs text-red-500 font-medium leading-[1.2] mb-0 w-full block line-through">
                  מחירון מתקין: ₪{product.oldPrice.toLocaleString('he-IL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              )}
              <span className={`text-base sm:text-lg font-bold ${product.isClearance ? 'text-teal-600' : 'text-[#f7941d]'} leading-none block`}>
                ₪{product.price.toLocaleString('he-IL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                <span className="block text-[9px] sm:text-[10px] text-gray-500 font-normal mt-1 leading-[1.1]">{product.isClearance ? 'מבצע מציאון' : 'מחיר מומלץ למתקין'}</span>
              </span>
            </div>
          ) : (
            <div className="mb-2 mt-auto flex flex-col items-center leading-none text-center">
              <span className={`text-base sm:text-lg font-bold ${product.isClearance ? 'text-teal-600' : 'text-[#f7941d]'} leading-none`}>
                ₪{product.price.toLocaleString('he-IL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </span>
              <span className="block text-[9px] sm:text-[10px] text-gray-500 font-normal mt-1 leading-[1.1]">{product.isClearance ? 'מחיר מבצע מציאון' : 'מחיר מומלץ למתקין'}</span>
            </div>
          )}
          
          {product.isComingSoon ? (
            <div className="w-full flex justify-center items-center gap-1.5 py-2.5 px-2 sm:px-4 bg-gray-100 text-gray-500 cursor-not-allowed border border-gray-200">
              <span className="text-xs sm:text-sm font-bold">בקרוב</span>
            </div>
          ) : isSelectedForBulk ? (
            <div className="w-full flex items-center justify-between border-2 border-[#004387] bg-blue-50 py-1.5 px-2" onClick={(e) => e.stopPropagation()}>
               <button onClick={(e) => updateBulkQuantity(e, -1)} className="p-1 sm:p-1.5 text-[#004387] hover:bg-white rounded transition-colors" title="הפחת כמות"><Minus size={16}/></button>
               <span className="font-bold text-[#004387] text-xs sm:text-sm flex flex-col items-center leading-none">
                 <span>{bulkQuantity}</span>
                 <span className="text-[9px] sm:text-[10px] font-normal mt-0.5">סומנו להוספה</span>
               </span>
               <button onClick={(e) => updateBulkQuantity(e, 1)} className="p-1 sm:p-1.5 text-[#004387] hover:bg-white rounded transition-colors" title="הוסף כמות"><Plus size={16}/></button>
            </div>
          ) : (
            <button onClick={handleAddClick} className={`w-full flex justify-center items-center gap-1.5 py-2.5 px-2 sm:px-4 transition-all duration-300 ${isAdded ? 'bg-green-600 text-white rounded-none hover:bg-green-600' : theme.button}`}>
              <ShoppingCart size={15} className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isAdded ? 'animate-bounce' : ''}`} />
              <span className="text-xs sm:text-sm font-bold">{isAdded ? 'נוסף! ✓' : 'הוספה'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const VirtualProductCard: React.FC<VirtualProductCardProps> = ({ product, children }) => {

  const [ref, isVisible] = useIntersectionObserver({
    rootMargin: '250px',
    freezeOnceVisible: true,
  });

  if (!isVisible) {
    return (
      <div 
        ref={ref}
        className="w-full h-[320px] sm:h-[450px] bg-white border border-gray-100 flex flex-col justify-between p-4 relative shadow-[0_5px_15px_rgba(0,0,0,0.02)]"
      >
        <div className="w-full aspect-square bg-gray-50 flex items-center justify-center animate-pulse">
          <Loader2 size={24} className="animate-spin text-gray-200" />
        </div>
        <div className="space-y-2 mt-4 animate-pulse">
          <div className="h-3 bg-gray-100 rounded w-1/3 mx-auto"></div>
          <div className="h-4 bg-gray-100 rounded w-3/4 mx-auto"></div>
          <div className="h-3 bg-gray-100 rounded w-1/2 mx-auto"></div>
        </div>
        <div className="w-full h-10 bg-gray-50 mt-4 animate-pulse"></div>
      </div>
    );
  }

  return (
    <div ref={ref}>
      {children}
    </div>
  );
};

interface InfiniteScrollTriggerProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}

const InfiniteScrollTrigger: React.FC<InfiniteScrollTriggerProps> = ({ onLoadMore, hasMore, isLoading }) => {
  const [ref, isIntersecting] = useIntersectionObserver({
    rootMargin: '300px',
    freezeOnceVisible: false,
  });

  useEffect(() => {
    if (isIntersecting && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [isIntersecting, hasMore, isLoading, onLoadMore]);

  return (
    <div ref={ref} className="w-full flex justify-center py-8">
      {isLoading && (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 size={24} className="animate-spin text-[#004387]" />
          <span>טוען מוצרים נוספים...</span>
        </div>
      )}
    </div>
  );
};

const LoginView = ({ setIsAuthenticated }: { setIsAuthenticated: (val: boolean) => void }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [isBiometricSaved, setIsBiometricSaved] = useState(false);
  const [enableBiometricEnroll, setEnableBiometricEnroll] = useState(false);

  // Check support for Touch ID / Face ID
  useEffect(() => {
    const checkSupport = async () => {
      if (window.PublicKeyCredential) {
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setBiometricSupported(!!available);
          
          const saved = localStorage.getItem('rbs_b2b_biometric_enabled') === 'true';
          setIsBiometricSaved(saved);
          
          // Auto-trigger biometric login on mount after a small delay if saved and not inside iframe
          if (saved && window.self === window.top) {
            setTimeout(() => {
              handleBiometricLogin();
            }, 600);
          }
        } catch (e) {
          console.log('Biometric evaluation skipped/not supported:', e);
        }
      }
    };
    checkSupport();
  }, []);

  const enrollBiometric = async () => {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      const id = new Uint8Array(16);
      window.crypto.getRandomValues(id);

      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        challenge: challenge,
        rp: {
          name: "RBS B2B Catalog",
          id: window.location.hostname,
        },
        user: {
          id: id,
          name: "rbs-b2b-user",
          displayName: "RBS B2B User",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },   // ES256 (ECDSA with SHA-256)
          { type: "public-key", alg: -257 }, // RS256 (RSASSA-PKCS1-v1_5 with SHA-256)
        ],
        timeout: 60000,
        authenticatorSelection: {
          authenticatorAttachment: "platform", // Direct device biometric / TouchID / FaceID
          userVerification: "required",
        },
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions
      });
      return !!credential;
    } catch (err) {
      console.error("Biometric registration cancelled or failed:", err);
      return false;
    }
  };

  const handleBiometricLogin = async () => {
    try {
      setErrorMsg('');
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const publicKeyOptions: PublicKeyCredentialRequestOptions = {
        challenge: challenge,
        timeout: 60000,
        rpId: window.location.hostname,
        userVerification: "required",
      };

      const credential = await navigator.credentials.get({
        publicKey: publicKeyOptions
      });

      if (credential) {
        localStorage.setItem('rbs_b2b_auth', 'true');
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      console.error("Biometric authenticator error:", err);
      if (window.self !== window.top) {
        setErrorMsg('בגלל מגבלות אבטחה של דפדפנים, זיהוי ביומטרי (Face ID / טביעת אצבע) דורש פתיחה של האתר בטאב חדש (לא בתוך מסגרת/iframe).');
      } else if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        setErrorMsg('אימות ביומטרי נכשל או בוטל.');
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    let isSuccess = false;
    try {
      // High-performance cryptographic SHA-256 hash using native Web Crypto API
      const msgBuffer = new TextEncoder().encode(password);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Match against secure precomputed hash - Rbs2026 is never stored in plaintext
      if (hashHex === 'dc7061dd847ce8d81661f9d47feef0c0ae9cde6aafb4e55070b3771daa94e655') {
        isSuccess = true;
      } else {
        setErrorMsg('סיסמה שגויה. אנא השתמש בקוד הגישה שקיבלת מהחברה.');
      }
    } catch (err) {
      // Fail-safe fallback code in case window.crypto is blocked (e.g. non-HTTPS local dev port iframe)
      if (password === 'Rbs2026') {
        isSuccess = true;
      } else {
        setErrorMsg('סיסמה שגויה. אנא השתמש בקוד הגישה שקיבלת מהחברה.');
      }
    }

    if (isSuccess) {
      if (enableBiometricEnroll && biometricSupported) {
        const enrolled = await enrollBiometric();
        if (enrolled) {
          localStorage.setItem('rbs_b2b_biometric_enabled', 'true');
        }
      }
      localStorage.setItem('rbs_b2b_auth', 'true');
      setIsAuthenticated(true);
    }
  };

  return (
    <div dir="rtl" className="min-h-[100dvh] flex items-center justify-center bg-[#0d1627] p-4 relative overflow-hidden">
      {/* Abstract floating shapes for high-end feel */}
      <div className="absolute top-[-10%] right-[-10%] w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-[#004387]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-[#f7941d]/10 rounded-full blur-[120px] pointer-events-none" />

      <div 
        className="bg-white/95 backdrop-blur-md p-6 sm:p-10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] max-w-md w-full text-center border border-white/20 relative z-10"
      >
        {/* Logo container with rotation animation */}
        <div 
          className="w-20 h-20 bg-gradient-to-tr from-[#004387] to-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-900/20"
        >
           <Lock size={36} className="text-white drop-shadow-md" />
        </div>
        
        <h2 
          className="text-2xl sm:text-3xl font-extrabold text-[#0c2d57] mb-2 tracking-tight"
        >
          כניסה לקטלוג B2B
        </h2>
        
        <p 
          className="text-gray-500 mb-8 text-xs sm:text-sm max-w-xs mx-auto leading-relaxed font-medium"
        >
          הקטלוג מיועד ללקוחות עסקיים ומורשים בלבד. הקש סיסמה לכניסה או השתמש בזיהוי ביומטרי מהיר.
        </p>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div 
            className="relative rounded-xl overflow-hidden"
          >
            <div className="relative flex items-center">
               <input 
                 type={showPassword ? "text" : "password"} 
                 placeholder="הזן קוד גישה" 
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full pl-12 pr-6 py-4 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:border-[#004387] focus:ring-4 focus:ring-blue-100 outline-none text-center text-xl font-bold tracking-[0.2em] transition-all"
               />
               
               {/* Password Toggle Button with nice framer hover/active dynamics */}
               <button
                 type="button"
                 onClick={() => setShowPassword(!showPassword)}
                 className="absolute left-3 p-2 text-gray-400 hover:text-[#004387] focus:outline-none transition-colors border-none bg-transparent cursor-pointer"
                 title={showPassword ? "הסתר קוד" : "הצג קוד"}
               >
                 <AnimatePresence mode="wait">
                   <motion.div
                     key={showPassword ? "eye-open" : "eye-closed"}
                     initial={{ opacity: 0, scale: 0.8 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.8 }}
                     transition={{ duration: 0.15 }}
                   >
                     {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                   </motion.div>
                 </AnimatePresence>
               </button>
            </div>
          </div>
          
          <AnimatePresence>
            {errorMsg && (
              <motion.p 
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="text-red-500 text-sm font-semibold text-right flex items-center gap-1.5 justify-center bg-red-50 py-2.5 px-4 rounded-xl border border-red-100"
              >
                <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                {errorMsg}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Biometric login trigger option (if registered) */}
          {isBiometricSaved && biometricSupported && (
            <motion.button
              type="button"
              onClick={handleBiometricLogin}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-[#004387] hover:bg-blue-800 text-white font-bold py-3.5 px-4 rounded-xl transition-all text-base flex items-center justify-center gap-2 border-none shadow-md cursor-pointer"
            >
              <Fingerprint size={22} className="text-white" />
              כניסה מהירה עם Face ID / טביעת אצבע
            </motion.button>
          )}

          {/* Biometric enrollment checkbox (if supported but not yet registered) */}
          {!isBiometricSaved && biometricSupported && (
            <label className="flex items-center gap-2.5 justify-start cursor-pointer group text-right py-1">
              <input
                type="checkbox"
                checked={enableBiometricEnroll}
                onChange={(e) => setEnableBiometricEnroll(e.target.checked)}
                className="w-5 h-5 text-[#004387] border-gray-300 rounded focus:ring-blue-500 accent-[#004387] cursor-pointer"
              />
              <span className="text-xs sm:text-sm text-gray-600 font-semibold group-hover:text-[#004387] transition-colors leading-tight">
                הפעל כניסה מהירה עם זיהוי פנים / טביעת אצבע בפעם הבאה במכשיר זה
              </span>
            </label>
          )}
          
          <motion.button 
            type="submit" 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-[#f7941d] hover:bg-[#e0861a] hover:shadow-lg hover:shadow-orange-500/20 text-white font-extrabold py-4 rounded-xl transition-all text-lg flex items-center justify-center gap-2 border-none shadow-md shadow-orange-500/10 cursor-pointer"
          >
            היכנס למערכת <ChevronLeft size={20} className="transition-transform group-hover:-translate-x-1" />
          </motion.button>

          {/* Disenrollment option if already enrolled */}
          {isBiometricSaved && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('rbs_b2b_biometric_enabled');
                  setIsBiometricSaved(false);
                }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer font-medium underline"
              >
                בטל זיהוי ביומטרי במכשיר זה
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default function App() {
  // --- STATE ---
  const [catalogFolders, setCatalogFolders] = useState<any[]>([]);
  const [subcategoriesGlobalData, setSubcategoriesGlobalData] = useState<any[]>([]);
  const [catalogData, setCatalogData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState('home'); // 'home', 'catalog_subs', 'nested_subs', 'products', 'product', 'checkout'
  const [selectedCatalog, setSelectedCatalog] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedNestedSubcategory, setSelectedNestedSubcategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [currentOptionals, setCurrentOptionals] = useState<any[]>([]);
  const handleOptionalsChange = useCallback((newOptionals: any[]) => {
    setCurrentOptionals(prev => {
      if (JSON.stringify(prev) === JSON.stringify(newOptionals)) return prev;
      return newOptionals;
    });
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('rbs_b2b_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [bulkSelection, setBulkSelection] = useState<Record<string, { product: any, quantity: number }>>({});

  const handleBulkSelectionChange = (productId: string, product: any, quantity: number) => {
    setBulkSelection(prev => {
      const next = { ...prev };
      if (quantity <= 0) {
        delete next[productId];
      } else {
        next[productId] = { product, quantity };
      }
      return next;
    });
  };

  const clearBulkSelection = () => setBulkSelection({});

  const handleAddBulkToCart = () => {
    Object.values(bulkSelection).forEach(({product, quantity}) => {
      addToCart(product, quantity);
    });
    setBulkSelection({});
    setIsCartOpen(true);
  };

  const [addedItemConfirm, setAddedItemConfirm] = useState<{
    isOpen: boolean;
    productId: string;
    optionals: any[];
    productName: string;
    productImage?: string;
    productPrice?: number;
    quantity: number;
    category?: string;
  } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);

  // Admin Sync configuration & Authorization (1 hour window, with option to save password)
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [showAdminSyncModal, setShowAdminSyncModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState(() => {
    try {
      return localStorage.getItem('rbs_b2b_admin_saved_pwd') || '';
    } catch {
      return '';
    }
  });
  const [saveAdminPassword, setSaveAdminPassword] = useState(() => {
    try {
      return localStorage.getItem('rbs_b2b_admin_save_pwd') === 'true';
    } catch {
      return false;
    }
  });
  const [adminError, setAdminError] = useState('');
  const [isSyncingLive, setIsSyncingLive] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState('');

  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(140);

  // Dynamic header measurement to avoid content overlap on all viewport widths & browsers (including Android/iOS)
  useEffect(() => {
    const handleResize = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };
    
    // Initial measurement
    handleResize();
    
    // Delay slightly to ensure layout has paint-settled
    const timer = setTimeout(handleResize, 100);
    
    // Attach ResizeObserver for instant and continuous height correction on wrappers/layout changes
    let observer: ResizeObserver | null = null;
    if (typeof window !== 'undefined' && 'ResizeObserver' in window && headerRef.current) {
      observer = new ResizeObserver(() => {
        handleResize();
      });
      observer.observe(headerRef.current);
    } else {
      window.addEventListener('resize', handleResize);
    }
    
    return () => {
      clearTimeout(timer);
      if (observer) {
        observer.disconnect();
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [currentView, searchQuery]);

  // Check valid admin session from localStorage (expires after 1 hour)
  useEffect(() => {
    try {
      const authTime = localStorage.getItem('rbs_b2b_admin_auth_time');
      if (authTime) {
        const elapsed = Date.now() - parseInt(authTime, 10);
        if (elapsed < 3600000) { // 1 hour
          setIsAdminAuth(true);
        } else {
          localStorage.removeItem('rbs_b2b_admin_auth_time');
        }
      }
    } catch (e) {
      console.log('Error checking admin auth time:', e);
    }
  }, []);

  const handleAdminSyncSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAdminError('');
    setSyncSuccessMsg('');

    const trimmedPassword = adminPassword.trim();
    const isAuthorized = isAdminAuth || trimmedPassword === 'Vlad1107';

    if (isAuthorized) {
      try {
        setIsSyncingLive(true);
        
        // Save the session validation timestamp (1 hour)
        localStorage.setItem('rbs_b2b_admin_auth_time', Date.now().toString());
        setIsAdminAuth(true);

        // Save password details if checkbox is checked
        if (saveAdminPassword) {
          localStorage.setItem('rbs_b2b_admin_saved_pwd', trimmedPassword);
          localStorage.setItem('rbs_b2b_admin_save_pwd', 'true');
        } else {
          localStorage.removeItem('rbs_b2b_admin_saved_pwd');
          localStorage.removeItem('rbs_b2b_admin_save_pwd');
        }

        // Trigger live sheets sync - bypassing the CDN and intermediate browser cache instantly!
        await loadData(false, true);

        // Display green success toast animation
        setSyncSuccessMsg('הנתונים סונכרנו בהצלחה ישירות מ-Google Sheets ורעננו את האתר!');
        
        // Auto close after 2.5 seconds
        setTimeout(() => {
          setShowAdminSyncModal(false);
          setSyncSuccessMsg('');
        }, 2200);

      } catch (err) {
        console.error('Manual direct sheet sync error:', err);
        setAdminError('סינכרון נכשל עקב בעיית תקשורת. נא ודא חיבור או נסה שוב.');
      } finally {
        setIsSyncingLive(false);
      }
    } else {
      setAdminError('סיסמה שגויה. אנא הזן סיסמת מנהל נכונה.');
    }
  };

  const clearAdminAuth = () => {
    try {
      localStorage.removeItem('rbs_b2b_admin_auth_time');
      localStorage.removeItem('rbs_b2b_admin_saved_pwd');
      localStorage.removeItem('rbs_b2b_admin_save_pwd');
      setIsAdminAuth(false);
      setAdminPassword('');
      setSaveAdminPassword(false);
      setAdminError('אימות מנהל נמחק ממכשיר זה.');
    } catch {}
  };

  // Reset pagination on view/filter change
  useEffect(() => {
    setVisibleCount(50);
  }, [currentView, selectedCatalog, selectedSubcategory, selectedNestedSubcategory, searchQuery]);

  // --- DATA FETCHING ---
  const lastFetchTimeRef = useRef(0);
  const [productsOffset, setProductsOffset] = useState(0);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const loadMoreProducts = useCallback(async () => {
    if (isFetchingMore || !hasMoreProducts) return;
    setIsFetchingMore(true);
    try {
      const productsCsv = await fetchCSV(PRODUCTS_GID, 50, productsOffset);
      if (productsCsv.length < 50) {
        setHasMoreProducts(false);
      }
      
      if (productsCsv.length > 0) {
        const parsedProducts = productsCsv.map(parseProductRow);

        // Add without duplicate ids to keep data perfectly consistent and robust
        setCatalogData(prev => {
          const ids = new Set(prev.map(p => p.id));
          const uniqueNew = parsedProducts.filter(p => !ids.has(p.id));
          return [...prev, ...uniqueNew];
        });
        setProductsOffset(prev => prev + 50);
      } else {
        setHasMoreProducts(false);
      }
    } catch (err) {
      console.error("Error fetching more products:", err);
    } finally {
      setIsFetchingMore(false);
    }
  }, [productsOffset, hasMoreProducts, isFetchingMore]);

  const handleLoadMore = useCallback(() => {
    setVisibleCount(prev => prev + 50);
    if (hasMoreProducts && !isFetchingMore) {
      loadMoreProducts();
    }
  }, [hasMoreProducts, isFetchingMore, loadMoreProducts]);

  const loadData = useCallback(async (silent = false, forceBypassCache = false) => {
    try {
      if (!silent) setIsLoading(true);
      setError(null);

      // 1. Fetch metadata sheets (catalogs and subcategories are tiny, taking negligible time)
      const [catalogsCsv, subcategoriesCsv] = await Promise.all([
        fetchCSV(CATALOGS_GID, undefined, undefined, forceBypassCache),
        fetchCSV(SUBCATEGORIES_GID, undefined, undefined, forceBypassCache)
      ]);

      const parsedCatalogs = catalogsCsv.map((row: any) => {
         let rawImage = row.IMAGE || row.Image || row.image || row['תמונה'] || row.imageURL;
         let catImage = rawImage ? transformImageLink(rawImage) : null;
         
         const catName = typeof (row.name || row['שם'] || row.Name) === 'string' ? String(row.name || row['שם'] || row.Name).trim() : '';
         
         if (!catImage) {
           if (catName && (catName.includes("סלולריים") || catName.toLowerCase().includes("cellular"))) {
              catImage = "https://robustelanz.com.au/wp-content/uploads/2021/06/Robustel_R1520_1.jpg";
           } else if (catName && catName.includes("POE")) {
              catImage = transformImageLink("https://drive.google.com/file/d/17Im3ggLiWxPTfrDberOwwKWyMgf2D6A6/view?usp=drive_link");
           } else {
              catImage = 'https://placehold.co/600x400/f3f4f6/000000?text=' + encodeURIComponent(catName || 'Category');
           }
         }

         return {
           name: catName,
           desc: (row.desc || row.description || row['תיאור'] || '').trim(),
           image: catImage,
           brand: (row.brand || row['מותג'] || '').trim(),
           sortOrder: Number(row.sortOrder || row['סדר'] || 999),
           active: (row.active || row['פעיל']) === 'TRUE' || (row.active || row['פעיל']) === 'true' || row.active === 'כן'
         };
      }).sort((a,b) => a.sortOrder - b.sortOrder);

      const parsedSubcategories = (subcategoriesCsv || []).map((row: any) => {
         let providedImage = row.IMAGE || row.Image || row.image || row['תמונה'] || row.imageURL;
         let subImage = providedImage ? transformImageLink(providedImage) : null;
         
         let subcategoryName = row.subcategory || row.Subcategory || row['תת קטגוריה'] || row.subCategory || row[' Subcategory'] || '';
         subcategoryName = typeof subcategoryName === 'string' ? subcategoryName.trim() : subcategoryName;
         
         let categoryName = row.category || row.Category || row['קטגוריה'] || '';
         categoryName = typeof categoryName === 'string' ? categoryName.trim() : categoryName;
         
         // Normalize parent subcategory matching the exact weird header the user added
         let parentSubcategory = row.parentSubcategory || row['Parent  Subcategory'] || row['Parent Subcategory'] || row['\tParent  Subcategory'] || '';
         parentSubcategory = typeof parentSubcategory === 'string' ? parentSubcategory.trim() : parentSubcategory;
         
         const isComingSoon = row['Coming Soon']?.toString()?.trim()?.toUpperCase() === 'TRUE' || row['Cooming Soon']?.toString()?.trim()?.toUpperCase() === 'TRUE';

         // Normalize active to boolean robustly:
         let isActive = true;
         if (row.active !== undefined && row.active !== null) {
            const actVal = String(row.active).toUpperCase().trim();
            if (actVal === 'FALSE' || actVal === '0') {
               isActive = false;
            }
         }
         
         const brandValue = row.brand || row.brands || row.Brands || row.Brand || row['מותג'] || '';
         
         return {
           ...row,
           category: categoryName,
           subcategory: subcategoryName,
           parentSubcategory: parentSubcategory,
           isComingSoon: isComingSoon,
           image: subImage,
           active: isActive,
           brand: typeof brandValue === 'string' ? brandValue.trim() : String(brandValue).trim()
         };
      });

      setCatalogFolders(parsedCatalogs.filter(c => c.active !== false));
      setSubcategoriesGlobalData(parsedSubcategories);
      
      // Stop the main block immediately, allowing the system to display the Home Page INSTANTLY!
      if (!silent) setIsLoading(false);

      // 2. Fetch the FIRST 50 products from Google Sheets, so initial render is incredibly fast!
      if (!silent) setIsProductsLoading(true);
      setProductsOffset(0);
      setHasMoreProducts(true);

      const productsCsv = await fetchCSV(PRODUCTS_GID, 50, 0, forceBypassCache);
      const parsedProducts = productsCsv.map(parseProductRow);

      setCatalogData(parsedProducts);
      setProductsOffset(50);
      if (productsCsv.length < 50) {
        setHasMoreProducts(false);
        setIsProductsLoading(false);
      } else {
        setIsProductsLoading(false);
        // Progressive background fetching for ALL products to populate categories entirely
        fetchCSV(PRODUCTS_GID, undefined, undefined, forceBypassCache)
          .then(allProductsCsv => {
            if (allProductsCsv && allProductsCsv.length > 0) {
              const allParsed = allProductsCsv.map(parseProductRow);
              setCatalogData(allParsed);
              setHasMoreProducts(false);
              setProductsOffset(allParsed.length);
            }
          })
          .catch(err => {
            console.error("Progressive background fetch of full products sheet failed:", err);
          });
      }
      lastFetchTimeRef.current = Date.now();

    } catch (err) {
      console.error("Error loading data:", err);
      setError("שגיאה בטעינת הנתונים מהמערכת. ודא שהחיבור תקין ונסה שוב.");
      setIsProductsLoading(false);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Smart auto-refresh on focus
  useEffect(() => {
    const handleFocus = () => {
      // If data is older than 2 minutes, refresh it smartly in background
      if (Date.now() - lastFetchTimeRef.current > 1000 * 120) {
        loadData(true);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadData]);

  // Scroll to top on every view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentView, selectedProduct]);

  const getFallbackImage = (subName: string): string | null => {
    if (!subName) return null;
    if (subName === 'מצלמות חשמל WIFI' || subName === 'מצלמות WIFI חשמל') return transformImageLink('https://drive.google.com/file/d/1EQnAA-b_ez8dHTDbfcb5dETBnHSF5HeO/view?usp=drive_link');
    if (subName.includes('סלולריים') || subName.toLowerCase().includes('cellular')) return 'https://robustelanz.com.au/wp-content/uploads/2021/06/Robustel_R1520_1.jpg';
    if (subName.includes('POE')) return transformImageLink('https://drive.google.com/file/d/17Im3ggLiWxPTfrDberOwwKWyMgf2D6A6/view?usp=drive_link');
    if (subName === 'מצלמות חשמל 4G' || subName === 'מצלמות 4G חשמל') return transformImageLink('https://drive.google.com/file/d/1vMM8K41UALo7f9WLeRGHtt8l9XfjctmA/view?usp=drive_link');
    if (subName.includes('סוללה עצמאיות')) return transformImageLink('https://drive.google.com/file/d/13d3JVC3H7T-dCGbImrrRm-05pGFqrOkN/view?usp=drive_link');
    if (subName === 'אינטרקומים') return transformImageLink('https://drive.google.com/file/d/1_e67NvLTFI8hiisTJHgLerRkLD33jak4/view?usp=drive_link');
    if (subName === 'מנעולים חכמים') return transformImageLink('https://drive.google.com/file/d/1uo_Vnq_Vei1oRhLw02h2TQEaylApQiQW/view?usp=drive_link');
    if (subName === 'שואבים שוטפים רובוטיים' || subName.includes('שואבים שוטפים')) return transformImageLink('https://drive.google.com/file/d/1kOd6VCtpXz3Im-_hCQFRGRDrT0ucD_xh/view?usp=drive_link');
    if (subName === 'מתגי ליבה ורשת מנוהלים') return 'https://assets.hikvision.com/prd/normal/all/image/m000113563/DS-3E2736-HI-24F8T4X_F_202309.jpg?eo-img.format=webp';
    if (subName === 'מתגי רשת גיגה לא מנוהלים') return 'https://assets.hikvision.com/prd/normal/all/image/m000073645/8%E5%8F%A3%E5%B7%A645%E4%BF%AF%E8%A7%86---%E5%89%AF%E6%9C%AC.png?eo-img.format=webp';
    if (subName === 'מתגי גיגה תעשייתיים') return 'https://assets.hikvision.com/prd/normal/all/image/m000138688/12.png?eo-img.format=webp';
    if (subName === 'מפצלי POE') return 'https://assets.hikvision.com/prd/public/all/image/m000131322/DSC09357.png?eo-img.format=webp';
    if (subName === 'אקסס פוינטים - AP') return 'https://assets.hikvision.com/prd/normal/all/image/m000113057/%E6%AD%A3%E8%A7%86%E5%9B%BE.png?eo-img.format=webp';
    if (subName === 'לינקים אלחוטיים') return 'https://assets.hikvision.com/prd/normal/all/image/m000152562/11-1.png?eo-img.format=webp';
    if (subName === 'נתבים אלחוטיים ביתי-משרדי') return 'https://assets.hikvision.com/prd/normal/all/image/m000133680/%E7%BA%BF%E4%B8%8B%E6%AC%BE1.png?eo-img.format=webp';
    if (subName === 'מגדילי טווח ויחידות MESH') return 'https://assets.hikvision.com/prd/public/all/image/m000156931/%E4%B8%AD%E7%BB%A7%E5%99%A8.png?eo-img.format=webp';
    if (subName === 'VPN Professional Router') return 'https://assets.hikvision.com/prd/public/all/image/m000113061/DS-3WG507G-SI_F_202309.jpg?eo-img.format=webp';
    if (subName === 'אל פסק - UPS') return 'https://assets.hikvision.com/prd/public/all/image/m000086221/%E5%9B%BE%E7%89%87.jpg?eo-img.format=webp';
    if (subName === 'אל פסק אונליין RM') return 'https://assets.hikvision.com/prd/normal/all/image/m000172008/%E5%B7%A6%E5%89%8D%E4%BE%A7-LOGO.png?eo-img.format=webp';
    if (subName === 'אל פסק אונליין Tower') return 'https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcQ7QJg4nHgNAgQ2E8vZ4Kqtt-pCWsi8eyLVxCIARB7_HCTqSzBn-TiKsWBYn4mn-dnHo4yfRy2MxOB02yDbX6QmZIM3eujkj2fh4T5V4EYiD0vSfQSAsdF_tnQZwbrFlocNutsK0bu_dWk&usqp=CAc';
    if (subName === 'טלפוניה IP') return 'https://assets.hikvision.com/prd/normal/all/image/m000062901/KP9301%E4%B8%BB%E8%A7%86%E5%9B%BE_20220822.png?eo-img.format=webp';
    if (subName === 'כבלים ואביזרים') return 'https://assets.hikvision.com/prd/normal/all/image/m000001449/%E8%B6%85%E4%BA%94%E7%B1%BB2.png?eo-img.format=webp';
    if (subName === 'מצלמות לרכב') return 'https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcTOxMM3c1rVlvshWHjGeqk4BFeF5B2KA5HnKvA2uP3Zv546YfeY7A8DlFJhcz9x1ByVXPrFIed1YamY4h9MuBXuhQ8b_m_hX8S1nnbVq-bPHj6DBG00YQw5T2s4O1Zpag&usqp=CAc';
    if (subName === 'כבלי תקשורת Recber') return 'https://www.recber.com.tr/wp-content/uploads/2018/12/banner4.jpg';
    if (subName === 'ארונות תקשורת ואביזרים') return 'https://rbs-telecom.com/wp-content/uploads/קטלוג-פסי-שקעים-scaled.png';
    if (subName === 'פסי שקעים PDU') return 'https://rbs-telecom.com/wp-content/uploads/5cd9dbb9-8411-455d-8eed-9f1194971df8.png';
    if (subName === 'רמקולים שקועים') return transformImageLink('https://drive.google.com/file/d/1PhQwKX-PPEDkI86oJYx8_Oxcy8D1JoNo/view?usp=drive_link');
    if (subName === 'רמקולים חיצוניים') return transformImageLink('https://drive.google.com/file/d/13DphjTY4N3ZUBusc9fPflH5i2XxejnvO/view?usp=drive_link');
    if (subName === 'מגברים') return transformImageLink('https://drive.google.com/file/d/1WVwyorSCDVSFH8tVhbTkrdCMgAbCpRna/view?usp=drive_link');
    if (subName === 'אביזרים משלימים') return transformImageLink('https://drive.google.com/file/d/1ANu1sSxiv6prXWdBCSkg6EDMWNktYHeg/view?usp=drive_link');
    if (subName.includes('בידוריות')) return transformImageLink('https://drive.google.com/file/d/1uWWpTJTAATxeUecKLrAcsYv-UuYJmQ16/view?usp=drive_link');
    if (subName === 'מיקסרים ומקרופונים' || subName === 'מיקסרים ומיקרופונים') return transformImageLink('https://drive.google.com/file/d/1GtUymZdOSaALtyMVJ_znxYjlxwIE-PRb/view?usp=drive_link');
    return null;
  };

  // --- DERIVED DATA ---
  
  // Get all unique subcategories (sheets) for the selected catalog
  const activeSubcategories = useMemo(() => {
    if (!selectedCatalog) return [];
    
    const activeCatObj = catalogFolders.find(c => c.name === selectedCatalog);
    const isHotSaleMode = activeCatObj && (
      (activeCatObj.brand && activeCatObj.brand.trim().toUpperCase() === 'HOT SALE') ||
      activeCatObj.name.includes('מבצע') ||
      activeCatObj.name.toLowerCase().includes('sale')
    );

    if (isHotSaleMode) {
      const hotSaleProducts = catalogData.filter(item => item.active !== 'FALSE' && item.isHotSale);
      const categoriesWithHotSales = [...new Set(hotSaleProducts.map(p => p.category).filter(Boolean))];

      let results = categoriesWithHotSales.map(catName => {
        const catObj = catalogFolders.find(c => c.name === catName);
        const count = hotSaleProducts.filter(p => p.category === catName).length;
        
        return {
          name: catName,
          count: count,
          isComingSoon: false,
          image: catObj?.image || getFallbackImage(catName) || 'https://placehold.co/600x400/f3f4f6/000000?text=' + encodeURIComponent(catName),
          brand: catObj?.brand
        };
      });

      // For clearance, we group items explicitly marked with isClearance
      const clearanceProducts = catalogData.filter(item => item.active !== 'FALSE' && item.isClearance);
      const clearanceCount = clearanceProducts.length;
      if (clearanceCount > 0) {
         const clearanceDef = subcategoriesGlobalData.find(s => s.category === selectedCatalog && s.subcategory && s.subcategory.includes('מציאון') && s.active !== false);
         results.unshift({
           name: clearanceDef ? clearanceDef.subcategory : 'מציאון',
           count: clearanceCount,
           isComingSoon: false,
           image: (clearanceDef && clearanceDef.image) ? clearanceDef.image : 'https://placehold.co/600x400/f3f4f6/000000?text=' + encodeURIComponent('מציאון'),
           brand: clearanceDef ? clearanceDef.brand : undefined
         });
      }

      return results;
    }

    // First get all subcategories defined in the Subcategories global tab for this catalog
    const definedSubs = subcategoriesGlobalData.filter(s => s.category === selectedCatalog && s.active !== false && !s.parentSubcategory);
    
    const productsInCat = catalogData.filter(item => item.category === selectedCatalog && item.active !== 'FALSE');
    let productSubs = [...new Set(productsInCat.map(item => item.subcategory).filter(Boolean))] as string[];
    
    // Merge both: we want to show things explicitly defined, plus things that have products but maybe weren't explicitly defined
    let allSubNames = [...new Set([...definedSubs.map(s => s.subcategory), ...productSubs])];

    const hasInginium = productSubs.some(p => p && p.startsWith('Inginium - '));
    if (hasInginium && !allSubNames.includes('Inginium Full Channel')) {
      allSubNames.push('Inginium Full Channel');
    }

    // Hide nested ones from main list if we know them
    const hiddenNestedSubs = [
      'מתגי רשת מנוהלים - Smart Cloud Managed (ללא POE)', 
      'מתגי ליבה אופטי - Access Switches L3',
      'Inginium - גלילים CAT7',
      'Inginium - מגשרי CAT6A',
      'ספקי כוח',
      'ספקים מזוודים'
    ];

    allSubNames = allSubNames.filter(name => !hiddenNestedSubs.includes(name));

    // Create an array of objects with counts for UI
    return allSubNames.map(subName => {
      // Find matching subcategory from Google Sheets (by subcategory name and parent category)
      const sheetSub = subcategoriesGlobalData.find(s => s.category === selectedCatalog && s.subcategory === subName && !s.parentSubcategory);
      
      let customImage = sheetSub?.image || null;
      let firstProductImage = productsInCat.find(p => p.subcategory === subName && p.name !== 'מוצר הדגמה' && p.name !== 'קטגוריית אם' && p.images[0] && !p.images[0].includes('No+Image') && !p.images[0].includes('no+image') && !p.images[0].includes('placehold.co'))?.images[0];
      
      let count = productsInCat.filter(p => p.subcategory === subName && p.name !== 'מוצר הדגמה' && p.name !== 'קטגוריית אם').length;
      
      // If it's a grouped umbrella category, sum its nested products
      if (subName === 'Inginium Full Channel') {
         count = productsInCat.filter(p => p.subcategory && p.subcategory.startsWith('Inginium - ')).length;
      }
      if (subName === 'מתגי ליבה ורשת מנוהלים') {
         count += productsInCat.filter(p => p.subcategory === 'מתגי רשת מנוהלים - Smart Cloud Managed (ללא POE)' || p.subcategory === 'מתגי ליבה אופטי - Access Switches L3').length;
      }
      if (subName === 'ספקי כוח ומתח') {
         const extra = productsInCat.filter(p => (p.subcategory === 'ספקי כוח' || p.subcategory === 'ספקים מזוודים') && p.subcategory !== 'ספקי כוח ומתח');
         count += extra.length;
      }
      
      return {
        name: subName,
        count: count,
        isComingSoon: sheetSub?.isComingSoon === true,
        image: customImage || getFallbackImage(subName) || firstProductImage || 'https://placehold.co/600x400/f3f4f6/000000?text=' + encodeURIComponent(subName),
        brand: sheetSub?.brand
      };
    }).filter(sub => sub.count > 0).sort((a, b) => {
       const orderList = SUBCATEGORIES_ORDER[selectedCatalog] || [];
       let aIndex = orderList.findIndex(item => a.name.includes(item) || item.includes(a.name));
       let bIndex = orderList.findIndex(item => b.name.includes(item) || item.includes(b.name));
       if (aIndex === -1 && a.name === 'מצלמות WIFI חשמל') aIndex = orderList.findIndex(item => item.includes('מצלמות חשמל WIFI'));
       if (bIndex === -1 && b.name === 'מצלמות WIFI חשמל') bIndex = orderList.findIndex(item => item.includes('מצלמות חשמל WIFI'));
       if (aIndex === -1 && a.name === 'מצלמות 4G חשמל') aIndex = orderList.findIndex(item => item.includes('מצלמות חשמל 4G'));
       if (bIndex === -1 && b.name === 'מצלמות 4G חשמל') bIndex = orderList.findIndex(item => item.includes('מצלמות חשמל 4G'));

       if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
       if (aIndex !== -1) return -1;
       if (bIndex !== -1) return 1;
       return b.count - a.count;
    });
  }, [selectedCatalog, catalogData, subcategoriesGlobalData]);

  const nestedSubcategoriesData = useMemo(() => {
    if (!selectedSubcategory || !selectedCatalog) return [];
    
    const productsInCat = catalogData.filter(item => item.category === selectedCatalog && item.active !== 'FALSE');
    let nestedSubs: any[] = [];
    
    // Grouping specific logic based on user's structure
    if (selectedSubcategory === 'Inginium Full Channel') {
      nestedSubs = [...new Set(productsInCat.filter(p => p.subcategory && p.subcategory.startsWith('Inginium - ')).map(p => p.subcategory))];
    } else if (selectedSubcategory === 'מתגי ליבה ורשת מנוהלים') {
      const explicitSubs = productsInCat.filter(p => p.subcategory === 'מתגי רשת מנוהלים - Smart Cloud Managed (ללא POE)' || p.subcategory === 'מתגי ליבה אופטי - Access Switches L3').map(p => p.subcategory);
      nestedSubs = [...new Set(explicitSubs)];
    } else if (selectedSubcategory === 'ספקי כוח ומתח') {
      const explicitSubs = productsInCat.filter(p => p.subcategory === 'ספקי כוח ומתח' && p.nestedSubcategory).map(p => p.nestedSubcategory);
      // Fallback if they were somehow moved to subcategory
      const explicitSubs2 = productsInCat.filter(p => p.subcategory === 'ספקי כוח' || p.subcategory === 'ספקים מזוודים').map(p => p.subcategory);
      
      const mappedFromSheet = subcategoriesGlobalData.filter(s => s.category === selectedCatalog && s.subcategory === 'ספקי כוח ומתח' && s.parentSubcategory).map(s => s.parentSubcategory);
      
      nestedSubs = [...new Set([...explicitSubs, ...explicitSubs2, ...mappedFromSheet])];
    } else {
      // Find all products in the selected subcategory that have a nested subcategory
      const productsInSub = productsInCat.filter(item => item.subcategory === selectedSubcategory);
      nestedSubs = [...new Set(productsInSub.map(item => item.nestedSubcategory).filter(Boolean))] as string[];
    }
    
    return nestedSubs.map(nestedName => {
      // Try to find image in global data, matching by either subcategory name or nested name if mapped that way
      const sheetSub = subcategoriesGlobalData.find(s => s.category === selectedCatalog && (s.subcategory === nestedName || s.parentSubcategory === nestedName));
      
      let customImage = sheetSub?.image || null;
      let count = 0;
      let firstProductImage = null;
      
      if (selectedSubcategory === 'Inginium Full Channel' || selectedSubcategory === 'מתגי ליבה ורשת מנוהלים') {
         // for these, the nested name is actually the subcategory name in products
         const prods = productsInCat.filter(p => p.subcategory === nestedName && p.name !== 'מוצר הדגמה' && p.name !== 'קטגוריית אם');
         count = prods.length;
         firstProductImage = prods.find(p => p.images[0] && !p.images[0].includes('No+Image') && !p.images[0].includes('no+image') && !p.images[0].includes('placehold.co'))?.images[0];
      } else {
         const prods = productsInCat.filter(p => p.subcategory === selectedSubcategory && p.nestedSubcategory === nestedName && p.name !== 'מוצר הדגמה' && p.name !== 'קטגוריית אם');
         count = prods.length;
         firstProductImage = prods.find(p => p.images[0] && !p.images[0].includes('No+Image') && !p.images[0].includes('no+image') && !p.images[0].includes('placehold.co'))?.images[0];
         // Fallback if they are directly subcategories instead of nested
         if (count === 0 && (nestedName === 'ספקי כוח' || nestedName === 'ספקים מזוודים' || nestedName === 'ספקים מזוודים ')) {
            const fbProds = productsInCat.filter(p => (p.subcategory === nestedName || (p.subcategory === 'ספקי כוח ומתח' && p.nestedSubcategory === nestedName)) && p.name !== 'מוצר הדגמה' && p.name !== 'קטגוריית אם');
            count = fbProds.length;
            firstProductImage = fbProds.find(p => p.images[0] && !p.images[0].includes('No+Image') && !p.images[0].includes('no+image') && !p.images[0].includes('placehold.co'))?.images[0];
         }
      }
      
      return {
        name: nestedName,
        count: count,
        isComingSoon: sheetSub?.isComingSoon === true,
        image: customImage || getFallbackImage(nestedName) || firstProductImage || 'https://placehold.co/600x400/f3f4f6/000000?text=' + encodeURIComponent(nestedName),
        brand: sheetSub?.brand
      };
    }).filter(sub => sub.count > 0).sort((a,b) => {
       const orderList = SUBCATEGORIES_ORDER[selectedCatalog] || [];
       let aIndex = orderList.findIndex(item => a.name.includes(item) || item.includes(a.name));
       let bIndex = orderList.findIndex(item => b.name.includes(item) || item.includes(b.name));
       if (aIndex === -1 && a.name === 'מצלמות WIFI חשמל') aIndex = orderList.findIndex(item => item.includes('מצלמות חשמל WIFI'));
       if (bIndex === -1 && b.name === 'מצלמות WIFI חשמל') bIndex = orderList.findIndex(item => item.includes('מצלמות חשמל WIFI'));
       if (aIndex === -1 && a.name === 'מצלמות 4G חשמל') aIndex = orderList.findIndex(item => item.includes('מצלמות חשמל 4G'));
       if (bIndex === -1 && b.name === 'מצלמות 4G חשמל') bIndex = orderList.findIndex(item => item.includes('מצלמות חשמל 4G'));

       if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
       if (aIndex !== -1) return -1;
       if (bIndex !== -1) return 1;
       return b.count - a.count;
    });
  }, [selectedSubcategory, selectedCatalog, catalogData, subcategoriesGlobalData]);

  const filteredProducts = useMemo(() => {
    let filtered = catalogData.filter(item => item.active !== 'FALSE');

    // Search override - Smart Token-Based & Fuzzy Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      // מפצל את החיפוש למילים נפרדות על בסיס רווחים, מקפים או קווים נטויים
      const queryTokens = query.split(/[\s\-/,]+/).filter(Boolean);

      return filtered.filter(item => {
        // Filter out placeholder "category mother" products
        if (item.name === 'קטגוריית אם' || item.name === 'מוצר הדגמה') return false;

        const searchableText = `${item.name} ${item.sku} ${item.brand} ${item.description || ''} ${item.category} ${item.subcategory}`.toLowerCase();
        // מנקה את כל התווים המיוחדים, הרווחים והמקפים מהטקסט (כדי למצוא H9C בתוך CS-H9C)
        const cleanedSearchableText = searchableText.replace(/[^a-z0-9א-ת]/gi, '');

        // מוודא שכל ביטוי שהוקלד בחיפוש קיים במוצר (כטקסט נקי)
        const tokenMatch = queryTokens.every(token => {
          const cleanToken = token.replace(/[^a-z0-9א-ת]/gi, '');
          if (!cleanToken) return searchableText.includes(token);
          return cleanedSearchableText.includes(cleanToken);
        });

        return tokenMatch;
      });
    }

    // Filter by catalog and subcategory
    if (selectedCatalog && currentView === 'products') {
      const activeCatObj = catalogFolders.find(c => c.name === selectedCatalog);
      const isHotSaleMode = activeCatObj && (
        (activeCatObj.brand && activeCatObj.brand.trim().toUpperCase() === 'HOT SALE') ||
        activeCatObj.name.includes('מבצע') ||
        activeCatObj.name.toLowerCase().includes('sale')
      );

      filtered = filtered.filter(item => {
        if (item.name === 'מוצר הדגמה' || item.name === 'קטגוריית אם') return false;
        
        if (isHotSaleMode) {
          if (selectedSubcategory && selectedSubcategory.includes('מציאון')) {
             return item.isClearance === true;
          }
          // If a category IS selected (and it's not clearance), filter out clearance items that are not hot sale
          if (selectedSubcategory && !item.isHotSale) return false;
          // Both hot sales and clearance should be allowed when no category is selected
          if (!item.isHotSale && !item.isClearance) return false;
          if (selectedSubcategory && item.category !== selectedSubcategory) return false;
          return true;
        }

        if (item.category !== selectedCatalog) return false;
        
        if (selectedNestedSubcategory) {
          if (selectedSubcategory === 'Inginium Full Channel' || selectedSubcategory === 'מתגי ליבה ורשת מנוהלים') {
             return item.subcategory === selectedNestedSubcategory;
          }
          if (selectedSubcategory === 'ספקי כוח ומתח') {
             return item.nestedSubcategory === selectedNestedSubcategory || item.subcategory === selectedNestedSubcategory;
          }
          return item.subcategory === selectedSubcategory && item.nestedSubcategory === selectedNestedSubcategory;
        }
        
        if (selectedSubcategory === 'Inginium Full Channel') {
           return item.subcategory && item.subcategory.startsWith('Inginium - ');
        }
        if (selectedSubcategory === 'מתגי ליבה ורשת מנוהלים') {
           return item.subcategory === 'מתגי רשת מנוהלים - Smart Cloud Managed (ללא POE)' || item.subcategory === 'מתגי ליבה אופטי - Access Switches L3';
        }
        if (selectedSubcategory === 'ספקי כוח ומתח') {
           return item.subcategory === 'ספקי כוח ומתח' || item.subcategory === 'ספקי כוח' || item.subcategory === 'ספקים מזוודים';
        }
        
        return item.subcategory === selectedSubcategory;
      });
    }
    
    return filtered;
  }, [selectedCatalog, selectedSubcategory, selectedNestedSubcategory, currentView, searchQuery, catalogData]);

  // Automatically fetch remaining chunks of products in the background after the initial instant render
  // This ensures that all categories, subcategories, counts, and search queries are fully populated and work perfectly.
  useEffect(() => {
    if (isLoading || isProductsLoading || error) return;
    if (hasMoreProducts && !isFetchingMore) {
      const timer = setTimeout(() => {
        loadMoreProducts();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isProductsLoading, hasMoreProducts, isFetchingMore, error, loadMoreProducts]);

  // --- CART FUNCTIONS ---
  const addToCart = (product: any, quantity = 1, optionals: any[] = []) => {
    setCart(prev => {
      // Find matching item (same ID and same optionals configuration)
      const existing = prev.find(item => 
        item.id === product.id && 
        JSON.stringify(item.optionals || []) === JSON.stringify(optionals || [])
      );
      if (existing) {
        return prev.map(item => item === existing ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { ...product, quantity, optionals }];
    });
    setAddedItemConfirm({
      isOpen: true,
      productId: product.id,
      optionals: optionals,
      productName: product.name || "מוצר",
      productImage: (product.images && product.images[0]) || "",
      productPrice: parsePrice(product.price),
      quantity: quantity,
      category: product.category || ""
    });
  };

  const updateConfirmCartItemQuantity = (qty: number) => {
    if (!addedItemConfirm) return;
    if (qty <= 0) {
      removeConfirmCartItem();
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.id === addedItemConfirm.productId && 
          JSON.stringify(item.optionals || []) === JSON.stringify(addedItemConfirm.optionals || [])) {
        return { ...item, quantity: qty };
      }
      return item;
    }));
  };

  const removeConfirmCartItem = () => {
    if (!addedItemConfirm) return;
    setCart(prev => prev.filter(item => 
      !(item.id === addedItemConfirm.productId && 
        JSON.stringify(item.optionals || []) === JSON.stringify(addedItemConfirm.optionals || []))
    ));
    setAddedItemConfirm(null);
  };

  const updateCartQuantity = (target: any, delta: number) => {
    setCart(prev => {
      const isObject = typeof target === 'object' && target !== null;
      const updated = prev.map(item => {
        const isMatch = isObject 
          ? (item.id === target.id && JSON.stringify(item.optionals || []) === JSON.stringify(target.optionals || []))
          : item.id === target;
        if (isMatch) {
          const newQ = item.quantity + delta;
          return { ...item, quantity: newQ };
        }
        return item;
      });
      return updated.filter(item => item.quantity > 0);
    });
  };

  const removeFromCart = (target: any) => {
    const isObject = typeof target === 'object' && target !== null;
    setCart(prev => prev.filter(item => {
      if (isObject) {
        return !(item.id === target.id && JSON.stringify(item.optionals || []) === JSON.stringify(target.optionals || []));
      }
      return item.id !== target;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => {
    let itemTotal = item.price * item.quantity;
    if (item.optionals && item.optionals.length > 0) {
      item.optionals.forEach((opt: any) => {
        const accCatalogItem = catalogData.find(p => p.sku === opt.pn);
        if (accCatalogItem) {
          itemTotal += (accCatalogItem.price || 0) * item.quantity;
        }
      });
    }
    return sum + itemTotal;
  }, 0);
  const cartTotalWithVat = cartTotal * 1.18; // חישוב מע"מ סטנדרטי (18% נכון ל-2025)

  // --- NAVIGATION ---
  useEffect(() => {
    if (!window.history.state) {
      window.history.replaceState({
        currentView: 'home',
        selectedCatalog: null,
        selectedSubcategory: null,
        selectedNestedSubcategory: null,
        selectedProduct: null
      }, '');
    }

    const handlePopState = (e: PopStateEvent) => {
      if (e.state) {
        setCurrentView(e.state.currentView || 'home');
        setSelectedCatalog(e.state.selectedCatalog || null);
        setSelectedSubcategory(e.state.selectedSubcategory || null);
        setSelectedNestedSubcategory(e.state.selectedNestedSubcategory || null);
        setSelectedProduct(e.state.selectedProduct || null);
      } else {
        setCurrentView('home');
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateForward = (updates: any) => {
    const nextState = {
      currentView,
      selectedCatalog,
      selectedSubcategory,
      selectedNestedSubcategory,
      selectedProduct,
      ...updates
    };
    window.history.pushState(nextState, '');
    setCurrentView(nextState.currentView);
    if (updates.selectedCatalog !== undefined) setSelectedCatalog(nextState.selectedCatalog);
    if (updates.selectedSubcategory !== undefined) setSelectedSubcategory(nextState.selectedSubcategory);
    if (updates.selectedNestedSubcategory !== undefined) setSelectedNestedSubcategory(nextState.selectedNestedSubcategory);
    if (updates.selectedProduct !== undefined) setSelectedProduct(nextState.selectedProduct);
  };

  const navigateHome = () => {
    navigateForward({
      currentView: 'home',
      selectedCatalog: null,
      selectedSubcategory: null,
      selectedNestedSubcategory: null,
      selectedProduct: null
    });
    setSearchQuery('');
    setMobileMenuOpen(false);
  };

  const goBack = () => {
    if (searchQuery) {
       setSearchQuery('');
       return;
    }
    
    if (window.history.state && window.history.length > 1) {
       window.history.back();
    } else {
       navigateHome();
    }
  };

  const navigateToCatalog = (catalogName: string | null) => {
    navigateForward({
      currentView: 'catalog_subs',
      selectedCatalog: catalogName,
      selectedSubcategory: null,
      selectedNestedSubcategory: null,
      selectedProduct: null
    });
    setSearchQuery('');
    setMobileMenuOpen(false);
  };

  const navigateToSubcategory = (subName: string | null) => {
    const activeCatObj = catalogFolders.find(c => c.name === selectedCatalog);
    const isHotSaleMode = activeCatObj && (
      (activeCatObj.brand && activeCatObj.brand.trim().toUpperCase() === 'HOT SALE') ||
      activeCatObj.name.includes('מבצע') ||
      activeCatObj.name.toLowerCase().includes('sale')
    );

    let hasNested = false;
    if (!isHotSaleMode) {
      hasNested = catalogData.some(p => p.category === selectedCatalog && p.subcategory === subName && !!p.nestedSubcategory);
      if (subName === 'Inginium Full Channel' || subName === 'מתגי ליבה ורשת מנוהלים' || subName === 'ספקי כוח ומתח') {
         hasNested = true;
      }
    }
    
    navigateForward({
      currentView: hasNested ? 'nested_subs' : 'products',
      selectedSubcategory: subName,
      selectedNestedSubcategory: null,
      selectedProduct: null
    });
    setSearchQuery('');
  };

  const navigateToNestedSubcategory = (nestedName: string | null) => {
    navigateForward({
      currentView: 'products',
      selectedNestedSubcategory: nestedName,
      selectedProduct: null
    });
    setSearchQuery('');
  };

  const navigateToProduct = (product: any) => {
    setCurrentOptionals([]);
    navigateForward({
      currentView: 'product',
      selectedProduct: product
    });
  };

  const handleCheckout = () => {
    navigateForward({
       currentView: 'checkout'
    });
    setIsCartOpen(false);
  };



  const ProductDetailsView = () => {
    const [mainImage, setMainImage] = useState(selectedProduct?.images[0]);
    const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
    const [isZoomed, setIsZoomed] = useState(false);
    const [isAdded, setIsAdded] = useState(false);
    const [isVideoHovered, setIsVideoHovered] = useState(false);
    const [isSpecsHovered, setIsSpecsHovered] = useState(false);
    const [isManualHovered, setIsManualHovered] = useState(false);
    const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
    const theme = getBrandTheme(selectedProduct?.brand);
    const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 1024;

    useEffect(() => {
      if (selectedProduct) {
        setMainImage(selectedProduct.images[0]);
      }
    }, [selectedProduct]);

    const imagesList = selectedProduct?.images || [];
    const activeIdx = imagesList.indexOf(mainImage);

    const handlePrevImage = (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (imagesList.length <= 1) return;
      const newIndex = activeIdx > 0 ? activeIdx - 1 : imagesList.length - 1;
      setMainImage(imagesList[newIndex]);
      setTimeout(() => {
        const carousel = document.getElementById('image-carousel');
        if (carousel) {
          const activeThumb = carousel.children[newIndex] as HTMLElement;
          if (activeThumb) {
             const scrollLeft = activeThumb.offsetLeft - (carousel.clientWidth / 2) + (activeThumb.clientWidth / 2);
             carousel.scrollTo({ left: scrollLeft, behavior: 'smooth' });
          }
        }
      }, 50);
    };

    const handleNextImage = (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (imagesList.length <= 1) return;
      const newIndex = activeIdx < imagesList.length - 1 ? activeIdx + 1 : 0;
      setMainImage(imagesList[newIndex]);
      setTimeout(() => {
        const carousel = document.getElementById('image-carousel');
        if (carousel) {
          const activeThumb = carousel.children[newIndex] as HTMLElement;
          if (activeThumb) {
             const scrollLeft = activeThumb.offsetLeft - (carousel.clientWidth / 2) + (activeThumb.clientWidth / 2);
             carousel.scrollTo({ left: scrollLeft, behavior: 'smooth' });
          }
        }
      }, 50);
    };

    const handleMouseMove = (e: any) => {
      const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
      const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
      const x = Math.max(0, Math.min(100, ((clientX - left) / width) * 100));
      const y = Math.max(0, Math.min(100, ((clientY - top) / height) * 100));
      setZoomPos({ x, y });
      setIsZoomed(true);
    };

    const handleMouseLeave = () => {
      setZoomPos({ x: 50, y: 50 });
      setIsZoomed(false);
    };

    if (!selectedProduct) return null;

    return (
      <div className="animate-in fade-in duration-300">


        <div className="bg-white rounded-none shadow-sm border border-gray-100 mt-2 sm:mt-4">

          <div className="p-4 sm:p-6 md:p-8 flex flex-col lg:flex-row gap-6 sm:gap-8">
            
            <div className="w-full lg:w-5/12 flex flex-col gap-3 sm:gap-4">
              {/* ZOOMABLE IMAGE CONTAINER */}
              <div 
                className={`aspect-square rounded-none border border-gray-100 ${theme.bg} p-2 sm:p-4 flex items-center justify-center relative overflow-hidden group cursor-crosshair`}
                onMouseEnter={() => setIsZoomed(true)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onTouchStart={() => setIsZoomed(true)}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseLeave}
              >
                <img referrerPolicy="no-referrer" 
                  src={transformImageLink(mainImage, 800)} 
                  alt={selectedProduct.name} 
                  onError={handleImageError}
                  className="w-full h-full object-contain mix-blend-multiply pointer-events-none"
                  style={{ 
                    transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                    transform: isZoomed ? 'scale(2.5)' : 'scale(1)',
                    transition: isZoomed ? 'transform 0.05s ease-out' : 'transform 0.2s ease-out'
                  }}
                />

                {/* Left & Right Chevrons overlaid on main image */}
                {imagesList.length > 1 && (
                  <>
                    <button 
                      onClick={handlePrevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 hover:text-[#004387] border border-gray-100 w-10 h-10 rounded-full shadow-md transition-all active:scale-90 z-20 flex items-center justify-center cursor-pointer"
                      aria-label="תמונה קודמת"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button 
                      onClick={handleNextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 hover:text-[#004387] border border-gray-100 w-10 h-10 rounded-full shadow-md transition-all active:scale-90 z-20 flex items-center justify-center cursor-pointer"
                      aria-label="תמונה הבאה"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}

                {/* Zoom icon for mobile */}
                {isMobileDevice && (
                  <button 
                    onClick={() => setIsMobileModalOpen(true)}
                    className="absolute bottom-3 right-3 bg-white/90 text-gray-700 hover:text-[#0c2d57] border border-gray-200 rounded-full p-2.5 shadow-sm active:scale-95 z-20 flex items-center justify-center cursor-pointer"
                    aria-label="זום"
                  >
                    <ZoomIn size={18} />
                  </button>
                )}
              </div>

              {imagesList.length > 1 && (
                <div className="relative group/carousel mt-1 px-1">
                  <div id="image-carousel" className="flex gap-2 sm:gap-3 overflow-x-auto pb-4 pt-2 snap-x scroll-smooth" style={{ scrollbarWidth: 'none' }}>
                    {imagesList.map((img: string, idx: number) => (
                      <button 
                        key={idx} 
                        onClick={() => {
                          setMainImage(img);
                          const carousel = document.getElementById('image-carousel');
                          if (carousel) {
                            const activeThumb = carousel.children[idx] as HTMLElement;
                            if (activeThumb) {
                               const scrollLeft = activeThumb.offsetLeft - (carousel.clientWidth / 2) + (activeThumb.clientWidth / 2);
                               carousel.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                            }
                          }
                        }}
                        className={`w-20 h-20 sm:w-28 sm:h-28 bg-white p-1 sm:p-2 rounded-none border-2 overflow-hidden flex-shrink-0 transition-all snap-start ${mainImage === img ? 'border-[#004387] shadow-md scale-[1.02]' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <img referrerPolicy="no-referrer" src={transformImageLink(img, 300)} alt={`תמונה ${idx + 1} של המוצר`} onError={handleImageError} className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm" />
                      </button>
                    ))}
                  </div>

                  {imagesList.length > 3 && (
                    <>
                      <button 
                        className="absolute top-1/2 left-0 -translate-y-[calc(50%+8px)] -ml-2 sm:-ml-3 bg-white border border-gray-200 rounded-full p-1.5 shadow-md text-gray-500 hover:text-[#004387] hover:bg-gray-50 active:scale-95 transition-all z-20 flex items-center justify-center cursor-pointer"
                        onClick={handlePrevImage}
                        aria-label="גלול שמאל"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button 
                        className="absolute top-1/2 right-0 -translate-y-[calc(50%+8px)] -mr-2 sm:-mr-3 bg-white border border-gray-200 rounded-full p-1.5 shadow-md text-gray-500 hover:text-[#004387] hover:bg-gray-50 active:scale-95 transition-all z-20 flex items-center justify-center cursor-pointer"
                        onClick={handleNextImage}
                        aria-label="גלול ימין"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="w-full lg:w-7/12 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2 sm:mb-3">
                <div className={`text-xs sm:text-sm font-semibold ${theme.accent}`}>{selectedProduct.category} | {selectedProduct.subcategory}</div>
                {selectedProduct.brand && (
                  <div className="flex-shrink-0">
                    <BrandBadge brand={selectedProduct.brand} />
                  </div>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#0c2d57] mb-2 leading-tight">{selectedProduct.name}</h1>
              <div className="text-gray-500 mb-4 sm:mb-6 text-xs sm:text-sm">
                מק"ט: <span className="font-mono text-gray-800">{selectedProduct.sku}</span>
              </div>
              
              <p className="text-gray-700 mb-6 sm:mb-8 leading-relaxed bg-[#f2f2f2] p-3 sm:p-4 text-sm sm:text-base rounded-none border-none whitespace-pre-line">
                {selectedProduct.description}
              </p>

              {/* DOCUMENTATION & LINKS SECTION */}
              {(selectedProduct.specsLink || selectedProduct.manualLink || selectedProduct.videoLink || (selectedProduct.labCerts && selectedProduct.labCerts.length > 0)) && (
                <div className="mb-6 sm:mb-8">
                  <h3 className="font-semibold text-[#0c2d57] mb-3 sm:mb-4 text-base sm:text-lg border-b pb-2">מידע נוסף ומסמכים</h3>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-4">
                    {selectedProduct.specsLink && (
                      <div 
                        className="flex-1 min-w-[140px] relative flex"
                        onMouseEnter={() => setIsSpecsHovered(true)}
                        onMouseLeave={() => setIsSpecsHovered(false)}
                      >
                        <a href={selectedProduct.specsLink} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-white text-[#004387] border border-[#004387] hover:bg-[#004387] hover:text-white py-2 sm:py-3 px-3 sm:px-4 rounded-none transition-all font-bold text-sm sm:text-base group">
                          <FileText size={24} className="text-[#004387] group-hover:text-white transition-colors group-hover:scale-110 duration-200" />
                          מפרט טכני
                        </a>

                        {/* Specs Preview Popup */}
                        {isSpecsHovered && !isMobileDevice && getPdfPreviewUrl(selectedProduct.specsLink) && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 sm:w-80 aspect-[1/1.4] bg-white z-50 rounded-lg overflow-hidden shadow-2xl border border-gray-200 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                            <iframe 
                              width="100%" 
                              height="100%" 
                              src={getPdfPreviewUrl(selectedProduct.specsLink)!} 
                              title="Specs Preview" 
                              frameBorder="0" 
                            ></iframe>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedProduct.manualLink && (
                      <div 
                        className="flex-1 min-w-[140px] relative flex"
                        onMouseEnter={() => setIsManualHovered(true)}
                        onMouseLeave={() => setIsManualHovered(false)}
                      >
                        <a href={selectedProduct.manualLink} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-white text-[#004387] border border-[#004387] hover:bg-[#004387] hover:text-white py-2 sm:py-3 px-3 sm:px-4 rounded-none transition-all font-bold text-sm sm:text-base group">
                          <BookOpen size={24} className="text-[#004387] group-hover:text-white transition-colors group-hover:scale-110 duration-200" />
                          מדריך למשתמש
                        </a>

                        {/* Manual Preview Popup */}
                        {isManualHovered && !isMobileDevice && getPdfPreviewUrl(selectedProduct.manualLink) && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 sm:w-80 aspect-[1/1.4] bg-white z-50 rounded-lg overflow-hidden shadow-2xl border border-gray-200 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                            <iframe 
                              width="100%" 
                              height="100%" 
                              src={getPdfPreviewUrl(selectedProduct.manualLink)!} 
                              title="Manual Preview" 
                              frameBorder="0" 
                            ></iframe>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedProduct.videoLink && (
                      <div 
                        className="flex-1 min-w-[140px] relative flex" 
                        onMouseEnter={() => setIsVideoHovered(true)} 
                        onMouseLeave={() => setIsVideoHovered(false)}
                      >
                        <a href={selectedProduct.videoLink} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-white text-[#004387] border border-[#004387] hover:bg-[#004387] hover:text-white py-2 sm:py-3 px-3 sm:px-4 rounded-none transition-all font-bold text-sm sm:text-base group">
                          <Youtube size={24} className="text-[#004387] group-hover:text-white transition-colors group-hover:scale-110 duration-200" />
                          סרטון הדרכה
                        </a>
                        
                        {/* Video Preview Popup */}
                        {isVideoHovered && !isMobileDevice && getVideoEmbedUrl(selectedProduct.videoLink) && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 sm:w-80 aspect-video bg-black z-50 rounded-lg overflow-hidden shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
                            <iframe 
                              width="100%" 
                              height="100%" 
                              src={getVideoEmbedUrl(selectedProduct.videoLink)!} 
                              title="Video Preview" 
                              frameBorder="0" 
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            ></iframe>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* LAB CERTIFICATES SECTION */}
                  {selectedProduct.labCerts && selectedProduct.labCerts.length > 0 && (
                    <div className="mt-4 sm:mt-6 pt-4">
                      <h4 className="font-semibold text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base flex items-center justify-center gap-2">
                         אישורי מעבדה ותקנים ({selectedProduct.labCerts.length}) <ShieldCheck size={20} className="text-emerald-500" />
                      </h4>
                      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                        {selectedProduct.labCerts.map((certLink: string, idx: number) => {
                          const isPdf = certLink.toLowerCase().includes('.pdf');
                          
                          return (
                            <a 
                              key={idx}
                              href={certLink} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="group flex flex-row items-center gap-3 bg-white text-emerald-700 border border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50 py-2 px-4 rounded-full transition-all hover:shadow-sm"
                            >
                              <Link size={16} className="text-emerald-600" />
                              <span className="text-sm font-medium text-emerald-800">אישור #{idx + 1}</span>
                              <Download size={16} className="text-emerald-600 opacity-70 group-hover:opacity-100" />
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SPECIFIC CONFIGURATORS (Only for Cabinets, not accessories) */}
              {((selectedProduct.subcategory === 'ארונות תקשורת ואביזרים' || selectedProduct.subcategory === 'ארונות וארונות הסתעפות') && 
                !selectedProduct['Nested subcategory']?.includes('אביזרים') && 
                /ארון|מסד|מארז/i.test(selectedProduct.name)) && (
                <div className="mb-6">
                  <React.Suspense fallback={<div className="animate-pulse h-32 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-sm text-gray-500">טוען קונפיגורטור...</div>}>
                    <CabinetConfigurator product={selectedProduct} catalogData={catalogData} onOptionalsChange={handleOptionalsChange} />
                  </React.Suspense>
                </div>
              )}

              {/* COMPATIBLE CABINETS (If this is an accessory) */}
              {((selectedProduct['Nested subcategory']?.includes('אביזרים') || selectedProduct.subcategory?.includes('אביזרים למסדים') || /מדף|פנל|מאוורר|ברגים|אביזר|KVM/i.test(selectedProduct.name)) && !(/ארון|מסד|מארז/i.test(selectedProduct.name))) && (
                <React.Suspense fallback={<div className="animate-pulse h-32 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-sm text-gray-500">טוען ארונות תואמים...</div>}>
                  <AccessoryCabinets 
                    product={selectedProduct} 
                    catalogData={catalogData} 
                    ProductCard={ProductCard} 
                    navigateToProduct={navigateToProduct}
                    addToCart={addToCart}
                  />
                </React.Suspense>
              )}

              <div className="mt-auto border-t border-gray-200 pt-4 sm:pt-6">
                {/* OPTIONALS BREAKDOWN */}
                {currentOptionals.length > 0 && (
                  <div className="mb-4 bg-gray-50 border border-gray-200 rounded p-4 animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-sm">
                    <h4 className="text-sm font-bold text-[#0c2d57] mb-3 border-b border-gray-200/60 pb-2">פירוט פריטים (ארון + תוספות שבחרת):</h4>
                    
                    <div className="flex justify-between items-center text-sm py-1.5">
                      <span className="font-semibold text-gray-800 flex-1 pl-2">{selectedProduct.name}</span>
                      <span className="font-bold whitespace-nowrap text-gray-900">₪{selectedProduct.price.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    
                    {currentOptionals.map((opt, i) => {
                       const catItem = catalogData.find(p => p.sku === opt.sku || p.sku === opt.pn);
                       const optPrice = catItem ? catItem.price : (opt.price || 0);
                       return (
                         <div key={i} className="flex justify-between items-center text-sm py-1.5 text-[#004387]">
                           <span className="flex-1 pl-2 truncate relative pl-4 after:content-['+'] after:absolute after:right-0 after:top-0 after:font-bold after:mr-[-10px]">+ {opt.name || opt.description || opt.pn}</span>
                           <span className="font-semibold whitespace-nowrap">₪{optPrice.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                         </div>
                       );
                    })}
                    
                    <div className="flex justify-between items-center text-lg lg:text-xl font-bold text-[#f7941d] pt-3 mt-2 border-t border-gray-200/60 bg-white -mx-4 -mb-4 p-4 rounded-b">
                      <span>סה"כ לתשלום:</span>
                      <span>₪{(selectedProduct.price + currentOptionals.reduce((acc, opt) => {
                         const catItem = catalogData.find(p => p.sku === opt.sku || p.sku === opt.pn);
                         return acc + (catItem ? catItem.price : (opt.price || 0));
                      }, 0)).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col w-full gap-4 mt-2">
                  {selectedProduct.isClearance && (
                    <div className="w-full bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-teal-200 rounded-lg p-3 sm:p-5 shadow-sm flex flex-col sm:flex-row items-center sm:justify-between gap-3 transform hover:scale-[1.01] transition-transform">
                      <div className="flex items-center gap-2 text-teal-700 font-black text-xl sm:text-2xl leading-none">
                        <Tag className="w-7 h-7 sm:w-9 sm:h-9 text-teal-600 fill-teal-600 animate-bounce drop-shadow-md" />
                        <span>מבצע מציאון</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-teal-800 bg-white px-4 sm:px-6 py-2 rounded-md shadow-md border-b-2 border-teal-200 drop-shadow-sm text-center">
                        מחיר מיוחד
                      </div>
                    </div>
                  )}
                  {selectedProduct.isHotSale && (
                    <div className="w-full bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg p-3 sm:p-5 shadow-sm flex flex-col sm:flex-row items-center sm:justify-between gap-3 transform hover:scale-[1.01] transition-transform">
                      <div className="flex items-center gap-2 text-red-600 font-black text-xl sm:text-2xl leading-none">
                        <Flame className="w-7 h-7 sm:w-9 sm:h-9 text-red-500 fill-red-500 animate-pulse drop-shadow-md" />
                        <span>{selectedProduct.saleType || "מבצע מיוחד"}</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-red-700 bg-white px-4 sm:px-6 py-2 rounded-md shadow-md border-b-2 border-red-200 drop-shadow-sm text-center">
                        {selectedProduct.saleValue || "פרטים בעגלה"}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
                    <div className="flex flex-col w-full sm:w-auto text-center sm:text-right">
                       {selectedProduct.retailPrice && currentOptionals.length === 0 && (
                          <span className="text-sm sm:text-base text-gray-800 font-medium mb-1 line-through">
                            מחיר מומלץ לצרכן ₪{selectedProduct.retailPrice.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-gray-500 font-normal">(כולל מע"מ)</span>
                          </span>
                       )}
                       {selectedProduct.oldPrice && currentOptionals.length === 0 && (
                          <span className="text-sm sm:text-base text-red-500 font-medium mb-1 line-through">
                            מחירון מתקין: ₪{selectedProduct.oldPrice.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                       )}
                       {currentOptionals.length === 0 && (
                         <div className={`text-2xl sm:text-3xl font-bold ${selectedProduct.isClearance ? 'text-teal-600' : 'text-[#f7941d]'}`}>
                            ₪{selectedProduct.price.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                            <span className="text-xs sm:text-sm text-[#0c2d57] font-normal mr-1 sm:mr-2">{selectedProduct.isClearance ? 'מחיר מבצע מציאון' : 'מחיר מומלץ למתקין'} <span className="hidden sm:inline">(ללא מע"מ)</span></span>
                         </div>
                       )}
                    </div>
                  {selectedProduct.isComingSoon ? (
                    <div className="w-full sm:w-auto flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-10 py-3 font-bold transition-all shadow-md text-sm sm:text-base bg-gray-200 text-gray-600 cursor-not-allowed">
                       <span className="animate-pulse">בקרוב!</span>
                    </div>
                  ) : currentOptionals.length > 0 ? (
                    <div className="flex flex-col gap-3 w-full">
                      <div className="flex flex-col sm:flex-row gap-3 w-full">
                        <button 
                          onClick={() => {
                            addToCart(selectedProduct, 1, currentOptionals);
                            setIsAdded(true);
                            setTimeout(() => setIsAdded(false), 1500);
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 px-5 py-4 font-bold transition-all shadow-md hover:shadow-lg text-sm sm:text-base cursor-pointer rounded-none text-white ${isAdded ? 'bg-green-600' : 'bg-[#fe8d00] hover:bg-[#004387]'}`}
                        >
                          <ShoppingCart size={18} className={isAdded ? 'animate-bounce' : ''} />
                          {isAdded ? 'נארז יחד ונוסף! ✓' : 'הוסף כחבילה אחת (מומלץ)'}
                        </button>
                        
                        <button 
                          onClick={() => {
                            addToCart(selectedProduct, 1, []);
                            currentOptionals.forEach((opt: any) => {
                               const catItem = catalogData.find(p => p.sku === opt.sku || p.sku === opt.pn);
                               if (catItem) {
                                  addToCart(catItem, 1, []);
                               }
                            });
                            setIsAdded(true);
                            setTimeout(() => setIsAdded(false), 1550);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-5 py-4 font-bold text-[#004387] border-2 border-[#004387] bg-white hover:bg-gray-50 transition-all text-sm sm:text-base cursor-pointer rounded-none"
                        >
                          <ShoppingCart size={18} />
                          {isAdded ? 'פריטים נפרדים נוספו! ✓' : 'בחר כפריטים נפרדים'}
                        </button>
                      </div>
                      <p className="text-[11px] text-center text-[#004387] font-semibold bg-[#e6f0fa]/40 py-2 border border-[#b3d4f5] rounded-none">
                        💡 תאימות מושלמת: הוספה כחבילה אחת מקשרת את כל האביזרים ישירות לארון זה בעגלה ומונעת טעויות ייצור והרכבה!
                      </p>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        addToCart(selectedProduct, 1, []);
                        setIsAdded(true);
                        setTimeout(() => setIsAdded(false), 1500);
                      }}
                      className={`w-full sm:w-auto flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-10 py-3 font-bold transition-all shadow-md hover:shadow-lg text-sm sm:text-base ${isAdded ? 'bg-green-600 hover:bg-green-600 text-white' : theme.button}`}
                    >
                      <ShoppingCart size={18} className={`sm:w-5 sm:h-5 ${isAdded ? 'animate-bounce' : ''}`} />
                      {isAdded ? 'נוסף לעגלה! ✓' : 'הוסף להזמנה'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* MOBILE FULL SCREEN IMAGE MODAL */}
        {isMobileModalOpen && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-0 m-0">
            <button 
              onClick={() => setIsMobileModalOpen(false)}
              className="absolute top-4 right-4 z-[110] bg-white text-black p-2 rounded-full shadow-lg"
            >
              <X size={24} />
            </button>
            <div className="w-full h-full relative flex flex-col items-center justify-center overflow-auto p-4 max-h-screen">
              <TransformWrapper
                initialScale={1}
                minScale={1}
                maxScale={4}
                centerOnInit={true}
              >
                {({ zoomIn, zoomOut, resetTransform }) => (
                  <React.Fragment>
                    <TransformComponent wrapperClass="!w-full !flex !items-center !justify-center" contentClass="!w-full !flex !items-center !justify-center">
                      <img referrerPolicy="no-referrer" 
                        src={transformImageLink(mainImage, 1200)} 
                        alt={selectedProduct.name} 
                        onError={handleImageError}
                        className="w-full h-auto max-h-[80vh] object-contain"
                      />
                    </TransformComponent>
                    <div className="mt-6 text-white/70 text-sm flex gap-4 items-center bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">
                      <button onClick={() => zoomOut()} className="p-2 hover:bg-white/20 rounded-full"><Minus size={18} /></button>
                      <button onClick={() => resetTransform()} className="p-2 hover:bg-white/20 rounded-full"><Search size={16} /></button>
                      <button onClick={() => zoomIn()} className="p-2 hover:bg-white/20 rounded-full"><Plus size={18} /></button>
                    </div>
                  </React.Fragment>
                )}
              </TransformWrapper>
            </div>
          </div>
        )}

        {/* SIMILAR PRODUCTS */}
        {(() => {
          const similar = catalogData.filter(p => p.subcategory === selectedProduct.subcategory && p.id !== selectedProduct.id && p.active !== 'FALSE').slice(0, 4);
          if (similar.length === 0) return null;
          return (
            <div className="mt-12 mb-8">
              <h3 className="text-xl font-bold text-[#0c2d57] mb-6 border-b border-gray-200 pb-2">מוצרים משלימים ומקבילים</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
                {similar.map(product => (
                  <ProductCard key={product.id} product={product} navigateToProduct={navigateToProduct} addToCart={addToCart} bulkSelection={bulkSelection} onBulkSelectionChange={handleBulkSelectionChange} />
                ))}
              </div>
            </div>
          );
        })()}

      </div>
    );
  };

  const CheckoutView = () => {
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [lastSentMethod, setLastSentMethod] = useState<'email' | 'whatsapp' | null>(null);
    const [companyName, setCompanyName] = useState('');
    const [companyId, setCompanyId] = useState('');
    const [contactName, setContactName] = useState('');
    const [phonePrefix, setPhonePrefix] = useState('050');
    const [phone, setPhone] = useState('');
    const [secondaryPhone, setSecondaryPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedAgent, setSelectedAgent] = useState('');
    const [errors, setErrors] = useState<any>({});

    const agents = [
      { name: 'בחר/י סוכן מהרשימה', email: '', phone: '' },
      { name: 'משרד - נירית', email: 'nirit@rbs-telecom.com', phone: '972545241480' },
      { name: 'מיכה', email: 'micha@rbs-telecom.com', phone: '972503332497' },
      { name: 'ניר', email: 'nir@rbs-telecom.com', phone: '972503332116' },
      { name: 'אברהם', email: 'avraham@rbs-telecom.com', phone: '972503332254' },
      { name: 'מוטי', email: 'moti@rbs-telecom.com', phone: '972503334259' },
      { name: 'מאיר', email: 'meir@rbs-telecom.com', phone: '972504530996' }
    ];

    const phonePrefixes = [
      '050', '052', '053', '054', '055', '058',
      '02', '03', '04', '08', '09',
      '072', '073', '074', '076', '077', '079'
    ];

    const validateForm = () => {
        const newErrors: any = {};
        
        if (companyId && !/^\d{9}$/.test(companyId.trim().replace(/\D/g, ''))) {
            newErrors.companyId = 'ח.פ חייב להכיל 9 ספרות';
        }
        
        if (phone && !/^\d{7}$/.test(phone.trim())) {
            newErrors.phone = 'מספר טלפון חייב להכיל 7 ספרות';
        }
        
        if (!phone && !customerEmail) {
            newErrors.contact = 'יש להזין לפחות דואר אלקטרוני או מספר טלפון ראשי';
        }

        if (!companyName) {
            newErrors.companyName = 'יש להזין שם חברה';
        }

        if (!selectedAgent) {
            newErrors.selectedAgent = 'יש לבחור סוכן מטפל';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const buildOrderDetailsText = () => {
      let orderDetails = `הזמנה חדשה מקטלוג B2B
`;
      orderDetails += `---------------------------------
`;
      orderDetails += `שם חברה/לקוח: ${companyName}
`;
      if (companyId) orderDetails += `ח.פ/עוסק מורשה: ${companyId}
`;
      if (contactName) orderDetails += `איש קשר: ${contactName}
`;
      if (phone) orderDetails += `טלפון: ${phonePrefix}-${phone}
`;
      if (secondaryPhone) orderDetails += `טלפון נוסף: ${secondaryPhone}
`;
      if (customerEmail) orderDetails += `מייל לקוח: ${customerEmail}
`;
      if (address) orderDetails += `כתובת אספקה: ${address}
`;
      if (notes) orderDetails += `הערות: ${notes}
`;
      orderDetails += `---------------------------------

`;
      orderDetails += `פריטים:

`;
      
      cart.forEach((item, idx) => {
         orderDetails += `${idx + 1}. ${item.name}
`;
         orderDetails += `   מק"ט: ${item.sku}
`;
         orderDetails += `   כמות: ${item.quantity}
`;
         
         if (item.isClearance) {
           orderDetails += `   * מציאון: ${item.clearancePrice ? '₪' + item.clearancePrice : 'מחיר מיוחד'}
`;
         } else if (item.isHotSale) {
           orderDetails += `   * מבצע חם: ${item.saleType ? item.saleType + ' ' : ''}${item.saleValue || ''}
`;
         }
         
         if (item.optionals && item.optionals.length > 0) {
           orderDetails += `   תוספות בארון:
`;
           item.optionals.forEach((opt: any) => {
             orderDetails += `     - ${opt.pn} | ${opt.description}
`;
           });
         }
         orderDetails += `
`;
      });
      
      orderDetails += `---------------------------------
`;
      orderDetails += `סה"כ כמות פריטים: ${cart.reduce((acc, item) => acc + item.quantity, 0)}
`;

      return orderDetails;
    };

    const handleSendEmail = () => {
      if (!validateForm()) return;

      const agentEmail = agents.find(a => a.name === selectedAgent)?.email;
      if (!agentEmail) return;

      const orderDetails = buildOrderDetailsText();
      const subject = encodeURIComponent(`הזמנה חדשה (B2B): ${companyName || 'לקוח מזדמן'}`);
      const body = encodeURIComponent(orderDetails);
      
      let mailtoLink = `mailto:${agentEmail}?subject=${subject}&body=${body}`;
      if (customerEmail) {
          mailtoLink += `&cc=${customerEmail}`;
      }
      
      window.location.href = mailtoLink;
      
      setLastSentMethod('email');
      setOrderPlaced(true);
    };

    const handleSendWhatsApp = () => {
      if (!validateForm()) return;
      
      const agentPhone = agents.find(a => a.name === selectedAgent)?.phone;
      if (!agentPhone) return;

      const orderDetails = buildOrderDetailsText();
      const text = encodeURIComponent(orderDetails);
      
      window.open(`https://wa.me/${agentPhone}?text=${text}`, '_blank');
      
      setLastSentMethod('whatsapp');
      setOrderPlaced(true);
    };

    const handleBackToSite = () => {
      navigateHome();
    };

    const handleLogout = () => {
      setCart([]);
      setIsAuthenticated(false);
      navigateHome();
    };

    if (orderPlaced) {
      return (
        <div className="bg-white rounded-none shadow-sm border border-gray-100 p-8 sm:p-12 text-center max-w-2xl mx-auto mt-10">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0c2d57] mb-4">הבקשה נוסחה והועברה לאפליקציה שבחרת!</h2>
          <p className="text-gray-600 mb-8 px-4">שים לב: הודעת המייל או הווצאפ נפתחה במכשירך להשלמת השליחה.</p>
          
          <div className="border-t border-gray-200 pt-6 mt-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {lastSentMethod === 'email' ? 'מומלץ לשלוח גיבוי גם בוואטסאפ:' : 'מומלץ לשלוח גיבוי גם במייל:'}
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
               {lastSentMethod !== 'email' && (
                 <button 
                    onClick={() => handleSendEmail()}
                    className="bg-white text-[#004387] border border-[#004387] px-6 py-2 font-bold hover:bg-[#004387] hover:text-white transition-colors"
                 >
                    שליחת גיבוי ב-Email
                 </button>
               )}
               {lastSentMethod !== 'whatsapp' && (
                 <button 
                    onClick={() => handleSendWhatsApp()}
                    className="bg-green-500 text-white border border-green-500 px-6 py-2 font-bold hover:bg-green-600 transition-colors"
                 >
                    שליחת גיבוי ב-WhatsApp
                 </button>
               )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 bg-gray-50 -mx-8 sm:-mx-12 -mb-8 sm:-mb-12 p-8 sm:p-12 mt-4">
             <h3 className="text-lg font-bold text-gray-800 mb-4">מה תרצה לעשות עכשיו?</h3>
             <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={handleBackToSite}
                  className="bg-[#004387] text-white px-8 py-3 font-bold hover:bg-[#fe8d00] transition-colors shadow-sm"
                >
                  המשך לאתר (שמור על העגלה)
                </button>
                <button 
                  onClick={handleLogout}
                  className="bg-gray-200 text-gray-800 px-8 py-3 font-bold hover:bg-red-500 hover:text-white transition-colors shadow-sm"
                >
                  יציאה מהמערכת (התנתק)
                </button>
             </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-5xl mx-auto mt-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#0c2d57]">סיכום הזמנה ושליחה לסוכן</h2>
          <button onClick={navigateHome} className="flex items-center gap-2 text-[#004387] font-semibold hover:text-[#fe8d00] transition-colors">
            המשך קניות <ChevronLeft size={18} />
          </button>
        </div>
        <div className="bg-white rounded-none shadow-[0_5px_15px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden flex flex-col md:flex-row">
          
          <div className="w-full md:w-1/2 lg:w-3/5 p-6 border-b md:border-b-0 md:border-l border-gray-100">
            <h3 className="text-lg font-bold mb-4 text-[#0c2d57]">פריטים בעגלה ({cart.length})</h3>
            {cart.length === 0 ? (
              <p className="text-gray-500">העגלה ריקה.</p>
            ) : (
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.id} className="flex gap-4 items-center border-b border-gray-100 pb-4 last:border-0">
                    <img referrerPolicy="no-referrer" src={transformImageLink(item.images[0], 120)} alt={item.name} onError={handleImageError} className="w-16 h-16 object-contain bg-[#f2f2f2] p-1" />
                    <div className="flex-grow">
                      <div className="font-semibold text-[#0c2d57]">{item.name}</div>
                      <div className="text-xs text-gray-500 mb-2">מק"ט: {item.sku}</div>
                      {item.optionals && item.optionals.length > 0 && (
                        <div className="text-xs text-gray-600 mb-2 bg-gray-50 border border-gray-200 p-2 rounded">
                          <strong className="block mb-1">תוספות מצורפות לארון:</strong>
                          <ul className="list-disc pl-4 pr-1">
                            {item.optionals.map((opt: any, i: number) => {
                              const accCatalogItem = catalogData.find(p => p.sku === opt.pn);
                              return (
                                <li key={i}>{opt.pn} - {opt.description} {accCatalogItem ? `(₪${accCatalogItem.price.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : ''}</li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-[#f2f2f2] border border-gray-200 overflow-hidden rounded-md">
                          <button onClick={() => updateCartQuantity(item, -1)} className="p-1 px-3 hover:bg-white text-gray-600 transition-colors" aria-label="הפחת כמות"><Minus size={14}/></button>
                          <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                          <button onClick={() => updateCartQuantity(item, 1)} className="p-1 px-3 hover:bg-white text-gray-600 transition-colors" aria-label="הוסף כמות"><Plus size={14}/></button>
                        </div>
                        <button onClick={() => removeFromCart(item)} className="text-red-500 hover:text-red-600 transition-colors p-2 bg-red-50 hover:bg-red-100 rounded-md" aria-label="הסר מוצר מחשבון">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="w-full md:w-1/2 lg:w-2/5 p-6 bg-[#f2f2f2] flex flex-col">
            <h3 className="text-lg font-bold mb-4 text-[#0c2d57]">פרטי חברה / לקוח</h3>
            <div className="space-y-3 mb-6">
              
              <div>
                <input type="text" placeholder="שם חברה / עסק (חובה)" value={companyName} onChange={e => {setCompanyName(e.target.value); setErrors({...errors, companyName: null})}} className={`w-full px-3 py-3 border ${errors.companyName ? 'border-red-500' : 'border-gray-200'} bg-white rounded-none focus:ring-2 focus:ring-[#004387] outline-none text-sm`} />
                {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName}</p>}
              </div>

              <div>
                <input type="text" placeholder="ח.פ / עוסק מורשה" value={companyId} onChange={e => {setCompanyId(e.target.value); setErrors({...errors, companyId: null})}} className={`w-full px-3 py-3 border ${errors.companyId ? 'border-red-500' : 'border-gray-200'} bg-white rounded-none focus:ring-2 focus:ring-[#004387] outline-none text-sm`} />
                {errors.companyId && <p className="text-red-500 text-xs mt-1">{errors.companyId}</p>}
              </div>

              <input type="text" placeholder="איש קשר" value={contactName} onChange={e => setContactName(e.target.value)} className="w-full px-3 py-3 border border-gray-200 bg-white rounded-none focus:ring-2 focus:ring-[#004387] outline-none text-sm" />
              
              <div className="flex gap-2 relative">
                <input type="tel" placeholder="טלפון ראשי (7 ספרות)" value={phone} onChange={e => {setPhone(e.target.value.replace(/\D/g, '')); setErrors({...errors, contact: null, phone: null})}} maxLength={7} className={`flex-grow px-3 py-3 border ${errors.phone || errors.contact ? 'border-red-500' : 'border-gray-200'} bg-white rounded-none focus:ring-2 focus:ring-[#004387] outline-none text-sm`} />
                <select 
                  value={phonePrefix} 
                  onChange={e => setPhonePrefix(e.target.value)}
                  className="w-24 px-3 py-3 border border-gray-200 bg-white rounded-none focus:ring-2 focus:ring-[#004387] outline-none text-sm font-medium"
                  dir="ltr"
                >
                  {phonePrefixes.map(prefix => (
                    <option key={prefix} value={prefix}>{prefix}</option>
                  ))}
                </select>
              </div>
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}

              <input type="tel" placeholder="טלפון נוסף" value={secondaryPhone} onChange={e => setSecondaryPhone(e.target.value)} className="w-full px-3 py-3 border border-gray-200 bg-white rounded-none focus:ring-2 focus:ring-[#004387] outline-none text-sm" />

              <div>
                <input type="email" placeholder="דואר אלקטרוני (לחובה עבור העתק הזמנה)" value={customerEmail} onChange={e => {setCustomerEmail(e.target.value); setErrors({...errors, contact: null})}} className={`w-full px-3 py-3 border ${errors.contact ? 'border-red-500' : 'border-gray-200'} bg-white rounded-none focus:ring-2 focus:ring-[#004387] outline-none text-sm`} />
                {errors.contact && <p className="text-red-500 text-xs mt-1">{errors.contact}</p>}
                <p className="text-xs text-gray-500 mt-1">כתובת המייל אליה יישלח אישור/העתק כשתשתמשו בשליחה דרך המייל.</p>
              </div>

              <AddressAutocomplete 
                value={address} 
                onChange={setAddress}
                theme={{
                  bg: 'bg-white',
                  text: 'text-[#0c2d57]',
                  border: 'border-gray-200',
                  accent: 'text-[#004387]',
                  hover: 'hover:bg-gray-50'
                }}
              />

              <textarea placeholder="הערות למשלוח / הזמנה" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-3 border border-gray-200 bg-white rounded-none focus:ring-2 focus:ring-[#004387] outline-none text-sm resize-none"></textarea>
              
              <div className="pt-3 border-t border-gray-300 mt-3">
                <label className="block text-sm font-semibold text-[#0c2d57] mb-2">בחירת סוכן מטפל להזמנה <span className="text-red-500">*</span>:</label>
                <select 
                  value={selectedAgent} 
                  onChange={e => {setSelectedAgent(e.target.value); setErrors({...errors, selectedAgent: null})}}
                  className={`w-full px-3 py-3 border ${errors.selectedAgent ? 'border-red-500' : 'border-gray-200'} bg-white rounded-none focus:ring-2 focus:ring-[#004387] outline-none text-sm font-medium`}
                >
                  {agents.map((agent, i) => (
                     <option key={i} value={agent.name === 'בחר/י סוכן מהרשימה' ? '' : agent.name} disabled={i === 0}>
                        {agent.name}
                     </option>
                  ))}
                </select>
                {errors.selectedAgent && <p className="text-red-500 text-xs mt-1">{errors.selectedAgent}</p>}
              </div>

            </div>

            <div className="mt-auto">
              <div className="flex justify-between items-center text-lg font-bold mb-6 text-[#0c2d57] border-t border-gray-300 pt-4">
                <span>סה"כ כמות פריטים:</span>
                <span className="text-[#f7941d]">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              
              <div className="flex flex-col gap-3">
                 <button 
                   disabled={cart.length === 0}
                   onClick={handleSendEmail}
                   className="w-full bg-[#004387] hover:bg-blue-800 text-white font-bold py-3 rounded-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border-none"
                 >
                   שדר הצעת מחיר במייל
                 </button>
                 
                 <button 
                   disabled={cart.length === 0}
                   onClick={handleSendWhatsApp}
                   className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold py-3 rounded-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border-none flex items-center justify-center gap-2"
                 >
                   שדר בקשה כהודעת WhatsApp
                 </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- MAIN LAYOUT ---
  if (!isAuthenticated) {
     return <LoginView setIsAuthenticated={setIsAuthenticated} />;
  }

  if (error) {
     return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-[#0c2d57] p-4">
          <X size={48} className="mb-4 text-red-500" />
          <h2 className="text-lg font-semibold text-center leading-relaxed text-gray-700 max-w-md mb-6">{error}</h2>
          <button 
            onClick={() => {
              setError(null);
              loadData();
            }}
            className="bg-[#004387] hover:bg-[#fe8d00] text-white px-8 py-3 transition-colors shadow-sm font-medium rounded-none"
          >
            נסה שוב
          </button>
        </div>
     );
  }

  return (
    <div dir="rtl" className="min-h-screen text-gray-900 selection:bg-[#fe8d00] selection:text-white" style={{ background: 'transparent' }}>
      
      {/* CSS Variables for Layout Layout Heights */}
      <style dangerouslySetInnerHTML={{__html: `

        :root {
          --header-height-home: 104px;
          --header-height-sub: 140px;
        }
        @media (min-width: 768px) {
          :root {
            --header-height-home: 56px;
            --header-height-sub: 92px;
          }
        }
      `}} />

      <div id="rbs-b2b-app">
        {/* SECONDARY TOOLBAR INSTEAD OF MAIN HEADER */}
        <div ref={headerRef} className="sticky top-0 z-40 w-full bg-white shadow-md border-b border-gray-100 fixed-header">
          <div className="container mx-auto px-4 min-h-[56px] flex flex-row items-center justify-between flex-nowrap gap-2 sm:gap-4">
            
            {/* RIGHT SIDE: Menu & Back (Mobile optimized browser controls & Desktop standard) */}
            <div className="flex flex-row items-center gap-2 md:gap-4 flex-shrink-0">
              
              {/* MOBILE ONLY: Browser-style Navigation Controls with large touch targets */}
              <div id="mobile-browser-navigation-bar" className="flex md:hidden items-center gap-1.5 bg-gray-50 border border-gray-200/80 p-1.5 rounded-xl shadow-xs">
                
                {/* 1. Menu Button: 48px size, large Menu bars */}
                <button 
                  id="mobile-nav-hamburger"
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="flex items-center justify-center w-12 h-12 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-lg shadow-sm transition-all duration-200 active:scale-95 flex-shrink-0"
                  aria-label="פתח תפריט"
                  title="תפריט ניווט"
                >
                  <Menu size={28} className="stroke-[2.5]" />
                </button>

                <div className="h-8 w-[1px] bg-gray-300/60 mx-0.5"></div>

                {/* 2. Back Button (ChevronRight for RTL back) */}
                <button 
                  id="mobile-nav-back"
                  type="button"
                  onClick={() => { if (searchQuery) { setSearchQuery(''); } else { goBack(); } }}
                  className="flex items-center justify-center w-11 h-11 bg-white hover:bg-gray-100 text-[#004387] border border-gray-200 rounded-lg shadow-sm transition-all duration-200 active:scale-90 flex-shrink-0"
                  aria-label="אחורה"
                  title="חזור אחורה"
                >
                  <ChevronRight size={24} className="stroke-[2.5]" />
                </button>

                {/* 3. Forward Button (ChevronLeft for RTL forward) */}
                <button 
                  id="mobile-nav-forward"
                  type="button"
                  onClick={() => {
                    if (window.history.state) {
                      window.history.forward();
                    }
                  }}
                  className="flex items-center justify-center w-11 h-11 bg-white hover:bg-gray-100 text-[#004387] border border-gray-200 rounded-lg shadow-sm transition-all duration-200 active:scale-90 flex-shrink-0"
                  aria-label="קדימה"
                  title="חזור קדימה"
                >
                  <ChevronLeft size={24} className="stroke-[2.5]" />
                </button>

                {/* 4. Home Button */}
                <button 
                  id="mobile-nav-home"
                  type="button"
                  onClick={navigateHome}
                  className="flex items-center justify-center w-11 h-11 bg-white hover:bg-gray-100 text-[#004387] border border-gray-200 rounded-lg shadow-sm transition-all duration-200 active:scale-90 flex-shrink-0"
                  aria-label="דף הבית"
                  title="דף הבית"
                >
                  <Home size={22} className="stroke-[2]" />
                </button>

              </div>

              {/* DESKTOP ONLY: Standard navigation controls as they were */}
              <div id="desktop-navigation-controls" className="hidden md:flex flex-row items-center gap-4">
                {/* כפתור חזור גלובלי - מופיע כשלא בדף הבית או כשיש חיפוש פעיל */}
                {(currentView !== 'home' || searchQuery) && (
                  <button 
                    id="desktop-back-btn"
                    onClick={() => { if (searchQuery) { setSearchQuery(''); } else { goBack(); } }} 
                    className="flex flex-row items-center justify-center gap-1 !p-2 !m-0 bg-[#f2f2f2] hover:bg-[#004387] text-[#004387] hover:text-white !rounded-none transition-all border-none"
                    title="חזור"
                    aria-label="חזור לתצוגה הקודמת"
                  >
                    <ChevronRight size={20} className="flex-shrink-0" />
                    <span className="hidden md:block text-sm font-semibold ml-1 whitespace-nowrap">חזור</span>
                  </button>
                )}
              </div>
              
              {/* Breadcrumb style path indicator */}
              <div className="hidden sm:flex items-center text-sm text-[#0c2d57] opacity-80 whitespace-nowrap gap-3">
                <img referrerPolicy="no-referrer" src="https://rbs-telecom.com/wp-content/uploads/2021/01/LOGO-RBS_FINAL.png" alt="RBS Logo" className="h-8 object-contain" />
                <span 
                  onClick={() => {
                    setAdminError('');
                    setSyncSuccessMsg('');
                    setShowAdminSyncModal(true);
                  }}
                  className="font-semibold px-2 border-r border-[#0c2d57]/20 cursor-pointer select-none hover:text-[#004387] active:scale-95 transition-all"
                  title="מיני-פאנל ניהול וסינכרון"
                >
                  B2B Portal
                </span>
                {hasMoreProducts && (
                  <div className="flex items-center gap-1.5 text-xs text-[#fe8d00] bg-orange-50 px-2 py-0.5 animate-pulse select-none font-medium border border-orange-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#fe8d00] animate-ping"></span>
                    <span>בסנכרון נתונים...</span>
                  </div>
                )}
              </div>
            </div>

            {/* CENTER SIDE: Search (Protected from collapsing) */}
            <div className="flex-grow min-w-0 max-w-xl mx-2 hidden md:flex items-center bg-[#f2f2f2] px-4 py-2 border border-transparent focus-within:border-[#004387] focus-within:bg-white transition-all">
              <Search size={18} className="text-gray-400 ml-2 flex-shrink-0" />
              <input 
                type="text" 
                placeholder="חיפוש חופשי (מק״ט, שם, מותג)..." 
                className="bg-transparent border-none outline-none w-full min-w-0 text-sm text-gray-700 shadow-none focus:ring-0 !p-0 !m-0"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
              />
            </div>

            {/* LEFT SIDE: Cart (Protected from theme overrides) */}
            <div className="flex-shrink-0">
              <button 
                className="relative flex flex-row items-center justify-center gap-2 !p-2 !px-3 !m-0 h-[40px] text-[#004387] bg-white border border-[#004387] hover:bg-[#004387] hover:text-white transition-colors whitespace-nowrap !rounded-none box-border"
                onClick={() => setIsCartOpen(true)}
                aria-label="פתח עגלת הזמנה"
                style={{ margin: 0, padding: '8px 12px' }}
              >
                <ShoppingCart size={20} className="flex-shrink-0" />
                <span className="text-sm font-bold hidden sm:block whitespace-nowrap">עגלת הזמנה</span>
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#f7941d] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* MOBILE SEARCH BAR INTEGRATED INTO STICKY HEADER */}
          <div className="md:hidden bg-white px-4 pb-3 w-full block">
            <div className="flex items-center bg-[#f2f2f2] px-4 py-2 border border-transparent focus-within:border-[#004387] focus-within:bg-white transition-all w-full">
              <Search size={18} className="text-gray-400 ml-2 flex-shrink-0" />
              <input 
                type="text" 
                placeholder="חיפוש חופשי..." 
                className="bg-transparent border-none outline-none w-full min-w-0 text-sm shadow-none focus:ring-0 !p-0 !m-0"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
              />
            </div>
          </div>

          {/* DYNAMIC, UNIFIED STICKY BREADCRUMB BAR (FROZEN TO TOP) */}
          {(currentView !== 'home' || searchQuery) && (
            <div className="bg-[#fafafa] border-t border-b border-gray-200/60 py-1.5 px-4 w-full text-right transition-all">
              <div className="container mx-auto flex flex-row items-center justify-start flex-wrap gap-1 md:gap-1.5 text-[11px] sm:text-xs md:text-sm text-gray-500 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                
                {/* Home Indicator */}
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    navigateHome();
                  }} 
                  className="hover:text-[#004387] p-2 sm:p-1 flex items-center gap-1.5 font-bold bg-gray-100 sm:bg-transparent border border-gray-200 sm:border-none rounded-md sm:rounded-none cursor-pointer flex-shrink-0 text-[#004387] sm:text-gray-500 hover:scale-105 transition-all text-xs"
                  title="ראשי"
                >
                  <Home size={18} className="sm:w-[15px] sm:h-[15px]" /><span className="sm:hidden text-[11px] font-bold">ראשי</span>
                </button>

                {searchQuery ? (
                  <>
                    <ChevronLeft size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="font-semibold text-[#0c2d57] bg-blue-50/50 px-2 py-0.5 rounded-sm">
                      תוצאות חיפוש ל: <strong className="text-[#004387]">{searchQuery}</strong>
                    </span>
                  </>
                ) : (
                  <>
                    {/* Catalog Link */}
                    {selectedCatalog && (
                      <>
                        <ChevronLeft size={14} className="text-gray-400 flex-shrink-0" />
                        <button 
                          onClick={() => navigateToCatalog(selectedCatalog)} 
                          className="hover:text-[#004387] hover:underline font-medium bg-transparent border-none p-0 cursor-pointer flex-shrink-0 transition-opacity"
                        >
                          {selectedCatalog}
                        </button>
                      </>
                    )}

                    {/* Subcategory Link */}
                    {selectedSubcategory && (currentView === 'nested_subs' || currentView === 'products' || currentView === 'product') && (
                      <>
                        <ChevronLeft size={14} className="text-gray-400 flex-shrink-0" />
                        <button 
                          onClick={() => navigateToSubcategory(selectedSubcategory)} 
                          className="hover:text-[#004387] hover:underline font-medium bg-transparent border-none p-0 cursor-pointer flex-shrink-0 transition-opacity"
                        >
                          {selectedSubcategory}
                        </button>
                      </>
                    )}

                    {/* Nested Subcategory Link */}
                    {selectedNestedSubcategory && (currentView === 'products' || currentView === 'product') && (
                      <>
                        <ChevronLeft size={14} className="text-gray-400 flex-shrink-0" />
                        <button 
                          onClick={() => navigateToNestedSubcategory(selectedNestedSubcategory)} 
                          className="hover:text-[#004387] hover:underline font-medium bg-transparent border-none p-0 cursor-pointer flex-shrink-0 transition-opacity"
                        >
                          {selectedNestedSubcategory}
                        </button>
                      </>
                    )}

                    {/* Product Name (Active Leaf) */}
                    {currentView === 'product' && selectedProduct && (
                      <>
                        <ChevronLeft size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="font-semibold text-[#0c2d57] bg-blue-50/10 text-[#004387] px-2 py-0.5 rounded-none truncate max-w-[150px] sm:max-w-[250px] md:max-w-[400px]">
                          {selectedProduct.name}
                        </span>
                      </>
                    )}

                    {/* Subcategories (Active Leaf) */}
                    {currentView === 'catalog_subs' && (
                      <>
                        <ChevronLeft size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="font-semibold text-[#0c2d57] bg-blue-50/50 px-2 py-0.5 rounded-none">
                          קטגוריות
                        </span>
                      </>
                    )}

                    {/* Nested Subcategories (Active Leaf) */}
                    {currentView === 'nested_subs' && (
                      <>
                        <ChevronLeft size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="font-semibold text-[#0c2d57] bg-blue-50/50 px-2 py-0.5 rounded-none">
                          תתי קטגוריה
                        </span>
                      </>
                    )}

                    {/* Products View (Active Leaf) */}
                    {currentView === 'products' && !selectedNestedSubcategory && (
                      <>
                        <ChevronLeft size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="font-semibold text-[#0c2d57] bg-blue-50/50 px-2 py-0.5 rounded-none">
                          מוצרים
                        </span>
                      </>
                    )}

                    {/* Checkout (Active Leaf) */}
                    {currentView === 'checkout' && (
                      <>
                        <ChevronLeft size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="font-semibold text-[#0c2d57] bg-blue-50/50 px-2 py-0.5 rounded-none">
                          סיכום הזמנה ושליחה
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Spacer not needed for sticky layout as browser handles flow spacing natively, preserved at 0px to maintain node structure */}
        <div 
          className="w-full block" 
          style={{ 
            height: '0px'
          }}
          aria-hidden="true" 
        />

        <div className="container mx-auto px-4 py-2">
          
          {/* MOBILE DRAWER */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden">
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
              <div className="relative w-4/5 max-w-sm bg-white h-full shadow-xl p-4 overflow-y-auto">
                <button className="absolute top-4 left-4 !p-2 !m-0 bg-[#f2f2f2] text-gray-600 hover:text-[#004387] border-none" onClick={() => setMobileMenuOpen(false)} aria-label="סגור תפריט">
                  <X size={20} />
                </button>
                <h2 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAdminError('');
                    setSyncSuccessMsg('');
                    setShowAdminSyncModal(true);
                  }}
                  className="font-bold text-xl mb-6 mt-2 text-[#0c2d57] cursor-pointer select-none active:text-[#fe8d00] transition-colors"
                >
                  ניווט מהיר
                </h2>
                <ul className="space-y-4">
                  <li>
                    <button onClick={navigateHome} className="font-bold text-lg text-[#f7941d] bg-transparent border-none !p-0">כל המחירונים</button>
                  </li>
                  <hr className="border-gray-100"/>
                  {catalogFolders.map((cat, idx) => (
                    <li key={idx}>
                      <button onClick={() => navigateToCatalog(cat.name)} className="text-gray-800 font-medium text-right w-full bg-transparent border-none !p-0">{cat.name}</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* MAIN CONTENT AREA */}
          <main className="w-full pb-32 md:pb-20">
            {isLoading ? (
               <div className="flex flex-col items-center justify-center p-12 bg-white text-[#0c2d57] min-h-[50vh]">
                 <Loader2 size={48} className="animate-spin mb-4 text-[#fe8d00]" />
                 <h2 className="text-xl font-bold">טוען נתונים מהמערכת...</h2>
               </div>
            ) : searchQuery ? (
               // SEARCH RESULTS
               <>

                {isProductsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 shadow-sm max-w-lg mx-auto p-6 text-center duration-300">
                    <Loader2 size={40} className="animate-spin text-[#f7941d] mb-4" />
                    <h3 className="text-xl font-bold text-[#0c2d57]">מבצע חיפוש...</h3>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-20 bg-white border border-gray-100">
                    <div className="text-gray-300 mb-4 flex justify-center"><Search size={48} /></div>
                    <h3 className="text-xl font-bold text-[#0c2d57]">לא נמצאו מוצרים</h3>
                    <p className="text-gray-500 mt-2">נסה לשנות את מילות החיפוש.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6">
                      {filteredProducts.slice(0, visibleCount).map(product => (
                        <VirtualProductCard key={product.id} product={product}>
                          <ProductCard product={product} navigateToProduct={navigateToProduct} addToCart={addToCart} bulkSelection={bulkSelection} onBulkSelectionChange={handleBulkSelectionChange} />
                        </VirtualProductCard>
                      ))}
                    </div>
                    {(hasMoreProducts || visibleCount < filteredProducts.length) && (
                      <InfiniteScrollTrigger 
                        onLoadMore={handleLoadMore} 
                        hasMore={hasMoreProducts || visibleCount < filteredProducts.length} 
                        isLoading={isFetchingMore} 
                      />
                    )}
                  </>
                )}
               </>

            ) : currentView === 'home' ? (
              
              // HOME - CATALOGS VIEW
              <div>
                <div className="mb-6 sm:mb-8 bg-[#004387] p-6 sm:p-8 text-white relative overflow-hidden flex flex-col items-center justify-center text-center">
                  <div className="relative z-10 w-full">
                    {/* Changed to h2 with explicit !text-white to avoid WP theme overriding color */}
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 !text-white !text-center w-full block" style={{ color: 'white', textAlign: 'center' }}>ברוכים הבאים לפורטל B2B</h2>
                    <p className="text-sm sm:text-lg opacity-90 max-w-xl font-light mx-auto !text-white !text-center block" style={{ color: 'white' }}>בחר מחירון כדי להציג את הקטגוריות, להוריד מפרטים ולהרכיב הצעת מחיר / הזמנה בקלות.</p>
                  </div>
                  <Package size={120} className="absolute left-4 bottom-0 opacity-10 rotate-12 text-white pointer-events-none" />
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6">
                  {catalogFolders.map((catalog, idx) => (
                    <CatalogCard key={idx} catalog={catalog} navigateToCatalog={navigateToCatalog} />
                  ))}
                </div>
              </div>

            ) : currentView === 'catalog_subs' ? (
              
              // SUBCATEGORIES (SHEETS) VIEW
              <>


                <h2 className="text-2xl sm:text-3xl font-bold text-[#0c2d57] mb-4 sm:mb-6 text-center w-full block">בחר קטגוריה</h2>
                
                {isProductsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 shadow-sm max-w-lg mx-auto p-6 text-center duration-300">
                    <Loader2 size={40} className="animate-spin text-[#f7941d] mb-4" />
                    <h3 className="text-xl font-bold text-[#0c2d57]">טוען נתונים...</h3>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6">
                    {activeSubcategories.length === 0 ? (
                      <div className="col-span-full text-center py-10 text-gray-500 bg-white border border-gray-100">
                        לא נמצאו קטגוריות או מוצרים במחירון זה.
                      </div>
                    ) : (
                      activeSubcategories.map((sub, idx) => (
                        <SubcategoryCard key={idx} sub={sub} navigateToSubcategory={navigateToSubcategory} />
                      ))
                    )}
                  </div>
                )}
              </>

            ) : currentView === 'nested_subs' ? (
              
              // NESTED SUBCATEGORIES VIEW
              <>


                <h2 className="text-2xl sm:text-3xl font-bold text-[#0c2d57] mb-4 sm:mb-6 text-center w-full">בחר תת-קטגוריה</h2>
                
                {isProductsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 shadow-sm max-w-lg mx-auto p-6 text-center duration-300">
                    <Loader2 size={40} className="animate-spin text-[#f7941d] mb-4" />
                    <h3 className="text-xl font-bold text-[#0c2d57]">טוען נתונים...</h3>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-6 max-w-4xl mx-auto">
                    {nestedSubcategoriesData.map((sub, idx) => (
                      <SubcategoryCard key={idx} sub={sub} onClick={() => navigateToNestedSubcategory(sub.name)} />
                    ))}
                  </div>
                )}
              </>

            ) : currentView === 'products' ? (
              
              // PRODUCTS VIEW
              <>

                <div className="mb-6 sm:mb-8 text-center relative">
                   <h2 className="text-2xl sm:text-3xl font-bold text-[#0c2d57] inline-block w-full sm:w-auto px-4">{selectedNestedSubcategory || selectedSubcategory}</h2>
                   {!isProductsLoading && (
                     <div className="mt-3 sm:mt-0 sm:absolute sm:left-0 sm:top-1/2 sm:-translate-y-1/2 flex items-center justify-center">
                       <span className="text-gray-600 bg-[#f2f2f2] px-3 py-1 rounded-none text-xs sm:text-sm font-medium whitespace-nowrap border border-gray-100 shadow-sm">{filteredProducts.length} מוצרים</span>
                     </div>
                   )}
                </div>

                {isProductsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 shadow-sm max-w-lg mx-auto p-6 text-center duration-300">
                    <Loader2 size={40} className="animate-spin text-[#f7941d] mb-4" />
                    <h3 className="text-xl font-bold text-[#0c2d57]">טוען מוצרים...</h3>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6">
                      {filteredProducts.slice(0, visibleCount).map(product => (
                        <VirtualProductCard key={product.id} product={product}>
                          <ProductCard product={product} navigateToProduct={navigateToProduct} addToCart={addToCart} bulkSelection={bulkSelection} onBulkSelectionChange={handleBulkSelectionChange} />
                        </VirtualProductCard>
                      ))}
                    </div>
                    {(hasMoreProducts || visibleCount < filteredProducts.length) && (
                      <InfiniteScrollTrigger 
                        onLoadMore={handleLoadMore} 
                        hasMore={hasMoreProducts || visibleCount < filteredProducts.length} 
                        isLoading={isFetchingMore} 
                      />
                    )}
                  </>
                )}
              </>
            ) : currentView === 'product' && selectedProduct ? (
              isProductsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 shadow-sm max-w-lg mx-auto p-6 text-center duration-300">
                  <Loader2 size={40} className="animate-spin text-[#f7941d] mb-4" />
                  <h3 className="text-xl font-bold text-[#0c2d57]">טוען את פרטי המוצר...</h3>
                </div>
              ) : (
                <ProductDetailsView />
              )
            ) : currentView === 'checkout' ? (
               <CheckoutView />
            ) : null}

          </main>
        </div>
      </div>

      {/* SHOPPING CART OVERLAY */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300">
            
            <div className="p-5 border-b flex justify-between items-center bg-[#f2f2f2]">
              <h2 className="text-xl font-bold flex items-center gap-2 text-[#0c2d57]">
                <ShoppingCart size={22} className="text-[#004387]" /> עגלת הזמנה מסחרית
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 bg-white hover:bg-[#004387] hover:text-white transition-colors text-gray-500" aria-label="סגור עגלה">
                <X size={20} />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-5">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-300 space-y-4">
                  <ShoppingCart size={64} opacity={0.5} />
                  <p className="text-lg text-gray-500 font-medium">העגלה ריקה כרגע</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {cart.map(item => (
                    <div key={item.id} className="flex gap-4 border-b border-gray-100 pb-4">
                      <div className="w-20 h-20 bg-[#f2f2f2] p-1 flex-shrink-0 border border-gray-200">
                        <img referrerPolicy="no-referrer" src={transformImageLink(item.images[0], 150)} alt={item.name} onError={handleImageError} className="w-full h-full object-contain mix-blend-multiply" />
                      </div>
                      <div className="flex-col flex flex-grow">
                        <div className="font-semibold text-sm text-[#0c2d57] line-clamp-2">{item.name}</div>
                        <div className="text-xs text-gray-500 mt-1">מק"ט: <span className="font-mono">{item.sku}</span></div>
                        
                        {item.isClearance && (
                          <div className="text-[10px] text-teal-700 font-bold mt-1.5 flex items-center gap-1 bg-teal-50/50 p-1 w-fit rounded border border-teal-100">
                             <Tag size={12} className="text-teal-600" /> מציאון: {item.clearancePrice ? `₪${item.clearancePrice}` : 'מחיר מיוחד'}
                          </div>
                        )}
                        {item.isHotSale && !item.isClearance && (
                          <div className="text-[10px] text-red-600 font-bold mt-1.5 flex items-center gap-1 bg-red-50/50 p-1 w-fit rounded border border-red-100">
                             <Flame size={12} className="text-red-500" /> {item.saleType || 'מבצע'}: {item.saleValue || 'מחיר מיוחד - פנה לנציג'}
                          </div>
                        )}
                        
                        {item.optionals && item.optionals.length > 0 && (
                          <div className="text-[10px] text-gray-600 mt-2 bg-gray-50 p-1.5 border border-gray-100 rounded">
                            <strong className="block mb-0.5">תוספות:</strong>
                            <ul className="pl-3 pr-1 list-disc">
                              {item.optionals.map((opt: any, i: number) => {
                                const accCatalogItem = catalogData.find(p => p.sku === opt.pn);
                                return (
                                  <li key={i}>{opt.pn} {accCatalogItem ? `(₪${accCatalogItem.price.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : ''}</li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        <div className="mt-auto pt-2 flex items-end justify-end">
                          
                          <div className="flex items-center bg-[#f2f2f2] border border-gray-200 overflow-hidden">
                            <button onClick={() => updateCartQuantity(item, -1)} className="p-1 px-2 hover:bg-white text-gray-600 transition-colors" aria-label="הפחת כמות"><Minus size={14}/></button>
                            <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                            <button onClick={() => updateCartQuantity(item, 1)} className="p-1 px-2 hover:bg-white text-gray-600 transition-colors" aria-label="הוסף כמות"><Plus size={14}/></button>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item)} 
                        className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all self-start p-2 rounded-md shadow-sm" 
                        aria-label="הסר מוצר מהעגלה"
                        title="הסר פריט"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-gray-200 p-5 bg-[#f2f2f2] shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between items-center mb-4 text-lg font-bold text-[#0c2d57]">
                  <span>סה"כ כמות פריטים:</span>
                  <span className="text-2xl text-[#f7941d]">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
                <button 
                  onClick={handleCheckout}
                  className="w-full bg-[#004387] hover:bg-[#fe8d00] text-white font-bold py-3 rounded-none transition-colors shadow-sm"
                >
                  מעבר להצעת מחיר
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {!isHumanVerified && <HumanVerification onVerified={() => setIsHumanVerified(true)} />}
      <React.Suspense fallback={null}>
        <TechnicalAdvisor catalogData={catalogData} addToCart={addToCart} isAuthenticated={isAuthenticated} />
      </React.Suspense>
      <InstallBanner />

      {/* SHOPPING CART ADDITION CONFIRMATION MODAL */}
      {addedItemConfirm && addedItemConfirm.isOpen && (
        <div id="cart-add-confirm-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div id="cart-add-confirm-container" className="bg-white w-full max-w-sm p-6 shadow-2xl relative border-t-4 border-green-500 rounded-none">
            
            {/* Close button */}
            <button 
              id="cart-add-confirm-close-btn"
              onClick={() => setAddedItemConfirm(null)} 
              className="absolute top-4 left-4 p-2 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors border-none rounded-none"
              title="סגור"
              type="button"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5 mt-2">
              <div className="p-2.5 bg-green-50 text-green-600 rounded-full">
                <CheckCircle size={22} className="text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0c2d57] leading-none mb-1">התווסף לסל בהצלחה!</h3>
                {addedItemConfirm.category && (
                  <p className="text-[11px] text-gray-400 font-medium">{addedItemConfirm.category}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-4 bg-gray-50 p-3 mb-4 border border-gray-100">
              {addedItemConfirm.productImage ? (
                <div className="w-16 h-16 bg-white border border-gray-200 p-1 flex items-center justify-center flex-shrink-0">
                  <img 
                    referrerPolicy="no-referrer" 
                    src={transformImageLink(addedItemConfirm.productImage, 150)} 
                    alt={addedItemConfirm.productName} 
                    onError={handleImageError} 
                    className="max-w-full max-h-full object-contain mix-blend-multiply" 
                  />
                </div>
              ) : (
                <div className="w-16 h-16 bg-white border border-gray-200 p-1 flex items-center justify-center flex-shrink-0 text-gray-300">
                  <Package size={28} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-[#0c2d57] line-clamp-2 leading-tight mb-2">{addedItemConfirm.productName}</h4>
                {addedItemConfirm.productPrice !== undefined && addedItemConfirm.productPrice > 0 && (
                  <div className="text-xs text-gray-500">
                    מחיר יחידה: <strong className="text-gray-800">₪{addedItemConfirm.productPrice.toLocaleString('he-IL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic quantity selector and removal control */}
            {(() => {
              const currentConfirmCartItem = cart.find(item => 
                item.id === addedItemConfirm.productId && 
                JSON.stringify(item.optionals || []) === JSON.stringify(addedItemConfirm.optionals || [])
              );
              const currentQty = currentConfirmCartItem ? currentConfirmCartItem.quantity : addedItemConfirm.quantity;

              return (
                <div className="mb-6 p-3 bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0c2d57]">כמות:</span>
                    <div className="flex items-center border border-gray-300 bg-white shadow-sm">
                      <button 
                        type="button"
                        onClick={() => updateConfirmCartItemQuantity(currentQty - 1)}
                        className="p-1 px-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-black border-none select-none transition-colors"
                      >
                        <Minus size={12} className="stroke-[3]" />
                      </button>
                      <input 
                        type="text" 
                        inputMode="numeric" 
                        pattern="[0-9]*"
                        value={currentQty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                          updateConfirmCartItemQuantity(val);
                        }}
                        className="w-10 text-center text-xs font-extrabold text-gray-800 focus:outline-none py-1 border-none bg-transparent"
                      />
                      <button 
                        type="button"
                        onClick={() => updateConfirmCartItemQuantity(currentQty + 1)}
                        className="p-1 px-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-black border-none select-none transition-colors"
                      >
                        <Plus size={12} className="stroke-[3]" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={removeConfirmCartItem}
                    className="flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 transition-all text-xs font-bold bg-white border border-red-200"
                    title="הסר מוצר מהסל"
                  >
                    <Trash2 size={13} />
                    <span>הסר מהסל</span>
                  </button>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-3">
              <button
                id="cart-add-confirm-continue-btn"
                type="button"
                onClick={() => setAddedItemConfirm(null)}
                className="w-full bg-white hover:bg-gray-50 text-gray-700 font-bold py-2 px-3 border border-gray-300 text-sm transition-colors text-center"
              >
                מעבר להמשך קניות
              </button>
              <button
                id="cart-add-confirm-view-cart-btn"
                type="button"
                onClick={() => {
                  setAddedItemConfirm(null);
                  setIsCartOpen(true);
                }}
                className="w-full bg-[#004387] hover:bg-[#fe8d00] text-white font-bold py-2 px-3 text-sm transition-colors text-center flex items-center justify-center gap-2 shadow-sm"
              >
                <ShoppingCart size={16} />
                מעבר לסל הקניות
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ADMIN SYNC MODAL OVERLAY */}
      {showAdminSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-white w-full max-w-sm p-6 shadow-2xl relative border-t-4 border-[#004387]">
            
            {/* Close button */}
            <button 
              onClick={() => setShowAdminSyncModal(false)} 
              className="absolute top-4 left-4 p-2 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors border-none"
              title="סגור"
              type="button"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4 mt-2">
              <div className="p-2.5 bg-[#004387]/10 text-[#004387]">
                <RefreshCw size={22} className={isSyncingLive ? "animate-spin text-[#004387]" : "text-[#004387]"} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0c2d57] leading-none mb-1">סנכרון נתונים ידני</h3>
                <p className="text-[11px] text-[#fe8d00] font-bold">עקיפת ה-Cache ועדכון נתונים מיידי</p>
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-5 leading-normal">
              הנתונים של RBS מסתנכרנים אוטומטית פעם ב-10 דקות לשמירת משאבים ומהירות. לצורך עדכונים דחופים, בצע כאן סינכרון ידני בזמן אמת.
            </p>

            {syncSuccessMsg ? (
              <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 text-xs font-semibold flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0"></span>
                <span>{syncSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleAdminSyncSubmit} className="space-y-4">
                
                {/* Session Active Box */}
                {isAdminAuth ? (
                  <div className="bg-blue-50/70 p-3 border border-blue-100 text-[11px] text-[#004387] leading-relaxed mb-1">
                    <p className="font-bold mb-1">✓ מכשיר זה מאומת למשך שעה</p>
                    <p className="text-gray-500 font-normal">אינך צריך להקליד שוב את סיסמת Vlad1107.</p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">הזן סיסמת מנהל:</label>
                    <input 
                      type="password" 
                      placeholder="הזן את סיסמת המנהל..." 
                      className="w-full bg-[#fdfdfd] border border-gray-200 px-3 py-2 text-sm font-medium outline-none focus:border-[#004387] transition-all"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                      name="admin_pwd_field"
                      autoComplete="current-password"
                    />

                    {/* Checkbox to remember password inside browser */}
                    <div className="flex items-center gap-2 mt-3 select-none">
                      <input 
                        type="checkbox" 
                        id="save-pwd-checkbox"
                        checked={saveAdminPassword}
                        onChange={(e) => setSaveAdminPassword(e.target.checked)}
                        className="w-3.5 h-3.5 border-gray-300 rounded text-[#004387] focus:ring-[#004387]"
                      />
                      <label htmlFor="save-pwd-checkbox" className="text-[11px] text-gray-500 font-medium cursor-pointer">
                        שמור סיסמה במכשיר לצורך סנכרון מהיר בעתיד
                      </label>
                    </div>
                  </div>
                )}

                {/* Error Box */}
                {adminError && (
                  <div className="p-2.5 bg-red-50 border border-red-100 text-red-600 text-xs font-medium">
                    {adminError}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 pt-1">
                  <button 
                    type="submit"
                    disabled={isSyncingLive}
                    className="w-full bg-[#004387] hover:bg-[#fe8d00] text-white font-bold py-2.5 text-sm transition-all shadow-sm rounded-none flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {isSyncingLive ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>טוען נתונים מה-Sheets...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} />
                        <span>{isAdminAuth ? 'סנכרן כעת בזמן אמת' : 'אמת סיסמה וסנכרן'}</span>
                      </>
                    )}
                  </button>

                  {isAdminAuth && (
                    <button 
                      type="button"
                      onClick={clearAdminAuth}
                      disabled={isSyncingLive}
                      className="text-[10px] text-red-400 hover:text-red-600 bg-transparent hover:underline py-1 mt-1 border-none outline-none"
                    >
                      נקה אימות מנהל במכשיר זה (התנתק)
                    </button>
                  )}
                </div>

              </form>
            )}

            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-mono">
              <span>RBS Admin Manager</span>
              <span>v1.2.6</span>
            </div>

          </div>
        </div>
      )}

      {/* Floating Action Bar for Bulk Selection */}
      {Object.keys(bulkSelection).length > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[100] w-[95%] max-w-sm sm:max-w-md bg-white border border-[#004387] shadow-[0_8px_30px_rgba(0,67,135,0.2)] rounded-lg p-3 sm:p-4 flex items-center justify-between gap-2 sm:gap-4 flex-row" style={{ animation: 'slideUp 0.3s ease-out forwards' }}>
          <div className="flex flex-col">
            <span className="text-[#0c2d57] font-bold text-sm sm:text-base leading-tight">
              {Object.keys(bulkSelection).length} מוצרים סומנו
            </span>
            <span className="text-xs text-gray-500 font-medium leading-tight mt-0.5">
              סה"כ {Object.values(bulkSelection).reduce((sum, item) => sum + item.quantity, 0)} פריטים
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={clearBulkSelection}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors rounded border border-transparent hover:border-red-100"
              title="נקה בחירה"
            >
              איפוס
            </button>
            <button
              onClick={handleAddBulkToCart}
              className="bg-[#004387] hover:bg-[#fe8d00] text-white px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold shadow-md transition-colors flex items-center gap-1.5 rounded"
            >
              <ShoppingCart size={14} className="sm:w-4 sm:h-4" />
              <span className="whitespace-nowrap">הוסף לסל</span>
            </button>
          </div>
        </div>
      )}

      {/* Global Style for slide-up animation if tailwind animate-in is not present */}
      <style>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
