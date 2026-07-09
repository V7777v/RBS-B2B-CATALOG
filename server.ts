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
app.post("/api/advisor/chat", async (req, res) => {
  try {
    const { message, history = [], forceAI = false } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // Rate Limiting to protect tokens
    const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown-ip').split(',')[0].trim();
    const now = Date.now();
    let userLimit = chatRateLimits.get(ip);
    
    if (!userLimit || now > userLimit.resetTime) {
      userLimit = {
        count: 0,
        resetTime: now + LIMIT_WINDOW_MS
      };
      chatRateLimits.set(ip, userLimit);
    }
    
    if (userLimit.count >= MAX_REQUESTS) {
      const remainingMinutes = Math.max(1, Math.ceil((userLimit.resetTime - now) / 60000));
      return res.json({
        type: "ai_response",
        text: `⚠️ **הגעת למכסת השאלות המותרת ב-RBS Expert לסבב זה.**\n\nעל מנת לשמור על יציבות המערכת ולמנוע עומס על משאבי השרת ומפתחות ה-API, השימוש ביועץ ההנדסי מוגבל לעד ${MAX_REQUESTS} פניות בשעה לכל משתמש.\n\nמכסת הפניות שלך תתאפס אוטומטית בעוד כ-**${remainingMinutes} דקות**. תודה על ההבנה והסבלנות! ⏱️`,
        sources: []
      });
    }
    
    // Increment count
    userLimit.count += 1;

    // Check if GEMINI_API_KEY is defined and is valid
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      return res.json({
        type: "ai_response",
        text: `⚠️ **חיבור ה-API של Google אינו פעיל עדיין לחשבונך במערכת.**

כדי שתוכל להשתמש ב-**RBS Expert** (היועץ ההנדסי והטכני החכם), מנהל המערכת צריך להגדיר את מפתח ה-API האישי שלכם בפורטל הבנייה:
1. פתח את תפריט **Settings** (הגדרות) ב-AI Studio בצד העמוד.
2. לחץ על **Secrets** (סודות ומפתחות).
3. הוסף רשומה חדשה עם השם \`GEMINI_API_KEY\` והדבק שם את מפתח ה-API האישי שקיבלת מ-Google AI Studio.

ברגע שתגדיר מפתח זה, המערכת תתחבר אוטומטית ללא מידע חסר לפאנל! ✨`,
        sources: []
      });
    }

    // 1. Get complete context from RBS catalog
    const products = await getCatalogDataContext();

    // 2. Pre-filter relevant products
    const { matches: relevantProducts, maxScore, tokenCount } = findRelevantProducts(message, products);

    // Check if we can do a direct response
    // If it's not forced to AI, and we have a strong match (max score > 1 or it's a short product-like query)
    const isStrongMatch = relevantProducts.length > 0 && (maxScore >= 2 || (maxScore === 1 && tokenCount <= 3));
    if (!forceAI && isStrongMatch) {
      return res.json({
        type: "direct_products",
        products: relevantProducts.slice(0, 5), // Return up to 5 top products directly
        text: "מצאתי את המוצרים הבאים בקטלוג שיכולים להתאים לשאלתך:",
        sources: []
      });
    }

    // Decide whether to use AI caching or inline catalog
    let catalogSummaryString = "";
    if (relevantProducts.length > 0) {
      catalogSummaryString = relevantProducts.map(p => {
        let line = `SKU: ${p.sku} | Name: ${p.name} | Category: ${p.category} | Sub: ${p.subcategory} | Desc: ${p.desc}`;
        if (p.specsLink) line += ` | Specs Link: ${p.specsLink}`;
        if (p.manualLink) line += ` | Manual Link: ${p.manualLink}`;
        return line;
      }).join("\n");
    } else {
      catalogSummaryString = products.map(p => {
        let line = `SKU: ${p.sku} | Name: ${p.name} | Category: ${p.category} | Sub: ${p.subcategory}`;
        return line;
      }).join("\n");
    }

    const systemInstruction = getSystemInstructionTemplate(catalogSummaryString);

    // 3. Initialize Gemini structure safely and run content generation with Google Search Grounding enabled
    const ai = getGeminiClient();
    
    // Convert previous simple messages structure into contents argument for the Gemini API
    const contents: any[] = [];
    
    // Add history safely to reinforce context
    for (const h of history) {
      contents.push({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.text }]
      });
    }
    
    // Add current user prompt
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const config: any = {
      systemInstruction
    };

    let response;
    // Single model usage: try gemini-3.5-flash first, and fall back to gemini-3.1-flash-lite if needed
    try {
      console.log("Advisor: Attempting gemini-3.5-flash...");
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: config
      });
      console.log("Advisor: Successfully generated content using gemini-3.5-flash");
    } catch (primaryError: any) {
      console.warn("Advisor: gemini-3.5-flash failed, attempting fallback to gemini-3.1-flash-lite...", primaryError.message || primaryError);
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: contents,
          config: config
        });
        console.log("Advisor: Successfully generated content using fallback gemini-3.1-flash-lite");
      } catch (liteError: any) {
        console.error("Advisor: gemini-3.1-flash-lite fallback also failed.", liteError.message || liteError);
        
        const errorMsg = liteError.message || String(liteError);
        const isQuotaExceeded = errorMsg.includes("RESOURCE_EXHAUSTED") || 
                                errorMsg.includes("quota") || 
                                errorMsg.includes("exceeded") || 
                                errorMsg.includes("429");

        if (isQuotaExceeded) {
          return res.json({
            type: "ai_response",
            text: `🚦 **מכסת השימוש במפתח ה-Gemini API שלך הסתיימה או נחסמה על ידי גוגל (RESOURCE_EXHAUSTED).**

**הסבר חשוב – למה זה קורה גם אם לא השתמשת ביועץ היום?**
1. **סטטוס פרויקט וחשבון תשלום (Billing):** לעיתים קרובות, גוגל מסווגת מפתחות כ-RESOURCE_EXHAUSTED אם הפרויקט בו הם נוצרו ב-Cloud Console אינו פעיל, שייך לחשבון אירוח שאינו בתוקף, או שהכרטיס המקושר אליו פג תוקף, גם אם לא ניצלת אחוז קטן מהמכסה היום.
2. **מכסות קשיחות של הרמה החינמית:** מפתחות חינמיים ב-Google AI Studio מוגבלים מאוד ברמה היומית והחודשית, והמכסה מתאפסת לפי שעון גוגל העולמי ולא לפי יום קלנדרי מקומי.
3. **מפתח משותף:** במידה והמפתח משמש אפליקציות, ניסויים או מערכות אחרות שלך או של מפתחים נוספים, צריכת הטוקנים משותפת והיא זו שמילאה את המכסה.

**איך לראות בדיוק מה קרה ולפתור זאת כעת?**
אנא בצע את השלבים הפשוטים הבאים כדי להחזיר את ה-Expert לפעילות מיידית:
1. **הפקת מפתח חדש (מומלץ ביותר):** כנס לאתר הרשמי להפקת המפתחות [Google AI Studio](https://aistudio.google.com/) וצור מפתח API חדש לחלוטין (זה לוקח דקה אחת והוא חינמי לגמרי).
2. **הגדרת המפתח החדש:**
   - בעמוד הנוכחי, פתח את תפריט ה-**Settings** (סמל של גלגל שיניים בפינה השמאלית/צדדית של העמוד).
   - לחץ על **Secrets** (סודות ומפתחות).
   - מצא את הרשומה בשם \`GEMINI_API_KEY\` והדבק שם את המפתח החדש שיצרת (ללא רווחים לפני או אחרי).
3. **שדרוג במידת הצורך:** במידה ואתה משתמש במפתח באופן רציף, כדאי לשקול להעביר אותו למודל **Pay-as-you-go** ב-AI Studio. הוא מציע תמחור זול ביותר (חלקי סנט לפליטה) ומסיר לחלוטין את כל חסימות הקצב ומכסות החינם של גוגל!`,
            sources: []
          });
        }

        return res.json({
          type: "ai_response",
          text: `⚠️ **חיבור ה-AI נכשל בפנייה לשרתי Google.**

**הצעות לפתרון לעבודה עם RBS Expert:**
1. פתח את תפריט הגדרות ה-**Secrets** של הפרויקט ב-AI Studio.
2. ודא שהוספת את המשתנה \`GEMINI_API_KEY\` עם מפתח API תקין ופעיל.
3. ודא שאין רווחים מיותרים בהתחלה או בסוף של המפתח.`,
          sources: []
        });
      }
    }

    const textOutput = response.text || "סליחה, לא הצלחתי לעבד את התשובה. אנא נסה שוב.";
    
    // Extract grounding sources to display if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = groundingChunks.map((chunk: any) => ({
      title: chunk.web?.title || "מקור מידע חיצוני",
      uri: chunk.web?.uri || ""
    })).filter((s: any) => s.uri);

    res.json({
      type: "ai_response",
      text: textOutput,
      sources: webSources
    });

  } catch (error: any) {
    console.error("Gemini Advisor Endpoint Error:", { code: error.code || "UNKNOWN" });
    res.status(500).json({ 
      error: "Error processing request", 
      details: "שגיאה בטעינת הקטלוג. נסה שוב."
    });
  }
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
const CACHE_TTL_SHEETS_MS = 45 * 1000; // 45 seconds cache is ideal

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

function stripSensitiveColumnsServer(csv: string, gid: string): string {
  const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: false });
  const rows = (parsed.data || []) as string[][];
  if (!rows.length || !Array.isArray(rows[0])) return csv;
  
  const header = rows[0];
  const headerStrs = header.map(c => String(c).trim());
  
  // Is this the Products_React sheet?
  // Check GID directly or specific product columns
  const isProductsGid = gid === '1506812668';
  const hasProductHeaders = headerStrs.includes('sku') && 
                            headerStrs.includes('name') && 
                            headerStrs.includes('price') && 
                            headerStrs.includes('retailPrice');
                            
  if (!isProductsGid && !hasProductHeaders) {
    return csv; // Do not strip other sheets like CatalogFolders or Subcategories!
  }

  const dropIdx = new Set<number>();
  header.forEach((c, i) => { if (SENSITIVE_COLS_SERVER.includes(String(c).trim())) dropIdx.add(i); });
  
  if (dropIdx.size === 0) return csv;
  
  console.warn('[Sheets API] Product sensitive columns removed', { removedCount: dropIdx.size });

  const out = rows
    .filter((r) => !(r.length === 1 && r[0] === ""))
    .map((r) => r.filter((_, i) => !dropIdx.has(i)));
  return Papa.unparse(out);
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
    let csvString = await fetchSheetDataV4(String(gid), limit as string, offset as string);
    
    if (!authorized) {
      csvString = stripSensitiveColumnsServer(csvString, String(gid));
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
    console.error("Express sheets proxy error:", error);
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
