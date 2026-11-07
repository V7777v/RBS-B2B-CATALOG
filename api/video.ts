import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Readable } from "stream";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Anti-hotlinking protection: prevent external sites/bots from draining Vercel bandwidth
  const reqHost = String(req.headers.host || "").trim();
  const sourceHeader = String(req.headers.referer || req.headers.origin || "").trim();
  if (reqHost && sourceHeader) {
    try {
      const sourceHost = new URL(sourceHeader).host;
      if (sourceHost && sourceHost !== reqHost) {
        return res.status(403).json({ error: "Forbidden external hotlink" });
      }
    } catch {
      return res.status(403).json({ error: "Forbidden" });
    }
  }

  const fileId = typeof req.query.id === "string" ? req.query.id.trim() : "";
  if (!fileId || !/^[a-zA-Z0-9_-]{10,120}$/.test(fileId)) {
    return res.status(400).json({ error: "Invalid or missing Google Drive file ID" });
  }

  const driveDownloadUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;

  const upstreamHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "video/*,*/*;q=0.8",
  };

  if (typeof req.headers.range === "string" && req.headers.range) {
    upstreamHeaders["Range"] = req.headers.range;
  }

  const controller = new AbortController();
  req.on("close", () => {
    try {
      controller.abort();
    } catch {}
  });

  try {
    const upstreamRes = await fetch(driveDownloadUrl, {
      method: req.method,
      headers: upstreamHeaders,
      redirect: "follow",
      signal: controller.signal,
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return res.status(upstreamRes.status).json({
        error: `Upstream video responded with HTTP ${upstreamRes.status}`,
      });
    }

    const rawContentType = upstreamRes.headers.get("content-type") || "video/mp4";
    // If Google Drive returns an HTML warning page instead of binary media, fail fast so client can fallback to iframe
    if (rawContentType.includes("text/html")) {
      return res.status(422).json({ error: "Upstream returned HTML instead of video stream" });
    }

    const contentType =
      rawContentType.includes("video/") || rawContentType.includes("audio/")
        ? rawContentType
        : "video/mp4";

    res.status(upstreamRes.status);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Accept-Ranges", upstreamRes.headers.get("accept-ranges") || "bytes");
    // Cache 7 days in browser + 30 days in Vercel Edge CDN so loops & repeat views cost 0 serverless invocations
    res.setHeader(
      "Cache-Control",
      "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=2592000, immutable",
    );
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

    const contentLength = upstreamRes.headers.get("content-length");
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    const contentRange = upstreamRes.headers.get("content-range");
    if (contentRange) {
      res.setHeader("Content-Range", contentRange);
    }

    if (req.method === "HEAD" || !upstreamRes.body) {
      return res.end();
    }

    const nodeStream = Readable.fromWeb(upstreamRes.body as any);
    nodeStream.on("error", () => {
      try {
        if (!res.headersSent) res.status(502).end();
        else res.end();
      } catch {}
    });
    nodeStream.pipe(res);
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return;
    }
    console.error("[api/video] Error streaming video:", err?.message || err);
    if (!res.headersSent) {
      return res.status(502).json({ error: "Failed to stream video" });
    }
  }
}
