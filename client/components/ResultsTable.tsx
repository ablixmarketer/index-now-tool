import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Copy, ExternalLink, Eye } from 'lucide-react';
import { type PingResult, getStatusBadgeVariant } from '@shared/indexnow';
import { DebugOutputPanel } from '@/components/DebugOutputPanel';
import { debugLogger } from '@/lib/debug-logger';

interface ResultsTableProps {
  results: PingResult[];
  debugModeEnabled?: boolean;
}

export function ResultsTable({ results, debugModeEnabled = false }: ResultsTableProps) {
  const [selectedUrlForDebug, setSelectedUrlForDebug] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Check if there's debug info for a URL
  const hasDebugInfo = (url: string) => {
    const logs = debugLogger.getUrlDebugLogs(url);
    return Object.keys(logs).length > 0;
  };

  return (
    <>
      <div className="border rounded-lg">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Engine</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Meaning</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result, index) => (
                <TableRow key={`${result.url}-${result.engine}-${index}`}>
                  <TableCell className="max-w-[300px]">
                    <div className="flex items-center space-x-2">
                      <span className="truncate text-sm">{result.url}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(result.url)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {result.engine}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(result.status)}>
                      {result.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <span className="text-sm truncate">{result.meaning}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{result.latency}ms</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{result.attempts}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {debugModeEnabled && hasDebugInfo(result.url) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUrlForDebug(result.url)}
                          title="View debug details"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      {result.response && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(result.url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Debug Details Modal */}
      <Dialog open={!!selectedUrlForDebug} onOpenChange={(open) => {
        if (!open) setSelectedUrlForDebug(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Debug Verdict</DialogTitle>
            <DialogDescription>
              Comprehensive submission audit for {selectedUrlForDebug && new URL(selectedUrlForDebug).pathname}
            </DialogDescription>
          </DialogHeader>
          {selectedUrlForDebug && (
            <DebugOutputPanel url={selectedUrlForDebug} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
