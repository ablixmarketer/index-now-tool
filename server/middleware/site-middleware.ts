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
  const { siteId } = req.body;

  if (siteId === 'default' || !siteId) {
    // Use environment-based configuration
    req.siteConfig = {
      indexNowKey: process.env.INDEXNOW_KEY || '',
      indexNowKeyLocation: process.env.INDEXNOW_KEY_LOCATION || '',
      bingApiKey: process.env.BING_SUBMISSION_API_KEY || '',
    };

    console.log('[SITE MIDDLEWARE] Using environment configuration for default site');
  } else {
    // In production, you might fetch site config from a database
    // For now, we'll fall back to environment config
    console.log(`[SITE MIDDLEWARE] Site ${siteId} requested, using environment config`);
    req.siteConfig = {
      indexNowKey: process.env.INDEXNOW_KEY || '',
      indexNowKeyLocation: process.env.INDEXNOW_KEY_LOCATION || '',
      bingApiKey: process.env.BING_SUBMISSION_API_KEY || '',
    };
  }

  // Validate that we have at least an IndexNow key
  if (!req.siteConfig.indexNowKey) {
    console.warn('[SITE MIDDLEWARE] No IndexNow key configured');
  }

  next();
}
