import type { VercelRequest, VercelResponse } from "@vercel/node";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1NtYwQeTX3blf0aMcvtnlk9liIaJOiG9BOsP4Qc8lSRs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers for secure API access
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { gid, limit, offset } = req.query;

  if (!gid) {
    return res.status(400).json({ error: "Missing GID parameter in the request query." });
  }

  try {
    // Construct Google Sheets Visualization query URL
    let url = `${SHEET_URL}/gviz/tq?tqx=out:csv&gid=${gid}`;
    
    if (limit !== undefined && offset !== undefined) {
      const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 0, 0), 5000);
      const safeOffset = Math.max(parseInt(String(offset), 10) || 0, 0);
      url += `&tq=${encodeURIComponent(`SELECT * LIMIT ${safeLimit} OFFSET ${safeOffset}`)}`;
    }

    // Add random query param in backend ONLY to prevent Google from returning stale Gviz results internally if the spreadsheet changed
    url += `&_=${Date.now()}`;

    // Fetch the data from Google Sheets in the background on the server
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RBS-B2B-Proxy"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Google Sheets API returned an error: ${response.statusText}` 
      });
    }

    const text = await response.text();

    // Check if client requested direct sync to bypass cache
    const bypassCache = req.query.bypass_cache === "true";

    if (bypassCache) {
      // Force immediate cache invalidation across all CDNs and browsers
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    } else {
      // Set Vercel Edge Serverless Cache Headers:
      // - s-maxage=600: Cache on Vercel's global CDN nodes for exactly 10 minutes
      // - stale-while-revalidate=1200: Keep serving cached values instantly during the next 20 mins while updating in the background safely
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=1200");
    }
    
    // Return identical CSV text as Google Sheets to guarantee zero clientside breaking changes
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    return res.status(200).send(text);

  } catch (error: any) {
    console.error("Vercel CDN Sheets Proxy Error:", error);
    return res.status(500).json({ 
      error: error.message || "Failed to proxy Google Sheet safely." 
    });
  }
}
