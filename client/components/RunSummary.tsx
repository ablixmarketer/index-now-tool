import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { type PingResult } from '@shared/indexnow';

interface RunSummaryProps {
  results: PingResult[];
}

export function RunSummary({ results }: RunSummaryProps) {
  const total = results.length;
  const succeeded = results.filter(r => r.status === 200 || r.status === 202).length;
  const failed = results.filter(r => r.status >= 400 && r.status !== 429).length;
  const rateLimited = results.filter(r => r.status === 429).length;
  const errors = results.filter(r => r.status === 0).length;

  // Calculate unique URLs to show proper bulk statistics
  const uniqueUrls = new Set(results.map(r => r.url)).size;
  const uniqueEngines = new Set(results.map(r => r.engine)).size;

  const stats = [
    {
      title: 'Total Requests',
      value: total,
      icon: Clock,
      color: 'text-slate-600',
      bgColor: 'bg-slate-100 dark:bg-slate-800',
      subtitle: `${uniqueUrls} URLs × ${uniqueEngines} engines`
    },
    {
      title: 'Succeeded',
      value: succeeded,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      subtitle: `${((succeeded / total) * 100).toFixed(1)}% success rate`
    },
    {
      title: 'Failed',
      value: failed,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      subtitle: `${errors} network errors`
    },
    {
      title: 'Rate Limited',
      value: rateLimited,
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
      subtitle: 'Retry with delay'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className={`${stat.bgColor} border-0`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {stat.title}
                </p>
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
