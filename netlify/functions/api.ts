import serverless from "serverless-http";

let cachedHandler: any;

export const handler = async (event: any, context: any) => {
  try {
    if (!cachedHandler) {
      // Dynamic import to avoid bundling issues
      const { createApp } = await import("../../server/index.js");
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
