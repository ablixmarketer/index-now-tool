import React, { useState, useEffect } from 'react';
import { siteManager } from '@/lib/site-manager';
import type { SiteConfig } from '@shared/site-config';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Settings } from 'lucide-react';
import { SiteConfigModal } from '@/components/SiteConfigModal';

interface SiteSelectorProps {
  onSiteChange?: (site: SiteConfig) => void;
}

export function SiteSelector({ onSiteChange }: SiteSelectorProps) {
  const [sites, setSites] = useState<SiteConfig[]>([]);
  const [activeSite, setActiveSite] = useState<SiteConfig | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteConfig | null>(null);

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    await siteManager.init();
    const allSites = await siteManager.getAllSites();
    setSites(allSites);

    const active = await siteManager.getActiveSite();
    setActiveSite(active);
  };

  const handleSiteChange = async (siteId: string) => {
    await siteManager.setActiveSite(siteId);
    const site = await siteManager.getSite(siteId);
    if (site) {
      setActiveSite(site);
      onSiteChange?.(site);
    }
  };

  const handleAddSite = () => {
    setEditingSite(null);
    setShowModal(true);
  };

  const handleEditSite = (site: SiteConfig) => {
    setEditingSite(site);
    setShowModal(true);
  };

  const handleSiteConfigSaved = async () => {
    setShowModal(false);
    setEditingSite(null);
    await loadSites();
  };

  if (sites.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600 dark:text-slate-400">No sites configured</span>
        <Button
          size="sm"
          variant="outline"
          onClick={handleAddSite}
          className="gap-1"
        >
          <Plus className="h-3 w-3" />
          Add Site
        </Button>
        <SiteConfigModal
          open={showModal}
          onOpenChange={setShowModal}
          site={editingSite}
          onSaved={handleSiteConfigSaved}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={activeSite?.id || ''} onValueChange={handleSiteChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select a site" />
        </SelectTrigger>
        <SelectContent>
          {sites.map((site) => (
            <SelectItem key={site.id} value={site.id}>
              {site.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        size="sm"
        variant="outline"
        onClick={() => handleEditSite(activeSite!)}
        className="gap-1"
        title="Edit active site"
      >
        <Settings className="h-3 w-3" />
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={handleAddSite}
        className="gap-1"
        title="Add new site"
      >
        <Plus className="h-3 w-3" />
      </Button>

      <SiteConfigModal
        open={showModal}
        onOpenChange={setShowModal}
        site={editingSite}
        onSaved={handleSiteConfigSaved}
      />
    </div>
  );
}
