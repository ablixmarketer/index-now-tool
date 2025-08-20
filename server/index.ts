import { createServer } from "vite";
import express from "express";
import { readFileSync } from "fs";
import path from "path";
import cors from "cors";
import "dotenv/config";

// Import API handlers
import { handleDemo } from "./routes/demo";
import { handleSitemapScan } from "./routes/sitemap";
import { handleBulkPing, handleSinglePing, handleKeyVerification } from "./routes/indexnow";

export async function createApp() {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    // Serve static files from dist/spa
    app.use(express.static(path.join(process.cwd(), "dist/spa")));
    
    // Serve index.html for all non-API routes (SPA)
    app.get("*", (req, res) => {
      const indexPath = path.join(process.cwd(), "dist/spa/index.html");
      res.sendFile(indexPath);
    });
  } else {
    // Development mode - integrate with Vite
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    
    app.use(vite.ssrFixStacktrace);
    app.use(vite.middlewares);
  }

  return app;
}

// Export for vite config
export const createServer = createApp;

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = process.env.API_PORT || 3001;
  
  createApp().then(app => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      if (process.env.INDEXNOW_KEY) {
        console.log(`IndexNow key configured: ${process.env.INDEXNOW_KEY.slice(0, 8)}...`);
      } else {
        console.log('⚠️  IndexNow key not configured. Set INDEXNOW_KEY environment variable.');
      }
    });
  }).catch(console.error);
}
