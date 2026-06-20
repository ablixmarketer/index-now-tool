import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { type PingResult, getStatusBadgeVariant } from '@shared/indexnow';
import { DebugOutputPanel } from '@/components/DebugOutputPanel';
import { DeepDebugModal } from '@/components/DeepDebugModal';
import { debugLogger } from '@/lib/debug-logger';
import { debugStorage } from '@/lib/debug-storage';

interface ResultsTableProps {
  results: PingResult[];
  debugModeEnabled?: boolean;
}

interface DeepDebugSelection {
  url: string;
  engine: string;
}

export function ResultsTable({ results, debugModeEnabled = false }: ResultsTableProps) {
  const [expandedUrls, setExpandedUrls] = useState<Set<string>>(new Set());
  const [selectedDebug, setSelectedDebug] = useState<DeepDebugSelection | null>(null);
  const [urlsWithDebug, setUrlsWithDebug] = useState<Set<string>>(new Set());

  // Load debug info from storage on mount
  useEffect(() => {
    if (!debugModeEnabled) return;

    const loadDebugInfo = async () => {
      const urls = new Set<string>();
      for (const result of results) {
        try {
          const report = await debugStorage.getReport(result.url);
          if (report) {
            urls.add(result.url);
            console.log(`[RESULTS TABLE] Found debug report for ${result.url}`);
          }
        } catch (err) {
          console.warn(`[RESULTS TABLE] Error checking debug for ${result.url}:`, err);
        }
      }
      setUrlsWithDebug(urls);
    };

    loadDebugInfo();
  }, [results, debugModeEnabled]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Check if there's debug info for a URL
  const hasDebugInfo = (url: string) => {
    return urlsWithDebug.has(url);
  };

  const toggleUrlExpand = (url: string) => {
    const newExpanded = new Set(expandedUrls);
    if (newExpanded.has(url)) {
      newExpanded.delete(url);
    } else {
      newExpanded.add(url);
    }
    setExpandedUrls(newExpanded);
  };

  // Group results by URL for better display
  const uniqueUrls = Array.from(new Set(results.map(r => r.url)));

  return (
    <div className="space-y-3">
      {uniqueUrls.map((url) => {
        const urlResults = results.filter(r => r.url === url);
        const isExpanded = expandedUrls.has(url);
        const hasDebug = debugModeEnabled && hasDebugInfo(url);

        return (
          <div key={url} className="border rounded-lg overflow-hidden">
            {/* URL Header Row */}
            <div className="bg-slate-50 dark:bg-slate-900 p-3 flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <span className="font-medium text-sm truncate">{url}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => copyToClipboard(url)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center gap-2 ml-3">
                {hasDebug && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Click the first engine's deep debug button
                        const firstResult = urlResults[0];
                        if (firstResult) {
                          setSelectedDebug({ url, engine: firstResult.engine });
                        }
                      }}
                      className="text-xs gap-1 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                      title="Deep debug report"
                    >
                      <Eye className="h-3 w-3" />
                      Deep Debug
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleUrlExpand(url)}
                      className="text-xs gap-1"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          Hide
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          Quick
                        </>
                      )}
                    </Button>
                  </>
                )}
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {urlResults.length} engines
                </Badge>
              </div>
            </div>

            {/* Results Table for this URL */}
            <div className="border-t">
              <ScrollArea className="h-auto">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Engine</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Meaning</TableHead>
                      <TableHead className="text-xs">Latency</TableHead>
                      <TableHead className="text-xs">Attempts</TableHead>
                      <TableHead className="text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {urlResults.map((result, index) => (
                      <TableRow key={`${result.url}-${result.engine}-${index}`} className="text-xs">
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
                          <span className="truncate">{result.meaning}</span>
                        </TableCell>
                        <TableCell>
                          <span>{result.latency}ms</span>
                        </TableCell>
                        <TableCell>
                          <span>{result.attempts}</span>
                        </TableCell>
                        <TableCell>
                          {result.response && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(result.url, '_blank')}
                              className="h-5 w-5 p-0"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            {/* Debug Output Panel - Expandable */}
            {hasDebug && isExpanded && (
              <div className="border-t bg-amber-50 dark:bg-amber-950/30 p-4">
                <DebugOutputPanel url={url} engine={urlResults[0]?.engine} />
              </div>
            )}
          </div>
        );
      })}

      {/* Deep Debug Modal */}
      {selectedDebug && (
        <DeepDebugModal
          url={selectedDebug.url}
          engine={selectedDebug.engine}
          open={!!selectedDebug}
          onOpenChange={(open) => {
            if (!open) setSelectedDebug(null);
          }}
        />
      )}
    </div>
  );
}
