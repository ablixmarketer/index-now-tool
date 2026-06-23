import React, { useState, useEffect } from 'react';
import { siteManager } from '@/lib/site-manager';
import type { SiteConfig, SiteConfigFormData } from '@shared/site-config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Trash2 } from 'lucide-react';

interface SiteConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site?: SiteConfig | null;
  onSaved?: () => void;
}

export function SiteConfigModal({ open, onOpenChange, site, onSaved }: SiteConfigModalProps) {
  const [formData, setFormData] = useState<SiteConfigFormData>({
    domain: '',
    displayName: '',
    indexNowKey: '',
    indexNowKeyLocation: '',
    bingApiKey: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (site) {
      setFormData({
        domain: site.domain,
        displayName: site.displayName,
        indexNowKey: site.indexNowKey,
        indexNowKeyLocation: site.indexNowKeyLocation,
        bingApiKey: site.bingApiKey,
      });
    } else {
      setFormData({
        domain: '',
        displayName: '',
        indexNowKey: '',
        indexNowKeyLocation: '',
        bingApiKey: '',
      });
    }
    setError(null);
  }, [site, open]);

  const handleChange = (field: keyof SiteConfigFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.domain.trim()) {
      setError('Domain is required');
      return false;
    }
    if (!formData.displayName.trim()) {
      setError('Display name is required');
      return false;
    }
    if (!formData.indexNowKey.trim()) {
      setError('IndexNow key is required');
      return false;
    }
    if (!formData.indexNowKeyLocation.trim()) {
      setError('IndexNow key location is required');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (site) {
        await siteManager.updateSite(site.id, formData);
        console.log('[SITE CONFIG] Updated site:', formData.domain);
      } else {
        await siteManager.addSite(formData);
        console.log('[SITE CONFIG] Added new site:', formData.domain);
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save site configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!site) return;
    if (!window.confirm(`Are you sure you want to delete "${site.displayName}"?`)) return;

    setLoading(true);
    try {
      await siteManager.deleteSite(site.id);
      console.log('[SITE CONFIG] Deleted site:', site.domain);
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete site');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {site ? 'Edit Site Configuration' : 'Add New Site'}
          </DialogTitle>
          <DialogDescription>
            Configure IndexNow and Bing API credentials for your site
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              placeholder="example.com"
              value={formData.domain}
              onChange={(e) => handleChange('domain', e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="My Website"
              value={formData.displayName}
              onChange={(e) => handleChange('displayName', e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="indexNowKey">IndexNow API Key</Label>
            <Input
              id="indexNowKey"
              placeholder="Generate from https://www.indexnow.org/"
              value={formData.indexNowKey}
              onChange={(e) => handleChange('indexNowKey', e.target.value)}
              disabled={loading}
              type="password"
            />
          </div>

          <div>
            <Label htmlFor="indexNowKeyLocation">IndexNow Key Location</Label>
            <Input
              id="indexNowKeyLocation"
              placeholder="https://example.com/indexnow-key.txt"
              value={formData.indexNowKeyLocation}
              onChange={(e) => handleChange('indexNowKeyLocation', e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="bingApiKey">Bing Submission API Key (Optional)</Label>
            <Input
              id="bingApiKey"
              placeholder="Get from Bing Webmaster Tools"
              value={formData.bingApiKey}
              onChange={(e) => handleChange('bingApiKey', e.target.value)}
              disabled={loading}
              type="password"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          {site && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
              className="mr-auto gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : site ? 'Update' : 'Add Site'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
