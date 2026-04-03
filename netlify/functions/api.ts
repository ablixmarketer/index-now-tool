import serverless from "serverless-http";
import express from "express";
import cors from "cors";

// Import route handlers that don't require jsdom
import { handleDemo } from "../../server/routes/demo";
import { handleSitemapScan } from "../../server/routes/sitemap";
import {
  handleBulkPing,
  handleSinglePing,
  handleKeyVerification,
} from "../../server/routes/indexnow";
import {
  handleSingleBingUrlSubmission,
  handleBulkBingUrlSubmission,
} from "../../server/routes/bing-url-submission";

let cachedHandler: any;

async function createApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Routes that work in Netlify Functions (no jsdom dependency)
  app.get("/api/ping", (req, res) => {
    res.json({ message: "pong", timestamp: new Date().toISOString() });
  });

  app.get("/api/demo", handleDemo);
  app.post("/api/sitemap/scan", handleSitemapScan);
  app.post("/api/indexnow/bulk", handleBulkPing);
  app.post("/api/indexnow/single", handleSinglePing);
  app.post("/api/indexnow/verify-key", handleKeyVerification);
  app.post("/api/bing/submit-urls/single", handleSingleBingUrlSubmission);
  app.post("/api/bing/submit-urls/bulk", handleBulkBingUrlSubmission);

  // Note: Bing Content Submission routes (which require jsdom) are not available
  // in Netlify Functions. They can be accessed via the static site's API
  // or deployed separately using a different hosting provider.

  app.use((req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  return app;
}

export const handler = async (event: any, context: any) => {
  try {
    if (!cachedHandler) {
      const app = await createApp();
      cachedHandler = serverless(app);
    }
    return cachedHandler(event, context);
  } catch (error) {
    console.error("Handler error:", error);
    return {
      statusCode: 502,
      body: JSON.stringify({
        error: "Internal server error",
        details: String(error),
      }),
    };
  }
};
