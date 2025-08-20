import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Code } from 'lucide-react';
import { type PingResult } from '@shared/indexnow';

interface ExportButtonsProps {
  results: PingResult[];
}

export function ExportButtons({ results }: ExportButtonsProps) {
  const exportToCsv = () => {
    const headers = ['url', 'engine', 'status', 'meaning', 'latency_ms', 'attempts', 'final'];
    const rows = results.map(result => [
      result.url,
      result.engine,
      result.status.toString(),
      result.meaning,
      result.latency.toString(),
      result.attempts.toString(),
      result.final.toString()
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `indexnow-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToJson = () => {
    const jsonContent = JSON.stringify(results, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `indexnow-results-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (results.length === 0) return null;

  return (
    <div className="flex space-x-2">
      <Button variant="outline" onClick={exportToCsv} className="flex items-center space-x-2">
        <FileText className="w-4 h-4" />
        <span>Export CSV</span>
      </Button>
      <Button variant="outline" onClick={exportToJson} className="flex items-center space-x-2">
        <Code className="w-4 h-4" />
        <span>Export JSON</span>
      </Button>
    </div>
  );
}
