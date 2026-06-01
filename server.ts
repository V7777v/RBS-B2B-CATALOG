import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import Papa from "papaparse";
import fs from "fs";

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

// Helper to fetch and parse Google Sheet as CSV
async function fetchSheetCSV(gid: string): Promise<any[]> {
  const url = `${SHEET_URL}/gviz/tq?tqx=out:csv&gid=${gid}&_=${Date.now()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet GID ${gid}: ${response.statusText}`);
  }
  const text = await response.text();
  return new Promise((resolve) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: () => {
        resolve([]);
      }
    });
  });
}

// Function to pull all products and catalogs
async function getCatalogDataContext(): Promise<any[]> {
  try {
    const now = Date.now();
    if (catalogCache && (now - catalogCache.lastFetchedAt < CACHE_TTL_MS)) {
      return catalogCache.products;
    }

    const [productsRaw, catalogsRaw] = await Promise.all([
      fetchSheetCSV(PRODUCTS_GID),
      fetchSheetCSV(CATALOGS_GID)
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

// Lazy init Gemini client with fail-fast check
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined in the environment secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// API endpoint to serve chat requests safely
app.post("/api/advisor/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // 1. Get complete context from RBS catalog
    const products = await getCatalogDataContext();

    // 2. Format a compact summary of relevant catalog data for Gemini to keep token counts efficient
    const catalogSummaryString = products.map(p => {
      let line = `SKU: ${p.sku} | Name: ${p.name} | Category: ${p.category} | Sub: ${p.subcategory} | Desc: ${p.desc}`;
      if (p.specsLink) line += ` | Specs Link: ${p.specsLink}`;
      if (p.manualLink) line += ` | Manual Link: ${p.manualLink}`;
      return line;
    }).join("\n");

    const systemInstruction = `
אתה הקופיילוט והיועץ הטכני החכם והרשמי של פורטל B2B של חברת RBS Telecom (אר.בי.אס טלקום).
תפקידך לסייע לטכנאים, מהנדסי תקשורת, קבלנים, אינטגרטורים ולקוחות קצה לתכנן מערכות, לחשב מפרטים טכניים ולשאול ולשאול כל שאלה הנדסית, מוצרים ותאימות מתוך הקטלוג.

יש לך גישה ישירה ומלאה לכל מפרטי המוצרים והמלאי הפעילים של החברה, הנה המחירון הנוכחי שלנו:
---
${catalogSummaryString}
---

עקרונות המענה שלך:
1. ענה תמיד בעברית מקצועית, אדיבה וברורה.
2. תמיכה רחבה ומלאה:
   - שאלות על UPS, הספקים, או AP הן רק דוגמה. עליך לתת מענה ולענות על *כל דבר* - כל שאילתה טכנית, מידע על ארונות תקשורת, תלת פאזי, מגשרים, סיבים אופטיים, הזנות מתח, מתגים, מפרטים, או תאימות.
3. קישורים לדפי נתונים ומדריכים (Datasheets & Manuals):
   - לכל מוצר בקטלוג עשויים להיות קישורים משויכים: "Specs Link" (מפרט טכני) ו/או "Manual Link" (מדריך למשתמש).
   - אם משתמש שואל על מוצר, מפרט שלו או מחפש קובץ מדריך/דף נתונים, ועבור המוצר המתאים קיים Specs Link או Manual Link במאגר המוצרים שקיבלת לעיל, עליך להציג את הקישורים הללו במפורש ובצורה בולטת כקישורי Markdown בעברית!
     (לדוגמה: "[📄 לצפייה בדף מפרט טכני של המוצר](קישור)")
   - אם משהו אינו קיים ישירות בקטלוג שלך, בצע חיפוש באינטרנט (באמצעות כלי Google Search Grounding הקיים ברשותך) כדי למצוא נתוני מפרט רשמיים / הגיוניים, וקשר למקורות המידע.
4. דיסקליימר והתנערות מאחריות:
   - בכל תשובה חשובה (או בתחילת התשובה), הדגש תמיד בקצרה שמדובר בייעוץ מבוסס AI הנמצא במצב הרצה (Trial/Beta), ועל כן ייתכנו שגיאות או טעויות בחישובים, זמני הגיבוי או מפרטים. באחריות המשתמש לבצע בדיקה נוספת מול מסמכי המקור הרשמיים, והחברה אינה נושאת באחריות כלשהי על תשובות המודל.
5. שמור על סגנון הנדסי מהימן - אל תמציא מק"טים או מוצרים שאינם קיימים בקטלוג. אם משהו אינו קיים במחירון, ציין זאת בנימוס והצע את החלופה הקרובה ביותר או פתרון הנדסי אחר, תוך שימוש בידע הרחב שלך ובחיפוש ברשת.
`;

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

    let response;
    // Multi-layer fallback logic to guarantee service uptime:
    // Layer 1: gemini-3.5-flash with googleSearch grounding (for real-time data)
    // Layer 2: gemini-3.5-flash standard (if grounding is out of quota - 429)
    // Layer 3: gemini-3.1-flash-lite standard (if 3.5-flash is overloaded - 503)
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }]
        }
      });
    } catch (searchError: any) {
      console.warn("Advisor: Layer 1 (gemini-3.5-flash with search) failed, falling back to Layer 2 standard:", searchError.message || searchError);
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: contents,
          config: {
            systemInstruction
          }
        });
      } catch (standardError: any) {
        console.warn("Advisor: Layer 2 (gemini-3.5-flash standard) failed, falling back to Layer 3 (gemini-3.1-flash-lite standard):", standardError.message || standardError);
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: contents,
          config: {
            systemInstruction
          }
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
      text: textOutput,
      sources: webSources
    });

  } catch (error: any) {
    console.error("Gemini Advisor Endpoint Error:", error);
    res.status(500).json({ 
      error: "Error processing request", 
      details: error.message || error
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
