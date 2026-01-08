import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Globe, Zap, AlertCircle } from 'lucide-react';
import { engines, type EngineId, type PingResult } from '@shared/indexnow';
import { indexnowApi, bingApi } from '@/lib/fetch-utils';
import { debugLogger } from '@/lib/debug-logger';
import { DebugOutputPanel } from '@/components/DebugOutputPanel';

interface SingleUrlPingProps {
  onPingComplete: (results: PingResult[]) => void;
  disabled?: boolean;
  debugModeEnabled?: boolean;
}

export function SingleUrlPing({ onPingComplete, disabled, debugModeEnabled = false }: SingleUrlPingProps) {
  const [url, setUrl] = useState('');
  const [selectedEngines, setSelectedEngines] = useState<EngineId[]>(['indexnow']);
  const [isPinging, setIsPinging] = useState(false);
  const [error, setError] = useState('');
  const [debugResults, setDebugResults] = useState<PingResult[] | null>(null);

  const handlePing = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (selectedEngines.length === 0) {
      setError('Please select at least one search engine');
      return;
    }

    setError('');
    setIsPinging(true);
    setDebugResults(null);

    try {
      const trimmedUrl = url.trim();
      const allResults: PingResult[] = [];

      // Log start if debug enabled
      if (debugModeEnabled) {
        console.log(`[DEBUG] Starting ping for URL: ${trimmedUrl}`);
        console.log(`[DEBUG] Selected engines:`, selectedEngines);
      }

      // Handle different engine types
      for (const engineId of selectedEngines) {
        try {
          if (engineId === 'bing-content') {
            // Use content submission API
            const bingData = await bingApi.submitContentSingleWithDebug(
              {
                url: trimmedUrl,
                engines: [engineId],
              },
              debugModeEnabled
            );
            allResults.push(...bingData.results);

            // Process debug info and populate debugLogger
            if (debugModeEnabled && bingData.results) {
              bingData.results.forEach((result: PingResult) => {
                if (result.debug) {
                  console.log(`[DEBUG] ${engineId} Result:`, result.debug);

                  // Populate debugLogger with structured debug info
                  const debugInfo = result.debug as any;

                  // Always extract and log what's available
                  const contentExtraction = debugInfo.contentExtraction || {
                    sourceTag: 'none' as const,
                    sanitizedPreview: '',
                    characterCount: 0,
                    isValid: false,
                    isEmpty: true,
                    isHeaderFooterOnly: false,
                    warnings: debugInfo.reason ? [debugInfo.reason] : [],
                  };

                  const metadata = debugInfo.metadata || {
                    title: '',
                    description: '',
                    canonical: '',
                    robots: '',
                    publishDate: null,
                    lastModified: null,
                  };

                  const schema = debugInfo.schema || {
                    found: false,
                    count: 0,
                    types: [],
                    schemas: [],
                    isValid: false,
                    validationErrors: [],
                    sentToBing: false,
                  };

                  // Log individual extractions
                  if (debugInfo.contentExtraction) {
                    debugLogger.logContentExtraction(trimmedUrl, debugInfo.contentExtraction);
                  }
                  if (debugInfo.metadata) {
                    debugLogger.logMetadataExtraction(trimmedUrl, debugInfo.metadata);
                  }
                  if (debugInfo.schema) {
                    debugLogger.logSchemaExtraction(trimmedUrl, debugInfo.schema);
                  }

                  // Always log the full content submission debug info
                  debugLogger.logContentSubmission({
                    url: trimmedUrl,
                    contentExtraction: contentExtraction,
                    metadata: metadata,
                    schema: schema,
                    contentHash: debugInfo.contentHash || '',
                    previousHash: debugInfo.previousHash || null,
                    contentChanged: debugInfo.contentChanged !== undefined ? debugInfo.contentChanged : false,
                    requestPayload: {},
                    httpStatus: result.status || 0,
                    bingResponse: result.response || '',
                    bingResponseParsed: null,
                    success: (result.status === 200 || result.status === 202 || result.status === 304),
                    retryAttempts: result.attempts || 1,
                    rateLimitHeaders: {},
                    latency: result.latency || 0,
                  });
                }
              });
            }
          } else if (engineId === 'bing-url') {
            // Use URL submission API for bing-url
            const bingData = await bingApi.submitUrlSingleWithDebug(
              {
                url: trimmedUrl,
                engines: [engineId],
              },
              debugModeEnabled
            );
            allResults.push(...bingData.results);

            // Process debug info and populate debugLogger
            if (debugModeEnabled && bingData.results) {
              bingData.results.forEach((result: PingResult) => {
                if (result.debug) {
                  console.log(`[DEBUG] ${engineId} Result:`, result.debug);

                  // Populate debugLogger with URL submission debug info
                  const debugInfo = result.debug as any;
                  if (debugInfo.requestPayload || debugInfo.httpStatus) {
                    debugLogger.logUrlSubmission({
                      url: trimmedUrl,
                      siteUrl: new URL(trimmedUrl).origin,
                      requestPayload: debugInfo.requestPayload || {},
                      httpStatus: result.status || 0,
                      bingResponse: result.response || '',
                      bingResponseParsed: null,
                      success: result.status === 200 || result.status === 202,
                      retryAttempts: result.attempts || 1,
                      retryReasons: [],
                      rateLimitHeaders: {},
                      latency: result.latency || 0,
                    });
                  }
                }
              });
            }
          } else {
            // Use IndexNow API for indexnow and bing
            const indexNowData = await indexnowApi.single({
              url: trimmedUrl,
              engines: [engineId],
            });
            allResults.push(...indexNowData.results);

            if (debugModeEnabled) {
              console.log(`[DEBUG] ${engineId} Result:`, indexNowData.results);
            }
          }
        } catch (engineError) {
          console.error(`Error with engine ${engineId}:`, engineError);
          allResults.push({
            url: trimmedUrl,
            engine: engineId,
            status: 0,
            meaning: 'Failed',
            latency: 0,
            attempts: 1,
            final: true,
            error: engineError instanceof Error ? engineError.message : 'Unknown error',
          });
        }
      }

      onPingComplete(allResults);

      // Store debug results if debug mode enabled
      if (debugModeEnabled) {
        setDebugResults(allResults);
        console.log(`[DEBUG] Ping completed. Total results: ${allResults.length}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to ping URL';
      setError(message);
      console.error('[ERROR]', message);
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
      {/* URL Input */}
      <div className="space-y-2">
        <Label htmlFor="single-url" className="text-sm font-medium">
          URL to Ping
        </Label>
        <div className="relative">
          <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <Input
            id="single-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/page"
            className="pl-10"
            disabled={disabled || isPinging}
          />
        </div>
      </div>

      {/* Engine Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Search Engines</Label>
        <div className="space-y-3">
          {Object.entries(engines).map(([id, engine]) => (
            <div key={id} className="flex items-start space-x-3">
              <Checkbox
                id={`single-engine-${id}`}
                checked={selectedEngines.includes(id as EngineId)}
                onCheckedChange={(checked) => handleEngineToggle(id as EngineId, checked as boolean)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <Label htmlFor={`single-engine-${id}`} className="text-sm font-medium cursor-pointer">
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

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Ping Button */}
      <Button
        onClick={handlePing}
        disabled={disabled || isPinging || selectedEngines.length === 0}
        className="w-full"
        size="lg"
      >
        {isPinging ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="mr-2"
          >
            <Zap className="w-4 h-4" />
          </motion.div>
        ) : (
          <Zap className="w-4 h-4 mr-2" />
        )}
        {isPinging ? 'Pinging URL...' : 'Ping Single URL'}
      </Button>

      {/* Debug Output - Only show when debug mode enabled and results available */}
      <AnimatePresence>
        {debugModeEnabled && debugResults && url && (
          <DebugOutputPanel url={url} />
        )}
      </AnimatePresence>
    </div>
  );
}
