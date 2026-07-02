import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SignJWT, importPKCS8, jwtVerify, createRemoteJWKSet } from "jose";

// ============================================================================
// Secure Google Sheets proxy.
// - The sheet is PRIVATE (shared only with the Service Account below).
// - This function authenticates to Google with a Service Account (env vars)
//   and fetches the CSV server-side. The browser never talks to Google.
// - App Check (reCAPTCHA v3) is verified so only our app can call this API.
// - In-memory cache (10 min) protects Google quota without a CDN cache
//   (CDN cache would bypass App Check verification).
// Env vars (Vercel → Settings → Environment Variables):
//   GOOGLE_SA_EMAIL        = service account email (…@….iam.gserviceaccount.com)
//   GOOGLE_SA_PRIVATE_KEY  = the private_key from the JSON key file (with \n)
// Rollout-safe: until env vars are set, falls back to unauthenticated fetch
// (works while the sheet is still public). Once the sheet is private, the
// Service Account path is the only one that works.
// ============================================================================

const SHEET_ID = "1NtYwQeTX3blf0aMcvtnlk9liIaJOiG9BOsP4Qc8lSRs";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}`;

// Catalog tabs + cabinet configurator tabs (H-14: no arbitrary gid).
const ALLOWED_GIDS = ["1506812668", "1781083359", "1626175369", "250535112", "1366808268"];

// --- App Check verification (same pattern as api/advisor/chat.ts) ---
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

// --- Google Service Account OAuth token (cached ~55 min) ---
let googleToken: { token: string; exp: number } | null = null;
async function getGoogleToken(): Promise<string | null> {
  const email = process.env.GOOGLE_SA_EMAIL;
  let key = process.env.GOOGLE_SA_PRIVATE_KEY;
  if (!email || !key) return null; // not configured yet → public-sheet fallback
  if (googleToken && Date.now() < googleToken.exp - 60_000) return googleToken.token;
  try {
    key = key.replace(/\\n/g, "\n");
    const pk = await importPKCS8(key, "RS256");
    const now = Math.floor(Date.now() / 1000);
    const assertion = await new SignJWT({
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly"
    })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(email)
      .setAudience("https://oauth2.googleapis.com/token")
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(pk);
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${assertion}`
    });
    if (!r.ok) {
      console.error("SA token exchange failed:", r.status, await r.text());
      return null;
    }
    const d: any = await r.json();
    googleToken = { token: d.access_token, exp: Date.now() + (d.expires_in || 3600) * 1000 };
    return googleToken.token;
  } catch (e) {
    console.error("SA token error:", e);
    return null;
  }
}

// --- In-memory CSV cache (per warm instance) ---
const csvCache = new Map<string, { body: string; exp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });

  // App Check: only our app (web/PWA, incl. guests) may call this endpoint.
  const appCheckToken = (req.headers["x-firebase-appcheck"] || "") as string;
  if (!appCheckToken || !(await verifyAppCheck(appCheckToken))) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const { gid, limit, offset } = req.query;
  if (!gid || !ALLOWED_GIDS.includes(String(gid))) {
    return res.status(400).json({ error: "Invalid request." });
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
    let url = `${SHEET_URL}/gviz/tq?tqx=out:csv&gid=${gid}`;
    if (limit !== undefined && offset !== undefined) {
      const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 0, 0), 5000);
      const safeOffset = Math.max(parseInt(String(offset), 10) || 0, 0);
      url += `&tq=${encodeURIComponent(`SELECT * LIMIT ${safeLimit} OFFSET ${safeOffset}`)}`;
    }
    url += `&_=${Date.now()}`;

    const gTok = await getGoogleToken();
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RBS-B2B-Proxy"
    };
    if (gTok) headers["Authorization"] = `Bearer ${gTok}`;

    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.error("Upstream Sheets error:", response.status, response.statusText);
      return res.status(502).json({ error: "Upstream data source unavailable." });
    }

    const text = await response.text();
    // If the sheet is private and we had no/invalid token, Google returns an HTML login page.
    if (/^\s*<(!DOCTYPE|html)/i.test(text)) {
      console.error("Sheets returned HTML (auth required). Check GOOGLE_SA_EMAIL / GOOGLE_SA_PRIVATE_KEY and sheet sharing.");
      return res.status(502).json({ error: "Data source auth misconfigured." });
    }

    if (!bypassCache) csvCache.set(cacheKey, { body: text, exp: Date.now() + CACHE_TTL_MS });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Cache-Control", bypassCache ? "no-store, no-cache, must-revalidate, max-age=0" : "private, max-age=0, no-store");
    res.setHeader("X-Cache", "MISS");
    return res.status(200).send(text);
  } catch (e) {
    console.error("Sheets proxy error:", e);
    return res.status(500).json({ error: "Internal error." });
  }
}
