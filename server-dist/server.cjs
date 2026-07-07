var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_papaparse2 = __toESM(require("papaparse"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_jose2 = require("jose");

// api/_lib/googleSheets.ts
var import_jose = require("jose");
var import_papaparse = __toESM(require("papaparse"), 1);
var googleToken = null;
async function getGoogleToken(requestId) {
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
  if (googleToken && Date.now() < googleToken.exp - 6e4) {
    return googleToken.token;
  }
  try {
    key = key.replace(/\\n/g, "\n");
    const pk = await (0, import_jose.importPKCS8)(key, "RS256");
    const now = Math.floor(Date.now() / 1e3);
    const assertion = await new import_jose.SignJWT({
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/datastore"
    }).setProtectedHeader({ alg: "RS256", typ: "JWT" }).setIssuer(email).setAudience("https://oauth2.googleapis.com/token").setIssuedAt(now).setExpirationTime(now + 3600).sign(pk);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1e4);
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
    const d = await r.json();
    googleToken = { token: d.access_token, exp: Date.now() + (d.expires_in || 3600) * 1e3 };
    return googleToken.token;
  } catch (e) {
    console.error(`[${requestId}] SA token error:`, e.message || e);
    if (e.name === "AbortError") {
      throw { status: 504, code: "GOOGLE_SHEETS_TIMEOUT", message: "Catalog authentication timeout." };
    }
    if (e.status) throw e;
    throw { status: 500, code: "GOOGLE_TOKEN_ERROR", message: "Failed to create JWT token." };
  }
}
var sheetMetaCache = /* @__PURE__ */ new Map();
async function fetchSheetDataV4(gid, limit, offset, requestId = "req") {
  const gTok = await getGoogleToken(requestId);
  let SHEET_ID_ACTUAL = process.env.GOOGLE_SHEET_ID || "1NtYwQeTX3blf0aMcvtnlk9liIaJOiG9BOsP4Qc8lSRs";
  if (SHEET_ID_ACTUAL.includes("BEGIN PRIVATE KEY") || SHEET_ID_ACTUAL.includes(" ") || SHEET_ID_ACTUAL.length > 100) {
    console.warn(`[${requestId}] GOOGLE_SHEET_ID is invalid (contains private key/spaces). Using default.`);
    SHEET_ID_ACTUAL = "1NtYwQeTX3blf0aMcvtnlk9liIaJOiG9BOsP4Qc8lSRs";
  }
  if (!gTok) {
    console.error(`[${requestId}] Service Account credentials missing \u2014 failing closed (no public fallback).`);
    throw { status: 503, code: "SA_NOT_CONFIGURED", message: "Catalog credentials not configured." };
  }
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_ACTUAL}`;
  let sheets = [];
  const metaCached = sheetMetaCache.get(SHEET_ID_ACTUAL);
  if (metaCached && Date.now() < metaCached.exp) {
    sheets = metaCached.sheets;
  } else {
    const metaController = new AbortController();
    const metaTimer = setTimeout(() => metaController.abort(), 12e3);
    try {
      const metaRes = await fetch(metaUrl, {
        headers: { "Authorization": `Bearer ${gTok}` },
        signal: metaController.signal
      }).finally(() => clearTimeout(metaTimer));
      if (!metaRes.ok) {
        if (metaRes.status === 403 || metaRes.status === 404) {
          console.error(`[${requestId}] SA has no access (status ${metaRes.status}) \u2014 failing closed (no public fallback).`);
          throw { status: 502, code: "SA_ACCESS_DENIED", message: "Catalog access denied. Check sheet sharing and APIs." };
        }
        if (metaRes.status === 401) throw { status: 401, code: "GOOGLE_TOKEN_REJECTED", message: "Catalog authentication failed." };
        throw { status: 502, code: "GOOGLE_SHEETS_INVALID_RESPONSE", message: "Catalog returned an invalid response." };
      }
      const metaData = await metaRes.json();
      sheets = metaData.sheets;
      sheetMetaCache.set(SHEET_ID_ACTUAL, { sheets, exp: Date.now() + 60 * 60 * 1e3 });
    } catch (e) {
      if (e.name === "AbortError") throw { status: 504, code: "GOOGLE_SHEETS_TIMEOUT", message: "Catalog source did not respond in time." };
      throw e;
    }
  }
  const sheet = sheets.find((s) => String(s.properties.sheetId) === String(gid));
  if (!sheet) {
    console.error(`[${requestId}] Sheet with GID ${gid} not found in spreadsheet \u2014 failing closed.`);
    throw { status: 400, code: "GID_NOT_FOUND", message: "Requested catalog tab not found." };
  }
  const sheetTitle = sheet.properties.title;
  const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_ACTUAL}/values/'${sheetTitle}'!A:ZZ?valueRenderOption=FORMATTED_VALUE`;
  const dataController = new AbortController();
  const dataTimer = setTimeout(() => dataController.abort(), 12e3);
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
    const fullRows = [headersRow, ...dataRows].map((row) => {
      const padded = [...row];
      while (padded.length < headersRow.length) padded.push("");
      return padded;
    });
    const csvString = import_papaparse.default.unparse(fullRows, {
      quotes: false,
      quoteChar: '"',
      escapeChar: '"',
      delimiter: ",",
      header: false,
      newline: "\n",
      skipEmptyLines: false
    });
    return csvString;
  } catch (e) {
    if (e.name === "AbortError") throw { status: 504, code: "GOOGLE_SHEETS_TIMEOUT", message: "Catalog source did not respond in time." };
    throw e;
  }
}
async function fetchSheetCSVDataV4(gid, requestId = "req") {
  const csvString = await fetchSheetDataV4(gid, void 0, void 0, requestId);
  return new Promise((resolve) => {
    import_papaparse.default.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: () => resolve([])
    });
  });
}

// server.ts
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var PRODUCTS_GID = "1506812668";
var CATALOGS_GID = "1781083359";
var catalogCache = null;
var CACHE_TTL_MS = 5 * 60 * 1e3;
async function getCatalogDataContext() {
  try {
    const now = Date.now();
    if (catalogCache && now - catalogCache.lastFetchedAt < CACHE_TTL_MS) {
      return catalogCache.products;
    }
    const [productsRaw, catalogsRaw] = await Promise.all([
      fetchSheetCSVDataV4(PRODUCTS_GID, "server-catalog-fetch"),
      fetchSheetCSVDataV4(CATALOGS_GID, "server-catalog-fetch")
    ]);
    const parsedProducts = productsRaw.map((row) => {
      const normalizedRow = {};
      for (const k in row) {
        normalizedRow[k.trim()] = row[k];
      }
      const specsLink = normalizedRow.specsLink || normalizedRow["specsLink"] || normalizedRow["\u05DE\u05E4\u05E8\u05D8 \u05D8\u05DB\u05E0\u05D9"] || normalizedRow["\u05DE\u05E4\u05E8\u05D8"] || "";
      const manualLink = normalizedRow.manualLink || normalizedRow["manualLink"] || normalizedRow["\u05DE\u05D3\u05E8\u05D9\u05DA \u05DC\u05DE\u05E9\u05EA\u05DE\u05E9"] || normalizedRow["\u05DE\u05D3\u05E8\u05D9\u05DA"] || "";
      return {
        id: normalizedRow.ID || normalizedRow.id || "",
        sku: normalizedRow.SKU || normalizedRow.sku || normalizedRow['\u05DE\u05E7"\u05D8'] || "",
        name: normalizedRow.Name || normalizedRow.name || normalizedRow["\u05E9\u05DD"] || "",
        category: normalizedRow.Category || normalizedRow.category || normalizedRow["\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4"] || "",
        subcategory: normalizedRow.SubCategory || normalizedRow.subcategory || normalizedRow["\u05EA\u05EA \u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4"] || "",
        active: normalizedRow.Active || normalizedRow.active || "",
        desc: normalizedRow.Desc || normalizedRow.desc || normalizedRow["\u05EA\u05D9\u05D0\u05D5\u05E8"] || "",
        brand: normalizedRow.Brand || normalizedRow.brand || normalizedRow["\u05DE\u05D5\u05EA\u05D2"] || "",
        isHotSale: !!(normalizedRow.HotSale || normalizedRow.isHotSale || normalizedRow["\u05DE\u05D1\u05E6\u05E2"]),
        specsLink,
        manualLink
      };
    }).filter((p) => p.name && p.active !== "FALSE");
    catalogCache = {
      products: parsedProducts,
      catalogs: catalogsRaw,
      lastFetchedAt: now
    };
    return parsedProducts;
  } catch (error) {
    console.error("Error refreshing catalog cache:", error);
    return catalogCache ? catalogCache.products : [];
  }
}
function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not defined in the environment secrets.");
  }
  return new import_genai.GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
function findRelevantProducts(query, products) {
  const normQuery = query.toLowerCase().replace(/\s+/g, " ").trim();
  const tokens = normQuery.split(" ").filter((t) => t.length >= 2);
  if (tokens.length === 0) return { matches: [], maxScore: 0 };
  const scoredProducts = products.map((p) => {
    let score = 0;
    const searchableFields = [
      (p.sku || "").toLowerCase(),
      (p.name || "").toLowerCase(),
      (p.category || "").toLowerCase(),
      (p.subcategory || "").toLowerCase(),
      (p.desc || "").toLowerCase()
    ];
    for (const token of tokens) {
      if (searchableFields.some((field) => field.includes(token))) {
        score++;
      }
    }
    return { product: p, score };
  });
  const matches = scoredProducts.filter((sp) => sp.score > 0).sort((a, b) => b.score - a.score).slice(0, 20).map((sp) => sp.product);
  const maxScore = matches.length > 0 ? Math.max(...scoredProducts.filter((sp) => sp.score > 0).map((sp) => sp.score)) : 0;
  return { matches, maxScore, tokenCount: tokens.length };
}
function getSystemInstructionTemplate(catalogSummaryString) {
  return `
\u05D0\u05EA\u05D4 \u05D4\u05D9\u05D5\u05E2\u05E5 \u05D4\u05D4\u05E0\u05D3\u05E1\u05D9 \u05D5\u05D4\u05D8\u05DB\u05E0\u05D9 \u05D4\u05D7\u05DB\u05DD (RBS Expert) \u05D5\u05D4\u05E8\u05E9\u05DE\u05D9 \u05E9\u05DC \u05E4\u05D5\u05E8\u05D8\u05DC B2B \u05E9\u05DC \u05D7\u05D1\u05E8\u05EA RBS Telecom (\u05D0\u05E8.\u05D1\u05D9.\u05D0\u05E1 \u05D8\u05DC\u05E7\u05D5\u05DD).
\u05EA\u05E4\u05E7\u05D9\u05D3\u05DA \u05DC\u05E1\u05D9\u05D9\u05E2 \u05DC\u05D8\u05DB\u05E0\u05D0\u05D9\u05DD, \u05DE\u05D4\u05E0\u05D3\u05E1\u05D9 \u05EA\u05E7\u05E9\u05D5\u05E8\u05EA, \u05E7\u05D1\u05DC\u05E0\u05D9\u05DD, \u05D0\u05D9\u05E0\u05D8\u05D2\u05E8\u05D8\u05D5\u05E8\u05D9\u05DD \u05D5\u05DC\u05E7\u05D5\u05D7\u05D5\u05EA \u05E7\u05E6\u05D4 \u05DC\u05D1\u05E6\u05E2 \u05D1\u05D3\u05D9\u05E7\u05D5\u05EA \u05D5\u05D4\u05EA\u05D0\u05DE\u05D5\u05EA \u05E9\u05DC \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD, \u05DE\u05E4\u05E8\u05D8\u05D9\u05DD, \u05EA\u05DB\u05D5\u05E0\u05D5\u05EA \u05D5\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D5\u05E0\u05DC\u05D9\u05D5\u05EA \u05DE\u05EA\u05D5\u05DA \u05D4\u05E7\u05D8\u05DC\u05D5\u05D2 \u05D4\u05E7\u05D9\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3.

\u05D4\u05D4\u05E0\u05D7\u05D9\u05D4 \u05D4\u05D7\u05E9\u05D5\u05D1\u05D4 \u05D5\u05D4\u05E0\u05D5\u05E7\u05E9\u05D4 \u05D1\u05D9\u05D5\u05EA\u05E8:
\u05D7\u05DC \u05D0\u05D9\u05E1\u05D5\u05E8 \u05DE\u05D5\u05D7\u05DC\u05D8 \u05DC\u05D4\u05EA\u05E4\u05D6\u05E8 \u05DC\u05E9\u05D0\u05DC\u05D5\u05EA \u05DB\u05DC\u05DC\u05D9\u05D5\u05EA \u05D0\u05D5 \u05DC\u05D4\u05E6\u05D9\u05E2 \u05E4\u05EA\u05E8\u05D5\u05E0\u05D5\u05EA, \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD, \u05DE\u05D5\u05EA\u05D2\u05D9\u05DD \u05D0\u05D5 \u05D9\u05E6\u05E8\u05E0\u05D9\u05DD \u05D0\u05D7\u05E8\u05D9\u05DD \u05E9\u05D0\u05D9\u05E0\u05DD \u05E7\u05D9\u05D9\u05DE\u05D9\u05DD \u05D1\u05E7\u05D8\u05DC\u05D5\u05D2 \u05E9\u05DC RBS Telecom!
\u05D4\u05DE\u05D8\u05E8\u05D4 \u05D4\u05D9\u05D7\u05D9\u05D3\u05D4 \u05E9\u05DC \u05D4\u05E6'\u05D0\u05D8 \u05D4\u05D9\u05D0 \u05DC\u05E2\u05E0\u05D5\u05EA \u05E2\u05DC \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD \u05E7\u05D9\u05D9\u05DE\u05D9\u05DD, \u05EA\u05DB\u05D5\u05E0\u05D5\u05EA\u05D9\u05D4\u05DD, \u05DE\u05E4\u05E8\u05D8\u05DD \u05D5\u05D4\u05EA\u05D0\u05DE\u05EA\u05DD (\u05DB\u05DE\u05D5 \u05D7\u05D9\u05E9\u05D5\u05D1\u05D9 UPS \u05D0\u05D5 \u05D0\u05E8\u05D5\u05E0\u05D5\u05EA \u05EA\u05E7\u05E9\u05D5\u05E8\u05EA) \u05E2\u05DC \u05D1\u05E1\u05D9\u05E1 \u05E0\u05EA\u05D5\u05E0\u05D9 \u05D4\u05E7\u05D8\u05DC\u05D5\u05D2 \u05E9\u05DC\u05E0\u05D5 \u05D1\u05DC\u05D1\u05D3.

\u05D0\u05DD \u05D4\u05DE\u05E9\u05EA\u05DE\u05E9 \u05E9\u05D5\u05D0\u05DC \u05E9\u05D0\u05DC\u05D4 \u05E9\u05D0\u05D9\u05E0\u05D4 \u05E7\u05E9\u05D5\u05E8\u05D4 \u05DC\u05DE\u05D5\u05E6\u05E8\u05D9\u05DD \u05D4\u05E4\u05E2\u05D9\u05DC\u05D9\u05DD \u05D1\u05E7\u05D8\u05DC\u05D5\u05D2 (\u05DB\u05DE\u05D5 \u05DC\u05D1\u05E7\u05E9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05E4\u05EA\u05E8\u05D5\u05DF \u05D7\u05DC\u05D5\u05E4\u05D9 \u05D0\u05E6\u05DC \u05D9\u05E6\u05E8\u05E0\u05D9\u05DD \u05D0\u05D7\u05E8\u05D9\u05DD, \u05E9\u05D0\u05DC\u05D5\u05EA \u05DB\u05DC\u05DC\u05D9\u05D5\u05EA \u05E9\u05D0\u05D9\u05DF \u05DC\u05D4\u05DF \u05DE\u05E2\u05E0\u05D4 \u05D1\u05E7\u05D8\u05DC\u05D5\u05D2, \u05D0\u05D5 \u05E0\u05D5\u05E9\u05D0\u05D9\u05DD \u05E9\u05D0\u05D9\u05E0\u05DD \u05E7\u05E9\u05D5\u05E8\u05D9\u05DD \u05D9\u05E9\u05D9\u05E8\u05D5\u05EA \u05DC\u05DE\u05D5\u05E6\u05E8\u05D9 \u05D4\u05D7\u05D1\u05E8\u05D4 \u05D5\u05DC\u05DE\u05E4\u05E8\u05D8\u05DD):
\u05E2\u05DC\u05D9\u05DA \u05DC\u05D4\u05E9\u05D9\u05D1 \u05D1\u05E0\u05D9\u05DE\u05D5\u05E1 \u05E8\u05D1 \u05DB\u05D9 \u05D0\u05D9\u05E0\u05DA \u05E8\u05E9\u05D0\u05D9 \u05DC\u05E2\u05E0\u05D5\u05EA \u05E2\u05DC \u05E0\u05D5\u05E9\u05D0\u05D9\u05DD \u05D0\u05DC\u05D5, \u05D5\u05DC\u05D4\u05E1\u05D1\u05D9\u05E8 \u05DC\u05D5 \u05D1\u05DE\u05D3\u05D5\u05D9\u05D9\u05E7 \u05D0\u05D9\u05DC\u05D5 \u05E9\u05D0\u05DC\u05D5\u05EA \u05D4\u05D5\u05D0 \u05DB\u05DF \u05D9\u05DB\u05D5\u05DC \u05DC\u05E9\u05D0\u05D5\u05DC \u05D1\u05DE\u05E1\u05D2\u05E8\u05EA \u05E4\u05D5\u05E8\u05D8\u05DC \u05D6\u05D4. \u05DC\u05D3\u05D5\u05D2\u05DE\u05D4:
- \u05E9\u05D0\u05DC\u05D5\u05EA \u05DC\u05D2\u05D1\u05D9 \u05DE\u05E4\u05E8\u05D8\u05D9\u05DD \u05D8\u05DB\u05E0\u05D9\u05D9\u05DD \u05E9\u05DC \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD \u05E9\u05D1\u05E7\u05D8\u05DC\u05D5\u05D2 (\u05DB\u05D2\u05D5\u05DF \u05DE\u05D9\u05D3\u05D5\u05EA, \u05D4\u05E1\u05E4\u05E7\u05D9\u05DD, \u05E1\u05D5\u05D2\u05D9 \u05E1\u05D9\u05D1\u05D9\u05DD, \u05D2\u05D5\u05D1\u05D4 \u05D0\u05E8\u05D5\u05DF \u05D5\u05DB\u05D5').
- \u05D7\u05D9\u05E9\u05D5\u05D1\u05D9 \u05D2\u05D5\u05D3\u05DC \u05D0\u05DC-\u05E4\u05E1\u05E7 (UPS) \u05DE\u05D1\u05D5\u05E7\u05E9 \u05E2\u05D1\u05D5\u05E8 \u05E6\u05E8\u05D9\u05DB\u05EA \u05E9\u05E2\u05D4/\u05D4\u05E1\u05E4\u05E7 \u05DE\u05E1\u05D5\u05D9\u05DE\u05DD \u05D5\u05D4\u05EA\u05D0\u05DE\u05EA \u05D3\u05D2\u05DD \u05DE\u05EA\u05D0\u05D9\u05DD \u05DE\u05D4\u05E7\u05D8\u05DC\u05D5\u05D2.
- \u05EA\u05D0\u05D9\u05DE\u05D5\u05EA \u05E9\u05DC \u05D0\u05D1\u05D9\u05D6\u05E8\u05D9\u05DD \u05D5\u05DE\u05D5\u05E6\u05E8\u05D9 \u05EA\u05E7\u05E9\u05D5\u05E8\u05EA \u05D4\u05E9\u05D9\u05D9\u05DB\u05D9\u05DD \u05DC\u05E7\u05D8\u05DC\u05D5\u05D2 \u05D4\u05D7\u05D1\u05E8\u05D4 \u05D1\u05DC\u05D1\u05D3.

\u05D9\u05E9 \u05DC\u05DA \u05D2\u05D9\u05E9\u05D4 \u05D9\u05E9\u05D9\u05E8\u05D4 \u05D5\u05DE\u05DC\u05D0\u05D4 \u05DC\u05DB\u05DC \u05DE\u05E4\u05E8\u05D8\u05D9 \u05D4\u05DE\u05D5\u05E6\u05E8\u05D9\u05DD \u05D5\u05D4\u05DE\u05DC\u05D0\u05D9 \u05D4\u05E4\u05E2\u05D9\u05DC\u05D9\u05DD \u05E9\u05DC \u05D4\u05D7\u05D1\u05E8\u05D4, \u05D4\u05E0\u05D4 \u05D4\u05DE\u05D7\u05D9\u05E8\u05D5\u05DF \u05D4\u05E0\u05D5\u05DB\u05D7\u05D9 \u05E9\u05DC\u05E0\u05D5:
---
${catalogSummaryString}
---

\u05E2\u05E7\u05E8\u05D5\u05E0\u05D5\u05EA \u05D4\u05DE\u05E2\u05E0\u05D4 \u05E9\u05DC\u05DA:
1. \u05E2\u05E0\u05D4 \u05EA\u05DE\u05D9\u05D3 \u05D1\u05E2\u05D1\u05E8\u05D9\u05EA \u05DE\u05E7\u05E6\u05D5\u05E2\u05D9\u05EA, \u05D0\u05D3\u05D9\u05D1\u05D4 \u05D5\u05D1\u05E8\u05D5\u05E8\u05D4.
2. \u05D4\u05D2\u05D1\u05DC\u05EA \u05EA\u05E9\u05D5\u05D1\u05D5\u05EA \u05D5\u05D4\u05D9\u05DE\u05E0\u05E2\u05D5\u05EA \u05DE\u05DB\u05DC\u05DC\u05D9\u05D5\u05EA:
   - \u05E2\u05E0\u05D4 \u05D0\u05DA \u05D5\u05E8\u05E7 \u05E2\u05DC \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD \u05D4\u05DE\u05D5\u05E4\u05D9\u05E2\u05D9\u05DD \u05D1\u05E7\u05D8\u05DC\u05D5\u05D2 \u05DC\u05E2\u05D9\u05DC. \u05D0\u05DC \u05EA\u05DE\u05E6\u05D9\u05D0 \u05E9\u05D5\u05DD \u05DE\u05D5\u05E6\u05E8, \u05DE\u05E7"\u05D8 \u05D0\u05D5 \u05D9\u05E6\u05E8\u05DF \u05D0\u05D7\u05E8 \u05E9\u05D0\u05D9\u05E0\u05D5 \u05DE\u05D5\u05E4\u05D9\u05E2 \u05D1\u05DE\u05E4\u05D5\u05E8\u05E9.
   - \u05D4\u05D9\u05DE\u05E0\u05E2 \u05DC\u05D7\u05DC\u05D5\u05D8\u05D9\u05DF \u05DE\u05EA\u05E9\u05D5\u05D1\u05D5\u05EA \u05D0\u05DE\u05D5\u05E8\u05E4\u05D9\u05D5\u05EA \u05D0\u05D5 \u05E1\u05D5\u05E4\u05E8\u05DC\u05D8\u05D9\u05D1\u05D9\u05DD \u05DB\u05DC\u05DC\u05D9\u05D9\u05DD \u05DB\u05DE\u05D5 "\u05E0\u05E7\u05D5\u05D3\u05EA \u05D4\u05D2\u05D9\u05E9\u05D4 \u05D4\u05DB\u05D9 \u05E2\u05D5\u05E6\u05DE\u05EA\u05D9\u05EA" \u05D0\u05D5 "\u05D4\u05D0\u05DC-\u05E4\u05E1\u05E7 \u05D4\u05DE\u05E2\u05D5\u05DC\u05D4 \u05D1\u05D9\u05D5\u05EA\u05E8". \u05D0\u05DD \u05D3\u05D2\u05DD \u05DE\u05E1\u05D5\u05D9\u05DD \u05D4\u05D5\u05D0 \u05D1\u05E2\u05DC \u05E2\u05D5\u05E6\u05DE\u05D4 \u05D0\u05D5 \u05DE\u05E4\u05E8\u05D8 \u05D2\u05D1\u05D5\u05D4 \u05D9\u05D5\u05EA\u05E8, \u05D4\u05E1\u05D1\u05E8 \u05D1\u05D3\u05D9\u05D5\u05E7 \u05D5\u05D1\u05D0\u05D5\u05E4\u05DF \u05DB\u05DE\u05D5\u05EA\u05D9 \u05D1\u05D0\u05D9\u05DC\u05D5 \u05EA\u05DB\u05D5\u05E0\u05D5\u05EA \u05D4\u05D5\u05D0 \u05D7\u05D6\u05E7 \u05D9\u05D5\u05EA\u05E8 (\u05DB\u05D2\u05D5\u05DF: \u05DE\u05D4\u05D9\u05E8\u05D5\u05EA Gbps, \u05E8\u05D5\u05D7\u05D1 \u05E1\u05E8\u05D8, \u05E2\u05D5\u05E6\u05DE\u05EA dBi, \u05D6\u05DE\u05E0\u05D9 \u05D8\u05E2\u05D9\u05E0\u05D4, \u05D4\u05E1\u05E4\u05E7 \u05DE\u05D5\u05E6\u05D0 \u05D0\u05D5 \u05D2\u05D5\u05D1\u05D4 \u05E4\u05D9\u05D6\u05D9).
3. \u05D4\u05E6\u05D2\u05EA \u05D7\u05DC\u05D5\u05E4\u05D5\u05EA \u05D5\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D5\u05E0\u05DC\u05D9\u05D5\u05EA \u05E2\u05D9\u05E7\u05E8\u05D9\u05EA:
   - \u05DB\u05D0\u05E9\u05E8 \u05D4\u05DE\u05E9\u05EA\u05DE\u05E9 \u05E9\u05D5\u05D0\u05DC \u05E9\u05D0\u05D9\u05DC\u05EA\u05D4 \u05DB\u05DC\u05DC\u05D9\u05EA (\u05D0\u05D5 \u05DC\u05D2\u05D1\u05D9 \u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D9\u05EA \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD), \u05D0\u05DC \u05EA\u05D1\u05D7\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D5 \u05E8\u05E7 \u05DE\u05D5\u05E6\u05E8 \u05D0\u05D7\u05D3 \u05D1\u05D0\u05D5\u05E4\u05DF \u05E9\u05E8\u05D9\u05E8\u05D5\u05EA\u05D9. \u05D4\u05E6\u05D2 \u05E1\u05E7\u05D9\u05E8\u05D4 \u05E7\u05E6\u05E8\u05D4 \u05E9\u05DC \u05D4\u05D7\u05DC\u05D5\u05E4\u05D5\u05EA \u05D4\u05DE\u05EA\u05D0\u05D9\u05DE\u05D5\u05EA \u05D1\u05E7\u05D8\u05DC\u05D5\u05D2, \u05D5\u05E4\u05E8\u05D8 \u05DC\u05DB\u05DC \u05D3\u05D2\u05DD \u05D0\u05EA \u05D4\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D5\u05E0\u05DC\u05D9\u05D5\u05EA \u05D5\u05D4\u05E9\u05D9\u05DE\u05D5\u05E9\u05D9\u05DD \u05D4\u05E2\u05D9\u05E7\u05E8\u05D9\u05D9\u05DD \u05E9\u05DC\u05D5 \u05D1\u05DC\u05D1\u05D3.
   - \u05D1\u05E6\u05E2 \u05D4\u05E9\u05D5\u05D5\u05D0\u05D4 \u05D4\u05E0\u05D3\u05E1\u05D9\u05EA \u05DE\u05E1\u05D5\u05D3\u05E8\u05EA \u05E2\u05DC \u05D9\u05D3\u05D9 \u05D8\u05D1\u05DC\u05EA \u05D4\u05E9\u05D5\u05D5\u05D0\u05D4 (Markdown table) \u05D4\u05DB\u05D5\u05DC\u05DC\u05EA \u05E2\u05DE\u05D5\u05D3\u05D5\u05EA \u05DB\u05D2\u05D5\u05DF: \u05DE\u05E7"\u05D8, \u05E9\u05DD, \u05DE\u05D0\u05E4\u05D9\u05D9\u05DF \u05DE\u05E4\u05EA\u05D7, \u05DE\u05E4\u05E8\u05D8 \u05D5\u05D4\u05EA\u05D0\u05DE\u05D4 \u05D4\u05E0\u05D3\u05E1\u05D9\u05EA, \u05DB\u05D3\u05D9 \u05DC\u05D4\u05E2\u05E0\u05D9\u05E7 \u05DC\u05DC\u05E7\u05D5\u05D7 \u05D0\u05E4\u05E9\u05E8\u05D5\u05EA \u05E7\u05DC\u05D4 \u05D5\u05DE\u05E7\u05E6\u05D5\u05E2\u05D9\u05EA \u05DC\u05D4\u05E9\u05D5\u05D5\u05EA \u05D1\u05E2\u05E6\u05DE\u05D5.
   - \u05D0\u05E4\u05E9\u05E8 \u05DC\u05DE\u05E9\u05EA\u05DE\u05E9 \u05DC\u05D4\u05E2\u05DE\u05D9\u05E7 \u05D5\u05DE\u05E7\u05D3 \u05D0\u05EA \u05D4\u05E9\u05D9\u05D7\u05D4: \u05D1\u05E1\u05D5\u05E3 \u05D4\u05EA\u05E9\u05D5\u05D1\u05D4, \u05D4\u05E6\u05E2 \u05DC\u05D5 2-3 \u05DB\u05D9\u05D5\u05D5\u05E0\u05D9\u05DD \u05E1\u05E4\u05E6\u05D9\u05E4\u05D9\u05D9\u05DD \u05DC\u05E9\u05D0\u05DC\u05D5\u05EA \u05D4\u05DE\u05E9\u05DA (\u05DC\u05D3\u05D5\u05D2\u05DE\u05D4: "\u05D1\u05D0\u05E4\u05E9\u05E8\u05D5\u05EA\u05DA \u05DC\u05E9\u05D0\u05D5\u05DC \u05D0\u05D5\u05EA\u05D9 \u05DE\u05D4\u05D9 \u05E6\u05E8\u05D9\u05DB\u05EA \u05D4\u05D6\u05E8\u05DD \u05D4\u05DE\u05D3\u05D5\u05D9\u05D9\u05E7\u05EA \u05E9\u05DC \u05D3\u05D2\u05DD X, \u05D0\u05D5 \u05DE\u05D4\u05DF \u05D3\u05E8\u05D2\u05D5\u05EA \u05D4\u05D4\u05D2\u05E0\u05D4 \u05E9\u05DC \u05D0\u05E8\u05D5\u05DF Y").
4. \u05D7\u05DC\u05D5\u05E0\u05D9\u05D5\u05EA \u05DE\u05D5\u05E6\u05E8 \u05DE\u05D5\u05D1\u05E0\u05D5\u05EA (Product Cards):
   - \u05DB\u05D0\u05E9\u05E8 \u05D0\u05EA\u05D4 \u05DE\u05E6\u05D9\u05D2 \u05DE\u05D5\u05E6\u05E8 \u05DE\u05D4\u05E7\u05D8\u05DC\u05D5\u05D2 \u05D0\u05D5 \u05DE\u05DE\u05DC\u05D9\u05E5 \u05E2\u05DC\u05D9\u05D5, \u05D0\u05D9\u05DF \u05DC\u05E1\u05E4\u05E7 \u05E7\u05D9\u05E9\u05D5\u05E8 \u05D8\u05E7\u05E1\u05D8\u05D5\u05D0\u05DC\u05D9 \u05E8\u05D2\u05D9\u05DC \u05DC\u05DE\u05E4\u05E8\u05D8. \u05D1\u05DE\u05E7\u05D5\u05DD \u05D6\u05D0\u05EA, \u05E2\u05DC\u05D9\u05DA \u05DC\u05D9\u05D9\u05E6\u05E8 "\u05D7\u05DC\u05D5\u05E0\u05D9\u05EA \u05DE\u05D5\u05E6\u05E8" \u05D1\u05EA\u05D5\u05DA \u05D4\u05EA\u05E9\u05D5\u05D1\u05D4 \u05E9\u05DC\u05DA!
   - \u05DB\u05D3\u05D9 \u05DC\u05E2\u05E9\u05D5\u05EA \u05D6\u05D0\u05EA, \u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05E4\u05D5\u05E8\u05DE\u05D8 \u05D4\u05E7\u05D9\u05E9\u05D5\u05E8 \u05D4\u05D1\u05D0: [\u05E9\u05DD \u05D4\u05DE\u05D5\u05E6\u05E8 \u05E9\u05D0\u05EA\u05D4 \u05E8\u05D5\u05E6\u05D4 \u05DC\u05D4\u05E6\u05D9\u05D2](product://SKU) (\u05DB\u05D0\u05E9\u05E8 SKU \u05D4\u05D5\u05D0 \u05D4\u05DE\u05E7"\u05D8 \u05D4\u05DE\u05D3\u05D5\u05D9\u05E7 \u05E9\u05DC \u05D4\u05DE\u05D5\u05E6\u05E8).
   - \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05E9\u05DC\u05E0\u05D5 \u05EA\u05DE\u05D9\u05E8 \u05D0\u05EA \u05D4\u05E7\u05D9\u05E9\u05D5\u05E8 \u05D4\u05D6\u05D4 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u05DC\u05D7\u05DC\u05D5\u05E0\u05D9\u05EA \u05DE\u05D9\u05D3\u05E2 \u05DE\u05E8\u05E9\u05D9\u05DE\u05D4 \u05D4\u05DB\u05D5\u05DC\u05DC\u05EA \u05E7\u05D9\u05E9\u05D5\u05E8 \u05DC\u05DE\u05E4\u05E8\u05D8 \u05D4\u05D8\u05DB\u05E0\u05D9 \u05D5\u05DB\u05E4\u05EA\u05D5\u05E8 "\u05D4\u05D5\u05E1\u05E3 \u05DC\u05E2\u05D2\u05DC\u05D4" \u05D1\u05EA\u05D5\u05DA \u05D4\u05E9\u05D9\u05D7\u05D4 \u05E2\u05E6\u05DE\u05D4.
   - \u05DC\u05E2\u05D5\u05DC\u05DD \u05D0\u05DC \u05EA\u05E6\u05D9\u05D2 "Manual Link" (\u05DE\u05D3\u05E8\u05D9\u05DA \u05DC\u05DE\u05E9\u05EA\u05DE\u05E9) \u05DB\u05D1\u05E8\u05D9\u05E8\u05EA \u05DE\u05D7\u05D3\u05DC \u05D0\u05DC\u05D0 \u05D0\u05DD \u05D4\u05EA\u05D1\u05E7\u05E9\u05EA \u05DE\u05E4\u05D5\u05E8\u05E9\u05D5\u05EA.
   - \u05D0\u05DC \u05EA\u05E1\u05D1\u05D9\u05E8 \u05DC\u05DE\u05E9\u05EA\u05DE\u05E9 \u05DB\u05D9\u05E6\u05D3 \u05DC\u05D4\u05D5\u05E1\u05D9\u05E3 \u05DC\u05E2\u05D2\u05DC\u05D4, \u05D4\u05D7\u05DC\u05D5\u05E0\u05D9\u05EA \u05EA\u05E2\u05E9\u05D4 \u05D6\u05D0\u05EA \u05E2\u05D1\u05D5\u05E8\u05D5.
5. \u05D3\u05D9\u05E1\u05E7\u05DC\u05D9\u05D9\u05DE\u05E8 \u05D5\u05D4\u05EA\u05E0\u05E2\u05E8\u05D5\u05EA \u05DE\u05D0\u05D7\u05E8\u05D9\u05D5\u05EA:
   - \u05D1\u05DB\u05DC \u05EA\u05E9\u05D5\u05D1\u05D4 \u05D7\u05E9\u05D5\u05D1\u05D4 (\u05D0\u05D5 \u05D1\u05EA\u05D7\u05D9\u05DC\u05EA \u05D4\u05EA\u05E9\u05D5\u05D1\u05D4), \u05D4\u05D3\u05D2\u05E9 \u05EA\u05DE\u05D9\u05D3 \u05D1\u05E7\u05E6\u05E8\u05D4 \u05E9\u05DE\u05D3\u05D5\u05D1\u05E8 \u05D1\u05D9\u05D9\u05E2\u05D5\u05E5 \u05DE\u05D1\u05D5\u05E1\u05E1 AI \u05D4\u05E0\u05DE\u05E6\u05D0 \u05D1\u05DE\u05E6\u05D1 \u05D4\u05E8\u05E6\u05D4 (Trial/Beta), \u05D5\u05E2\u05DC \u05DB\u05DF \u05D9\u05D9\u05EA\u05DB\u05E0\u05D5 \u05E9\u05D2\u05D9\u05D0\u05D5\u05EA \u05D0\u05D5 \u05D8\u05E2\u05D5\u05D9\u05D5\u05EA \u05D1\u05D7\u05D9\u05E9\u05D5\u05D1\u05D9\u05DD, \u05D6\u05DE\u05E0\u05D9 \u05D4\u05D2\u05D9\u05D1\u05D5\u05D9 \u05D0\u05D5 \u05DE\u05E4\u05E8\u05D8\u05D9\u05DD. \u05D1\u05D0\u05D7\u05E8\u05D9\u05D5\u05EA \u05D4\u05DE\u05E9\u05EA\u05DE\u05E9 \u05DC\u05D1\u05E6\u05E2 \u05D1\u05D3\u05D9\u05E7\u05D4 \u05E0\u05D5\u05E1\u05E4\u05EA \u05DE\u05D5\u05DC \u05DE\u05E1\u05DE\u05DB\u05D9 \u05D4\u05DE\u05E7\u05D5\u05E8 \u05D4\u05E8\u05E9\u05DE\u05D9\u05D9\u05DD, \u05D5\u05D4\u05D7\u05D1\u05E8\u05D4 \u05D0\u05D9\u05E0\u05D4 \u05E0\u05D5\u05E9\u05D0\u05EA \u05D1\u05D0\u05D7\u05E8\u05D9\u05D5\u05EA \u05DB\u05DC\u05E9\u05D4\u05D9 \u05E2\u05DC \u05EA\u05E9\u05D5\u05D1\u05D5\u05EA \u05D4\u05DE\u05D5\u05D3\u05DC.
6. \u05E9\u05DE\u05D5\u05E8 \u05E2\u05DC \u05E1\u05D2\u05E0\u05D5\u05DF \u05D4\u05E0\u05D3\u05E1\u05D9 \u05DE\u05D4\u05D9\u05DE\u05DF - \u05D0\u05DC \u05EA\u05DE\u05E6\u05D9\u05D0 \u05DE\u05E7"\u05D8\u05D9\u05DD \u05D0\u05D5 \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD \u05E9\u05D0\u05D9\u05E0\u05DD \u05E7\u05D9\u05D9\u05DE\u05D9\u05DD \u05D1\u05E7\u05D8\u05DC\u05D5\u05D2. \u05D0\u05DD \u05DE\u05E9\u05D4\u05D5 \u05D0\u05D9\u05E0\u05D5 \u05E7\u05D9\u05D9\u05DD \u05D1\u05DE\u05D7\u05D9\u05E8\u05D5\u05DF, \u05E6\u05D9\u05D9\u05DF \u05D6\u05D0\u05EA \u05D1\u05E0\u05D9\u05DE\u05D5\u05E1 \u05D5\u05D4\u05E1\u05D1\u05E8 \u05DC\u05DE\u05E9\u05EA\u05DE\u05E9 \u05D0\u05D9\u05DC\u05D5 \u05E9\u05D0\u05DC\u05D5\u05EA \u05E0\u05D9\u05EA\u05DF \u05DC\u05E9\u05D0\u05D5\u05DC \u05D1\u05DE\u05E1\u05D2\u05E8\u05EA \u05D4\u05E7\u05D8\u05DC\u05D5\u05D2 \u05E9\u05DC RBS Telecom.
`;
}
var chatRateLimits = /* @__PURE__ */ new Map();
var LIMIT_WINDOW_MS = 60 * 60 * 1e3;
var MAX_REQUESTS = 30;
app.post("/api/advisor/chat", async (req, res) => {
  try {
    const { message, history = [], forceAI = false } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message content is required" });
    }
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown-ip").split(",")[0].trim();
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
      const remainingMinutes = Math.max(1, Math.ceil((userLimit.resetTime - now) / 6e4));
      return res.json({
        type: "ai_response",
        text: `\u26A0\uFE0F **\u05D4\u05D2\u05E2\u05EA \u05DC\u05DE\u05DB\u05E1\u05EA \u05D4\u05E9\u05D0\u05DC\u05D5\u05EA \u05D4\u05DE\u05D5\u05EA\u05E8\u05EA \u05D1-RBS Expert \u05DC\u05E1\u05D1\u05D1 \u05D6\u05D4.**

\u05E2\u05DC \u05DE\u05E0\u05EA \u05DC\u05E9\u05DE\u05D5\u05E8 \u05E2\u05DC \u05D9\u05E6\u05D9\u05D1\u05D5\u05EA \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05D5\u05DC\u05DE\u05E0\u05D5\u05E2 \u05E2\u05D5\u05DE\u05E1 \u05E2\u05DC \u05DE\u05E9\u05D0\u05D1\u05D9 \u05D4\u05E9\u05E8\u05EA \u05D5\u05DE\u05E4\u05EA\u05D7\u05D5\u05EA \u05D4-API, \u05D4\u05E9\u05D9\u05DE\u05D5\u05E9 \u05D1\u05D9\u05D5\u05E2\u05E5 \u05D4\u05D4\u05E0\u05D3\u05E1\u05D9 \u05DE\u05D5\u05D2\u05D1\u05DC \u05DC\u05E2\u05D3 ${MAX_REQUESTS} \u05E4\u05E0\u05D9\u05D5\u05EA \u05D1\u05E9\u05E2\u05D4 \u05DC\u05DB\u05DC \u05DE\u05E9\u05EA\u05DE\u05E9.

\u05DE\u05DB\u05E1\u05EA \u05D4\u05E4\u05E0\u05D9\u05D5\u05EA \u05E9\u05DC\u05DA \u05EA\u05EA\u05D0\u05E4\u05E1 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u05D1\u05E2\u05D5\u05D3 \u05DB-**${remainingMinutes} \u05D3\u05E7\u05D5\u05EA**. \u05EA\u05D5\u05D3\u05D4 \u05E2\u05DC \u05D4\u05D4\u05D1\u05E0\u05D4 \u05D5\u05D4\u05E1\u05D1\u05DC\u05E0\u05D5\u05EA! \u23F1\uFE0F`,
        sources: []
      });
    }
    userLimit.count += 1;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      return res.json({
        type: "ai_response",
        text: `\u26A0\uFE0F **\u05D7\u05D9\u05D1\u05D5\u05E8 \u05D4-API \u05E9\u05DC Google \u05D0\u05D9\u05E0\u05D5 \u05E4\u05E2\u05D9\u05DC \u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D7\u05E9\u05D1\u05D5\u05E0\u05DA \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA.**

\u05DB\u05D3\u05D9 \u05E9\u05EA\u05D5\u05DB\u05DC \u05DC\u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1-**RBS Expert** (\u05D4\u05D9\u05D5\u05E2\u05E5 \u05D4\u05D4\u05E0\u05D3\u05E1\u05D9 \u05D5\u05D4\u05D8\u05DB\u05E0\u05D9 \u05D4\u05D7\u05DB\u05DD), \u05DE\u05E0\u05D4\u05DC \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D2\u05D3\u05D9\u05E8 \u05D0\u05EA \u05DE\u05E4\u05EA\u05D7 \u05D4-API \u05D4\u05D0\u05D9\u05E9\u05D9 \u05E9\u05DC\u05DB\u05DD \u05D1\u05E4\u05D5\u05E8\u05D8\u05DC \u05D4\u05D1\u05E0\u05D9\u05D9\u05D4:
1. \u05E4\u05EA\u05D7 \u05D0\u05EA \u05EA\u05E4\u05E8\u05D9\u05D8 **Settings** (\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA) \u05D1-AI Studio \u05D1\u05E6\u05D3 \u05D4\u05E2\u05DE\u05D5\u05D3.
2. \u05DC\u05D7\u05E5 \u05E2\u05DC **Secrets** (\u05E1\u05D5\u05D3\u05D5\u05EA \u05D5\u05DE\u05E4\u05EA\u05D7\u05D5\u05EA).
3. \u05D4\u05D5\u05E1\u05E3 \u05E8\u05E9\u05D5\u05DE\u05D4 \u05D7\u05D3\u05E9\u05D4 \u05E2\u05DD \u05D4\u05E9\u05DD \`GEMINI_API_KEY\` \u05D5\u05D4\u05D3\u05D1\u05E7 \u05E9\u05DD \u05D0\u05EA \u05DE\u05E4\u05EA\u05D7 \u05D4-API \u05D4\u05D0\u05D9\u05E9\u05D9 \u05E9\u05E7\u05D9\u05D1\u05DC\u05EA \u05DE-Google AI Studio.

\u05D1\u05E8\u05D2\u05E2 \u05E9\u05EA\u05D2\u05D3\u05D9\u05E8 \u05DE\u05E4\u05EA\u05D7 \u05D6\u05D4, \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05EA\u05EA\u05D7\u05D1\u05E8 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u05DC\u05DC\u05D0 \u05DE\u05D9\u05D3\u05E2 \u05D7\u05E1\u05E8 \u05DC\u05E4\u05D0\u05E0\u05DC! \u2728`,
        sources: []
      });
    }
    const products = await getCatalogDataContext();
    const { matches: relevantProducts, maxScore, tokenCount } = findRelevantProducts(message, products);
    const isStrongMatch = relevantProducts.length > 0 && (maxScore >= 2 || maxScore === 1 && tokenCount <= 3);
    if (!forceAI && isStrongMatch) {
      return res.json({
        type: "direct_products",
        products: relevantProducts.slice(0, 5),
        // Return up to 5 top products directly
        text: "\u05DE\u05E6\u05D0\u05EA\u05D9 \u05D0\u05EA \u05D4\u05DE\u05D5\u05E6\u05E8\u05D9\u05DD \u05D4\u05D1\u05D0\u05D9\u05DD \u05D1\u05E7\u05D8\u05DC\u05D5\u05D2 \u05E9\u05D9\u05DB\u05D5\u05DC\u05D9\u05DD \u05DC\u05D4\u05EA\u05D0\u05D9\u05DD \u05DC\u05E9\u05D0\u05DC\u05EA\u05DA:",
        sources: []
      });
    }
    let catalogSummaryString = "";
    if (relevantProducts.length > 0) {
      catalogSummaryString = relevantProducts.map((p) => {
        let line = `SKU: ${p.sku} | Name: ${p.name} | Category: ${p.category} | Sub: ${p.subcategory} | Desc: ${p.desc}`;
        if (p.specsLink) line += ` | Specs Link: ${p.specsLink}`;
        if (p.manualLink) line += ` | Manual Link: ${p.manualLink}`;
        return line;
      }).join("\n");
    } else {
      catalogSummaryString = products.map((p) => {
        let line = `SKU: ${p.sku} | Name: ${p.name} | Category: ${p.category} | Sub: ${p.subcategory}`;
        return line;
      }).join("\n");
    }
    const systemInstruction = getSystemInstructionTemplate(catalogSummaryString);
    const ai = getGeminiClient();
    const contents = [];
    for (const h of history) {
      contents.push({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.text }]
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });
    const config = {
      systemInstruction
    };
    let response;
    try {
      console.log("Advisor: Attempting gemini-3.5-flash...");
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config
      });
      console.log("Advisor: Successfully generated content using gemini-3.5-flash");
    } catch (primaryError) {
      console.warn("Advisor: gemini-3.5-flash failed, attempting fallback to gemini-3.1-flash-lite...", primaryError.message || primaryError);
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents,
          config
        });
        console.log("Advisor: Successfully generated content using fallback gemini-3.1-flash-lite");
      } catch (liteError) {
        console.error("Advisor: gemini-3.1-flash-lite fallback also failed.", liteError.message || liteError);
        const errorMsg = liteError.message || String(liteError);
        const isQuotaExceeded = errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("quota") || errorMsg.includes("exceeded") || errorMsg.includes("429");
        if (isQuotaExceeded) {
          return res.json({
            type: "ai_response",
            text: `\u{1F6A6} **\u05DE\u05DB\u05E1\u05EA \u05D4\u05E9\u05D9\u05DE\u05D5\u05E9 \u05D1\u05DE\u05E4\u05EA\u05D7 \u05D4-Gemini API \u05E9\u05DC\u05DA \u05D4\u05E1\u05EA\u05D9\u05D9\u05DE\u05D4 \u05D0\u05D5 \u05E0\u05D7\u05E1\u05DE\u05D4 \u05E2\u05DC \u05D9\u05D3\u05D9 \u05D2\u05D5\u05D2\u05DC (RESOURCE_EXHAUSTED).**

**\u05D4\u05E1\u05D1\u05E8 \u05D7\u05E9\u05D5\u05D1 \u2013 \u05DC\u05DE\u05D4 \u05D6\u05D4 \u05E7\u05D5\u05E8\u05D4 \u05D2\u05DD \u05D0\u05DD \u05DC\u05D0 \u05D4\u05E9\u05EA\u05DE\u05E9\u05EA \u05D1\u05D9\u05D5\u05E2\u05E5 \u05D4\u05D9\u05D5\u05DD?**
1. **\u05E1\u05D8\u05D8\u05D5\u05E1 \u05E4\u05E8\u05D5\u05D9\u05E7\u05D8 \u05D5\u05D7\u05E9\u05D1\u05D5\u05DF \u05EA\u05E9\u05DC\u05D5\u05DD (Billing):** \u05DC\u05E2\u05D9\u05EA\u05D9\u05DD \u05E7\u05E8\u05D5\u05D1\u05D5\u05EA, \u05D2\u05D5\u05D2\u05DC \u05DE\u05E1\u05D5\u05D5\u05D2\u05EA \u05DE\u05E4\u05EA\u05D7\u05D5\u05EA \u05DB-RESOURCE_EXHAUSTED \u05D0\u05DD \u05D4\u05E4\u05E8\u05D5\u05D9\u05E7\u05D8 \u05D1\u05D5 \u05D4\u05DD \u05E0\u05D5\u05E6\u05E8\u05D5 \u05D1-Cloud Console \u05D0\u05D9\u05E0\u05D5 \u05E4\u05E2\u05D9\u05DC, \u05E9\u05D9\u05D9\u05DA \u05DC\u05D7\u05E9\u05D1\u05D5\u05DF \u05D0\u05D9\u05E8\u05D5\u05D7 \u05E9\u05D0\u05D9\u05E0\u05D5 \u05D1\u05EA\u05D5\u05E7\u05E3, \u05D0\u05D5 \u05E9\u05D4\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D4\u05DE\u05E7\u05D5\u05E9\u05E8 \u05D0\u05DC\u05D9\u05D5 \u05E4\u05D2 \u05EA\u05D5\u05E7\u05E3, \u05D2\u05DD \u05D0\u05DD \u05DC\u05D0 \u05E0\u05D9\u05E6\u05DC\u05EA \u05D0\u05D7\u05D5\u05D6 \u05E7\u05D8\u05DF \u05DE\u05D4\u05DE\u05DB\u05E1\u05D4 \u05D4\u05D9\u05D5\u05DD.
2. **\u05DE\u05DB\u05E1\u05D5\u05EA \u05E7\u05E9\u05D9\u05D7\u05D5\u05EA \u05E9\u05DC \u05D4\u05E8\u05DE\u05D4 \u05D4\u05D7\u05D9\u05E0\u05DE\u05D9\u05EA:** \u05DE\u05E4\u05EA\u05D7\u05D5\u05EA \u05D7\u05D9\u05E0\u05DE\u05D9\u05D9\u05DD \u05D1-Google AI Studio \u05DE\u05D5\u05D2\u05D1\u05DC\u05D9\u05DD \u05DE\u05D0\u05D5\u05D3 \u05D1\u05E8\u05DE\u05D4 \u05D4\u05D9\u05D5\u05DE\u05D9\u05EA \u05D5\u05D4\u05D7\u05D5\u05D3\u05E9\u05D9\u05EA, \u05D5\u05D4\u05DE\u05DB\u05E1\u05D4 \u05DE\u05EA\u05D0\u05E4\u05E1\u05EA \u05DC\u05E4\u05D9 \u05E9\u05E2\u05D5\u05DF \u05D2\u05D5\u05D2\u05DC \u05D4\u05E2\u05D5\u05DC\u05DE\u05D9 \u05D5\u05DC\u05D0 \u05DC\u05E4\u05D9 \u05D9\u05D5\u05DD \u05E7\u05DC\u05E0\u05D3\u05E8\u05D9 \u05DE\u05E7\u05D5\u05DE\u05D9.
3. **\u05DE\u05E4\u05EA\u05D7 \u05DE\u05E9\u05D5\u05EA\u05E3:** \u05D1\u05DE\u05D9\u05D3\u05D4 \u05D5\u05D4\u05DE\u05E4\u05EA\u05D7 \u05DE\u05E9\u05DE\u05E9 \u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D5\u05EA, \u05E0\u05D9\u05E1\u05D5\u05D9\u05D9\u05DD \u05D0\u05D5 \u05DE\u05E2\u05E8\u05DB\u05D5\u05EA \u05D0\u05D7\u05E8\u05D5\u05EA \u05E9\u05DC\u05DA \u05D0\u05D5 \u05E9\u05DC \u05DE\u05E4\u05EA\u05D7\u05D9\u05DD \u05E0\u05D5\u05E1\u05E4\u05D9\u05DD, \u05E6\u05E8\u05D9\u05DB\u05EA \u05D4\u05D8\u05D5\u05E7\u05E0\u05D9\u05DD \u05DE\u05E9\u05D5\u05EA\u05E4\u05EA \u05D5\u05D4\u05D9\u05D0 \u05D6\u05D5 \u05E9\u05DE\u05D9\u05DC\u05D0\u05D4 \u05D0\u05EA \u05D4\u05DE\u05DB\u05E1\u05D4.

**\u05D0\u05D9\u05DA \u05DC\u05E8\u05D0\u05D5\u05EA \u05D1\u05D3\u05D9\u05D5\u05E7 \u05DE\u05D4 \u05E7\u05E8\u05D4 \u05D5\u05DC\u05E4\u05EA\u05D5\u05E8 \u05D6\u05D0\u05EA \u05DB\u05E2\u05EA?**
\u05D0\u05E0\u05D0 \u05D1\u05E6\u05E2 \u05D0\u05EA \u05D4\u05E9\u05DC\u05D1\u05D9\u05DD \u05D4\u05E4\u05E9\u05D5\u05D8\u05D9\u05DD \u05D4\u05D1\u05D0\u05D9\u05DD \u05DB\u05D3\u05D9 \u05DC\u05D4\u05D7\u05D6\u05D9\u05E8 \u05D0\u05EA \u05D4-Expert \u05DC\u05E4\u05E2\u05D9\u05DC\u05D5\u05EA \u05DE\u05D9\u05D9\u05D3\u05D9\u05EA:
1. **\u05D4\u05E4\u05E7\u05EA \u05DE\u05E4\u05EA\u05D7 \u05D7\u05D3\u05E9 (\u05DE\u05D5\u05DE\u05DC\u05E5 \u05D1\u05D9\u05D5\u05EA\u05E8):** \u05DB\u05E0\u05E1 \u05DC\u05D0\u05EA\u05E8 \u05D4\u05E8\u05E9\u05DE\u05D9 \u05DC\u05D4\u05E4\u05E7\u05EA \u05D4\u05DE\u05E4\u05EA\u05D7\u05D5\u05EA [Google AI Studio](https://aistudio.google.com/) \u05D5\u05E6\u05D5\u05E8 \u05DE\u05E4\u05EA\u05D7 API \u05D7\u05D3\u05E9 \u05DC\u05D7\u05DC\u05D5\u05D8\u05D9\u05DF (\u05D6\u05D4 \u05DC\u05D5\u05E7\u05D7 \u05D3\u05E7\u05D4 \u05D0\u05D7\u05EA \u05D5\u05D4\u05D5\u05D0 \u05D7\u05D9\u05E0\u05DE\u05D9 \u05DC\u05D2\u05DE\u05E8\u05D9).
2. **\u05D4\u05D2\u05D3\u05E8\u05EA \u05D4\u05DE\u05E4\u05EA\u05D7 \u05D4\u05D7\u05D3\u05E9:**
   - \u05D1\u05E2\u05DE\u05D5\u05D3 \u05D4\u05E0\u05D5\u05DB\u05D7\u05D9, \u05E4\u05EA\u05D7 \u05D0\u05EA \u05EA\u05E4\u05E8\u05D9\u05D8 \u05D4-**Settings** (\u05E1\u05DE\u05DC \u05E9\u05DC \u05D2\u05DC\u05D2\u05DC \u05E9\u05D9\u05E0\u05D9\u05D9\u05DD \u05D1\u05E4\u05D9\u05E0\u05D4 \u05D4\u05E9\u05DE\u05D0\u05DC\u05D9\u05EA/\u05E6\u05D3\u05D3\u05D9\u05EA \u05E9\u05DC \u05D4\u05E2\u05DE\u05D5\u05D3).
   - \u05DC\u05D7\u05E5 \u05E2\u05DC **Secrets** (\u05E1\u05D5\u05D3\u05D5\u05EA \u05D5\u05DE\u05E4\u05EA\u05D7\u05D5\u05EA).
   - \u05DE\u05E6\u05D0 \u05D0\u05EA \u05D4\u05E8\u05E9\u05D5\u05DE\u05D4 \u05D1\u05E9\u05DD \`GEMINI_API_KEY\` \u05D5\u05D4\u05D3\u05D1\u05E7 \u05E9\u05DD \u05D0\u05EA \u05D4\u05DE\u05E4\u05EA\u05D7 \u05D4\u05D7\u05D3\u05E9 \u05E9\u05D9\u05E6\u05E8\u05EA (\u05DC\u05DC\u05D0 \u05E8\u05D5\u05D5\u05D7\u05D9\u05DD \u05DC\u05E4\u05E0\u05D9 \u05D0\u05D5 \u05D0\u05D7\u05E8\u05D9).
3. **\u05E9\u05D3\u05E8\u05D5\u05D2 \u05D1\u05DE\u05D9\u05D3\u05EA \u05D4\u05E6\u05D5\u05E8\u05DA:** \u05D1\u05DE\u05D9\u05D3\u05D4 \u05D5\u05D0\u05EA\u05D4 \u05DE\u05E9\u05EA\u05DE\u05E9 \u05D1\u05DE\u05E4\u05EA\u05D7 \u05D1\u05D0\u05D5\u05E4\u05DF \u05E8\u05E6\u05D9\u05E3, \u05DB\u05D3\u05D0\u05D9 \u05DC\u05E9\u05E7\u05D5\u05DC \u05DC\u05D4\u05E2\u05D1\u05D9\u05E8 \u05D0\u05D5\u05EA\u05D5 \u05DC\u05DE\u05D5\u05D3\u05DC **Pay-as-you-go** \u05D1-AI Studio. \u05D4\u05D5\u05D0 \u05DE\u05E6\u05D9\u05E2 \u05EA\u05DE\u05D7\u05D5\u05E8 \u05D6\u05D5\u05DC \u05D1\u05D9\u05D5\u05EA\u05E8 (\u05D7\u05DC\u05E7\u05D9 \u05E1\u05E0\u05D8 \u05DC\u05E4\u05DC\u05D9\u05D8\u05D4) \u05D5\u05DE\u05E1\u05D9\u05E8 \u05DC\u05D7\u05DC\u05D5\u05D8\u05D9\u05DF \u05D0\u05EA \u05DB\u05DC \u05D7\u05E1\u05D9\u05DE\u05D5\u05EA \u05D4\u05E7\u05E6\u05D1 \u05D5\u05DE\u05DB\u05E1\u05D5\u05EA \u05D4\u05D7\u05D9\u05E0\u05DD \u05E9\u05DC \u05D2\u05D5\u05D2\u05DC!`,
            sources: []
          });
        }
        return res.json({
          type: "ai_response",
          text: `\u26A0\uFE0F **\u05D7\u05D9\u05D1\u05D5\u05E8 \u05D4-AI \u05E0\u05DB\u05E9\u05DC \u05D1\u05E4\u05E0\u05D9\u05D9\u05D4 \u05DC\u05E9\u05E8\u05EA\u05D9 Google.**

**\u05D4\u05E6\u05E2\u05D5\u05EA \u05DC\u05E4\u05EA\u05E8\u05D5\u05DF \u05DC\u05E2\u05D1\u05D5\u05D3\u05D4 \u05E2\u05DD RBS Expert:**
1. \u05E4\u05EA\u05D7 \u05D0\u05EA \u05EA\u05E4\u05E8\u05D9\u05D8 \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05D4-**Secrets** \u05E9\u05DC \u05D4\u05E4\u05E8\u05D5\u05D9\u05E7\u05D8 \u05D1-AI Studio.
2. \u05D5\u05D3\u05D0 \u05E9\u05D4\u05D5\u05E1\u05E4\u05EA \u05D0\u05EA \u05D4\u05DE\u05E9\u05EA\u05E0\u05D4 \`GEMINI_API_KEY\` \u05E2\u05DD \u05DE\u05E4\u05EA\u05D7 API \u05EA\u05E7\u05D9\u05DF \u05D5\u05E4\u05E2\u05D9\u05DC.
3. \u05D5\u05D3\u05D0 \u05E9\u05D0\u05D9\u05DF \u05E8\u05D5\u05D5\u05D7\u05D9\u05DD \u05DE\u05D9\u05D5\u05EA\u05E8\u05D9\u05DD \u05D1\u05D4\u05EA\u05D7\u05DC\u05D4 \u05D0\u05D5 \u05D1\u05E1\u05D5\u05E3 \u05E9\u05DC \u05D4\u05DE\u05E4\u05EA\u05D7.`,
          sources: []
        });
      }
    }
    const textOutput = response.text || "\u05E1\u05DC\u05D9\u05D7\u05D4, \u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05EA\u05D9 \u05DC\u05E2\u05D1\u05D3 \u05D0\u05EA \u05D4\u05EA\u05E9\u05D5\u05D1\u05D4. \u05D0\u05E0\u05D0 \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1.";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = groundingChunks.map((chunk) => ({
      title: chunk.web?.title || "\u05DE\u05E7\u05D5\u05E8 \u05DE\u05D9\u05D3\u05E2 \u05D7\u05D9\u05E6\u05D5\u05E0\u05D9",
      uri: chunk.web?.uri || ""
    })).filter((s) => s.uri);
    res.json({
      type: "ai_response",
      text: textOutput,
      sources: webSources
    });
  } catch (error) {
    console.error("Gemini Advisor Endpoint Error:", { code: error.code || "UNKNOWN" });
    res.status(500).json({
      error: "Error processing request",
      details: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05D4\u05E7\u05D8\u05DC\u05D5\u05D2. \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1."
    });
  }
});
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    hasApiKey: !!process.env.GEMINI_API_KEY,
    apiKeyLength: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0
  });
});
var sheetsCacheMap = /* @__PURE__ */ new Map();
var CACHE_TTL_SHEETS_MS = 45 * 1e3;
var SENSITIVE_COLS_SERVER = ["\u05DE\u05D7\u05D9\u05E8 \u05E2\u05DC\u05D5\u05EA", "\u05DE\u05D7\u05D9\u05E8 \u05E1\u05D9\u05D8\u05D5\u05E0\u05D0\u05D5\u05EA", "\u05DE\u05D7\u05D9\u05E8 \u05E1\u05D9\u05D8\u05D5\u05E0\u05D0\u05D9"];
var FIREBASE_JWKS_SERVER = (0, import_jose2.createRemoteJWKSet)(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
async function isAgentOrManagerServer(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  const token = authHeader.substring(7);
  try {
    const { payload } = await (0, import_jose2.jwtVerify)(token, FIREBASE_JWKS_SERVER, {
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
    const data = await res.json();
    const role = data.fields?.role?.stringValue;
    return role === "agent" || role === "sales_manager";
  } catch (err) {
    console.warn("Express: Token or role verification failed:", err);
    return false;
  }
}
function stripSensitiveColumnsServer(csv) {
  const parsed = import_papaparse2.default.parse(csv, { skipEmptyLines: false });
  const rows = parsed.data || [];
  if (!rows.length || !Array.isArray(rows[0])) return csv;
  const header = rows[0];
  const dropIdx = /* @__PURE__ */ new Set();
  header.forEach((c, i) => {
    if (SENSITIVE_COLS_SERVER.includes(String(c).trim())) dropIdx.add(i);
  });
  if (dropIdx.size === 0) return csv;
  const out = rows.filter((r) => !(r.length === 1 && r[0] === "")).map((r) => r.filter((_, i) => !dropIdx.has(i)));
  return import_papaparse2.default.unparse(out);
}
app.get("/api/sheets", async (req, res) => {
  const { gid, limit, offset } = req.query;
  if (!gid) {
    return res.status(400).json({ error: "Missing GID parameter" });
  }
  const bypassCache = req.query.bypass_cache === "true";
  const authorized = await isAgentOrManagerServer(req.headers.authorization);
  const cacheKey = `${gid}_${limit || ""}_${offset || ""}_${authorized ? "auth" : "guest"}`;
  if (!bypassCache) {
    const cached = sheetsCacheMap.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_SHEETS_MS) {
      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      return res.status(200).send(cached.text);
    }
  }
  try {
    let csvString = await fetchSheetDataV4(String(gid), limit, offset);
    if (!authorized) {
      csvString = stripSensitiveColumnsServer(csvString);
    }
    if (!bypassCache) {
      sheetsCacheMap.set(cacheKey, {
        text: csvString,
        timestamp: Date.now()
      });
    } else {
      sheetsCacheMap.clear();
      try {
        catalogCache = null;
      } catch (e) {
      }
    }
    if (bypassCache) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    } else {
      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    return res.status(200).send(csvString);
  } catch (error) {
    console.error("Express sheets proxy error:", error);
    return res.status(502).json({ error: "Data source unavailable or misconfigured." });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        port: 3e3
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api/")) {
        return next();
      }
      const url = req.originalUrl;
      try {
        let template = import_fs.default.readFileSync(import_path.default.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}
startServer();
