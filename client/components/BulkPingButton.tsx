import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Zap, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { engines, type EngineId, type PingResult } from '@shared/indexnow';
import { indexnowApi, bingApi } from '@/lib/fetch-utils';

interface BulkPingButtonProps {
  selectedUrls: string[];
  onPingStart: () => void;
  onPingProgress: (result: PingResult) => void;
  onPingComplete: (results: PingResult[]) => void;
  disabled?: boolean;
}

export function BulkPingButton({
  selectedUrls,
  onPingStart,
  onPingProgress,
  onPingComplete,
  disabled
}: BulkPingButtonProps) {
  // Default: all search engines selected
  const [selectedEngines, setSelectedEngines] = useState<EngineId[]>(['indexnow', 'bing', 'bing-url', 'bing-content']);
  const [isPinging, setIsPinging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [error, setError] = useState('');
  const [bulkResults, setBulkResults] = useState<{
    total: number;
    succeeded: number;
    failed: number;
    rateLimited: number;
    processing: number;
  }>({
    total: 0,
    succeeded: 0,
    failed: 0,
    rateLimited: 0,
    processing: 0
  });

  const handleBulkPing = async () => {
    if (selectedUrls.length === 0) {
      setError('Please select URLs to ping');
      return;
    }

    if (selectedEngines.length === 0) {
      setError('Please select at least one search engine');
      return;
    }

    setError('');
    setIsPinging(true);
    onPingStart();
    
    // Initialize bulk results
    setBulkResults({
      total: selectedUrls.length * selectedEngines.length,
      succeeded: 0,
      failed: 0,
      rateLimited: 0,
      processing: selectedUrls.length * selectedEngines.length
    });

    try {
      // Split URLs into batches of 1000 for processing
      const batchSize = 1000;
      const urlBatches = [];
      for (let i = 0; i < selectedUrls.length; i += batchSize) {
        urlBatches.push(selectedUrls.slice(i, i + batchSize));
      }

      setTotalBatches(urlBatches.length * selectedEngines.length);
      let currentBatchIndex = 0;
      const allResults: PingResult[] = [];

      // Process each engine
      for (const engineId of selectedEngines) {
        // Process each batch for current engine
        for (const urlBatch of urlBatches) {
          currentBatchIndex++;
          setCurrentBatch(currentBatchIndex);
          setProgress((currentBatchIndex / (urlBatches.length * selectedEngines.length)) * 100);

          try {
            let batchResults: any;

            // Use appropriate API based on engine type
            if (engineId === 'bing-content') {
              // Use Bing Content Submission API
              batchResults = await bingApi.submitContentBulk({
                urls: urlBatch,
                engines: [engineId]
              });
            } else if (engineId === 'bing-url') {
              // Use Bing URL Submission API
              batchResults = await bingApi.submitUrlBulk({
                urls: urlBatch,
                engines: [engineId]
              });
            } else {
              // Use IndexNow API for indexnow and bing
              batchResults = await indexnowApi.bulk({
                urls: urlBatch,
                engines: [engineId],
                mode: 'update'
              });
            }

            // Update bulk results summary
            if (batchResults.results) {
              allResults.push(...batchResults.results);

              // Update counters
              setBulkResults(prev => {
                const succeeded = allResults.filter(r => r.status === 200 || r.status === 202).length;
                const failed = allResults.filter(r => r.status >= 400 && r.status !== 429).length;
                const rateLimited = allResults.filter(r => r.status === 429).length;
                const processing = prev.total - allResults.length;

                return {
                  total: prev.total,
                  succeeded,
                  failed,
                  rateLimited,
                  processing: Math.max(0, processing)
                };
              });

              // Send progress updates
              batchResults.results.forEach(result => onPingProgress(result));
            }

            // Small delay between batches to be respectful
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (batchError) {
            console.error(`Batch ${currentBatchIndex} failed:`, batchError);
            // Create error results for failed batch
            const errorResults: PingResult[] = urlBatch.map(url => ({
              url,
              engine: engineId,
              status: 0,
              meaning: 'Batch Processing Error',
              latency: 0,
              attempts: 1,
              final: true,
              error: batchError instanceof Error ? batchError.message : 'Unknown batch error'
            }));

            allResults.push(...errorResults);
            errorResults.forEach(result => onPingProgress(result));
          }
        }
      }

      // Final update
      setBulkResults(prev => ({
        ...prev,
        processing: 0
      }));

      setProgress(100);
      onPingComplete(allResults);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to ping URLs';
      setError(message);
    } finally {
      setIsPinging(false);
    }
  };

  const handleEngineToggle = (engineId: EngineId, checked: boolean) => {
    setSelectedEngines(prev => 
      checked 
        ? [...prev, engineId]
        : prev.filter(id => id !== engineId)
    );
  };

  return (
    <div className="space-y-6">
      {/* Engine Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Search Engines for Bulk Ping</Label>
        <div className="space-y-3">
          {Object.entries(engines).map(([id, engine]) => (
            <div key={id} className="flex items-start space-x-3">
              <Checkbox
                id={`bulk-engine-${id}`}
                checked={selectedEngines.includes(id as EngineId)}
                onCheckedChange={(checked) => handleEngineToggle(id as EngineId, checked as boolean)}
                disabled={isPinging}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <Label htmlFor={`bulk-engine-${id}`} className="text-sm font-medium cursor-pointer">
                    {engine.name}
                  </Label>
                  <Badge variant="outline" className="text-xs">
                    {engine.type}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">{engine.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bulk Progress Summary */}
      {isPinging && (
        <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Bulk Ping Progress</h4>
            <Badge variant="outline">
              Batch {currentBatch} of {totalBatches}
            </Badge>
          </div>
          
          <Progress value={progress} className="w-full" />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                {bulkResults.total}
              </div>
              <div className="text-xs text-slate-500">Total</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">
                {bulkResults.succeeded}
              </div>
              <div className="text-xs text-slate-500">Succeeded</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-red-600">
                {bulkResults.failed}
              </div>
              <div className="text-xs text-slate-500">Failed</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600">
                {bulkResults.processing}
              </div>
              <div className="text-xs text-slate-500">Processing</div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Bulk Ping Button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {selectedUrls.length} URLs selected • {selectedEngines.length} engines
        </div>
        <Button
          onClick={handleBulkPing}
          disabled={disabled || isPinging || selectedUrls.length === 0 || selectedEngines.length === 0}
          size="lg"
          className="min-w-[140px]"
        >
          {isPinging ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="mr-2"
            >
              <Clock className="w-4 h-4" />
            </motion.div>
          ) : (
            <Zap className="w-4 h-4 mr-2" />
          )}
          {isPinging ? 'Pinging...' : 'Start Bulk Ping'}
        </Button>
      </div>
    </div>
  );
}
