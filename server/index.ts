import express from "express";
import { readFileSync } from "fs";
import path from "path";
import cors from "cors";
import "dotenv/config";
import { fileURLToPath } from "url";
import { siteMiddleware } from "./middleware/site-middleware";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import API handlers
import { handleDemo } from "./routes/demo";
import { handleSitemapScan } from "./routes/sitemap";
import {
  handleBulkPing,
  handleSinglePing,
  handleKeyVerification,
} from "./routes/indexnow";
import {
  handleSingleBingUrlSubmission,
  handleBulkBingUrlSubmission,
} from "./routes/bing-url-submission";
import {
  handleSingleBingContentSubmission,
  handleBulkBingContentSubmission,
} from "./routes/bing-content-submission";

export async function createApp() {
  const app = express();

  // Middleware - must be before routes
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(siteMiddleware);

  // Debug middleware
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      const bodyStr = req.body ? JSON.stringify(req.body) : '{}';
      console.log(`[API] ${req.method} ${req.path}`, {
        contentType: req.headers["content-type"],
        bodySize: bodyStr.length,
        body: req.body,
      });
    }
    next();
  });

  // Health check
  app.get("/api/ping", (req, res) => {
    res.json({ message: "pong", timestamp: new Date().toISOString() });
  });

  // Site configuration endpoint
  app.get("/api/config", (req, res) => {
    const config = {
      domain: process.env.INDEXNOW_KEY_LOCATION?.split("//")[1]?.split("/")[0] || "",
      indexNowKey: process.env.INDEXNOW_KEY || "",
      indexNowKeyLocation: process.env.INDEXNOW_KEY_LOCATION || "",
      bingApiKey: process.env.BING_SUBMISSION_API_KEY || "",
    };
    res.json(config);
  });

  // Existing demo route
  app.get("/api/demo", handleDemo);

  // IndexNow Console API routes
  app.post("/api/sitemap/scan", handleSitemapScan);
  app.post("/api/indexnow/bulk", handleBulkPing);
  app.post("/api/indexnow/single", handleSinglePing);
  app.post("/api/indexnow/verify-key", handleKeyVerification);

  // Bing URL Submission API routes
  app.post("/api/bing/submit-urls/single", handleSingleBingUrlSubmission);
  app.post("/api/bing/submit-urls/bulk", handleBulkBingUrlSubmission);

  // Bing Content Submission API routes
  app.post("/api/bing/submit-content/single", handleSingleBingContentSubmission);
  app.post("/api/bing/submit-content/bulk", handleBulkBingContentSubmission);

  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    // Production: serve compiled SPA from dist/spa
    // __dirname points to dist/server/ after build
    // So we need to go up 2 levels to reach dist/, then into spa/
    const spaPath = path.resolve(__dirname, '../../spa');
    const indexPath = path.join(spaPath, 'index.html');

    console.log('[SERVER] Production mode');
    console.log('[SERVER] __dirname:', __dirname);
    console.log('[SERVER] SPA path:', spaPath);
    console.log('[SERVER] Index.html path:', indexPath);

    // Serve static files with caching headers
    app.use(express.static(spaPath, {
      maxAge: '1d',
      etag: true,
    }));

    // SPA fallback: serve index.html for all non-API routes
    app.use((req, res, next) => {
      if (!req.path.startsWith('/api/')) {
        console.log(`[SERVER] Serving SPA for ${req.path}`);
        res.sendFile(indexPath, (err) => {
          if (err) {
            console.error('[SERVER] Error serving index.html:', {
              error: err.message,
              code: err.code,
              path: indexPath,
              requiredPath: req.path,
            });
            if (!res.headersSent) {
              res.status(500).json({ error: 'Internal Server Error' });
            }
          }
        });
      } else {
        next();
      }
    });
  } else {
    // Development mode - integrate with Vite (dynamic import to avoid bundling in functions)
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.ssrFixStacktrace);
    app.use(vite.middlewares);
  }

  return app;
}

// Export for vite config
export const createServer = createApp;

// Start server if this file is run directly
// Note: import.meta.url check removed for Netlify compatibility
if (
  typeof process !== "undefined" &&
  process.argv &&
  process.argv[1] &&
  process.argv[1].includes("server/index")
) {
  const PORT = process.env.API_PORT || 3001;

  createApp()
    .then((app) => {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
        if (process.env.INDEXNOW_KEY) {
          console.log(
            `IndexNow key configured: ${process.env.INDEXNOW_KEY.slice(0, 8)}...`,
          );
        } else {
          console.log(
            "⚠️  IndexNow key not configured. Set INDEXNOW_KEY environment variable.",
          );
        }
      });
    })
    .catch(console.error);
}
