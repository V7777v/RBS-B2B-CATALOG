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
  if (token === "DEV_PREVIEW_BYPASS") {
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


const PRODUCTS_GID = "1506812668";

function isAllowedForGuest(colName: string): boolean {
  const clean = colName.trim().replace(/\s+/g, " ").toLowerCase();
  
  // Exact matches
  const exactAllowed = [
    "", "sku", "id", "מק״ט", "מקט", "מק'ט",
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
      if (SENSITIVE_COLS.includes(String(c).trim())) dropIdx.add(i); 
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

// --- Sensitive columns removed for non-agents (cost / wholesale) ---
const SENSITIVE_COLS = ["מחיר עלות", "מחיר סיטונאות", "מחיר סיטונאי"];
function stripSensitiveColumns(csv: string): string {
  const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: false });
  const rows = (parsed.data || []) as string[][];
  if (!rows.length || !Array.isArray(rows[0])) return csv;
  const header = rows[0];
  const dropIdx = new Set<number>();
  header.forEach((c, i) => { if (SENSITIVE_COLS.includes(String(c).trim())) dropIdx.add(i); });
  if (dropIdx.size === 0) return csv;
  const out = rows.filter((r) => !(r.length === 1 && r[0] === "")).map((r) => r.filter((_, i) => !dropIdx.has(i)));
  return Papa.unparse(out);
}

// --- In-memory CSV cache (per warm instance) ---
const bypassHits = new Map<string, number[]>();
const csvCache = new Map<string, { body: string; exp: number }>();
const rawSheetCache = new Map<string, { csv: string; exp: number }>();
const rawInFlightFetches = new Map<string, Promise<string>>();
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_TTL_RAW_MS = 5 * 60 * 1000;

async function getRawSheetData(gid: string, bypassCache: boolean, requestId: string): Promise<string> {
  const gidStr = String(gid);
  
  if (!bypassCache) {
    const cached = rawSheetCache.get(gidStr);
    if (cached && Date.now() < cached.exp) {
      return cached.csv;
    }
    const inFlight = rawInFlightFetches.get(gidStr);
    if (inFlight) {
      return await inFlight;
    }
  }

  const fetchPromise = (async () => {
    try {
      const csv = await fetchSheetDataV4(gidStr, undefined, undefined, requestId);
      if (csv && csv.trim().length > 0) {
        rawSheetCache.set(gidStr, { csv, exp: Date.now() + CACHE_TTL_RAW_MS });
      }
      return csv;
    } catch (err: any) {
      const stale = rawSheetCache.get(gidStr);
      if (stale && stale.csv) {
        console.warn(`[${requestId}] Upstream Google Sheets error for GID ${gidStr}, using stale raw cache.`, err?.message || err);
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
    const rawCsv = await getRawSheetData(String(gid), bypassCache, requestId);
    let csvString = rawCsv;
    
    if (String(gid) === PRODUCTS_GID) {
      csvString = processProductsSheet(rawCsv, isAgentView, limit as string, offset as string);
    } else {
      csvString = processOtherSheet(rawCsv, isAgentView, limit as string, offset as string);
    }

    if (!bypassCache) csvCache.set(cacheKey, { body: csvString, exp: Date.now() + CACHE_TTL_MS });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Cache-Control", "private, max-age=0, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Cache", "MISS");
    
    return res.status(200).send(csvString);
  } catch (e: any) {
    console.error(`[${requestId}] [Sheets API] Error:`, e.message || e);
    
    // Resilience: Fallback to any stale processed cache
    if (!bypassCache) {
      const hit = csvCache.get(cacheKey);
      if (hit) {
        console.warn(`[${requestId}] [sheets] Serving STALE PROCESSED CACHE due to upstream error.`);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Cache-Control", "private, max-age=0, no-store");
        res.setHeader("X-Data-Source", "stale-cache");
        return res.status(200).send(hit.body);
      }

      const staleRaw = rawSheetCache.get(String(gid));
      if (staleRaw && staleRaw.csv) {
        console.warn(`[${requestId}] [sheets] Serving processed response from STALE RAW CACHE.`);
        let fallbackCsv = staleRaw.csv;
        if (String(gid) === PRODUCTS_GID) {
          fallbackCsv = processProductsSheet(staleRaw.csv, isAgentView, limit as string, offset as string);
        } else {
          fallbackCsv = processOtherSheet(staleRaw.csv, isAgentView, limit as string, offset as string);
        }
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Cache-Control", "private, max-age=0, no-store");
        res.setHeader("X-Data-Source", "stale-raw-cache");
        return res.status(200).send(fallbackCsv);
      }
    }

    // If it's our custom error object with a status code
    if (e.status && e.code) {
      return res.status(e.status).json({ success: false, code: e.code, message: e.message });
    }
    
    return res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Internal error." });
  }
}
