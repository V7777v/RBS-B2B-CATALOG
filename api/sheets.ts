import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { fetchSheetDataV4, ALLOWED_GIDS } from "./_lib/googleSheets.js";

// ============================================================================
// Secure Google Sheets proxy via API v4.
// - App Check (reCAPTCHA v3) is verified so only our app can call this API.
// ============================================================================

// --- App Check verification ---
const APP_CHECK_JWKS = createRemoteJWKSet(new URL("https://firebaseappcheck.googleapis.com/v1/jwks"));
const APP_CHECK_PROJECT_NUMBER = "224025193925";

async function verifyAppCheck(token: string): Promise<boolean> {
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

// --- In-memory CSV cache (per warm instance) ---
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
    console.error(`[${requestId}] [sheets] 401: App Check token INVALID. Token prefix:`, appCheckToken.slice(0, 12));
    return res.status(401).json({ success: false, code: "APP_CHECK_INVALID", message: "Unauthorized.", reason: "invalid-token" });
  }

  const { gid, limit, offset } = req.query;
  if (!gid || !ALLOWED_GIDS.includes(String(gid))) {
    console.warn(`[${requestId}] [sheets] 400: Invalid GID requested: ${gid}`);
    return res.status(400).json({ success: false, code: "INVALID_GID", message: "Invalid catalog source." });
  }

  const bypassCache = req.query.bypass_cache === "true";
  const cacheKey = `${gid}:${limit ?? ""}:${offset ?? ""}`;
  
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
    const csvString = await fetchSheetDataV4(String(gid), limit as string, offset as string, requestId);

    if (!bypassCache) csvCache.set(cacheKey, { body: csvString, exp: Date.now() + CACHE_TTL_MS });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Cache-Control", bypassCache ? "no-store, no-cache, must-revalidate, max-age=0" : "s-maxage=300, stale-while-revalidate=600");
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
