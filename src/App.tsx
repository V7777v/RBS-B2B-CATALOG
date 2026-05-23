import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, Search, Menu, X, ChevronLeft, ChevronRight, FileText, File, Video, Home, Plus, Minus, Trash2, CheckCircle, Package, FolderOpen, Loader2, Lock
} from 'lucide-react';
import Papa from 'papaparse';
import { HumanVerification } from './components/HumanVerification';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1NtYwQeTX3blf0aMcvtnlk9liIaJOiG9BOsP4Qc8lSRs';
const PRODUCTS_GID = '0';
const CATALOGS_GID = '1781083359';
const SUBCATEGORIES_GID = '1626175369';

// --- HELPER ---
const transformImageLink = (url: string) => {
  if (!url) return url;
  try {
    if (url.includes('drive.google.com/file/d/')) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1500-h1500`;
      }
    } else if (url.includes('drive.google.com/open?id=')) {
      const match = url.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1500-h1500`;
      }
    } else if (url.includes('drive.google.com/drive/folders/')) {
      return 'https://placehold.co/600x400/f3f4f6/000000?text=Drive+Folder';
    }
  } catch(e) { /* ignore */ }
  return url;
};

const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return null;
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

export default function App() {
  // --- STATE ---
  const [catalogFolders, setCatalogFolders] = useState<any[]>([]);
  const [subcategoriesGlobalData, setSubcategoriesGlobalData] = useState<any[]>([]);
  const [catalogData, setCatalogData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState('home'); // 'home', 'catalog_subs', 'products', 'product', 'checkout'
  const [selectedCatalog, setSelectedCatalog] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- DATA FETCHING ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const fetchCSV = (gid: string) => {
          return new Promise<any[]>((resolve, reject) => {
            Papa.parse(`${SHEET_URL}/gviz/tq?tqx=out:csv&gid=${gid}&_=${Date.now()}`, {
              download: true,
              header: true,
              skipEmptyLines: true,
              complete: (results) => resolve(results.data),
              error: (error: any) => reject(error)
            });
          });
        };

        const [productsCsv, catalogsCsv, subcategoriesCsv] = await Promise.all([
          fetchCSV(PRODUCTS_GID),
          fetchCSV(CATALOGS_GID),
          fetchCSV(SUBCATEGORIES_GID)
        ]);

        const parsedProducts = productsCsv.map((row: any) => {
          let itemImages = [];
          if (row.imagesJSON) {
            try {
               itemImages = JSON.parse(row.imagesJSON);
               if(!Array.isArray(itemImages)) {
                  itemImages = [itemImages];
               }
            } catch(e) {
               if (typeof row.imagesJSON === 'string') {
                  const cleaned = row.imagesJSON.trim();
                  if (cleaned.startsWith('http')) {
                     itemImages = cleaned.split(',').map((s: string) => s.trim()).filter((s: string) => s.startsWith('http'));
                  }
               }
            }
          }
          
          if (!itemImages || itemImages.length === 0) {
             if (row.imageURL && row.imageURL.trim().startsWith('http')) {
                itemImages = [row.imageURL.trim()];
             } else {
                itemImages = ['https://placehold.co/600x400/f3f4f6/000000?text=No+Image'];
             }
          }
          return {
            ...row,
            price: Number(row.price) || 0,
            retailPrice: row.retailPrice ? Number(row.retailPrice) : null,
            images: itemImages.map(transformImageLink)
          };
        });

        const parsedCatalogs = catalogsCsv.map((row: any) => {
           let catImage = transformImageLink(row.image);
           
           if (row.name && (row.name.includes("סלולריים") || row.name.toLowerCase().includes("cellular"))) {
              catImage = "https://robustelanz.com.au/wp-content/uploads/2021/06/Robustel_R1520_1.jpg";
           } else if (row.name && row.name.includes("POE")) {
              catImage = transformImageLink("https://drive.google.com/file/d/17Im3ggLiWxPTfrDberOwwKWyMgf2D6A6/view?usp=drive_link");
           }

           return {
             name: row.name,
             desc: row.desc,
             image: catImage,
             brand: row.brand,
             sortOrder: Number(row.sortOrder) || 999,
             active: row.active === 'TRUE' || row.active === 'true'
           };
        }).sort((a,b) => a.sortOrder - b.sortOrder);

        setCatalogData(parsedProducts);
        setCatalogFolders(parsedCatalogs.filter(c => c.active !== false));
        setSubcategoriesGlobalData((subcategoriesCsv || []).map((row: any) => {
           let providedImage = row.IMAGE || row.Image || row.image || row['תמונה'];
           let subImage = providedImage ? transformImageLink(providedImage) : null;
           
           if (!subImage) {
              if (row.subcategory && (row.subcategory.includes("סלולריים") || row.subcategory.toLowerCase().includes("cellular"))) {
              subImage = "https://robustelanz.com.au/wp-content/uploads/2021/06/Robustel_R1520_1.jpg";
           } else if (row.subcategory && row.subcategory.includes("POE")) {
              subImage = transformImageLink("https://drive.google.com/file/d/17Im3ggLiWxPTfrDberOwwKWyMgf2D6A6/view?usp=drive_link");
           } else if (row.subcategory && (row.subcategory === 'מצלמות חשמל WIFI' || row.subcategory === 'מצלמות WIFI חשמל')) {
              subImage = transformImageLink('https://drive.google.com/file/d/1EQnAA-b_ez8dHTDbfcb5dETBnHSF5HeO/view?usp=drive_link');
           } else if (row.subcategory && (row.subcategory === 'מצלמות חשמל 4G' || row.subcategory === 'מצלמות 4G חשמל')) {
              subImage = transformImageLink('https://drive.google.com/file/d/1vMM8K41UALo7f9WLeRGHtt8l9XfjctmA/view?usp=drive_link');
           } else if (row.subcategory && row.subcategory.includes('סוללה עצמאיות')) {
              subImage = transformImageLink('https://drive.google.com/file/d/13d3JVC3H7T-dCGbImrrRm-05pGFqrOkN/view?usp=drive_link');
           } else if (row.subcategory && row.subcategory === 'אינטרקומים') {
              subImage = transformImageLink('https://drive.google.com/file/d/1_e67NvLTFI8hiisTJHgLerRkLD33jak4/view?usp=drive_link');
           } else if (row.subcategory && row.subcategory === 'מנעולים חכמים') {
              subImage = transformImageLink('https://drive.google.com/file/d/1uo_Vnq_Vei1oRhLw02h2TQEaylApQiQW/view?usp=drive_link');
           } else if (row.subcategory && row.subcategory.includes('שואבים שוטפים')) {
              subImage = transformImageLink('https://drive.google.com/file/d/1kOd6VCtpXz3Im-_hCQFRGRDrT0ucD_xh/view?usp=drive_link');
           } else if (row.subcategory && row.subcategory === 'רמקולים שקועים') {
              subImage = transformImageLink('https://drive.google.com/file/d/1PhQwKX-PPEDkI86oJYx8_Oxcy8D1JoNo/view?usp=drive_link');
           } else if (row.subcategory && row.subcategory === 'רמקולים חיצוניים') {
              subImage = transformImageLink('https://drive.google.com/file/d/13DphjTY4N3ZUBusc9fPflH5i2XxejnvO/view?usp=drive_link');
           } else if (row.subcategory && row.subcategory === 'מגברים') {
              subImage = transformImageLink('https://drive.google.com/file/d/1WVwyorSCDVSFH8tVhbTkrdCMgAbCpRna/view?usp=drive_link');
           } else if (row.subcategory && row.subcategory === 'אביזרים משלימים') {
              subImage = transformImageLink('https://drive.google.com/file/d/1ANu1sSxiv6prXWdBCSkg6EDMWNktYHeg/view?usp=drive_link');
           } else if (row.subcategory && row.subcategory.includes('בידוריות')) {
              subImage = transformImageLink('https://drive.google.com/file/d/1uWWpTJTAATxeUecKLrAcsYv-UuYJmQ16/view?usp=drive_link');
           } else if (row.subcategory && (row.subcategory === 'מיקסרים ומקרופונים' || row.subcategory === 'מיקסרים ומיקרופונים')) {
              subImage = transformImageLink('https://drive.google.com/file/d/1GtUymZdOSaALtyMVJ_znxYjlxwIE-PRb/view?usp=drive_link');
           }
           }

           return {
             ...row,
             image: subImage
           };
        }));
      } catch (err) {
        console.error("Error loading data:", err);
        setError("שגיאה בטעינת הנתונים. אנא ודא שהמסמך פומבי ונגיש.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Scroll to top on every view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentView, selectedProduct]);

  // --- DERIVED DATA ---
  
  // Get all unique subcategories (sheets) for the selected catalog
  const activeSubcategories = useMemo(() => {
    if (!selectedCatalog) return [];
    const productsInCat = catalogData.filter(item => item.category === selectedCatalog && item.active !== 'FALSE');
    let subs = [...new Set(productsInCat.map(item => item.subcategory).filter(Boolean))] as string[];
    
    // הסתרת תתי-הקטגוריות הפנימיות מהרשימה הראשית (Hikvision + Inginium)
    const hiddenNestedSubs = [
      'מתגי רשת מנוהלים - Smart Cloud Managed (ללא POE)', 
      'מתגי ליבה אופטי - Access Switches L3',
      'Inginium - גלילים CAT7',
      'Inginium - מגשרי CAT6A'
    ];
    
    // אם יש מוצרים מהמשפחות הפנימיות של אינג'יניום, נוסיף באופן יזום את קטגוריית האם שלהם
    const hasInginium = productsInCat.some(p => p.subcategory && p.subcategory.startsWith('Inginium - '));
    if (hasInginium && !subs.includes('Inginium Full Channel')) {
      subs.push('Inginium Full Channel');
    }

    subs = subs.filter(sub => !hiddenNestedSubs.includes(sub));

    // Create an array of objects with counts for UI
    return subs.map(subName => {
      // Find matching subcategory from Google Sheets (by subcategory name and parent category)
      const sheetSub = subcategoriesGlobalData.find(s => s.category === selectedCatalog && s.subcategory === subName);
      let customImage = sheetSub?.image || null;
      
      // Fallback to hardcoded images if no image exists in the sheet
      if (!customImage) {
        if (subName === 'מצלמות חשמל WIFI' || subName === 'מצלמות WIFI חשמל') {
          customImage = transformImageLink('https://drive.google.com/file/d/1EQnAA-b_ez8dHTDbfcb5dETBnHSF5HeO/view?usp=drive_link');
        } else if (subName && (subName.includes('סלולריים') || subName.toLowerCase().includes('cellular'))) {
          customImage = 'https://robustelanz.com.au/wp-content/uploads/2021/06/Robustel_R1520_1.jpg';
        } else if (subName && subName.includes('POE')) {
          customImage = transformImageLink('https://drive.google.com/file/d/17Im3ggLiWxPTfrDberOwwKWyMgf2D6A6/view?usp=drive_link');
        } else if (subName === 'מצלמות חשמל 4G' || subName === 'מצלמות 4G חשמל') {
          customImage = transformImageLink('https://drive.google.com/file/d/1vMM8K41UALo7f9WLeRGHtt8l9XfjctmA/view?usp=drive_link');
        } else if (subName === 'מצלמות סוללה עצמאיות') {
          customImage = transformImageLink('https://drive.google.com/file/d/13d3JVC3H7T-dCGbImrrRm-05pGFqrOkN/view?usp=drive_link');
        } else if (subName === 'אינטרקומים') {
          customImage = transformImageLink('https://drive.google.com/file/d/1_e67NvLTFI8hiisTJHgLerRkLD33jak4/view?usp=drive_link');
        } else if (subName === 'מנעולים חכמים') {
          customImage = transformImageLink('https://drive.google.com/file/d/1uo_Vnq_Vei1oRhLw02h2TQEaylApQiQW/view?usp=drive_link');
        } else if (subName === 'שואבים שוטפים רובוטיים' || subName.includes('שואבים שוטפים')) {
          customImage = transformImageLink('https://drive.google.com/file/d/1kOd6VCtpXz3Im-_hCQFRGRDrT0ucD_xh/view?usp=drive_link');
        } else if (subName === 'מתגי ליבה ורשת מנוהלים') {
          customImage = 'https://assets.hikvision.com/prd/normal/all/image/m000113563/DS-3E2736-HI-24F8T4X_F_202309.jpg?eo-img.format=webp';
        } else if (subName === 'מתגי רשת גיגה לא מנוהלים') {
          customImage = 'https://assets.hikvision.com/prd/normal/all/image/m000073645/8%E5%8F%A3%E5%B7%A645%E4%BF%AF%E8%A7%86---%E5%89%AF%E6%9C%AC.png?eo-img.format=webp';
        } else if (subName === 'מתגי גיגה תעשייתיים') {
          customImage = 'https://assets.hikvision.com/prd/normal/all/image/m000138688/12.png?eo-img.format=webp';
        } else if (subName === 'מפצלי POE') {
          customImage = 'https://assets.hikvision.com/prd/public/all/image/m000131322/DSC09357.png?eo-img.format=webp';
        } else if (subName === 'אקסס פוינטים - AP') {
          customImage = 'https://assets.hikvision.com/prd/normal/all/image/m000113057/%E6%AD%A3%E8%A7%86%E5%9B%BE.png?eo-img.format=webp';
        } else if (subName === 'לינקים אלחוטיים') {
          customImage = 'https://assets.hikvision.com/prd/normal/all/image/m000152562/11-1.png?eo-img.format=webp';
        } else if (subName === 'נתבים אלחוטיים ביתי-משרדי') {
          customImage = 'https://assets.hikvision.com/prd/normal/all/image/m000133680/%E7%BA%BF%E4%B8%8B%E6%AC%BE1.png?eo-img.format=webp';
        } else if (subName === 'מגדילי טווח ויחידות MESH') {
          customImage = 'https://assets.hikvision.com/prd/public/all/image/m000156931/%E4%B8%AD%E7%BB%A7%E5%99%A8.png?eo-img.format=webp';
        } else if (subName === 'VPN Professional Router') {
          customImage = 'https://assets.hikvision.com/prd/public/all/image/m000113061/DS-3WG507G-SI_F_202309.jpg?eo-img.format=webp';
        } else if (subName === 'אל פסק - UPS') {
          customImage = 'https://assets.hikvision.com/prd/public/all/image/m000086221/%E5%9B%BE%E7%89%87.jpg?eo-img.format=webp';
        } else if (subName === 'אל פסק אונליין RM') {
          customImage = 'https://assets.hikvision.com/prd/normal/all/image/m000172008/%E5%B7%A6%E5%89%8D%E4%BE%A7-LOGO.png?eo-img.format=webp';
        } else if (subName === 'אל פסק אונליין Tower') {
          customImage = 'https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcQ7QJg4nHgNAgQ2E8vZ4Kqtt-pCWsi8eyLVxCIARB7_HCTqSzBn-TiKsWBYn4mn-dnHo4yfRy2MxOB02yDbX6QmZIM3eujkj2fh4T5V4EYiD0vSfQSAsdF_tnQZwbrFlocNutsK0bu_dWk&usqp=CAc';
        } else if (subName === 'טלפוניה IP') {
          customImage = 'https://assets.hikvision.com/prd/normal/all/image/m000062901/KP9301%E4%B8%BB%E8%A7%86%E5%9B%BE_20220822.png?eo-img.format=webp';
        } else if (subName === 'כבלים ואביזרים') {
          customImage = 'https://assets.hikvision.com/prd/normal/all/image/m000001449/%E8%B6%85%E4%BA%94%E7%B1%BB2.png?eo-img.format=webp';
        } else if (subName === 'מצלמות לרכב') {
          customImage = 'https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcTOxMM3c1rVlvshWHjGeqk4BFeF5B2KA5HnKvA2uP3Zv546YfeY7A8DlFJhcz9x1ByVXPrFIed1YamY4h9MuBXuhQ8b_m_hX8S1nnbVq-bPHj6DBG00YQw5T2s4O1Zpag&usqp=CAc';
        } else if (subName === 'Msolutions HDBaseT Extenders') {
          customImage = 'https://placehold.co/600x400/e0f2fe/0369a1?text=Msolutions+Extenders';
        } else if (subName === 'Msolutions Tester') {
          customImage = 'https://placehold.co/600x400/e0f2fe/0369a1?text=Msolutions+Tester';
        } else if (subName === 'Tesla Smart') {
          customImage = 'https://placehold.co/600x400/dcfce7/166534?text=Tesla+Smart';
        } else if (subName === 'Boost-Connect') {
          customImage = 'https://placehold.co/600x400/fef3c7/b45309?text=Boost+Connect';
        } else if (subName === 'Inginium Full Channel') {
          customImage = 'https://placehold.co/600x400/e0e7ff/0369a1?text=Inginium+Full+Channel';
        } else if (subName === 'כבלי תקשורת Recber') {
          customImage = 'https://www.recber.com.tr/wp-content/uploads/2018/12/banner4.jpg';
        } else if (subName === 'ארונות תקשורת ואביזרים') {
          customImage = 'https://rbs-telecom.com/wp-content/uploads/קטלוג-פסי-שקעים-scaled.png';
        } else if (subName === 'פסי שקעים PDU') {
          customImage = 'https://rbs-telecom.com/wp-content/uploads/5cd9dbb9-8411-455d-8eed-9f1194971df8.png';
        } else if (subName === 'כבלי פיקוד, רמקולים וכריזה') {
          customImage = 'https://placehold.co/600x400/dcfce7/166534?text=Audio+Cables';
        } else if (subName === 'מגשרי רשת CAT6') {
          customImage = 'https://placehold.co/600x400/e0e7ff/3730a3?text=CAT6+Patch+Cords';
        } else if (subName === 'מגשרי רשת CAT7 / CAT8') {
          customImage = 'https://placehold.co/600x400/e0e7ff/4338ca?text=CAT7/8+Patch+Cords';
        } else if (subName === 'שקעי רשת, תקעים ואביזרים') {
          customImage = 'https://placehold.co/600x400/f3f4f6/374151?text=Keystones+%26+Plugs';
        } else if (subName === 'כבלי רשת LAN גלילים') {
          customImage = 'https://placehold.co/600x400/ffedd5/92400e?text=LAN+Cables';
        } else if (subName === 'טלפוניה ואביזרים') {
          customImage = 'https://placehold.co/600x400/fce7f3/9d174d?text=Telephony';
        } else if (subName === 'כבלי קואקס') {
          customImage = 'https://placehold.co/600x400/e2e8f0/1e293b?text=Coax+Cables';
        } else if (subName === 'כבלי HDMI') {
          customImage = 'https://placehold.co/600x400/fef08a/b45309?text=HDMI+Cables';
        } else if (subName === 'ספקי כוח ומתח') {
          customImage = 'https://placehold.co/600x400/dbeafe/1e40af?text=Power+Supplies';
        } else if (subName === 'כלי עבודה וציוד בדיקה') {
          customImage = 'https://placehold.co/600x400/f3e8ff/4c1d95?text=Tools+%26+Testers';
        } else if (subName === 'רמקולים שקועים') {
          customImage = transformImageLink('https://drive.google.com/file/d/1PhQwKX-PPEDkI86oJYx8_Oxcy8D1JoNo/view?usp=drive_link');
        } else if (subName === 'רמקולים חיצוניים') {
          customImage = transformImageLink('https://drive.google.com/file/d/13DphjTY4N3ZUBusc9fPflH5i2XxejnvO/view?usp=drive_link');
        } else if (subName === 'מגברים') {
          customImage = transformImageLink('https://drive.google.com/file/d/1WVwyorSCDVSFH8tVhbTkrdCMgAbCpRna/view?usp=drive_link');
        } else if (subName === 'אביזרים משלימים') {
          customImage = transformImageLink('https://drive.google.com/file/d/1ANu1sSxiv6prXWdBCSkg6EDMWNktYHeg/view?usp=drive_link');
        } else if (subName && subName.includes('בידוריות')) {
          customImage = transformImageLink('https://drive.google.com/file/d/1uWWpTJTAATxeUecKLrAcsYv-UuYJmQ16/view?usp=drive_link');
        } else if (subName === 'מיקסרים ומקרופונים' || subName === 'מיקסרים ומיקרופונים') {
          customImage = transformImageLink('https://drive.google.com/file/d/1GtUymZdOSaALtyMVJ_znxYjlxwIE-PRb/view?usp=drive_link');
        } else if (subName === 'נתבים סלולריים תעשייתיים') {
          customImage = 'https://placehold.co/600x400/f1f5f9/334155?text=Cellular+Routers';
        } else if (subName === 'מתגי POE - BoostLink') {
          customImage = 'https://placehold.co/600x400/f1f5f9/334155?text=BoostLink+Switches';
        } else if (subName === 'Teltonika - מתגים ואביזרים') {
          customImage = 'https://placehold.co/600x400/f1f5f9/334155?text=Teltonika+Network';
        } else if (subName === 'Teltonika - חיישני IoT') {
          customImage = 'https://placehold.co/600x400/f1f5f9/334155?text=Teltonika+Sensors';
        } else if (subName === 'בקרות כניסה וקודנים') {
          customImage = 'https://placehold.co/600x400/f1f5f9/334155?text=Access+Control';
        } else if (subName === 'כבלים אופטיים מוכנים') {
          customImage = 'https://placehold.co/600x400/f8fafc/0f172a?text=Pre-made+Optical+Cables';
        } else if (subName === 'מגשרים אופטיים') {
          customImage = 'https://placehold.co/600x400/f8fafc/0f172a?text=Optical+Patch+Cords';
        } else if (subName === 'פיגטיילים') {
          customImage = 'https://placehold.co/600x400/f8fafc/0f172a?text=Optical+Pigtails';
        } else if (subName === "פאץ' פאנלים") {
          customImage = 'https://placehold.co/600x400/f8fafc/0f172a?text=Patch+Panels';
        } else if (subName === 'שקעים אופטיים') {
          customImage = 'https://placehold.co/600x400/f8fafc/0f172a?text=Optical+Outlets';
        } else if (subName === 'מתאמים אופטיים') {
          customImage = 'https://placehold.co/600x400/f8fafc/0f172a?text=Optical+Adapters';
        } else if (subName === 'מחבר מהיר') {
          customImage = 'https://placehold.co/600x400/f8fafc/0f172a?text=Fast+Connectors';
        } else if (subName === 'ארונות וארונות הסתעפות') {
          customImage = 'https://placehold.co/600x400/f8fafc/0f172a?text=Optical+Cabinets';
        } else if (subName === 'ציודי בדיקה') {
          customImage = 'https://placehold.co/600x400/f8fafc/0f172a?text=Testing+Equipment';
        } else if (subName === "מיני ג'יביקים") {
          customImage = 'https://placehold.co/600x400/f8fafc/0f172a?text=SFP+Modules';
        } else if (subName === 'ממירים אופטיים') {
          customImage = 'https://placehold.co/600x400/f8fafc/0f172a?text=Media+Converters';
        } else if (subName === 'כלי עבודה') {
          customImage = 'https://placehold.co/600x400/f8fafc/0f172a?text=Optical+Tools';
        }
      }
      
      let count = productsInCat.filter(p => p.subcategory === subName && p.name !== 'מוצר הדגמה' && p.name !== 'קטגוריית אם').length;
      
      // ספירת סך כל המוצרים גם בתת-הקטגוריות עבור תיקיות האם (היקויז'ן ואינג'יניום)
      if (subName === 'מתגי ליבה ורשת מנוהלים') {
         count = productsInCat.filter(p => (p.subcategory === 'מתגי רשת מנוהלים - Smart Cloud Managed (ללא POE)' || p.subcategory === 'מתגי ליבה אופטי - Access Switches L3') && p.name !== 'מוצר הדגמה' && p.name !== 'קטגוריית אם').length;
      } else if (subName === 'Inginium Full Channel') {
         count = productsInCat.filter(p => p.subcategory && p.subcategory.startsWith('Inginium - ') && p.name !== 'מוצר הדגמה' && p.name !== 'קטגוריית אם').length;
      }
      
      return {
        name: subName,
        count: count,
        image: customImage || productsInCat.find(p => p.subcategory === subName)?.images[0]
      };
    });
  }, [selectedCatalog, catalogData]);

  const nestedSubcategoriesData = useMemo(() => {
    let nestedNames: string[] = [];
    
    // אילו תתי קטגוריות להציג על פי תיקיית האם שנבחרה
    if (selectedSubcategory === 'מתגי ליבה ורשת מנוהלים') {
      nestedNames = ['מתגי רשת מנוהלים - Smart Cloud Managed (ללא POE)', 'מתגי ליבה אופטי - Access Switches L3'];
    }

    return nestedNames.map(name => {
      const count = catalogData.filter(p => p.subcategory === name && p.active !== 'FALSE').length;
      let defaultImage = 'https://placehold.co/600x400/f3f4f6/000000?text=Category';
      const sheetSub = subcategoriesGlobalData.find(s => s.category === selectedCatalog && s.subcategory === name);

      let image = sheetSub?.image || null;
      
      if (!image) {
        // תמונות מותאמות אישית לתתי-הקטגוריות הפנימיות
        if (name === 'מתגי ליבה אופטי - Access Switches L3') {
          image = 'https://assets.hikvision.com/prd/normal/all/image/m000113563/DS-3E2736-HI-24F8T4X_F_202309.jpg?eo-img.format=webp';
        } else if (name === 'מתגי רשת מנוהלים - Smart Cloud Managed (ללא POE)') {
          image = 'https://assets.hikvision.com/prd/normal/all/image/m000034943/1524.png?eo-img.format=webp';
        } else if (name === 'Inginium - גלילים CAT7') {
          image = 'https://placehold.co/600x400/e0e7ff/0369a1?text=CAT7+Rolls';
        } else if (name === 'Inginium - מגשרי CAT6A') {
          image = 'https://placehold.co/600x400/e0e7ff/0369a1?text=CAT6A+Patch+Cords';
        } else {
          image = defaultImage;
        }
      }
      
      return {
        name: name,
        count: count,
        image: image
      };
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
      filtered = filtered.filter(item => {
        if (item.category !== selectedCatalog || item.name === 'מוצר הדגמה' || item.name === 'קטגוריית אם') return false;
        
        if (selectedSubcategory === 'Inginium Full Channel') {
          return item.subcategory === 'Inginium Full Channel' || (item.subcategory && item.subcategory.startsWith('Inginium - '));
        }
        
        return item.subcategory === selectedSubcategory;
      });
    }
    
    return filtered;
  }, [selectedCatalog, selectedSubcategory, currentView, searchQuery, catalogData]);

  // --- CART FUNCTIONS ---
  const addToCart = (product: any, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { ...product, quantity }];
    });
    setIsCartOpen(true);
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartTotalWithVat = cartTotal * 1.18; // חישוב מע"מ סטנדרטי (18% נכון ל-2025)

  // --- NAVIGATION ---
  const navigateHome = () => {
    setCurrentView('home');
    setSelectedCatalog(null);
    setSelectedSubcategory(null);
    setSearchQuery('');
    setMobileMenuOpen(false);
  };

  // מנגנון חזרה חדש - חכם וזוכר הסטוריה
  const goBack = () => {
    switch(currentView) {
      case 'product':
        setCurrentView('products');
        setSelectedProduct(null);
        break;
      case 'products':
        // בדיקה האם המוצר הגיע מתיקייה פנימית של HIKVISION
        if (selectedSubcategory === 'מתגי רשת מנוהלים - Smart Cloud Managed (ללא POE)' || selectedSubcategory === 'מתגי ליבה אופטי - Access Switches L3') {
          setCurrentView('nested_subs');
          setSelectedSubcategory('מתגי ליבה ורשת מנוהלים');
        } 
        // רמה רגילה
        else {
          setCurrentView('catalog_subs');
          setSelectedSubcategory(null);
        }
        break;
      case 'nested_subs':
        setCurrentView('catalog_subs');
        setSelectedSubcategory(null);
        break;
      case 'catalog_subs':
        setCurrentView('home');
        setSelectedCatalog(null);
        break;
      case 'checkout':
        setCurrentView('home');
        setSearchQuery('');
        break;
      default:
        setCurrentView('home');
        setSearchQuery('');
    }
  };

  const navigateToCatalog = (catalogName: string | null) => {
    setSelectedCatalog(catalogName);
    setCurrentView('catalog_subs');
    setSearchQuery('');
    setMobileMenuOpen(false);
  };

  const navigateToSubcategory = (subName: string | null) => {
    setSelectedSubcategory(subName);
    // ניווט מותאם לתיקיות אם המכילות תתי-תיקיות
    if (subName === 'מתגי ליבה ורשת מנוהלים') {
      setCurrentView('nested_subs');
    } else {
      setCurrentView('products');
    }
    setSearchQuery('');
  };

  const navigateToProduct = (product: any) => {
    setSelectedProduct(product);
    setCurrentView('product');
  };

  const handleCheckout = () => {
    setCurrentView('checkout');
    setIsCartOpen(false);
  };

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

  // --- COMPONENTS ---

  const CatalogCard: React.FC<{ catalog: any }> = ({ catalog }) => (
    <div 
      onClick={() => navigateToCatalog(catalog.name)}
      className="group flex flex-col rounded-none bg-white overflow-hidden shadow-[0_5px_15px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.1)] transition-all cursor-pointer transform hover:-translate-y-1 border border-gray-100"
    >
      <div className="aspect-square relative border-b border-gray-100 bg-white flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        <img src={catalog.image} alt={catalog.name} className="w-full h-full max-w-full max-h-full object-contain mix-blend-multiply drop-shadow-sm transition-transform duration-300" />
      </div>
      <div className="p-3 sm:p-5 flex flex-col flex-grow bg-white group-hover:bg-gray-50 transition-colors text-center sm:text-right">
        <h3 className="font-semibold text-[#0c2d57] text-sm sm:text-lg mb-1 sm:mb-2 line-clamp-2 leading-tight min-h-[2.5rem] sm:min-h-0 flex items-center justify-center sm:justify-start">{catalog.name}</h3>
        <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-2 sm:mb-4 line-clamp-2 hidden sm:block">{catalog.desc}</p>
        <div className="mt-auto pt-2 border-t border-gray-50 sm:border-none flex justify-center sm:justify-between items-center text-[#f7941d] font-bold text-xs sm:text-sm">
          <span className="hidden sm:inline">פתח מחירון</span>
          <span className="sm:hidden">פתח</span>
          <ChevronLeft size={16} className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-0" />
        </div>
      </div>
    </div>
  );

  const SubcategoryCard: React.FC<{ sub: any }> = ({ sub }) => (
    <div 
      onClick={() => navigateToSubcategory(sub.name)}
      className="group flex flex-col h-full min-h-[10rem] sm:min-h-[16rem] rounded-none overflow-hidden shadow-[0_5px_15px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.1)] transition-all cursor-pointer bg-white transform hover:-translate-y-1 border border-gray-100"
    >
      <div className="relative aspect-square p-3 sm:p-6 flex items-center justify-center bg-white group-hover:bg-gray-50/50 transition-colors border-b border-gray-100 overflow-hidden">
        {sub.image ? (
          <img src={sub.image} alt={sub.name} className="w-full h-full max-w-full max-h-full object-contain mix-blend-multiply drop-shadow-sm transition-transform duration-500" />
        ) : (
          <FolderOpen className="text-gray-300 w-10 h-10 sm:w-12 sm:h-12" />
        )}
      </div>
      
      <div className="p-3 sm:p-5 flex flex-col flex-grow bg-white text-center justify-between">
        <div>
           <h3 className="font-semibold text-[#0c2d57] text-xs sm:text-lg leading-tight mb-1 sm:mb-2 line-clamp-2">{sub.name}</h3>
           <p className="text-gray-500 text-[11px] sm:text-sm mb-1 sm:mb-4 font-medium">{sub.count} מוצרים</p>
        </div>
        <div className="mt-auto flex justify-center items-center gap-1 text-[#f7941d] font-bold text-xs sm:text-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pt-1 border-t border-gray-50 sm:border-none">
          <span className="hidden sm:inline">הצג</span>
          <ChevronLeft size={14} className="w-4 h-4 sm:w-4 sm:h-4" />
        </div>
      </div>
    </div>
  );

  const ProductCard: React.FC<{ product: any }> = ({ product }) => {
    const theme = getBrandTheme(product.brand);
    return (
      <div 
        onClick={() => navigateToProduct(product)}
        className={`group flex flex-col rounded-none bg-white overflow-hidden shadow-[0_5px_15px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.1)] transition-all cursor-pointer transform hover:-translate-y-1 border border-gray-100`}
      >
        <div className={`p-3 sm:p-6 bg-white flex justify-center items-center aspect-square relative border-b border-gray-100 overflow-hidden`}>
          <img src={product.images[0]} alt={product.name} loading="lazy" decoding="async" className="w-full h-full max-w-full max-h-full object-contain mix-blend-multiply drop-shadow-sm" />
          
          <div className={`absolute top-2 right-2 text-[10px] sm:text-xs font-bold px-2 py-1 rounded-none border ${theme.badge} z-10`}>
            {product.brand}
          </div>
        </div>
        <div className="p-3 sm:p-4 flex flex-col flex-grow text-center">
          <div className="text-[10px] sm:text-xs text-gray-400 mb-1 line-clamp-1">{product.sku}</div>
          <h3 className="text-[#0c2d57] text-xs sm:text-base font-semibold mb-2 line-clamp-2 leading-tight min-h-[2rem] sm:min-h-[2.5rem] flex items-start justify-center">{product.name}</h3>
          
          <div className="mt-auto pt-2 sm:pt-2 flex flex-col items-center w-full">
            {product.price === 0 ? (
              <div className="text-xs sm:text-sm font-bold text-gray-600 mb-2 mt-auto">צור קשר</div>
            ) : product.retailPrice ? (
              <div className="flex flex-col items-center leading-tight mb-2 w-full">
                 <span className="text-[10px] sm:text-xs text-gray-700 font-medium leading-[1.2] mb-1 w-full">
                   מחיר מומלץ לצרכן ₪{product.retailPrice} <span className="block sm:inline text-[9px] sm:text-[10px]">(כולל מע"מ)</span>
                 </span>
                 <span className="text-lg sm:text-lg font-bold text-[#f7941d] leading-none">₪{product.price} <span className="text-[10px] sm:text-[10px] text-[#0c2d57] font-normal">מומלץ למתקין</span></span>
              </div>
            ) : (
              <div className="text-lg sm:text-lg font-bold text-[#f7941d] mb-2 mt-auto">₪{product.price} <span className="text-[10px] sm:text-[10px] text-[#0c2d57] font-normal">מחיר מומלץ למתקין</span></div>
            )}
            
            <button 
              onClick={(e) => { e.stopPropagation(); addToCart(product); }}
              className={`w-full flex justify-center items-center gap-1.5 py-2 px-2 sm:px-4 transition-colors hover:opacity-90 ${theme.button}`}
            >
              <ShoppingCart size={16} className="w-4 h-4 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-bold">הוספה</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ProductDetailsView = () => {
    const [mainImage, setMainImage] = useState(selectedProduct?.images[0]);
    const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
    const [isVideoHovered, setIsVideoHovered] = useState(false);
    const [isSpecsHovered, setIsSpecsHovered] = useState(false);
    const [isManualHovered, setIsManualHovered] = useState(false);
    const theme = getBrandTheme(selectedProduct?.brand);

    useEffect(() => {
      if (selectedProduct) {
        setMainImage(selectedProduct.images[0]);
      }
    }, [selectedProduct]);

    const handleMouseMove = (e: any) => {
      const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = ((clientX - left) / width) * 100;
      const y = ((clientY - top) / height) * 100;
      setZoomPos({ x, y });
    };

    const handleMouseLeave = () => {
      setZoomPos({ x: 50, y: 50 });
    };

    if (!selectedProduct) return null;

    return (
      <div className="animate-in fade-in duration-300">
        {/* PRODUCT BREADCRUMBS */}
        <div className="flex items-center justify-center mb-4 sm:mb-8 border-b border-gray-200 pb-3 sm:pb-4 text-center">
          <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 text-[11px] sm:text-sm text-gray-500">
            <button onClick={navigateHome} className="hover:text-[#004387] p-1" aria-label="דף הבית"><Home size={14} className="sm:w-4 sm:h-4" /></button>
            <ChevronLeft size={14} className="flex-shrink-0 sm:w-4 sm:h-4" />
            <button onClick={() => navigateToCatalog(selectedCatalog)} className="hover:text-[#004387]">
              {selectedCatalog}
            </button>
            <ChevronLeft size={14} className="flex-shrink-0 sm:w-4 sm:h-4" />
            <button onClick={() => navigateToSubcategory(selectedSubcategory)} className="hover:text-[#004387]">
              {selectedSubcategory}
            </button>
            <ChevronLeft size={14} className="flex-shrink-0 sm:w-4 sm:h-4" />
            <span className="font-semibold text-[#0c2d57] truncate max-w-[120px] sm:max-w-[300px]">{selectedProduct.name}</span>
          </div>
        </div>

        <div className="bg-white rounded-none shadow-sm border border-gray-100 mt-2 sm:mt-4">
          {(selectedProduct.brand === 'EZVIZ' || selectedProduct.brand === 'HIKVISION') && (
            <div className="w-full py-1.5 px-4 sm:py-2 sm:px-6 font-bold text-sm sm:text-lg text-white text-center tracking-widest bg-[#004387]">
              {selectedProduct.brand}
            </div>
          )}

          <div className="p-4 sm:p-6 md:p-8 flex flex-col lg:flex-row gap-6 sm:gap-8">
            
            <div className="w-full lg:w-5/12 flex flex-col gap-3 sm:gap-4">
              {/* ZOOMABLE IMAGE CONTAINER */}
              <div 
                className={`aspect-square rounded-none border border-gray-100 ${theme.bg} p-2 sm:p-4 flex items-center justify-center relative overflow-hidden cursor-crosshair group`}
                onMouseMove={handleMouseMove}
                onTouchMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <img 
                  src={mainImage} 
                  alt={selectedProduct.name} 
                  className="w-full h-full object-contain mix-blend-multiply transition-transform duration-200 ease-out group-hover:scale-[2.5]"
                  style={{ transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }}
                />
              </div>

              {selectedProduct.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                  {selectedProduct.images.map((img: string, idx: number) => (
                    <button 
                      key={idx} 
                      onClick={() => setMainImage(img)}
                      className={`w-16 h-16 sm:w-20 sm:h-20 bg-white p-1 rounded-none border-2 overflow-hidden flex-shrink-0 ${mainImage === img ? 'border-[#004387]' : 'border-transparent'}`}
                    >
                      <img src={img} alt="thumbnail" className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-full lg:w-7/12 flex flex-col">
              <div className={`text-xs sm:text-sm font-semibold mb-1 sm:mb-2 ${theme.accent}`}>{selectedProduct.category} | {selectedProduct.subcategory}</div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-normal text-[#0c2d57] mb-2 leading-tight">{selectedProduct.name}</h1>
              <div className="text-gray-500 mb-4 sm:mb-6 text-xs sm:text-sm">מק"ט: <span className="font-mono text-gray-800">{selectedProduct.sku}</span> | מותג: <span className="font-bold">{selectedProduct.brand}</span></div>
              
              <p className="text-gray-700 mb-6 sm:mb-8 leading-relaxed bg-[#f2f2f2] p-3 sm:p-4 text-sm sm:text-base rounded-none border-none whitespace-pre-line">
                {selectedProduct.description}
              </p>

              {/* DOCUMENTATION & LINKS SECTION */}
              {(selectedProduct.specsLink || selectedProduct.manualLink || selectedProduct.videoLink) && (
                <div className="mb-6 sm:mb-8">
                  <h3 className="font-semibold text-[#0c2d57] mb-3 sm:mb-4 text-base sm:text-lg border-b pb-2">מידע נוסף ומסמכים</h3>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    {selectedProduct.specsLink && (
                      <div 
                        className="flex-1 relative flex"
                        onMouseEnter={() => setIsSpecsHovered(true)}
                        onMouseLeave={() => setIsSpecsHovered(false)}
                      >
                        <a href={selectedProduct.specsLink} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-white text-[#004387] border border-[#004387] hover:bg-[#004387] hover:text-white py-2 sm:py-3 px-3 sm:px-4 rounded-none transition-all font-bold text-sm sm:text-base group">
                          <FileText size={18} className="sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                          מפרט טכני
                        </a>

                        {/* Specs Preview Popup */}
                        {isSpecsHovered && getPdfPreviewUrl(selectedProduct.specsLink) && (
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
                        className="flex-1 relative flex"
                        onMouseEnter={() => setIsManualHovered(true)}
                        onMouseLeave={() => setIsManualHovered(false)}
                      >
                        <a href={selectedProduct.manualLink} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-white text-[#004387] border border-[#004387] hover:bg-[#004387] hover:text-white py-2 sm:py-3 px-3 sm:px-4 rounded-none transition-all font-bold text-sm sm:text-base group">
                          <File size={18} className="sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                          מדריך למשתמש
                        </a>

                        {/* Manual Preview Popup */}
                        {isManualHovered && getPdfPreviewUrl(selectedProduct.manualLink) && (
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
                        className="flex-1 relative flex" 
                        onMouseEnter={() => setIsVideoHovered(true)} 
                        onMouseLeave={() => setIsVideoHovered(false)}
                      >
                        <a href={selectedProduct.videoLink} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-white text-[#004387] border border-[#004387] hover:bg-[#004387] hover:text-white py-2 sm:py-3 px-3 sm:px-4 rounded-none transition-all font-bold text-sm sm:text-base group">
                          <Video size={18} className="sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                          סרטון הדרכה
                        </a>
                        
                        {/* Video Preview Popup */}
                        {isVideoHovered && getYouTubeEmbedUrl(selectedProduct.videoLink) && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 sm:w-80 aspect-video bg-black z-50 rounded-lg overflow-hidden shadow-2xl border border-gray-200 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                            <iframe 
                              width="100%" 
                              height="100%" 
                              src={getYouTubeEmbedUrl(selectedProduct.videoLink)!} 
                              title="Video Preview" 
                              frameBorder="0" 
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            ></iframe>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-auto border-t border-gray-200 pt-4 sm:pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col w-full sm:w-auto text-center sm:text-right">
                   {selectedProduct.retailPrice && (
                      <span className="text-sm sm:text-base text-gray-800 font-medium mb-1">
                        מחיר מומלץ לצרכן ₪{selectedProduct.retailPrice} <span className="text-xs text-gray-500 font-normal">(כולל מע"מ)</span>
                      </span>
                   )}
                   <div className="text-2xl sm:text-3xl font-bold text-[#f7941d]">
                      ₪{selectedProduct.price} 
                      <span className="text-xs sm:text-sm text-[#0c2d57] font-normal mr-1 sm:mr-2">מחיר מומלץ למתקין <span className="hidden sm:inline">(ללא מע"מ)</span></span>
                   </div>
                </div>
                <button 
                  onClick={() => addToCart(selectedProduct)}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-10 py-3 font-bold transition-all shadow-md hover:shadow-lg text-sm sm:text-base ${theme.button}`}
                >
                  <ShoppingCart size={18} className="sm:w-5 sm:h-5" />
                  הוסף להזמנה
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SIMILAR PRODUCTS */}
        {(() => {
          const similar = catalogData.filter(p => p.subcategory === selectedProduct.subcategory && p.id !== selectedProduct.id && p.active !== 'FALSE').slice(0, 4);
          if (similar.length === 0) return null;
          return (
            <div className="mt-12 mb-8">
              <h3 className="text-xl font-bold text-[#0c2d57] mb-6 border-b border-gray-200 pb-2">מוצרים משלימים ומקבילים</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
                {similar.map(product => (
                  <ProductCard key={product.id} product={product} />
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
      let orderDetails = `הזמנה חדשה מקטלוג B2B\n`;
      orderDetails += `---------------------------------\n`;
      orderDetails += `שם חברה/לקוח: ${companyName}\n`;
      if (companyId) orderDetails += `ח.פ/עוסק מורשה: ${companyId}\n`;
      if (contactName) orderDetails += `איש קשר: ${contactName}\n`;
      if (phone) orderDetails += `טלפון: ${phonePrefix}-${phone}\n`;
      if (secondaryPhone) orderDetails += `טלפון נוסף: ${secondaryPhone}\n`;
      if (customerEmail) orderDetails += `מייל לקוח: ${customerEmail}\n`;
      if (address) orderDetails += `כתובת אספקה: ${address}\n`;
      if (notes) orderDetails += `הערות: ${notes}\n`;
      orderDetails += `---------------------------------\n\n`;
      orderDetails += `פריטים:\n\n`;
      
      cart.forEach((item, idx) => {
         orderDetails += `${idx + 1}. ${item.name}\n`;
         orderDetails += `   מק"ט: ${item.sku}\n`;
         orderDetails += `   כמות: ${item.quantity}\n\n`;
      });
      
      orderDetails += `---------------------------------\n`;
      orderDetails += `סה"כ כמות פריטים: ${cart.reduce((acc, item) => acc + item.quantity, 0)}\n`;

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
      
      setOrderPlaced(true);
      setCart([]);
    };

    const handleSendWhatsApp = () => {
      if (!validateForm()) return;
      
      const agentPhone = agents.find(a => a.name === selectedAgent)?.phone;
      if (!agentPhone) return;

      const orderDetails = buildOrderDetailsText();
      const text = encodeURIComponent(orderDetails);
      
      window.open(`https://wa.me/${agentPhone}?text=${text}`, '_blank');
      
      setOrderPlaced(true);
      setCart([]);
    };

    if (orderPlaced) {
      return (
        <div className="bg-white rounded-none shadow-sm border border-gray-100 p-12 text-center max-w-2xl mx-auto mt-10">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-3xl font-bold text-[#0c2d57] mb-4">הבקשה להזמנה הוכנה!</h2>
          <p className="text-gray-600 mb-8">אפליקציית השליחה (מייל/ווצאפ) שלך אמורה להיפתח כדי לסיים את השליחה לסוכן.</p>
          <button 
            onClick={navigateHome}
            className="bg-[#004387] text-white px-8 py-3 rounded-none font-bold hover:bg-[#fe8d00] transition-colors"
          >
            חזרה לדף הבית
          </button>
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
                    <img src={item.images[0]} alt={item.name} className="w-16 h-16 object-contain bg-[#f2f2f2] p-1" />
                    <div className="flex-grow">
                      <div className="font-semibold text-[#0c2d57]">{item.name}</div>
                      <div className="text-xs text-gray-500 mb-2">מק"ט: {item.sku}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-[#f2f2f2] border border-gray-200 overflow-hidden rounded-md">
                          <button onClick={() => updateCartQuantity(item.id, -1)} className="p-1 px-3 hover:bg-white text-gray-600 transition-colors" aria-label="הפחת כמות"><Minus size={14}/></button>
                          <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                          <button onClick={() => updateCartQuantity(item.id, 1)} className="p-1 px-3 hover:bg-white text-gray-600 transition-colors" aria-label="הוסף כמות"><Plus size={14}/></button>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-600 transition-colors p-2 bg-red-50 hover:bg-red-100 rounded-md" aria-label="הסר מוצר מחשבון">
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
                <select 
                  value={phonePrefix} 
                  onChange={e => setPhonePrefix(e.target.value)}
                  className="w-24 px-3 py-3 border border-gray-200 bg-white rounded-none focus:ring-2 focus:ring-[#004387] outline-none text-sm font-medium"
                >
                  {phonePrefixes.map(prefix => (
                    <option key={prefix} value={prefix}>{prefix}</option>
                  ))}
                </select>
                <input type="tel" placeholder="טלפון ראשי (7 ספרות)" value={phone} onChange={e => {setPhone(e.target.value.replace(/\D/g, '')); setErrors({...errors, contact: null, phone: null})}} maxLength={7} className={`flex-grow px-3 py-3 border ${errors.phone || errors.contact ? 'border-red-500' : 'border-gray-200'} bg-white rounded-none focus:ring-2 focus:ring-[#004387] outline-none text-sm`} />
              </div>
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}

              <input type="tel" placeholder="טלפון נוסף" value={secondaryPhone} onChange={e => setSecondaryPhone(e.target.value)} className="w-full px-3 py-3 border border-gray-200 bg-white rounded-none focus:ring-2 focus:ring-[#004387] outline-none text-sm" />

              <div>
                <input type="email" placeholder="דואר אלקטרוני (לחובה עבור העתק הזמנה)" value={customerEmail} onChange={e => {setCustomerEmail(e.target.value); setErrors({...errors, contact: null})}} className={`w-full px-3 py-3 border ${errors.contact ? 'border-red-500' : 'border-gray-200'} bg-white rounded-none focus:ring-2 focus:ring-[#004387] outline-none text-sm`} />
                {errors.contact && <p className="text-red-500 text-xs mt-1">{errors.contact}</p>}
                <p className="text-xs text-gray-500 mt-1">כתובת המייל אליה יישלח אישור/העתק כשתשתמשו בשליחה דרך המייל.</p>
              </div>

              <input type="text" placeholder="כתובת אספקה" value={address} onChange={e => setAddress(e.target.value)} className="w-full px-3 py-3 border border-gray-200 bg-white rounded-none focus:ring-2 focus:ring-[#004387] outline-none text-sm" />

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

  const LoginView = () => {
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      // "1234" is a simple fallback if you don't use environment variables
      if (password === '1234') {
        setIsAuthenticated(true);
      } else {
        setErrorMsg('סיסמה שגויה. אנא השתמש בקוד הגישה שקיבלת מהחברה.');
      }
    };

    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 shadow-xl max-w-sm w-full text-center border-t-4 border-[#004387]">
          {/* Default icon or user's logo could go here */}
          <div className="w-16 h-16 bg-[#004387] text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
             <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-[#0c2d57] mb-2">כניסה לקטלוג B2B</h2>
          <p className="text-gray-500 mb-8 text-sm">הקטלוג מיועד ללקוחות עסקיים ומורשים בלבד. הקש סיסמה לכניסה. (1234)</p>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
               <input 
                 type="password" 
                 placeholder="הזן קוד גישה" 
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full p-4 border border-gray-300 focus:border-[#004387] focus:ring-1 focus:ring-[#004387] outline-none text-center text-lg tracking-[0.25em]"
               />
            </div>
            {errorMsg && <p className="text-red-500 text-sm font-medium">{errorMsg}</p>}
            <button type="submit" className="w-full bg-[#f7941d] hover:bg-[#e0861a] text-white font-bold py-3 transition-colors text-lg flex items-center justify-center gap-2">
              היכנס למערכת <ChevronLeft size={18} />
            </button>
          </form>
        </div>
      </div>
    );
  };

  // --- MAIN LAYOUT ---
  if (!isAuthenticated) {
     return <LoginView />;
  }

  if (isLoading) {
     return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-[#0c2d57]">
          <Loader2 size={48} className="animate-spin mb-4 text-[#f7941d]" />
          <h2 className="text-xl font-bold">טוען נתונים מהמערכת...</h2>
        </div>
     );
  }

  if (error) {
     return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-red-600">
          <X size={48} className="mb-4" />
          <h2 className="text-xl font-bold mb-4">{error}</h2>
          <button onClick={() => window.location.reload()} className="bg-[#004387] text-white px-6 py-2">נסה שוב</button>
        </div>
     );
  }

  return (
    <div dir="rtl" className="min-h-screen text-gray-900 selection:bg-[#fe8d00] selection:text-white" style={{ background: 'transparent' }}>
      
      {/* WordPress styling fix for external container titles - Safer targeting */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Targeting titles directly, but ignoring anything inside our app */
        body h1.elementor-heading-title:not(#rbs-b2b-app *), 
        body .entry-title:not(#rbs-b2b-app *), 
        body .page-title:not(#rbs-b2b-app *) {
          text-align: center !important;
          color: #0c2d57 !important;
          font-weight: 900 !important;
          margin-bottom: 20px !important;
          display: block !important;
          width: 100% !important;
        }
      `}} />

      <div id="rbs-b2b-app">
        {/* SECONDARY TOOLBAR INSTEAD OF MAIN HEADER */}
        <div className="sticky top-0 z-40 w-full mb-6 bg-white shadow-md border-b border-gray-100">
          <div className="container mx-auto px-4 min-h-[56px] flex flex-row items-center justify-between flex-nowrap gap-2 sm:gap-4">
            
            {/* RIGHT SIDE: Menu & Back */}
            <div className="flex flex-row items-center gap-2 md:gap-4 flex-shrink-0">
              <button className="md:hidden !p-2 !m-0 text-gray-600 hover:text-[#004387] bg-transparent border-none" onClick={() => setMobileMenuOpen(true)} aria-label="פתח תפריט">
                <Menu size={24} />
              </button>

              {/* כפתור חזור גלובלי - מופיע כשלא בדף הבית או כשיש חיפוש פעיל */}
              {(currentView !== 'home' || searchQuery) && (
                <button 
                  onClick={() => { if (searchQuery) { setSearchQuery(''); } else { goBack(); } }} 
                  className="flex flex-row items-center justify-center gap-1 !p-2 !m-0 bg-[#f2f2f2] hover:bg-[#004387] text-[#004387] hover:text-white !rounded-none transition-all border-none"
                  title="חזור"
                  aria-label="חזור לתצוגה הקודמת"
                >
                  <ChevronRight size={20} className="flex-shrink-0" />
                  <span className="hidden md:block text-sm font-semibold ml-1 whitespace-nowrap">חזור</span>
                </button>
              )}
              
              {/* Breadcrumb style path indicator */}
              <div className="hidden sm:flex items-center text-sm text-[#0c2d57] opacity-80 whitespace-nowrap">
                <span className="font-semibold px-2">B2B Portal</span>
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
        </div>

        <div className="container mx-auto px-4 py-2">
          
          {/* MOBILE DRAWER */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden">
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
              <div className="relative w-4/5 max-w-sm bg-white h-full shadow-xl p-4 overflow-y-auto">
                <button className="absolute top-4 left-4 !p-2 !m-0 bg-[#f2f2f2] text-gray-600 hover:text-[#004387] border-none" onClick={() => setMobileMenuOpen(false)} aria-label="סגור תפריט">
                  <X size={20} />
                </button>
                <h2 className="font-bold text-xl mb-6 mt-2 text-[#0c2d57]">ניווט מהיר</h2>
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
          <main className="w-full pb-20">
            
            {searchQuery ? (
               // SEARCH RESULTS
               <>
                <div className="mb-6 flex items-center justify-center gap-2 text-sm text-gray-500 text-center">
                    <button onClick={navigateHome} className="hover:text-[#004387] bg-transparent border-none !p-0"><Home size={16} /></button>
                    <ChevronLeft size={16} />
                    <span>תוצאות חיפוש ל: <strong className="text-[#0c2d57]">{searchQuery}</strong></span>
                </div>
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-20 bg-white border border-gray-100">
                    <div className="text-gray-300 mb-4 flex justify-center"><Search size={48} /></div>
                    <h3 className="text-xl font-bold text-[#0c2d57]">לא נמצאו מוצרים</h3>
                    <p className="text-gray-500 mt-2">נסה לשנות את מילות החיפוש.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6">
                    {filteredProducts.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
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
                    <CatalogCard key={idx} catalog={catalog} />
                  ))}
                </div>
              </div>

            ) : currentView === 'catalog_subs' ? (
              
              // SUBCATEGORIES (SHEETS) VIEW
              <>
                <div className="flex items-center justify-center mb-6 sm:mb-8 border-b border-gray-200 pb-4 text-center">
                  <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-gray-500">
                    <button onClick={navigateHome} className="hover:text-[#004387] bg-transparent border-none !p-0"><Home size={16} /></button>
                    <ChevronLeft size={16} />
                    <span className="font-semibold text-[#0c2d57] sm:text-lg">{selectedCatalog}</span>
                  </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-[#0c2d57] mb-4 sm:mb-6 text-center w-full block">בחר קטגוריה</h2>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6">
                  {activeSubcategories.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-gray-500 bg-white border border-gray-100">
                      לא נמצאו קטגוריות או מוצרים במחירון זה.
                    </div>
                  ) : (
                    activeSubcategories.map((sub, idx) => (
                      <SubcategoryCard key={idx} sub={sub} />
                    ))
                  )}
                </div>
              </>

            ) : currentView === 'nested_subs' ? (
              
              // NESTED SUBCATEGORIES VIEW
              <>
                <div className="flex items-center justify-center mb-6 sm:mb-8 border-b border-gray-200 pb-4 text-center">
                  <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-gray-500">
                    <button onClick={navigateHome} className="hover:text-[#004387]"><Home size={16} /></button>
                    <ChevronLeft size={16} className="flex-shrink-0" />
                    <button onClick={() => navigateToCatalog(selectedCatalog)} className="hover:text-[#004387]">
                      {selectedCatalog}
                    </button>
                    <ChevronLeft size={16} className="flex-shrink-0" />
                    <span className="font-semibold text-[#0c2d57]">{selectedSubcategory}</span>
                  </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-[#0c2d57] mb-4 sm:mb-6 text-center w-full">בחר תת-קטגוריה</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-6 max-w-4xl mx-auto">
                  {nestedSubcategoriesData.map((sub, idx) => (
                    <SubcategoryCard key={idx} sub={sub} />
                  ))}
                </div>
              </>

            ) : currentView === 'products' ? (
              
              // PRODUCTS VIEW
              <>
                <div className="flex items-center justify-center mb-6 sm:mb-8 border-b border-gray-200 pb-4 text-center">
                  <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-gray-500">
                    <button onClick={navigateHome} className="hover:text-[#004387]"><Home size={16} /></button>
                    <ChevronLeft size={16} className="flex-shrink-0" />
                    <button onClick={() => navigateToCatalog(selectedCatalog)} className="hover:text-[#004387]">
                      {selectedCatalog}
                    </button>
                    <ChevronLeft size={16} className="flex-shrink-0" />
                    <span className="font-semibold text-[#0c2d57]">{selectedSubcategory}</span>
                  </div>
                </div>

                <div className="mb-6 sm:mb-8 text-center relative">
                   <h2 className="text-2xl sm:text-3xl font-bold text-[#0c2d57] inline-block w-full sm:w-auto px-4">{selectedSubcategory}</h2>
                   <div className="mt-3 sm:mt-0 sm:absolute sm:left-0 sm:top-1/2 sm:-translate-y-1/2 flex items-center justify-center">
                     <span className="text-gray-600 bg-[#f2f2f2] px-3 py-1 rounded-none text-xs sm:text-sm font-medium whitespace-nowrap border border-gray-100 shadow-sm">{filteredProducts.length} מוצרים</span>
                   </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6">
                  {filteredProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </>
            ) : currentView === 'product' && selectedProduct ? (
              <ProductDetailsView />
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
                        <img src={item.images[0]} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                      </div>
                      <div className="flex-col flex flex-grow">
                        <div className="font-semibold text-sm text-[#0c2d57] line-clamp-2">{item.name}</div>
                        <div className="text-xs text-gray-500 mt-1">מק"ט: <span className="font-mono">{item.sku}</span></div>
                        <div className="mt-auto pt-2 flex items-end justify-end">
                          
                          <div className="flex items-center bg-[#f2f2f2] border border-gray-200 overflow-hidden">
                            <button onClick={() => updateCartQuantity(item.id, -1)} className="p-1 px-2 hover:bg-white text-gray-600 transition-colors" aria-label="הפחת כמות"><Minus size={14}/></button>
                            <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                            <button onClick={() => updateCartQuantity(item.id, 1)} className="p-1 px-2 hover:bg-white text-gray-600 transition-colors" aria-label="הוסף כמות"><Plus size={14}/></button>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500 transition-colors self-start p-1" aria-label="הסר מוצר מהעגלה">
                        <Trash2 size={18} />
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
    </div>
  );
}
