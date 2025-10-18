import express from "express";
import { readFileSync } from "fs";
import path from "path";
import cors from "cors";
import "dotenv/config";

// Import API handlers
import { handleDemo } from "./routes/demo";
import { handleSitemapScan } from "./routes/sitemap";
import {
  handleBulkPing,
  handleSinglePing,
  handleKeyVerification,
} from "./routes/indexnow";

export async function createApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Health check
  app.get("/api/ping", (req, res) => {
    res.json({ message: "pong", timestamp: new Date().toISOString() });
  });

  // Existing demo route
  app.get("/api/demo", handleDemo);

  // IndexNow Console API routes
  app.post("/api/sitemap/scan", handleSitemapScan);
  app.post("/api/indexnow/bulk", handleBulkPing);
  app.post("/api/indexnow/single", handleSinglePing);
  app.post("/api/indexnow/verify-key", handleKeyVerification);

  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    // In Netlify Functions, the SPA is served by Netlify's static hosting
    // The function only handles API requests
    // Return 404 for non-API requests (Netlify will serve static files)
    app.use((req, res) => {
      if (!req.path.startsWith("/api/")) {
        res.status(404).json({ error: "Not found" });
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
