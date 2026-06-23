/**
 * Site Manager - Handles multi-site configuration
 * Stores site configs in localStorage and manages current active site
 */

import type { SiteConfig, ApiConfig, SiteConfigFormData } from '@shared/site-config';

const STORAGE_KEY = 'site_api_config';

class SiteManager {
  private config: ApiConfig = {
    currentSiteId: '',
    sites: {},
  };

  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    // Load from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.config = JSON.parse(stored);
        console.log('[SITE MANAGER] Loaded config from localStorage:', Object.keys(this.config.sites).length, 'sites');
      }
    } catch (e) {
      console.warn('[SITE MANAGER] Failed to load config from localStorage');
    }

    // Load initial config from environment
    await this.loadFromEnvironment();

    this.initialized = true;
  }

  private async loadFromEnvironment(): Promise<void> {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) {
        console.warn('[SITE MANAGER] Failed to load config from server');
        return;
      }

      const envConfig = await response.json();
      if (envConfig.domain && envConfig.indexNowKey) {
        const siteId = 'default';
        this.config.sites[siteId] = {
          id: siteId,
          domain: envConfig.domain,
          displayName: envConfig.domain,
          indexNowKey: envConfig.indexNowKey,
          indexNowKeyLocation: envConfig.indexNowKeyLocation || `https://${envConfig.domain}`,
          bingApiKey: envConfig.bingApiKey || '',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (!this.config.currentSiteId) {
          this.config.currentSiteId = siteId;
        }

        this.persist();
        console.log('[SITE MANAGER] Loaded default site from environment:', envConfig.domain);
      }
    } catch (e) {
      console.warn('[SITE MANAGER] Error loading environment config:', e);
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.warn('[SITE MANAGER] Failed to persist config to localStorage');
    }
  }

  async addSite(formData: SiteConfigFormData): Promise<SiteConfig> {
    await this.init();

    const siteId = `site_${Date.now()}`;
    const site: SiteConfig = {
      id: siteId,
      ...formData,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.config.sites[siteId] = site;
    if (!this.config.currentSiteId) {
      this.config.currentSiteId = siteId;
    }
    this.persist();

    console.log('[SITE MANAGER] Added new site:', formData.domain);
    return site;
  }

  async updateSite(siteId: string, formData: SiteConfigFormData): Promise<SiteConfig> {
    await this.init();

    if (!this.config.sites[siteId]) {
      throw new Error(`Site ${siteId} not found`);
    }

    const site: SiteConfig = {
      id: siteId,
      ...formData,
      isActive: this.config.sites[siteId].isActive,
      createdAt: this.config.sites[siteId].createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.config.sites[siteId] = site;
    this.persist();

    console.log('[SITE MANAGER] Updated site:', formData.domain);
    return site;
  }

  async deleteSite(siteId: string): Promise<void> {
    await this.init();

    delete this.config.sites[siteId];
    if (this.config.currentSiteId === siteId) {
      const remainingIds = Object.keys(this.config.sites);
      this.config.currentSiteId = remainingIds[0] || '';
    }
    this.persist();

    console.log('[SITE MANAGER] Deleted site:', siteId);
  }

  async setActiveSite(siteId: string): Promise<void> {
    await this.init();

    if (!this.config.sites[siteId]) {
      throw new Error(`Site ${siteId} not found`);
    }

    this.config.currentSiteId = siteId;
    this.persist();

    console.log('[SITE MANAGER] Set active site:', siteId);
  }

  async getActiveSite(): Promise<SiteConfig | null> {
    await this.init();

    if (!this.config.currentSiteId) return null;
    return this.config.sites[this.config.currentSiteId] || null;
  }

  async getAllSites(): Promise<SiteConfig[]> {
    await this.init();
    return Object.values(this.config.sites);
  }

  async getSite(siteId: string): Promise<SiteConfig | null> {
    await this.init();
    return this.config.sites[siteId] || null;
  }

  getActiveSiteSync(): SiteConfig | null {
    if (!this.config.currentSiteId) return null;
    return this.config.sites[this.config.currentSiteId] || null;
  }

  getAllSitesSync(): SiteConfig[] {
    return Object.values(this.config.sites);
  }
}

export const siteManager = new SiteManager();
