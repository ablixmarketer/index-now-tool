import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Clock, AlertTriangle, Zap, Globe } from 'lucide-react';
import { type PingResult } from '@shared/indexnow';

interface BulkResultsSummaryProps {
  results: PingResult[];
}

export function BulkResultsSummary({ results }: BulkResultsSummaryProps) {
  if (results.length === 0) return null;

  // Calculate bulk statistics
  const uniqueUrls = new Set(results.map(r => r.url));
  const uniqueEngines = new Set(results.map(r => r.engine));
  
  const totalRequests = results.length;
  const totalUrls = uniqueUrls.size;
  const totalEngines = uniqueEngines.size;
  
  const succeeded = results.filter(r => r.status === 200 || r.status === 202).length;
  const failed = results.filter(r => r.status >= 400 && r.status !== 429).length;
  const rateLimited = results.filter(r => r.status === 429).length;
  const errors = results.filter(r => r.status === 0).length;
  
  const successRate = totalRequests > 0 ? (succeeded / totalRequests) * 100 : 0;
  
  // Calculate per-URL success rate (more meaningful for bulk operations)
  const urlSuccessMap = new Map<string, boolean>();
  uniqueUrls.forEach(url => {
    const urlResults = results.filter(r => r.url === url);
    const hasSuccess = urlResults.some(r => r.status === 200 || r.status === 202);
    urlSuccessMap.set(url, hasSuccess);
  });
  
  const successfulUrls = Array.from(urlSuccessMap.values()).filter(Boolean).length;
  const urlSuccessRate = totalUrls > 0 ? (successfulUrls / totalUrls) * 100 : 0;

  // Engine performance
  const engineStats = Array.from(uniqueEngines).map(engine => {
    const engineResults = results.filter(r => r.engine === engine);
    const engineSucceeded = engineResults.filter(r => r.status === 200 || r.status === 202).length;
    const engineTotal = engineResults.length;
    const engineSuccessRate = engineTotal > 0 ? (engineSucceeded / engineTotal) * 100 : 0;
    
    return {
      engine,
      succeeded: engineSucceeded,
      total: engineTotal,
      successRate: engineSuccessRate
    };
  });

  return (
    <div className="space-y-6">
      {/* Bulk Operation Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-900 dark:text-blue-100">
            <Zap className="w-5 h-5" />
            <span>Bulk Ping Results</span>
            <Badge variant="outline" className="ml-auto">
              Completed
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                {totalUrls}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">URLs Processed</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                {totalEngines}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Search Engines</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                {totalRequests}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Total Requests</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Rate Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="w-5 h-5" />
              <span>URL Success Rate</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  URLs Successfully Pinged
                </span>
                <span className="text-lg font-bold text-green-600">
                  {successfulUrls}/{totalUrls}
                </span>
              </div>
              <Progress value={urlSuccessRate} className="h-3" />
              <div className="text-center">
                <span className="text-2xl font-bold text-green-600">
                  {urlSuccessRate.toFixed(1)}%
                </span>
                <div className="text-xs text-slate-500">
                  At least one engine accepted each URL
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5" />
              <span>Request Success Rate</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Successful Requests
                </span>
                <span className="text-lg font-bold text-green-600">
                  {succeeded}/{totalRequests}
                </span>
              </div>
              <Progress value={successRate} className="h-3" />
              <div className="text-center">
                <span className="text-2xl font-bold text-green-600">
                  {successRate.toFixed(1)}%
                </span>
                <div className="text-xs text-slate-500">
                  Individual API call success rate
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Results Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {succeeded}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">Succeeded</div>
              <div className="text-xs text-slate-500 mt-1">
                200/202 responses
              </div>
            </div>
            
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                {failed}
              </div>
              <div className="text-sm text-red-600 dark:text-red-400">Failed</div>
              <div className="text-xs text-slate-500 mt-1">
                4xx/5xx errors
              </div>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                {rateLimited}
              </div>
              <div className="text-sm text-yellow-600 dark:text-yellow-400">Rate Limited</div>
              <div className="text-xs text-slate-500 mt-1">
                429 responses
              </div>
            </div>
            
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-slate-700 dark:text-slate-400">
                {errors}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Network Errors</div>
              <div className="text-xs text-slate-500 mt-1">
                Connection issues
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engine Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Engine Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {engineStats.map((stat) => (
              <div key={stat.engine} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="capitalize">
                      {stat.engine}
                    </Badge>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {stat.succeeded}/{stat.total} successful
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    {stat.successRate.toFixed(1)}%
                  </span>
                </div>
                <Progress value={stat.successRate} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
