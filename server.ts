import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import Papa from "papaparse";
import fs from "fs";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { fetchSheetDataV4, fetchSheetCSVDataV4 } from "./api/_lib/googleSheets.js";

const app = express();
const PORT = 3000;

app.use(express.json());

// PWA Web Manifest handler - guarantees valid JSON & content-type in all environments
const PWA_MANIFEST = {
  name: "קטלוג RBS Telecom",
  short_name: "קטלוג RBS",
  description: "קטלוג B2B - RBS Telecom",
  start_url: "/",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#0c2d57",
  lang: "he",
  scope: "/",
  orientation: "portrait",
  dir: "rtl",
  icons: [
    {
      src: "/icons/icon-192-v2.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any"
    },
    {
      src: "/icons/icon-512-v2.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any"
    },
    {
      src: "/icons/icon-512-maskable-v2.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable"
    }
  ]
};

app.get(["/manifest.webmanifest", "/manifest.json"], (_req, res) => {
  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json(PWA_MANIFEST);
});

// Google Sheets context configurations
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1NtYwQeTX3blf0aMcvtnlk9liIaJOiG9BOsP4Qc8lSRs';
const PRODUCTS_GID = '1506812668';
const CATALOGS_GID = '1781083359';

interface CachedCatalog {
  products: any[];
  catalogs: any[];
  lastFetchedAt: number;
}

let catalogCache: CachedCatalog | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

// Function to pull all products and catalogs
async function getCatalogDataContext(): Promise<any[]> {
  try {
    const now = Date.now();
    if (catalogCache && (now - catalogCache.lastFetchedAt < CACHE_TTL_MS)) {
      return catalogCache.products;
    }

    const [productsRaw, catalogsRaw] = await Promise.all([
      fetchSheetCSVDataV4(PRODUCTS_GID, "server-catalog-fetch"),
      fetchSheetCSVDataV4(CATALOGS_GID, "server-catalog-fetch")
    ]);


    // Format products lightly for high value / lower token footprint
    const parsedProducts = productsRaw.map((row: any) => {
      // Normalize row keys to prevent casing differences
      const normalizedRow: any = {};
      for (const k in row) {
        normalizedRow[k.trim()] = row[k];
      }

      const specsLink = normalizedRow.specsLink || normalizedRow['specsLink'] || normalizedRow['מפרט טכני'] || normalizedRow['מפרט'] || '';
      const manualLink = normalizedRow.manualLink || normalizedRow['manualLink'] || normalizedRow['מדריך למשתמש'] || normalizedRow['מדריך'] || '';

      return {
        id: normalizedRow.ID || normalizedRow.id || '',
        sku: normalizedRow.SKU || normalizedRow.sku || normalizedRow['מק"ט'] || '',
        name: normalizedRow.Name || normalizedRow.name || normalizedRow['שם'] || '',
        category: normalizedRow.Category || normalizedRow.category || normalizedRow['קטגוריה'] || '',
        subcategory: normalizedRow.SubCategory || normalizedRow.subcategory || normalizedRow['תת קטגוריה'] || '',
        active: normalizedRow.Active || normalizedRow.active || '',
        desc: normalizedRow.Desc || normalizedRow.desc || normalizedRow['תיאור'] || '',
        brand: normalizedRow.Brand || normalizedRow.brand || normalizedRow['מותג'] || '',
        isHotSale: !!(normalizedRow.HotSale || normalizedRow.isHotSale || normalizedRow['מבצע']),
        specsLink: specsLink,
        manualLink: manualLink
      };
    }).filter(p => p.name && p.active !== 'FALSE');

    catalogCache = {
      products: parsedProducts,
      catalogs: catalogsRaw,
      lastFetchedAt: now
    };

    return parsedProducts;
  } catch (error) {
    console.error("Error refreshing catalog cache:", error);
    // Return stale cache if exists, otherwise empty
    return catalogCache ? catalogCache.products : [];
  }
}

// Dynamic fetch of Gemini client with fail-fast check
function getGeminiClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not defined in the environment secrets.");
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// Cache variables for Gemini
let geminiContextCacheName: string | null = null;
let geminiContextCacheExpiresAt: number = 0;

function findRelevantProducts(query: string, products: any[]) {
  const normQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();
  const tokens = normQuery.split(' ').filter(t => t.length >= 2);
  
  if (tokens.length === 0) return { matches: [], maxScore: 0 };

  const scoredProducts = products.map(p => {
    let score = 0;
    const searchableFields = [
      (p.sku || '').toLowerCase(),
      (p.name || '').toLowerCase(),
      (p.category || '').toLowerCase(),
      (p.subcategory || '').toLowerCase(),
      (p.desc || '').toLowerCase()
    ];
    
    for (const token of tokens) {
      if (searchableFields.some(field => field.includes(token))) {
        score++;
      }
    }
    return { product: p, score };
  });

  const matches = scoredProducts
    .filter(sp => sp.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(sp => sp.product);

  const maxScore = matches.length > 0 ? Math.max(...scoredProducts.filter(sp => sp.score > 0).map(sp => sp.score)) : 0;
  
  return { matches, maxScore, tokenCount: tokens.length };
}

function getSystemInstructionTemplate(catalogSummaryString: string) {
  return `
אתה היועץ ההנדסי והטכני החכם (RBS Expert) והרשמי של פורטל B2B של חברת RBS Telecom (אר.בי.אס טלקום).
תפקידך לסייע לטכנאים, מהנדסי תקשורת, קבלנים, אינטגרטורים ולקוחות קצה לבצע בדיקות והתאמות של מוצרים, מפרטים, תכונות ופונקציונליות מתוך הקטלוג הקיים בלבד.

ההנחיה החשובה והנוקשה ביותר:
חל איסור מוחלט להתפזר לשאלות כלליות או להציע פתרונות, מוצרים, מותגים או יצרנים אחרים שאינם קיימים בקטלוג של RBS Telecom!
המטרה היחידה של הצ'אט היא לענות על מוצרים קיימים, תכונותיהם, מפרטם והתאמתם (כמו חישובי UPS או ארונות תקשורת) על בסיס נתוני הקטלוג שלנו בלבד.

אם המשתמש שואל שאלה שאינה קשורה למוצרים הפעילים בקטלוג (כמו לבקש למצוא פתרון חלופי אצל יצרנים אחרים, שאלות כלליות שאין להן מענה בקטלוג, או נושאים שאינם קשורים ישירות למוצרי החברה ולמפרטם):
עליך להשיב בנימוס רב כי אינך רשאי לענות על נושאים אלו, ולהסביר לו במדוייק אילו שאלות הוא כן יכול לשאול במסגרת פורטל זה. לדוגמה:
- שאלות לגבי מפרטים טכניים של מוצרים שבקטלוג (כגון מידות, הספקים, סוגי סיבים, גובה ארון וכו').
- חישובי גודל אל-פסק (UPS) מבוקש עבור צריכת שעה/הספק מסוימם והתאמת דגם מתאים מהקטלוג.
- תאימות של אביזרים ומוצרי תקשורת השייכים לקטלוג החברה בלבד.

יש לך גישה ישירה ומלאה לכל מפרטי המוצרים והמלאי הפעילים של החברה, הנה המחירון הנוכחי שלנו:
---
${catalogSummaryString}
---

עקרונות המענה שלך:
1. ענה תמיד בעברית מקצועית, אדיבה וברורה.
2. הגבלת תשובות והימנעות מכלליות:
   - ענה אך ורק על מוצרים המופיעים בקטלוג לעיל. אל תמציא שום מוצר, מק"ט או יצרן אחר שאינו מופיע במפורש.
   - הימנע לחלוטין מתשובות אמורפיות או סופרלטיבים כלליים כמו "נקודת הגישה הכי עוצמתית" או "האל-פסק המעולה ביותר". אם דגם מסוים הוא בעל עוצמה או מפרט גבוה יותר, הסבר בדיוק ובאופן כמותי באילו תכונות הוא חזק יותר (כגון: מהירות Gbps, רוחב סרט, עוצמת dBi, זמני טעינה, הספק מוצא או גובה פיזי).
3. הצגת חלופות ופונקציונליות עיקרית:
   - כאשר המשתמש שואל שאילתה כללית (או לגבי קטגוריית מוצרים), אל תבחר עבורו רק מוצר אחד באופן שרירותי. הצג סקירה קצרה של החלופות המתאימות בקטלוג, ופרט לכל דגם את הפונקציונליות והשימושים העיקריים שלו בלבד.
   - בצע השוואה הנדסית מסודרת על ידי טבלת השוואה (Markdown table) הכוללת עמודות כגון: מק"ט, שם, מאפיין מפתח, מפרט והתאמה הנדסית, כדי להעניק ללקוח אפשרות קלה ומקצועית להשוות בעצמו.
   - אפשר למשתמש להעמיק ומקד את השיחה: בסוף התשובה, הצע לו 2-3 כיוונים ספציפיים לשאלות המשך (לדוגמה: "באפשרותך לשאול אותי מהי צריכת הזרם המדוייקת של דגם X, או מהן דרגות ההגנה של ארון Y").
4. חלוניות מוצר מובנות (Product Cards):
   - כאשר אתה מציג מוצר מהקטלוג או ממליץ עליו, אין לספק קישור טקסטואלי רגיל למפרט. במקום זאת, עליך לייצר "חלונית מוצר" בתוך התשובה שלך!
   - כדי לעשות זאת, השתמש בפורמט הקישור הבא: [שם המוצר שאתה רוצה להציג](product://SKU) (כאשר SKU הוא המק"ט המדויק של המוצר).
   - המערכת שלנו תמיר את הקישור הזה אוטומטית לחלונית מידע מרשימה הכוללת קישור למפרט הטכני וכפתור "הוסף לעגלה" בתוך השיחה עצמה.
   - לעולם אל תציג "Manual Link" (מדריך למשתמש) כברירת מחדל אלא אם התבקשת מפורשות.
   - אל תסביר למשתמש כיצד להוסיף לעגלה, החלונית תעשה זאת עבורו.
5. דיסקליימר והתנערות מאחריות:
   - בכל תשובה חשובה (או בתחילת התשובה), הדגש תמיד בקצרה שמדובר בייעוץ מבוסס AI הנמצא במצב הרצה (Trial/Beta), ועל כן ייתכנו שגיאות או טעויות בחישובים, זמני הגיבוי או מפרטים. באחריות המשתמש לבצע בדיקה נוספת מול מסמכי המקור הרשמיים, והחברה אינה נושאת באחריות כלשהי על תשובות המודל.
6. שמור על סגנון הנדסי מהימן - אל תמציא מק"טים או מוצרים שאינם קיימים בקטלוג. אם משהו אינו קיים במחירון, ציין זאת בנימוס והסבר למשתמש אילו שאלות ניתן לשאול במסגרת הקטלוג של RBS Telecom.
`;
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
}
const chatRateLimits = new Map<string, RateLimitInfo>();
const LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 30; // 30 queries per hour

// API endpoint to serve chat requests safely
import advisorHandler from "./api/advisor/chat.js";

// API endpoint to serve chat requests safely
app.post("/api/advisor/chat", async (req, res) => {
  // Mock Vercel environment for local Express
  req.query = req.query || {};
  await advisorHandler(req as any, res as any);
});

// Serve health status
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    hasApiKey: !!process.env.GEMINI_API_KEY,
    apiKeyLength: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0
  });
});

// Global in-memory cache map for proxy sheets requests
interface SheetsCacheEntry {
  text: string;
  timestamp: number;
}
const sheetsCacheMap = new Map<string, SheetsCacheEntry>();
const CACHE_TTL_SHEETS_MS = 60 * 1000; // 60 seconds for processed responses

// Raw sheet cache and in-flight request coalescing to eliminate Google Sheets API quota pressure
const rawSheetsCache = new Map<string, { csv: string; timestamp: number }>();
const rawInFlightFetches = new Map<string, Promise<string>>();
const CACHE_TTL_RAW_SHEETS_MS = 3 * 60 * 1000; // 3 minutes for raw Google Sheets data

async function getRawSheetData(gid: string, bypassCache: boolean): Promise<string> {
  const gidStr = String(gid);
  
  if (!bypassCache) {
    const cached = rawSheetsCache.get(gidStr);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_RAW_SHEETS_MS)) {
      return cached.csv;
    }
    const inFlight = rawInFlightFetches.get(gidStr);
    if (inFlight) {
      return await inFlight;
    }
  }

  const fetchPromise = (async () => {
    try {
      const csv = await fetchSheetDataV4(gidStr, undefined, undefined);
      if (csv && csv.trim().length > 0) {
        rawSheetsCache.set(gidStr, { csv, timestamp: Date.now() });
      }
      return csv;
    } catch (err: any) {
      const stale = rawSheetsCache.get(gidStr);
      if (stale && stale.csv) {
        console.warn(`[server] Upstream Google Sheets error for GID ${gidStr}, using stale in-memory cache.`, err?.message || err);
        return stale.csv;
      }
      throw err;
    } finally {
      rawInFlightFetches.delete(gidStr);
    }
  })();

  rawInFlightFetches.set(gidStr, fetchPromise);
  return await fetchPromise;
}

const SENSITIVE_COLS_SERVER = ["מחיר עלות", "מחיר סיטונאות", "מחיר סיטונאי", "needsReview", "notes"];
const FIREBASE_JWKS_SERVER = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

async function isAgentOrManagerServer(authHeader: string | undefined): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  const token = authHeader.substring(7);
  try {
    const { payload } = await jwtVerify(token, FIREBASE_JWKS_SERVER, {
      issuer: "https://securetoken.google.com/rbs-b2b",
      audience: "rbs-b2b"
    });
    
    const uid = payload.sub;
    if (!uid) return false;
    
    const url = `https://firestore.googleapis.com/v1/projects/rbs-b2b/databases/(default)/documents/approvedDistributors/${uid}`;
    const res = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) {
      return false;
    }
    const data: any = await res.json();
    const role = data.fields?.role?.stringValue;
    return role === "agent" || role === "sales_manager";
  } catch (err) {
    console.warn("Express: Token or role verification failed:", err);
    return false;
  }
}


function isAllowedForGuest(colName: string): boolean {
  const clean = colName.trim().replace(/\s+/g, " ").toLowerCase();
  
  // Exact matches
  const exactAllowed = [
    "sku", "id", "מק״ט", "מקט", "מק'ט",
    "name", "שם", "שם מוצר",
    "category", "קטגוריה", 
    "subcategory", "תת קטגוריה",
    "nested subcategory", "niche category",
    "images", "תמונות", "imagesjson", "imageurl",
    "price", "מחיר", "retailprice", "מחיר צרכן",
    "description", "תיאור",
    "brand", "מותג",
    "isnew", "coming soon", "cooming soon",
    "active", "פעיל",
    "manuallink", "videolink", "specslink",
    "סקירת מוצרים", "סקירת מוצר", "reviewlink",
    "אישורי מעבדה", "labcerts",
    "נפח", "נפח בארון", "התאמה לארון", "tags"
  ];
  if (exactAllowed.includes(clean)) return true;

  // Partial matches for sales & clearance
  if (
    clean.includes("מבצע חם") || clean.includes("מבצע_חם") || clean.includes("hot sale") || clean.includes("hotsale") || clean === "מבצע" || clean === "מבצעים" ||
    clean.includes("סוג מבצע") || clean.includes("sale type") || clean.includes("saletype") || clean.includes("סוג המבצע") ||
    clean.includes("ערך מבצע") || clean.includes("sale value") || clean.includes("salevalue") || clean.includes("ערך המבצע") || clean.includes("מחיר מבצע") ||
    clean.includes("מציאון") || clean.includes("clearance") || clean.includes("מציאון מחיר מיוחד") || clean.includes("מחיר מיוחד מציאון") || clean.includes("מחיר מציאון")
  ) {
    // Make sure we don't accidentally allow "cost price" if it has these words (though unlikely)
    if (clean.includes("עלות") || clean.includes("סיטונאות") || clean.includes("סיטונאי")) return false;
    return true;
  }

  return false;
}

function processProductsSheet(csv: string, isAgentView: boolean, limit?: string, offset?: string): string {
  const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: false });
  const rows = (parsed.data || []) as string[][];
  if (rows.length < 1) return csv;
  const header = rows[0];
  
  let keepIdx = new Set<number>();
  let activeColIdx = -1;
  
  header.forEach((c, i) => {
    const clean = String(c).trim().toLowerCase();
    if (clean === "active" || clean === "פעיל") {
      activeColIdx = i;
    }
    if (isAgentView) {
      keepIdx.add(i);
    } else {
      if (isAllowedForGuest(clean)) {
        keepIdx.add(i);
      }
    }
  });

  let dataRows = rows.slice(1).filter(r => !(r.length === 1 && r[0] === ""));
  
  // Filter inactive for guests
  if (!isAgentView) {
    dataRows = dataRows.filter(row => {
      if (activeColIdx === -1) return true;
      const val = String(row[activeColIdx] || "").trim().toLowerCase();
      if (val === "false" || val === "no" || val === "0" || val === "לא" || val === "n" || val === "f" || val === "לא פעיל") {
        return false;
      }
      return true;
    });
  }

  // Apply offset and limit
  if (offset) {
    const off = parseInt(offset, 10);
    if (!isNaN(off) && off > 0) dataRows = dataRows.slice(off);
  }
  if (limit) {
    const lim = parseInt(limit, 10);
    if (!isNaN(lim) && lim > 0) dataRows = dataRows.slice(0, lim);
  }

  const outRows = [header, ...dataRows].map(r => r.filter((_, i) => keepIdx.has(i)));
  return Papa.unparse(outRows);
}

function processOtherSheet(csv: string, isAgentView: boolean, limit?: string, offset?: string): string {
  const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: false });
  const rows = (parsed.data || []) as string[][];
  if (rows.length < 1) return csv;
  const header = rows[0];
  
  let dropIdx = new Set<number>();
  if (!isAgentView) {
    header.forEach((c, i) => { 
      if (SENSITIVE_COLS_SERVER.includes(String(c).trim())) dropIdx.add(i); 
    });
  }

  let dataRows = rows.slice(1).filter(r => !(r.length === 1 && r[0] === ""));

  if (offset) {
    const off = parseInt(offset, 10);
    if (!isNaN(off) && off > 0) dataRows = dataRows.slice(off);
  }
  if (limit) {
    const lim = parseInt(limit, 10);
    if (!isNaN(lim) && lim > 0) dataRows = dataRows.slice(0, lim);
  }

  const outRows = [header, ...dataRows].map(r => r.filter((_, i) => !dropIdx.has(i)));
  return Papa.unparse(outRows);
}


// Proxy endpoint for cached Google Sheets access on Express
app.get("/api/sheets", async (req, res) => {
  const { gid, limit, offset } = req.query;
  if (!gid) {
    return res.status(400).json({ error: "Missing GID parameter" });
  }

  const bypassCache = req.query.bypass_cache === "true";
  const authorized = await isAgentOrManagerServer(req.headers.authorization);
  const cacheKey = `${gid}_${limit || ""}_${offset || ""}_${authorized ? "auth" : "guest"}`;

  // Serve from cache if valid and not bypassing
  if (!bypassCache) {
    const cached = sheetsCacheMap.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_SHEETS_MS)) {
      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      return res.status(200).send(cached.text);
    }
  }

  try {
    const rawCsv = await getRawSheetData(String(gid), bypassCache);
    let csvString = rawCsv;
    
    if (String(gid) === PRODUCTS_GID) {
      csvString = processProductsSheet(rawCsv, authorized, limit as string, offset as string);
    } else {
      csvString = processOtherSheet(rawCsv, authorized, limit as string, offset as string);
    }

    if (!bypassCache) {
      sheetsCacheMap.set(cacheKey, {
        text: csvString,
        timestamp: Date.now()
      });
    } else {
      sheetsCacheMap.clear();
      // Ensure catalogCache is cleared if it exists in scope
      try { catalogCache = null; } catch(e) {} 
    }

    if (bypassCache) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    } else {
      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    return res.status(200).send(csvString);
    
  } catch (error: any) {
    console.error(`[server] Express sheets proxy error for GID ${gid}:`, error?.message || error);
    
    // Resilience: Fallback to any stale cached processed result
    const staleProcessed = sheetsCacheMap.get(cacheKey);
    if (staleProcessed && staleProcessed.text) {
      console.warn(`[server] Serving stale processed cache for ${cacheKey}`);
      res.setHeader("Cache-Control", "public, max-age=10, stale-while-revalidate=30");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      return res.status(200).send(staleProcessed.text);
    }

    // Resilience: Fallback to any stale raw sheet data
    const staleRaw = rawSheetsCache.get(String(gid));
    if (staleRaw && staleRaw.csv) {
      console.warn(`[server] Serving processed response from stale raw sheet for GID ${gid}`);
      let fallbackCsv = staleRaw.csv;
      if (String(gid) === PRODUCTS_GID) {
        fallbackCsv = processProductsSheet(staleRaw.csv, authorized, limit as string, offset as string);
      } else {
        fallbackCsv = processOtherSheet(staleRaw.csv, authorized, limit as string, offset as string);
      }
      res.setHeader("Cache-Control", "public, max-age=10, stale-while-revalidate=30");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      return res.status(200).send(fallbackCsv);
    }

    return res.status(502).json({ error: "Data source unavailable or misconfigured." });
  }
});

// Configure Vite middleware or production static files serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: "0.0.0.0",
        port: 3000
      },
      appType: "spa"
    });
    
    // Serve Vite assets
    app.use(vite.middlewares);

    // Render index.html fallback for SPAs in development
    app.use("*", async (req, res, next) => {
      // Exclude API requests from HTML fallback rendering
      if (req.originalUrl.startsWith("/api/")) {
        return next();
      }
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
