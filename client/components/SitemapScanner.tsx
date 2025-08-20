import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Globe, Search, AlertCircle, Settings, Zap } from 'lucide-react';
import { engines, type EngineId, type SitemapUrl } from '@shared/indexnow';

interface SitemapScannerProps {
  onScanStart: () => void;
  onScanComplete: (urls: SitemapUrl[]) => void;
  onScanError: (error: string) => void;
  disabled?: boolean;
}

export function SitemapScanner({ onScanStart, onScanComplete, onScanError, disabled }: SitemapScannerProps) {
  const [sitemapUrl, setSitemapUrl] = useState('https://www.airi.health/sitemap.xml');
  const [days, setDays] = useState(7);
  const [customDays, setCustomDays] = useState('');
  const [includePatterns, setIncludePatterns] = useState('');
  const [excludePatterns, setExcludePatterns] = useState('');
  const [selectedEngines, setSelectedEngines] = useState<EngineId[]>(['indexnow']);
  const [concurrency, setConcurrency] = useState([5]);
  const [retries, setRetries] = useState([2]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');

  const handleScan = async () => {
    if (!sitemapUrl.trim()) {
      setError('Please enter a sitemap URL');
      return;
    }

    setError('');
    setIsScanning(true);
    onScanStart();

    try {
      const finalDays = days === 0 ? parseInt(customDays) || 7 : days;
      const include = includePatterns.trim() ? includePatterns.split('\n').filter(p => p.trim()) : [];
      const exclude = excludePatterns.trim() ? excludePatterns.split('\n').filter(p => p.trim()) : [];

      const response = await fetch('/api/sitemap/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sitemapUrl: sitemapUrl.trim(),
          days: finalDays,
          include,
          exclude
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      onScanComplete(data.urls);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to scan sitemap';
      setError(message);
      onScanError(message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleEngineToggle = (engineId: EngineId, checked: boolean) => {
    setSelectedEngines(prev => 
      checked 
        ? [...prev, engineId]
        : prev.filter(id => id !== engineId)
    );
  };

  const daysOptions = [
    { value: 5, label: '5 days' },
    { value: 7, label: '7 days' },
    { value: 10, label: '10 days' },
    { value: 15, label: '15 days' },
    { value: 30, label: '30 days' },
    { value: 0, label: 'Custom' }
  ];

  return (
    <div className="space-y-6">
      {/* Sitemap URL */}
      <div className="space-y-2">
        <Label htmlFor="sitemap-url" className="text-sm font-medium">
          Sitemap URL
        </Label>
        <div className="relative">
          <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <Input
            id="sitemap-url"
            value={sitemapUrl}
            onChange={(e) => setSitemapUrl(e.target.value)}
            placeholder="https://example.com/sitemap.xml"
            className="pl-10"
            disabled={disabled || isScanning}
          />
        </div>
        <p className="text-xs text-slate-500">
          Supports standard, news, image, video, gzipped, and sitemap index files
        </p>
      </div>

      {/* Time Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Last Modified Filter</Label>
        <Select value={days.toString()} onValueChange={(value) => setDays(parseInt(value))}>
          <SelectTrigger>
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            {daysOptions.map(option => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {days === 0 && (
          <Input
            value={customDays}
            onChange={(e) => setCustomDays(e.target.value)}
            placeholder="Enter number of days"
            type="number"
            min="1"
            max="365"
            className="mt-2"
          />
        )}
      </div>

      <Separator />

      {/* Path Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Include Patterns</Label>
          <Textarea
            value={includePatterns}
            onChange={(e) => setIncludePatterns(e.target.value)}
            placeholder="/blog/&#10;/news/"
            rows={3}
            className="text-sm"
          />
          <p className="text-xs text-slate-500">One pattern per line (regex or prefix)</p>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Exclude Patterns</Label>
          <Textarea
            value={excludePatterns}
            onChange={(e) => setExcludePatterns(e.target.value)}
            placeholder="/admin/&#10;/test/"
            rows={3}
            className="text-sm"
          />
          <p className="text-xs text-slate-500">One pattern per line (regex or prefix)</p>
        </div>
      </div>

      <Separator />

      {/* Engine Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Search Engines</Label>
        <div className="space-y-3">
          {Object.entries(engines).map(([id, engine]) => (
            <div key={id} className="flex items-start space-x-3">
              <Checkbox
                id={`engine-${id}`}
                checked={selectedEngines.includes(id as EngineId)}
                onCheckedChange={(checked) => handleEngineToggle(id as EngineId, checked as boolean)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <Label htmlFor={`engine-${id}`} className="text-sm font-medium cursor-pointer">
                    {engine.name}
                  </Label>
                  <Badge variant="outline" className="text-xs">
                    {engine.type}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">{engine.description}</p>
              </div>
            </div>
          ))}
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            IndexNow Hub distributes to all participating search engines including Bing, Yandex, and others.
            Google currently doesn't accept IndexNow pings.
          </AlertDescription>
        </Alert>
      </div>

      <Separator />

      {/* Advanced Settings */}
      <div className="space-y-4">
        <Label className="text-sm font-medium flex items-center space-x-2">
          <Settings className="w-4 h-4" />
          <span>Advanced Settings</span>
        </Label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Concurrency: {concurrency[0]}</Label>
            <Slider
              value={concurrency}
              onValueChange={setConcurrency}
              max={20}
              min={1}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-slate-500">Parallel requests limit</p>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm">Retries: {retries[0]}</Label>
            <Slider
              value={retries}
              onValueChange={setRetries}
              max={3}
              min={0}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-slate-500">Max retry attempts</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Scan Button */}
      <Button
        onClick={handleScan}
        disabled={disabled || isScanning || selectedEngines.length === 0}
        className="w-full"
        size="lg"
      >
        {isScanning ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="mr-2"
          >
            <Search className="w-4 h-4" />
          </motion.div>
        ) : (
          <Search className="w-4 h-4 mr-2" />
        )}
        {isScanning ? 'Scanning Sitemap...' : 'Scan Sitemap'}
      </Button>
    </div>
  );
}
