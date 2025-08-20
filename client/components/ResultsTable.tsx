import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { type PingResult, getStatusBadgeVariant } from '@shared/indexnow';

interface ResultsTableProps {
  results: PingResult[];
}

export function ResultsTable({ results }: ResultsTableProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
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
                  {result.response && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(result.url, '_blank')}
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
  );
}
