import React from 'react';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';
import { type SitemapUrl } from '@shared/indexnow';

interface DemoDataButtonProps {
  onLoadDemo: (urls: SitemapUrl[]) => void;
}

export function DemoDataButton({ onLoadDemo }: DemoDataButtonProps) {
  const loadDemoData = () => {
    const demoUrls: SitemapUrl[] = [
      {
        url: 'https://example.com/',
        lastmod: '2024-01-20T10:00:00Z',
        reason: 'included',
        checked: true
      },
      {
        url: 'https://example.com/hospitals',
        lastmod: '2024-01-19T15:30:00Z',
        reason: 'included',
        checked: true
      },
      {
        url: 'https://example.com/services',
        lastmod: '2024-01-18T12:45:00Z',
        reason: 'included',
        checked: true
      },
      {
        url: 'https://example.com/about',
        lastmod: '2024-01-17T09:15:00Z',
        reason: 'included',
        checked: true
      },
      {
        url: 'https://example.com/contact',
        lastmod: '2024-01-16T14:20:00Z',
        reason: 'included',
        checked: true
      },
      {
        url: 'https://example.com/admin/panel',
        lastmod: '2024-01-15T11:00:00Z',
        reason: 'excluded',
        checked: true
      },
      {
        url: 'https://example.com/old-page',
        lastmod: '2023-12-01T10:00:00Z',
        reason: 'old',
        checked: true
      }
    ];
    
    onLoadDemo(demoUrls);
  };

  return (
    <Button 
      variant="outline" 
      onClick={loadDemoData}
      className="flex items-center space-x-2"
    >
      <PlayCircle className="w-4 h-4" />
      <span>Load Demo Data</span>
    </Button>
  );
}
