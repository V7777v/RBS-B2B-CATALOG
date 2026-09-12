import fs from 'fs';

let content = fs.readFileSync('api/advisor/chat.ts', 'utf-8');

// We need to add verifiedEmail to chat.ts
const importsToAdd = `import { jwtVerify, createRemoteJWKSet } from "jose";\nimport crypto from "crypto";\n`;
if (!content.includes('crypto from "crypto"')) {
    content = content.replace('import { GoogleGenAI } from "@google/genai";', `import { GoogleGenAI } from "@google/genai";\nimport crypto from "crypto";`);
}

const authFunctions = `
// --- Firebase Auth & Quota ---
const FIREBASE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
const FIREBASE_PROJECT_ID = "rbs-b2b";

async function verifiedEmail(idToken: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
      issuer: \`https://securetoken.google.com/\${FIREBASE_PROJECT_ID}\`,
      audience: FIREBASE_PROJECT_ID
    });
    return payload.email ? String(payload.email) : null;
  } catch (e) {
    return null;
  }
}

async function getUserRole(email: string, saTok: string): Promise<string | null> {
  try {
    const fsUrl = \`https://firestore.googleapis.com/v1/projects/\${FIREBASE_PROJECT_ID}/databases/(default)/documents/approvedDistributors/\${encodeURIComponent(email)}\`;
    const fsRes = await fetch(fsUrl, { headers: { Authorization: \`Bearer \${saTok}\` } });
    if (fsRes.ok) {
      const doc: any = await fsRes.json();
      return (doc?.fields?.role?.stringValue || "").trim().toLowerCase();
    }
  } catch (e) {}
  return null;
}

// Quota Management
import { getGoogleToken } from "../_lib/googleSheets.js";

async function getQuotaUsage(quotaId: string, saTok: string): Promise<number> {
  try {
    const url = \`https://firestore.googleapis.com/v1/projects/\${FIREBASE_PROJECT_ID}/databases/(default)/documents/quotas/\${encodeURIComponent(quotaId)}\`;
    const res = await fetch(url, { headers: { Authorization: \`Bearer \${saTok}\` } });
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
    const url = \`https://firestore.googleapis.com/v1/projects/\${FIREBASE_PROJECT_ID}/databases/(default)/documents/quotas/\${encodeURIComponent(quotaId)}?updateMask.fieldPaths=count\`;
    await fetch(url, {
      method: "PATCH",
      headers: { Authorization: \`Bearer \${saTok}\`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { count: { integerValue: String(newCount) } } })
    });
  } catch (e) {
    console.error("Failed to increment quota for", quotaId, e);
  }
}
`;

content = content.replace('// App Check token verification', authFunctions + '\n// App Check token verification');

// Now we need to update the handler logic
// First, extract what's inside handler
const handlerStart = content.indexOf('export default async function handler(req: VercelRequest, res: VercelResponse) {');
const handlerEnd = content.lastIndexOf('}');

const oldHandler = content.slice(handlerStart);
const newHandler = `export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    let quotaId = \`guest_\${ip.replace(/[^a-zA-Z0-9]/g, '_')}\`;
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
          quotaId = \`agent_\${email.replace(/[^a-zA-Z0-9]/g, '_')}\`;
        }
      }
    }
    
    if (!isAgentView) {
      // For guests, use the explicit guest-id if provided to separate users on the same NAT/IP
      const guestId = (req.headers["x-guest-id"] || "").toString().replace(/[^a-zA-Z0-9-]/g, '');
      if (guestId) {
         quotaId = \`guest_\${guestId}\`;
      }
    }
    
    // Append today's date to quota document ID
    const todayStr = new Date().toISOString().slice(0, 10);
    const quotaDocId = \`\${quotaId}_\${todayStr}\`;
    
    let currentUsage = 0;
    if (saTok) {
      currentUsage = await getQuotaUsage(quotaDocId, saTok);
      if (currentUsage >= dailyLimit) {
        res.setHeader("Retry-After", "86400");
        return res.status(429).json({ 
          error: "QUOTA_EXCEEDED", 
          message: \`הגעת למכסת השאלות היומית (\${dailyLimit}). ניתן להמשיך מחר\${!isAgentView ? ', או להתחבר לקבלת מכסה גדולה יותר.' : '.'}\`,
          quotaInfo: { current: currentUsage, limit: dailyLimit }
        });
      }
    }

    const products = await getCatalogDataContext(requestId);
    const { matches: relevantProducts, maxScore, tokenCount } = findRelevantProducts(message, products);

    const isStrongMatch = relevantProducts.length > 0 && (maxScore >= 2 || (maxScore === 1 && tokenCount <= 3));
    if (!forceAI && isStrongMatch) {
      return res.json({
        type: "direct_products",
        products: relevantProducts.slice(0, 5),
        text: "מצאתי את המוצרים הבאים בקטלוג שיכולים להתאים לשאלתך:",
        sources: [],
        quotaInfo: { current: currentUsage, limit: dailyLimit } // Direct products don't cost AI quota!
      });
    }

    let catalogSummaryString = relevantProducts.length > 0 
      ? relevantProducts.map(p => \`SKU: \${p.sku} | Name: \${p.name} | Category: \${p.category} | Sub: \${p.subcategory} | Desc: \${p.desc}\${p.price ? ' | Price: ₪'+Math.round(p.price) : ''}\`).join("\\n")
      : products.map(p => \`SKU: \${p.sku} | Name: \${p.name} | Category: \${p.category} | Sub: \${p.subcategory}\`).join("\\n");

    let systemInstruction = getSystemInstructionTemplate(catalogSummaryString);
    if (!isAgentView) {
      systemInstruction += "\\n\\n--- מצב אורח (מתקין) ---\\nהמשתמש הוא מתקין. ענה אך ורק על שאלות הקשורות למוצרי הקטלוג של RBS Telecom: מפרטים טכניים, התאמה בין מוצרים, אביזרים נלווים, התקנה ושימוש. אם השאלה אינה קשורה לקטלוג של RBS (נושאים כלליים שאינם מוצרי החברה) — סרב בנימוס והסבר אילו שאלות ניתן לשאול במסגרת הקטלוג.";
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
           return res.json({ type: "ai_response", text: "🚦 **מכסת השימוש במפתח ה-Gemini API הסתיימה...**", sources: [] });
        }
        return res.json({ type: "ai_response", text: "⚠️ **חיבור ה-AI נכשל בפנייה לשרתי Google.**", sources: [] });
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
`;

content = content.replace(oldHandler, newHandler);

fs.writeFileSync('api/advisor/chat.ts', content);
