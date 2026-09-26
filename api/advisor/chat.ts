import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { fetchSheetCSVDataV4, getGoogleToken } from "../_lib/googleSheets.ts";


// --- Firebase Auth & Quota ---
const FIREBASE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
const FIREBASE_PROJECT_ID = "rbs-b2b";

async function verifiedEmail(idToken: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID
    });
    return payload.email ? String(payload.email) : null;
  } catch (e) {
    return null;
  }
}

async function getUserRole(email: string, saTok: string): Promise<string | null> {
  try {
    const fsUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/approvedDistributors/${encodeURIComponent(email)}`;
    const fsRes = await fetch(fsUrl, { headers: { Authorization: `Bearer ${saTok}` } });
    if (fsRes.ok) {
      const doc: any = await fsRes.json();
      return (doc?.fields?.role?.stringValue || "").trim().toLowerCase();
    }
  } catch (e) {}
  return null;
}

// Quota Management

async function getQuotaUsage(quotaId: string, saTok: string): Promise<number> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/quotas/${encodeURIComponent(quotaId)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${saTok}` } });
    if (res.ok) {
      const data = await res.json();
      return parseInt(data.fields?.count?.integerValue || "0", 10);
    }
  } catch (e) {}
  return 0;
}

async function incrementQuotaUsage(quotaId: string, currentUsage: number, saTok: string): Promise<void> {
  try {
    const newCount = currentUsage + 1;
    // We use patch to create or update
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/quotas/${encodeURIComponent(quotaId)}?updateMask.fieldPaths=count`;
    await fetch(url, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${saTok}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { count: { integerValue: String(newCount) } } })
    });
  } catch (e) {
    console.error("Failed to increment quota for", quotaId, e);
  }
}

// App Check token verification (reCAPTCHA v3) via Firebase App Check public JWKS.
const APP_CHECK_JWKS = createRemoteJWKSet(new URL("https://firebaseappcheck.googleapis.com/v1/jwks"));
const APP_CHECK_PROJECT_NUMBER = "224025193925";

async function verifyAppCheck(token: string): Promise<boolean> {
  if (process.env.NODE_ENV !== "production" && token === "DEV_PREVIEW_BYPASS") {
    return true;
  }
  try {
    await jwtVerify(token, APP_CHECK_JWKS, {
      issuer: `https://firebaseappcheck.googleapis.com/${APP_CHECK_PROJECT_NUMBER}`,
      audience: `projects/${APP_CHECK_PROJECT_NUMBER}`
    });
    return true;
  } catch {
    return false;
  }
}

// Google Sheets context configurations
const PRODUCTS_GID = '1506812668';
const CATALOGS_GID = '1781083359';

interface CachedCatalog {
  products: any[];
  catalogs: any[];
  lastFetchedAt: number;
}

let catalogCache: CachedCatalog | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

// Best-effort per-IP rate limit (per warm serverless instance). For robust limiting use a KV store.
const rateMap = new Map<string, number[]>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;

// Function to pull all products and catalogs
async function getCatalogDataContext(requestId: string): Promise<any[]> {
  try {
    const now = Date.now();
    if (catalogCache && (now - catalogCache.lastFetchedAt < CACHE_TTL_MS)) {
      return catalogCache.products;
    }

    const [productsRaw, catalogsRaw] = await Promise.all([
      fetchSheetCSVDataV4(PRODUCTS_GID, requestId),
      fetchSheetCSVDataV4(CATALOGS_GID, requestId)
    ]);


    // Format products lightly for high value / lower token footprint
    const toPrice = (v: any): number | null => {
      const raw = String(v == null ? '' : v).replace(/[^\d.]/g, '');
      const n = parseFloat(raw);
      return isFinite(n) && n > 0 ? n : null;
    };
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
        price: toPrice(normalizedRow.Price || normalizedRow.price || normalizedRow['מחיר']),
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
   - מחירים: השתמש אך ורק במחירים המופיעים בקטלוג לעיל (שדה Price). אל תמציא, תעריך או תחשב מחירים שאינם מופיעים. אם למוצר אין מחיר בקטלוג, ציין שהמחיר אינו זמין ויש לפנות לסוכן.
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const reqOrigin = (req.headers.origin || "") as string;
  const reqReferer = (req.headers.referer || "") as string;
  const reqHost = (req.headers.host || "") as string;
  const sourceUrl = reqOrigin || reqReferer;
  let okSource = false;
  if (reqHost && sourceUrl) {
    try { okSource = new URL(sourceUrl).host === reqHost; } catch { okSource = false; }
  }
  if (!okSource) return res.status(403).json({ error: "Forbidden" });

  const appCheckToken = (req.headers["x-firebase-appcheck"] || "") as string;
  if (!appCheckToken || !(await verifyAppCheck(appCheckToken))) {
    return res.status(401).json({ error: "App Check verification failed" });
  }

  const ip = ((req.headers["x-forwarded-for"] as string) || "").split(",")[0].trim() || "unknown";
  const nowTs = Date.now();
  const recentHits = (rateMap.get(ip) || []).filter((t) => nowTs - t < RATE_WINDOW_MS);
  if (recentHits.length >= RATE_LIMIT) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ error: "יותר מדי בקשות, נסה שוב בעוד דקה." });
  }
  recentHits.push(nowTs);
  rateMap.set(ip, recentHits);

  try {
    const { message, history = [], forceAI = false } = req.body;
    
    // Strict schema & length validation
    if (!message || typeof message !== "string" || message.trim().length === 0 || message.length > 1000) {
      return res.status(400).json({ error: "Message content is invalid or too long (max 1000 chars)" });
    }
    if (!Array.isArray(history)) {
      return res.status(400).json({ error: "History must be an array" });
    }
    
    let totalHistoryLength = 0;
    const safeHistory = [];
    for (const h of history.slice(-10)) { // limit to last 10 turns
      if (h && typeof h.text === "string" && (h.role === "user" || h.role === "assistant")) {
        totalHistoryLength += h.text.length;
        if (totalHistoryLength > 10000) break; // Hard cap on history payload to prevent abuse
        safeHistory.push({ role: h.role, text: h.text.substring(0, 1000) });
      }
    }

    const requestId = Array.isArray(req.headers["x-vercel-id"]) ? req.headers["x-vercel-id"][0] : (req.headers["x-vercel-id"] || crypto.randomUUID());
    
    // Determine Identity and Quota
    // Identification limits: Guests use a client UUID + IP fallback, which can be reset. 
    // True enforcement requires user accounts, but this stops casual exhaustion.
    let isAgentView = false;
    let quotaId = `guest_${ip.replace(/[^a-zA-Z0-9]/g, '_')}`;
    let dailyLimit = 8; // Guests limit
    
    const idToken = (req.headers["x-firebase-id-token"] || "") as string;
    const saTok = await getGoogleToken(requestId);
    
    if (idToken && saTok) {
      const email = await verifiedEmail(idToken);
      if (email) {
        const role = await getUserRole(email, saTok);
        if (role === "agent" || role === "sales_manager") {
          isAgentView = true;
          dailyLimit = 50; // Agent limit
          quotaId = `agent_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        }
      }
    }
    
    if (!isAgentView) {
      // For guests, use the explicit guest-id if provided to separate users on the same NAT/IP
      const guestId = (req.headers["x-guest-id"] || "").toString().replace(/[^a-zA-Z0-9-]/g, '');
      if (guestId) {
         quotaId = `guest_${guestId}`;
      }
    }
    
    // Append today's date to quota document ID
    const todayStr = new Date().toISOString().slice(0, 10);
    const quotaDocId = `${quotaId}_${todayStr}`;
    
    let currentUsage = 0;
    if (saTok) {
      currentUsage = await getQuotaUsage(quotaDocId, saTok);
      if (currentUsage >= dailyLimit) {
        res.setHeader("Retry-After", "86400");
        return res.status(429).json({ 
          error: "QUOTA_EXCEEDED", 
          message: `הגעת למכסת השאלות היומית (${dailyLimit}). ניתן להמשיך מחר${!isAgentView ? ', או להתחבר לקבלת מכסה גדולה יותר.' : '.'}`,
          quotaInfo: { current: currentUsage, limit: dailyLimit }
        });
      }
    }

    const products = await getCatalogDataContext(requestId);
    const { matches: relevantProducts, maxScore, tokenCount } = findRelevantProducts(message, products);

    const isStrongMatch = relevantProducts.length > 0 && (maxScore >= 2 || (maxScore === 1 && tokenCount <= 3));
    if (!forceAI && isStrongMatch) {
      return console.log("Sending response", { currentUsage, dailyLimit });
    res.json({
        type: "direct_products",
        products: relevantProducts.slice(0, 5),
        text: "מצאתי את המוצרים הבאים בקטלוג שיכולים להתאים לשאלתך:",
        sources: [],
        quotaInfo: { current: currentUsage, limit: dailyLimit } // Direct products don't cost AI quota!
      });
    }

    let catalogSummaryString = relevantProducts.length > 0 
      ? relevantProducts.map(p => `SKU: ${p.sku} | Name: ${p.name} | Category: ${p.category} | Sub: ${p.subcategory} | Desc: ${p.desc}${p.price ? ' | Price: ₪'+Math.round(p.price) : ''}`).join("\n")
      : products.map(p => `SKU: ${p.sku} | Name: ${p.name} | Category: ${p.category} | Sub: ${p.subcategory}`).join("\n");

    let systemInstruction = getSystemInstructionTemplate(catalogSummaryString);
    if (!isAgentView) {
      systemInstruction += "\n\n--- מצב אורח (מתקין) ---\nהמשתמש הוא מתקין. ענה אך ורק על שאלות הקשורות למוצרי הקטלוג של RBS Telecom: מפרטים טכניים, התאמה בין מוצרים, אביזרים נלווים, התקנה ושימוש. אם השאלה אינה קשורה לקטלוג של RBS (נושאים כלליים שאינם מוצרי החברה) — סרב בנימוס והסבר אילו שאלות ניתן לשאול במסגרת הקטלוג.";
    }

    const ai = getGeminiClient();
    const contents: any[] = [];
    for (const h of safeHistory) {
      contents.push({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text }] });
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    const config: any = { systemInstruction, maxOutputTokens: 4096 };
    let response;
    
    try {
      response = await ai.models.generateContent({ model: "gemini-3.5-flash", contents, config });
    } catch (primaryError: any) {
      try {
        response = await ai.models.generateContent({ model: "gemini-3.1-flash-lite", contents, config });
      } catch (liteError: any) {
        const errorMsg = liteError.message || String(liteError);
        const isProviderQuota = errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("429");
        if (isProviderQuota) {
           return console.log("Sending response", { currentUsage, dailyLimit });
    res.json({ type: "ai_response", text: "🚦 **מכסת השימוש במפתח ה-Gemini API הסתיימה...**", sources: [] });
        }
        return console.log("Sending response", { currentUsage, dailyLimit });
    res.json({ type: "ai_response", text: "⚠️ **חיבור ה-AI נכשל בפנייה לשרתי Google.**", sources: [] });
      }
    }

    const textOutput = response.text || "סליחה, לא הצלחתי לעבד את התשובה. אנא נסה שוב.";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = groundingChunks.map((chunk: any) => ({
      title: chunk.web?.title || "מקור מידע חיצוני", uri: chunk.web?.uri || ""
    })).filter((s: any) => s.uri);
    
    // Only increment quota after successful AI processing!
    if (saTok) {
      await incrementQuotaUsage(quotaDocId, currentUsage, saTok);
      currentUsage += 1;
    }

    console.log("Sending response", { currentUsage, dailyLimit });
    res.json({
      type: "ai_response",
      text: textOutput,
      sources: webSources,
      quotaInfo: { current: currentUsage, limit: dailyLimit }
    });

  } catch (error: any) {
    console.error("Gemini Advisor Endpoint Error:", error);
    res.status(500).json({ error: "Error processing request", details: "שגיאה בטעינת הנתונים. נסה שוב." });
  }
}
