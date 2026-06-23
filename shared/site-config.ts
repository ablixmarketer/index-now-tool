/**
 * Multi-site configuration management
 * Allows managing multiple domains with different IndexNow and Bing API keys
 */

export interface SiteConfig {
  id: string;
  domain: string;
  displayName: string;
  indexNowKey: string;
  indexNowKeyLocation: string;
  bingApiKey: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SiteConfigFormData {
  domain: string;
  displayName: string;
  indexNowKey: string;
  indexNowKeyLocation: string;
  bingApiKey: string;
}

export interface ApiConfig {
  currentSiteId: string;
  sites: Record<string, SiteConfig>;
}
