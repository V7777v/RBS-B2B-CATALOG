import { SignJWT, importPKCS8 } from "jose";
import Papa from "papaparse";

export const ALLOWED_GIDS = ["1506812668", "1781083359", "1626175369", "250535112", "1366808268"];

let googleToken: { token: string; exp: number } | null = null;

export async function getGoogleToken(requestId: string): Promise<string | null> {
  let email = process.env.GOOGLE_SA_EMAIL;
  let key = process.env.GOOGLE_SA_PRIVATE_KEY;
  
  if (!email && !key) {
    const jsonStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        email = parsed.client_email;
        key = parsed.private_key;
      } catch (e) {
        console.error(`[${requestId}] Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON`);
        throw { status: 500, code: "GOOGLE_CREDENTIALS_INVALID", message: "Invalid credentials JSON" };
      }
    }
  }

  if (!email || !key) {
    console.warn(`[${requestId}] Missing Service Account credentials, falling back to public sheet`);
    return null;
  }

  if (!key.includes("BEGIN PRIVATE KEY")) {
    console.error(`[${requestId}] Invalid private key format`);
    throw { status: 500, code: "GOOGLE_CREDENTIALS_INVALID", message: "Invalid private key format" };
  }

  if (googleToken && Date.now() < googleToken.exp - 60_000) {
    return googleToken.token;
  }

  try {
    key = key.replace(/\\n/g, "\n");
    const pk = await importPKCS8(key, "RS256");
    const now = Math.floor(Date.now() / 1000);
    const assertion = await new SignJWT({
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly"
    })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(email)
      .setAudience("https://oauth2.googleapis.com/token")
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(pk);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${assertion}`,
      signal: controller.signal
    }).finally(() => clearTimeout(timer));

    if (!r.ok) {
      console.error(`[${requestId}] SA token exchange failed:`, r.status);
      throw { status: 502, code: "GOOGLE_TOKEN_REJECTED", message: "Catalog authentication failed." };
    }

    const d: any = await r.json();
    googleToken = { token: d.access_token, exp: Date.now() + (d.expires_in || 3600) * 1000 };
    return googleToken.token;
  } catch (e: any) {
    console.error(`[${requestId}] SA token error:`, e.message || e);
    if (e.name === "AbortError") {
       throw { status: 504, code: "GOOGLE_SHEETS_TIMEOUT", message: "Catalog authentication timeout." };
    }
    if (e.status) throw e;
    throw { status: 500, code: "GOOGLE_TOKEN_ERROR", message: "Failed to create JWT token." };
  }
}

const sheetMetaCache = new Map<string, { sheets: any[], exp: number }>();

export async function fetchSheetDataV4(gid: string, limit?: string, offset?: string, requestId: string = "req"): Promise<string> {
  const gTok = await getGoogleToken(requestId);
  
  let SHEET_ID_ACTUAL = process.env.GOOGLE_SHEET_ID || '1NtYwQeTX3blf0aMcvtnlk9liIaJOiG9BOsP4Qc8lSRs';
  if (SHEET_ID_ACTUAL.includes('BEGIN PRIVATE KEY') || SHEET_ID_ACTUAL.includes(' ')) {
    console.warn(`[${requestId}] GOOGLE_SHEET_ID appears to be invalid (contains spaces or private key). Using default.`);
    SHEET_ID_ACTUAL = '1NtYwQeTX3blf0aMcvtnlk9liIaJOiG9BOsP4Qc8lSRs';
  }

  async function fallbackGviz() {
    console.warn(`[${requestId}] Falling back to public gviz/tq endpoint.`);
    let url = `https://docs.google.com/spreadsheets/d/${SHEET_ID_ACTUAL}/gviz/tq?tqx=out:csv&gid=${gid}`;
    if (limit !== undefined && offset !== undefined) {
      url += `&tq=${encodeURIComponent(`SELECT * LIMIT ${limit} OFFSET ${offset}`)}`;
    }
    url += `&_=${Date.now()}`;
    console.log(`[${requestId}] Fetching gviz url:`, url);
    const res = await fetch(url);
    if (!res.ok) {
      throw { status: res.status, code: "GOOGLE_SHEETS_PUBLIC_FETCH_FAILED", message: `Fallback gviz fetch failed: ${res.statusText}` };
    }
    return await res.text();
  }

  if (!gTok) {
    console.warn(`[${requestId}] No GOOGLE_SA_EMAIL/KEY found.`);
    return fallbackGviz();
  }

  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_ACTUAL}`;
  let sheets = [];
  const metaCached = sheetMetaCache.get(SHEET_ID_ACTUAL);
  
  if (metaCached && Date.now() < metaCached.exp) {
    sheets = metaCached.sheets;
  } else {
    const metaController = new AbortController();
    const metaTimer = setTimeout(() => metaController.abort(), 12000);
    try {
      const metaRes = await fetch(metaUrl, { 
        headers: { "Authorization": `Bearer ${gTok}` },
        signal: metaController.signal
      }).finally(() => clearTimeout(metaTimer));
      
      if (!metaRes.ok) {
        if (metaRes.status === 403 || metaRes.status === 404) {
           console.warn(`[${requestId}] SA has no access (status ${metaRes.status}).`);
           return fallbackGviz();
        }
        if (metaRes.status === 401) throw { status: 401, code: "GOOGLE_TOKEN_REJECTED", message: "Catalog authentication failed." };
        throw { status: 502, code: "GOOGLE_SHEETS_INVALID_RESPONSE", message: "Catalog returned an invalid response." };
      }
      
      const metaData = await metaRes.json();
      sheets = metaData.sheets;
      sheetMetaCache.set(SHEET_ID_ACTUAL, { sheets, exp: Date.now() + 60 * 60 * 1000 });
    } catch (e: any) {
      if (e.name === "AbortError") throw { status: 504, code: "GOOGLE_SHEETS_TIMEOUT", message: "Catalog source did not respond in time." };
      throw e;
    }
  }

  const sheet = sheets.find((s: any) => String(s.properties.sheetId) === String(gid));
  if (!sheet) {
    console.error(`[${requestId}] Sheet with GID ${gid} not found in spreadsheet`);
    return fallbackGviz();
  }
  const sheetTitle = sheet.properties.title;
  // Properly quote the sheet title and include standard range A:ZZ to ensure all columns are fetched
  const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_ACTUAL}/values/'${sheetTitle}'!A:ZZ?valueRenderOption=FORMATTED_VALUE`;
  
  const dataController = new AbortController();
  const dataTimer = setTimeout(() => dataController.abort(), 12000);
  
  try {
    const dataRes = await fetch(dataUrl, { 
      headers: { "Authorization": `Bearer ${gTok}` },
      signal: dataController.signal
    }).finally(() => clearTimeout(dataTimer));

    if (!dataRes.ok) {
      if (dataRes.status === 401) throw { status: 401, code: "GOOGLE_TOKEN_REJECTED", message: "Catalog authentication failed." };
      if (dataRes.status === 403) throw { status: 403, code: "GOOGLE_SHEETS_FORBIDDEN", message: "Catalog source is not accessible." };
      if (dataRes.status === 404) throw { status: 404, code: "GOOGLE_SHEETS_NOT_FOUND", message: "Catalog source was not found." };
      throw { status: 502, code: "GOOGLE_SHEETS_INVALID_RESPONSE", message: "Catalog returned an invalid response." };
    }

    const dataJson = await dataRes.json();
    const rows = dataJson.values || [];
    if (rows.length === 0) return "";

    const headersRow = rows[0] || [];
    let dataRows = rows.slice(1);
    
    if (offset) {
        const off = parseInt(offset, 10);
        if (!isNaN(off) && off > 0) dataRows = dataRows.slice(off);
    }
    if (limit) {
        const lim = parseInt(limit, 10);
        if (!isNaN(lim) && lim > 0) dataRows = dataRows.slice(0, lim);
    }

    // Convert values back to CSV structure ensuring proper escaping and missing cell padding
    const fullRows = [headersRow, ...dataRows].map(row => {
      // pad row to match header length
      const padded = [...row];
      while (padded.length < headersRow.length) padded.push("");
      return padded;
    });

    const csvString = Papa.unparse(fullRows, {
      quotes: false,
      quoteChar: '"',
      escapeChar: '"',
      delimiter: ",",
      header: false,
      newline: "\n",
      skipEmptyLines: false,
    });
    
    return csvString;
  } catch (e: any) {
    if (e.name === "AbortError") throw { status: 504, code: "GOOGLE_SHEETS_TIMEOUT", message: "Catalog source did not respond in time." };
    throw e;
  }
}

export async function fetchSheetCSVDataV4(gid: string, requestId: string = "req"): Promise<any[]> {
  const csvString = await fetchSheetDataV4(gid, undefined, undefined, requestId);
  return new Promise((resolve) => {
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => resolve(results.data),
      error: () => resolve([])
    });
  });
}
