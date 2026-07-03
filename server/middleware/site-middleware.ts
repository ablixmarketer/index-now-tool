import { Request, Response, NextFunction } from 'express';
import 'dotenv/config';

export interface SiteRequest extends Request {
  siteConfig?: {
    indexNowKey: string;
    indexNowKeyLocation: string;
    bingApiKey: string;
  };
}

export function siteMiddleware(req: SiteRequest, res: Response, next: NextFunction) {
  // Get site configuration from request body or use environment defaults
  // req.body only exists on POST/PUT requests, so safely check it
  const siteId = req.body?.siteId;

  // Always use environment-based configuration for now
  // In the future, you can fetch from a database based on siteId
  req.siteConfig = {
    indexNowKey: process.env.INDEXNOW_KEY || '',
    indexNowKeyLocation: process.env.INDEXNOW_KEY_LOCATION || '',
    bingApiKey: process.env.BING_SUBMISSION_API_KEY || '',
  };

  if (siteId && siteId !== 'default') {
    console.log(`[SITE MIDDLEWARE] Site ${siteId} requested, using environment config`);
  }

  next();
}
