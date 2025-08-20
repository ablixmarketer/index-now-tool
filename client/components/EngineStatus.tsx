import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { engines, type PingResult } from '@shared/indexnow';

interface EngineStatusProps {
  results: PingResult[];
}

export function EngineStatus({ results }: EngineStatusProps) {
  const engineStats = Object.keys(engines).map(engineId => {
    const engineResults = results.filter(r => r.engine === engineId);
    const total = engineResults.length;
    const succeeded = engineResults.filter(r => r.status === 200 || r.status === 202).length;
    const avgLatency = engineResults.length > 0 
      ? Math.round(engineResults.reduce((sum, r) => sum + r.latency, 0) / engineResults.length)
      : 0;

    return {
      engine: engines[engineId as keyof typeof engines],
      total,
      succeeded,
      successRate: total > 0 ? (succeeded / total) * 100 : 0,
      avgLatency
    };
  }).filter(stat => stat.total > 0);

  if (engineStats.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Engine Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {engineStats.map((stat) => (
            <div key={stat.engine.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline">{stat.engine.name}</Badge>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {stat.succeeded}/{stat.total} successful
                  </span>
                </div>
                <div className="text-sm text-slate-500">
                  {stat.avgLatency}ms avg
                </div>
              </div>
              <Progress value={stat.successRate} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
