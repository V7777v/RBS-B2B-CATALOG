import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jwtVerify, createRemoteJWKSet } from "jose";
import Papa from "papaparse";
import { fetchSheetDataV4, ALLOWED_GIDS, getGoogleToken } from "./_lib/googleSheets.js";

// ============================================================================
// Secure Google Sheets proxy via API v4.
// - App Check (reCAPTCHA v3) is verified so only our app can call this API.
// ============================================================================

// --- App Check verification ---
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

// --- Firebase ID token verification (identifies the actual USER + role) ---
const FIREBASE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
const FIREBASE_PROJECT_ID = "rbs-b2b";
async function verifiedEmail(idToken: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID
    });
    if (payload.email_verified === true && typeof payload.email === "string") return payload.email.toLowerCase();
    return null;
  } catch { return null; }
}

// --- Public Catalog Column Allowlist ---
// Only these columns will be sent to the browser for public (guest) users.
const PUBLIC_CATALOG_COLUMNS = new Set([
  'מק"ט', 'sku', 'שם מוצר', 'name', 'תיאור', 'description', 'desc',
  'קטגוריה', 'category', 'תת קטגוריה', 'subcategory',
  'nested subcategory', 'niche category', 'מותג', 'brand', 'brands',
  'מחיר', 'price', 'מחיר מכירה', 'מחיר צרכן', 'retailprice', 'retail price', 'oldprice', 'old price',
  'סוג מבצע', 'sale type', 'saletype', 'סוג המבצע',
  'ערך מבצע', 'sale value', 'salevalue', 'ערך המבצע', 'מחיר מבצע',
  'מבצע חם', 'מבצע_חם', 'hot sale', 'hotsale', 'מבצע', 'מבצעים',
  'מציאון', 'clearance',
  'מחיר מציאון', 'מציאון מחיר מיוחד', 'מחיר מיוחד מציאון',
  'תמונה', 'images', 'image', 'imageurl', 'תמונות', 'imagesjson',
  'מפרט', 'datasheet', 'technicalsheet', 'קישור מפרט', 'labcerts', 'אישורי מעבדה',
  'מלאי', 'זמינות', 'status', 'features', 'מאפיינים',
  'נפח', 'נפח בארון', 'התאמה לארון', 'ארונות מתאימים', 'coming soon', 'cooming soon',
  'id', 'count', 'orderindex', 'hidefromcatalog', 'video', 'youtube', 'link', 'url',
  'sortorder', 'label', 'activerow', 'parentsubcategory', ''
].map(c => c.toLowerCase()));

// --- Backstop Sensitive Detector ---
// Even if a column is somehow in the allowlist, block it if it matches these sensitive keywords.
const SENSITIVE_KEYWORDS = [
  'עלות', 'cost',
  'סיטונאות', 'סיטונאי', 'wholesale',
  'ספק', 'supplier', 'vendor',
  'קנייה', 'רכישה', 'purchase', 'buy price',
  'יבוא', 'margin', 'profit', 'מרווח', 'רווח',
  'הנהלה', 'admin', 'internal', 'פנימי', 'private', 'hidden', 'secret',
  'סוכן', 'agent', 'dealer', 'לקוח', 'הנחת'
];

function isColumnAllowed(colName: string): boolean {
  const cleanName = String(colName).trim().toLowerCase();
  
  // 1. Must be in Allowlist (or be exactly empty string which is sometimes used for images)
  if (!PUBLIC_CATALOG_COLUMNS.has(cleanName)) {
    return false;
  }
  
  // 2. Backstop Check: Must NOT contain any sensitive keywords
  for (const keyword of SENSITIVE_KEYWORDS) {
    if (cleanName.includes(keyword)) {
      return false; // Blocked by backstop
    }
  }
  
  return true;
}

function stripSensitiveColumns(csv: string): string {
  const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: false });
  const rows = (parsed.data || []) as string[][];
  if (!rows.length || !Array.isArray(rows[0])) return csv;
  
  const header = rows[0];
  const keepIdx = new Set<number>();
  let droppedCount = 0;
  
  header.forEach((c, i) => { 
    if (isColumnAllowed(c)) {
      keepIdx.add(i);
    } else {
      droppedCount++;
    }
  });
  
  if (droppedCount > 0) {
    console.warn(`[Sheets API] Public response dropped non-allowlisted columns`, { count: droppedCount });
  }
  
  if (keepIdx.size === header.length) return csv; // Nothing dropped
  
  const out = rows.filter((r) => !(r.length === 1 && r[0] === "")).map((r) => r.filter((_, i) => keepIdx.has(i)));
  return Papa.unparse(out);
}

// --- In-memory CSV cache (per warm instance) ---
const bypassHits = new Map<string, number[]>();
const csvCache = new Map<string, { body: string; exp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });

  const requestId = Array.isArray(req.headers["x-vercel-id"]) ? req.headers["x-vercel-id"][0] : (req.headers["x-vercel-id"] || crypto.randomUUID());

  // App Check: only our app may call this endpoint.
  const appCheckToken = (req.headers["x-firebase-appcheck"] || "") as string;
  if (!appCheckToken) {
    console.error(`[${requestId}] [sheets] 401: App Check token MISSING. UA:`, String(req.headers["user-agent"] || "").slice(0, 60));
    return res.status(401).json({ success: false, code: "APP_CHECK_MISSING", message: "Unauthorized.", reason: "missing-token" });
  }
  if (!(await verifyAppCheck(appCheckToken))) {
    console.error(`[${requestId}] [sheets] 401: App Check token INVALID.`);
    return res.status(401).json({ success: false, code: "APP_CHECK_INVALID", message: "Unauthorized.", reason: "invalid-token" });
  }

  const { gid, limit, offset } = req.query;
  if (!gid || !ALLOWED_GIDS.includes(String(gid))) {
    console.warn(`[${requestId}] [sheets] 400: Invalid GID requested: ${gid}`);
    return res.status(400).json({ success: false, code: "INVALID_GID", message: "Invalid catalog source." });
  }

  // Agent/manager access: full columns only with a valid Firebase ID token + approved role.
  let isAgentView = false;
  const idToken = (req.headers["x-firebase-id-token"] || "") as string;
  if (idToken) {
    const email = await verifiedEmail(idToken);
    if (email) {
      try {
        const saTok = await getGoogleToken(requestId);
        if (saTok) {
          const fsUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/approvedDistributors/${encodeURIComponent(email)}`;
          const fsRes = await fetch(fsUrl, { headers: { Authorization: `Bearer ${saTok}` } });
          if (fsRes.ok) {
            const doc: any = await fsRes.json();
            const role = (doc?.fields?.role?.stringValue || "").trim().toLowerCase();
            isAgentView = (role === "agent" || role === "sales_manager");
          }
        }
      } catch { isAgentView = false; }
    }
  }

  // bypass_cache is rate-limited per IP (max 5 / 10 min) to protect Google quota.
  const clientIp = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  let bypassCache = req.query.bypass_cache === "true";
  if (bypassCache) {
    const now = Date.now();
    const hits = (bypassHits.get(clientIp) || []).filter((ts) => now - ts < 10 * 60 * 1000);
    if (hits.length >= 5) {
      bypassCache = false; // quota guard: serve cached instead
    } else {
      hits.push(now);
      bypassHits.set(clientIp, hits);
    }
  }
  const cacheKey = `${isAgentView ? "A" : "P"}:${gid}:${limit ?? ""}:${offset ?? ""}`;
  
  if (!bypassCache) {
    const hit = csvCache.get(cacheKey);
    if (hit && Date.now() < hit.exp) {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Cache-Control", "private, max-age=0, no-store");
      res.setHeader("X-Cache", "HIT");
      return res.status(200).send(hit.body);
    }
  }

  try {
    let csvString = await fetchSheetDataV4(String(gid), limit as string, offset as string, requestId);
    if (!isAgentView) csvString = stripSensitiveColumns(csvString);

    if (!bypassCache) csvCache.set(cacheKey, { body: csvString, exp: Date.now() + CACHE_TTL_MS });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Cache-Control", "private, max-age=0, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Cache", "MISS");
    
    return res.status(200).send(csvString);
  } catch (e: any) {
    console.error(`[${requestId}] [Sheets API] Error:`, e.message || e);
    
    // If it's our custom error object with a status code
    if (e.status && e.code) {
      if (!bypassCache && e.status >= 500) {
        const hit = csvCache.get(cacheKey);
        if (hit) {
          console.warn(`[${requestId}] [sheets] Serving STALE CACHE due to upstream error ${e.status}`);
          res.setHeader("Content-Type", "text/csv; charset=utf-8");
          res.setHeader("Cache-Control", "private, max-age=0, no-store");
          res.setHeader("X-Data-Source", "stale-cache");
          return res.status(200).send(hit.body);
        }
      }
      return res.status(e.status).json({ success: false, code: e.code, message: e.message });
    }
    
    return res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Internal error." });
  }
}
