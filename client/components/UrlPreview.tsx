import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { type SitemapUrl } from '@shared/indexnow';

interface UrlPreviewProps {
  urls: SitemapUrl[];
  selectedUrls: string[];
  onSelectionChange: (urls: string[]) => void;
}

export function UrlPreview({ urls, selectedUrls, onSelectionChange }: UrlPreviewProps) {
  const includedUrls = urls.filter(url => url.reason === 'included');
  const excludedUrls = urls.filter(url => url.reason !== 'included');

  const handleSelectAll = () => {
    const allIncluded = includedUrls.map(url => url.url);
    onSelectionChange(allIncluded);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const handleToggleUrl = (url: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedUrls, url]);
    } else {
      onSelectionChange(selectedUrls.filter(u => u !== url));
    }
  };

  const getReasonIcon = (reason: SitemapUrl['reason']) => {
    switch (reason) {
      case 'included':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'excluded':
        return <XCircle className="w-3 h-3 text-red-500" />;
      case 'old':
        return <Clock className="w-3 h-3 text-orange-500" />;
      case 'no-lastmod':
        return <AlertCircle className="w-3 h-3 text-yellow-500" />;
    }
  };

  const getReasonBadge = (reason: SitemapUrl['reason']) => {
    const variants = {
      included: 'default' as const,
      excluded: 'destructive' as const,
      old: 'secondary' as const,
      'no-lastmod': 'outline' as const
    };

    const labels = {
      included: 'Included',
      excluded: 'Excluded',
      old: 'Too Old',
      'no-lastmod': 'No Date'
    };

    return (
      <Badge variant={variants[reason]} className="text-xs">
        {labels[reason]}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary and Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {selectedUrls.length} of {includedUrls.length} URLs selected
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearAll}>
            Clear All
          </Button>
        </div>
      </div>

      {/* URL List */}
      <ScrollArea className="h-[300px] border rounded-lg p-3">
        <div className="space-y-2">
          {/* Included URLs */}
          {includedUrls.map((urlData) => (
            <div key={urlData.url} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
              <Checkbox
                checked={selectedUrls.includes(urlData.url)}
                onCheckedChange={(checked) => handleToggleUrl(urlData.url, checked as boolean)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  {getReasonIcon(urlData.reason)}
                  <span className="text-sm font-medium truncate">{urlData.url}</span>
                  {getReasonBadge(urlData.reason)}
                </div>
                {urlData.lastmod && (
                  <div className="text-xs text-slate-500">
                    Last modified: {new Date(urlData.lastmod).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Excluded URLs (show first 10) */}
          {excludedUrls.length > 0 && (
            <>
              <div className="border-t pt-4 mt-4">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Excluded URLs ({excludedUrls.length})
                </div>
                {excludedUrls.slice(0, 10).map((urlData) => (
                  <div key={urlData.url} className="flex items-start space-x-3 p-2 rounded-lg opacity-60">
                    <div className="w-4 h-4 mt-1" /> {/* Spacer for checkbox */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        {getReasonIcon(urlData.reason)}
                        <span className="text-sm truncate">{urlData.url}</span>
                        {getReasonBadge(urlData.reason)}
                      </div>
                      {urlData.lastmod && (
                        <div className="text-xs text-slate-500">
                          Last modified: {new Date(urlData.lastmod).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {excludedUrls.length > 10 && (
                  <div className="text-xs text-slate-500 text-center py-2">
                    ... and {excludedUrls.length - 10} more excluded URLs
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
