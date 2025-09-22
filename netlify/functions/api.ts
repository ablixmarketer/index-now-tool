import serverless from "serverless-http";

import { createApp } from "../../server";

let cachedHandler: any;

export const handler = async (event: any, context: any) => {
  if (!cachedHandler) {
    const app = await createApp();
    cachedHandler = serverless(app, { provider: "netlify" });
  }
  return cachedHandler(event, context);
};
