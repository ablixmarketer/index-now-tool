import serverless from "serverless-http";
import { createApp } from "../../server";

let cachedApp: any;

const getHandler = async () => {
  if (!cachedApp) {
    cachedApp = await createApp();
  }
  return serverless(cachedApp);
};

export const handler = async (event: any, context: any) => {
  try {
    const serverlessHandler = await getHandler();
    return serverlessHandler(event, context);
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
