import { Request, Response, NextFunction } from 'express';
import 'dotenv/config';

export interface SiteRequest extends Request {
  siteConfig?: {
    domain: string;
    indexNowKey: string;
    indexNowKeyLocation: string;
    bingApiKey: string;
  };
}

function getConfiguredDomain(): string {
  const location = process.env.INDEXNOW_KEY_LOCATION?.trim();
  if (!location) return '';

  try {
    return new URL(location).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function siteMiddleware(req: SiteRequest, res: Response, next: NextFunction) {
  // The deployment environment is the only source of API credentials.
  // req.body is absent for GET requests, so read it defensively.
  const siteId = req.body?.siteId;
  const configuredDomain = getConfiguredDomain();

  req.siteConfig = {
    domain: configuredDomain,
    indexNowKey: process.env.INDEXNOW_KEY?.trim() || '',
    indexNowKeyLocation: process.env.INDEXNOW_KEY_LOCATION?.trim() || '',
    bingApiKey: process.env.BING_SUBMISSION_API_KEY?.trim() || '',
  };

  if (siteId && siteId !== 'default') {
    console.warn(
      `[SITE MIDDLEWARE] Site ${siteId} was requested, but credentials always come from deployment environment`,
    );
  }

  if (configuredDomain && req.body && req.path.startsWith('/api/')) {
    const requestedUrls = [
      ...(typeof req.body.url === 'string' ? [req.body.url] : []),
      ...(typeof req.body.sitemapUrl === 'string' ? [req.body.sitemapUrl] : []),
      ...(Array.isArray(req.body.urls) ? req.body.urls.filter((url: unknown): url is string => typeof url === 'string') : []),
    ];

    const mismatchedUrl = requestedUrls.find((value) => {
      try {
        const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, '');
        return hostname !== configuredDomain;
      } catch {
        return false;
      }
    });

    if (mismatchedUrl) {
      let requestedDomain = 'unknown';
      try {
        requestedDomain = new URL(mismatchedUrl).hostname;
      } catch {
        // Schema validation will provide the detailed invalid URL response.
      }

      return res.status(400).json({
        error: 'Site domain mismatch',
        message: `This deployment is configured for ${configuredDomain}, but the request targets ${requestedDomain}. Update the deployment environment variables before submitting URLs for another site.`,
        configuredDomain,
        requestedDomain,
      });
    }
  }

  next();
}
