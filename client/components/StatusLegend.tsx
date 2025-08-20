import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpCircle } from 'lucide-react';

export function StatusLegend() {
  const statusMeanings = [
    { code: '200', meaning: 'Success - Accepted/Processed', variant: 'default' as const },
    { code: '202', meaning: 'Accepted - Pending Validation', variant: 'default' as const },
    { code: '400', meaning: 'Invalid - Bad Request/Params', variant: 'destructive' as const },
    { code: '403', meaning: 'Forbidden - Key Mismatch', variant: 'destructive' as const },
    { code: '404', meaning: 'Not Found - Endpoint Missing', variant: 'destructive' as const },
    { code: '410', meaning: 'Gone - URL Removed (valid for deletions)', variant: 'secondary' as const },
    { code: '422', meaning: 'Unprocessable - Host Mismatch', variant: 'destructive' as const },
    { code: '429', meaning: 'Rate Limited - Too Many Requests', variant: 'secondary' as const },
    { code: '5xx', meaning: 'Server Error - Retry Recommended', variant: 'destructive' as const }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-lg">
          <HelpCircle className="w-5 h-5" />
          <span>Status Code Meanings</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {statusMeanings.map((status) => (
            <div key={status.code} className="flex items-center space-x-3">
              <Badge variant={status.variant} className="min-w-[3rem] justify-center">
                {status.code}
              </Badge>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {status.meaning}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
