import { RequestHandler } from "express";
import pLimit from "p-limit";
import {
  BulkPingRequestSchema,
  SinglePingRequestSchema,
  type BulkPingResponse,
  type PingResult,
  statusToMeaning,
  engines,
} from "../../shared/indexnow";

// Environment variables
const INDEXNOW_KEY =
  process.env.INDEXNOW_KEY || "558e9f294e5246d2993e4eaed06e54b4";
const INDEXNOW_KEY_LOCATION = process.env.INDEXNOW_KEY_LOCATION;
const INDEXNOW_ENDPOINT =
  process.env.INDEXNOW_ENDPOINT || "https://api.indexnow.org/indexnow";

const limit = pLimit(5);

export const handleBulkPing: RequestHandler = async (req, res) => {
  try {
    // Handle Buffer body from serverless-http
    let bodyData = req.body;
    if (Buffer.isBuffer(bodyData)) {
      bodyData = JSON.parse(bodyData.toString("utf-8"));
    }

    const validation = BulkPingRequestSchema.safeParse(bodyData);

    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { urls, engines: selectedEngines, mode } = validation.data;

    console.log('[INDEXNOW BULK] Request received');
    console.log(`[INDEXNOW BULK] URLs count: ${urls.length}`);
    console.log(`[INDEXNOW BULK] Selected engines: ${selectedEngines.join(', ')}`);
    console.log(`[INDEXNOW BULK] Mode: ${mode}`);
    console.log(`[INDEXNOW BULK] First 3 URLs:`, urls.slice(0, 3));

    if (!INDEXNOW_KEY) {
      console.error('[INDEXNOW BULK] Error: INDEXNOW_KEY not configured');
      return res.status(400).json({
        error: "IndexNow key not configured",
        message: "INDEXNOW_KEY environment variable is required",
      });
    }

    if (!INDEXNOW_KEY_LOCATION) {
      console.error('[INDEXNOW BULK] Error: INDEXNOW_KEY_LOCATION not configured');
      return res.status(400).json({
        error: "IndexNow key location not configured",
        message: "INDEXNOW_KEY_LOCATION environment variable is required",
      });
    }

    // Verify key file exists before proceeding
    try {
      const keyFileUrl = `${INDEXNOW_KEY_LOCATION}/${INDEXNOW_KEY}.txt`;
      console.log(`[INDEXNOW BULK] Verifying key at: ${keyFileUrl}`);
      const keyCheckResponse = await fetch(keyFileUrl);

      if (!keyCheckResponse.ok) {
        console.error(`[INDEXNOW BULK] Key file verification failed: ${keyCheckResponse.status}`);
        return res.status(400).json({
          error: "IndexNow key verification failed",
          message: `Key file not found at ${keyFileUrl}. Please upload your key file.`,
          keyFileUrl,
        });
      }

      const keyContent = await keyCheckResponse.text();
      if (keyContent.trim() !== INDEXNOW_KEY) {
        console.error('[INDEXNOW BULK] Key file content mismatch');
        return res.status(400).json({
          error: "IndexNow key verification failed",
          message: "Key file content does not match configured key",
        });
      }

      console.log('[INDEXNOW BULK] Key verification passed');
    } catch (keyCheckError) {
      console.error('[INDEXNOW BULK] Key verification error:', keyCheckError);
      return res.status(400).json({
        error: "Failed to verify IndexNow key",
        message:
          keyCheckError instanceof Error
            ? keyCheckError.message
            : "Unknown error",
      });
    }

    const results: PingResult[] = [];

    // Process each engine
    for (const engineId of selectedEngines) {
      console.log(`[INDEXNOW BULK] Processing engine: ${engineId}`);
      const engine = engines[engineId];

      if (engine.type === "bulk") {
        // Handle bulk ping to IndexNow hub
        console.log(`[INDEXNOW BULK] Using bulk API for ${engineId}`);
        const bulkResults = await pingBulkToHub(urls, mode);
        console.log(`[INDEXNOW BULK] Received ${bulkResults.length} results from hub`);
        results.push(...bulkResults);
      } else {
        // Handle individual pings to engines like Bing
        console.log(`[INDEXNOW BULK] Using individual pings for ${engineId}`);
        const singleResults = await Promise.all(
          urls.map((url) => limit(() => pingSingleUrl(url, engineId, mode))),
        );
        console.log(`[INDEXNOW BULK] Received ${singleResults.length} individual results`);
        results.push(...singleResults);
      }
    }

    const summary = {
      total: results.length,
      succeeded: results.filter((r) => r.status === 200 || r.status === 202)
        .length,
      failed: results.filter((r) => r.status >= 400 && r.status !== 429).length,
      rateLimited: results.filter((r) => r.status === 429).length,
    };

    console.log('[INDEXNOW BULK] Response summary:', summary);
    console.log('[INDEXNOW BULK] Sample results:', results.slice(0, 3));

    const response: BulkPingResponse = {
      results,
      summary,
    };

    res.json(response);
  } catch (error) {
    console.error("Bulk ping error:", error);
    res.status(500).json({
      error: "Failed to ping URLs",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const handleSinglePing: RequestHandler = async (req, res) => {
  try {
    // Handle Buffer body from serverless-http
    let bodyData = req.body;
    if (Buffer.isBuffer(bodyData)) {
      bodyData = JSON.parse(bodyData.toString("utf-8"));
    }

    const validation = SinglePingRequestSchema.safeParse(bodyData);

    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { url, engines: selectedEngines } = validation.data;

    if (!INDEXNOW_KEY) {
      return res.status(400).json({
        error: "IndexNow key not configured",
        message: "INDEXNOW_KEY environment variable is required",
      });
    }

    if (!INDEXNOW_KEY_LOCATION) {
      return res.status(400).json({
        error: "IndexNow key location not configured",
        message: "INDEXNOW_KEY_LOCATION environment variable is required",
      });
    }

    // Verify key file exists before proceeding
    try {
      const keyFileUrl = `${INDEXNOW_KEY_LOCATION}/${INDEXNOW_KEY}.txt`;
      const keyCheckResponse = await fetch(keyFileUrl);

      if (!keyCheckResponse.ok) {
        return res.status(400).json({
          error: "IndexNow key verification failed",
          message: `Key file not found at ${keyFileUrl}. Please upload your key file.`,
          keyFileUrl,
        });
      }

      const keyContent = await keyCheckResponse.text();
      if (keyContent.trim() !== INDEXNOW_KEY) {
        return res.status(400).json({
          error: "IndexNow key verification failed",
          message: "Key file content does not match configured key",
        });
      }
    } catch (keyCheckError) {
      return res.status(400).json({
        error: "Failed to verify IndexNow key",
        message:
          keyCheckError instanceof Error
            ? keyCheckError.message
            : "Unknown error",
      });
    }

    const results = await Promise.all(
      selectedEngines.map((engineId) => pingSingleUrl(url, engineId, "update")),
    );

    res.json({ results });
  } catch (error) {
    console.error("Single ping error:", error);
    res.status(500).json({
      error: "Failed to ping URL",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

async function pingBulkToHub(
  urls: string[],
  mode: "update" | "delete" = "update",
): Promise<PingResult[]> {
  const startTime = Date.now();

  try {
    // Extract host from first URL
    const host = new URL(urls[0]).hostname;

    const payload: any = {
      host,
      key: INDEXNOW_KEY,
      urlList: urls,
    };

    if (INDEXNOW_KEY_LOCATION) {
      payload.keyLocation = INDEXNOW_KEY_LOCATION;
    }

    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "IndexNow-Ping-Console/1.0",
      },
      body: JSON.stringify(payload),
    });

    const latency = Date.now() - startTime;
    const responseText = await response.text();

    // Create results for all URLs
    const results: PingResult[] = urls.map((url) => ({
      url,
      engine: "indexnow",
      status: response.status,
      meaning: statusToMeaning(response.status),
      latency,
      attempts: 1,
      final: true,
      response: responseText.slice(0, 2048), // Trim long responses
    }));

    return results;
  } catch (error) {
    const latency = Date.now() - startTime;

    return urls.map((url) => ({
      url,
      engine: "indexnow",
      status: 0,
      meaning: "Network Error",
      latency,
      attempts: 1,
      final: true,
      error: error instanceof Error ? error.message : "Unknown error",
    }));
  }
}

async function pingSingleUrl(
  url: string,
  engineId: keyof typeof engines,
  mode: "update" | "delete" = "update",
): Promise<PingResult> {
  const engine = engines[engineId];
  const startTime = Date.now();

  try {
    let pingUrl: string;

    if (engineId === "bing") {
      // Bing IndexNow endpoint format
      const params = new URLSearchParams({
        url: url,
        key: INDEXNOW_KEY,
      });

      if (INDEXNOW_KEY_LOCATION) {
        params.set("keyLocation", INDEXNOW_KEY_LOCATION);
      }

      pingUrl = `${engine.url}?${params.toString()}`;
    } else {
      // Default to hub endpoint for other engines
      pingUrl = INDEXNOW_ENDPOINT;
    }

    const response = await fetch(pingUrl, {
      method: engineId === "bing" ? "GET" : "POST",
      headers:
        engineId === "bing"
          ? {}
          : {
              "Content-Type": "application/json",
              "User-Agent": "IndexNow-Ping-Console/1.0",
            },
      body:
        engineId === "bing"
          ? undefined
          : JSON.stringify({
              host: new URL(url).hostname,
              key: INDEXNOW_KEY,
              urlList: [url],
              ...(INDEXNOW_KEY_LOCATION && {
                keyLocation: INDEXNOW_KEY_LOCATION,
              }),
            }),
    });

    const latency = Date.now() - startTime;
    const responseText = await response.text();

    return {
      url,
      engine: engineId,
      status: response.status,
      meaning: statusToMeaning(response.status),
      latency,
      attempts: 1,
      final: true,
      response: responseText.slice(0, 2048),
    };
  } catch (error) {
    const latency = Date.now() - startTime;

    return {
      url,
      engine: engineId,
      status: 0,
      meaning: "Network Error",
      latency,
      attempts: 1,
      final: true,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export const handleKeyVerification: RequestHandler = async (req, res) => {
  try {
    // Handle Buffer body from serverless-http
    let bodyData = req.body;
    if (Buffer.isBuffer(bodyData)) {
      bodyData = JSON.parse(bodyData.toString("utf-8"));
    }

    const { domain } = bodyData;

    if (!domain || !INDEXNOW_KEY) {
      return res.status(400).json({
        error: "Domain and key required",
      });
    }

    const keyFileUrl = `${domain}/${INDEXNOW_KEY}.txt`;

    try {
      const response = await fetch(keyFileUrl);
      const content = await response.text().then((text) => text.trim());

      const isValid = response.ok && content === INDEXNOW_KEY;

      res.json({
        valid: isValid,
        status: response.status,
        content: content.slice(0, 100),
        url: keyFileUrl,
      });
    } catch (error) {
      res.json({
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error",
        url: keyFileUrl,
      });
    }
  } catch (error) {
    res.status(500).json({
      error: "Key verification failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
