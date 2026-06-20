import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Copy,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  FileJson,
  FileText,
} from 'lucide-react';
import { BulkDebugReport, debugStorage } from '@/lib/debug-storage';

interface DeepDebugModalProps {
  url: string;
  engine: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeepDebugModal({ url, engine, open, onOpenChange }: DeepDebugModalProps) {
  const [report, setReport] = useState<BulkDebugReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('verdict');

  useEffect(() => {
    if (!open) return;

    const loadReport = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log(`[BULK DEBUG] Loading detailed report for ${url} (engine: ${engine})`);
        const data = await debugStorage.getReport(url, engine);
        if (!data) {
          setError(`Debug report not found for ${engine} engine`);
        } else {
          setReport(data);
          console.log(`[BULK DEBUG] Loaded report for ${engine}: verdict = ${data.verdict.overall}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [url, engine, open]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getVerdictIcon = (status: 'PASS' | 'FAIL' | 'SKIPPED' | 'WORKING' | 'PARTIAL' | 'NEEDS_FIX') => {
    if (status === 'PASS' || status === 'WORKING') {
      return <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />;
    }
    if (status === 'FAIL' || status === 'NEEDS_FIX') {
      return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
    }
    return <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
  };

  const getVerdictColor = (status: string) => {
    if (status === 'PASS' || status === 'WORKING' || status === 'CONFIRMED') {
      return 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-300';
    }
    if (status === 'FAIL' || status === 'NEEDS_FIX') {
      return 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-300';
    }
    return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-300';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Deep Debug Report</span>
            {report && <Badge variant="outline" className="text-xs">{report.status}</Badge>}
          </DialogTitle>
          <DialogDescription className="truncate">{url}</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-sm text-slate-600 dark:text-slate-400">Loading detailed report...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {report && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 overflow-hidden flex flex-col"
          >
            {/* Export Buttons */}
            <div className="flex gap-2 mb-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const json = debugStorage.exportAsJSON(report);
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `debug-${new URL(report.url).hostname}.json`;
                  a.click();
                }}
                className="gap-2"
              >
                <FileJson className="w-4 h-4" />
                Export JSON
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const csv = debugStorage.exportAsCSV(report);
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `debug-${new URL(report.url).hostname}.csv`;
                  a.click();
                }}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                Export CSV
              </Button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
                <TabsTrigger value="verdict" className="text-xs">Verdict</TabsTrigger>
                <TabsTrigger value="url-submission" className="text-xs">URL</TabsTrigger>
                <TabsTrigger value="content" className="text-xs">Content</TabsTrigger>
                <TabsTrigger value="metadata" className="text-xs">Metadata</TabsTrigger>
                <TabsTrigger value="schema" className="text-xs">Schema</TabsTrigger>
                <TabsTrigger value="html" className="text-xs">HTML</TabsTrigger>
                <TabsTrigger value="api" className="text-xs">API</TabsTrigger>
                <TabsTrigger value="validation" className="text-xs">Checks</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-4">
                {/* Verdict Tab */}
                <TabsContent value="verdict" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {getVerdictIcon(report.verdict.overall as any)}
                        Final Verdict
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">URL Submission</div>
                          <Badge className={`${getVerdictColor(report.verdict.url)}`}>
                            {report.verdict.url}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Content Submission</div>
                          <Badge className={`${getVerdictColor(report.verdict.content)}`}>
                            {report.verdict.content}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Schema Markup</div>
                          <Badge className={`${getVerdictColor(report.verdict.schema)}`}>
                            {report.verdict.schema}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Bing Awareness</div>
                          <Badge className={`${getVerdictColor(report.verdict.bing)}`}>
                            {report.verdict.bing}
                          </Badge>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Overall Status</div>
                        <Badge className={`text-lg px-4 py-2 ${getVerdictColor(report.verdict.overall)}`}>
                          {report.verdict.overall}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded">
                          <div className="text-xs text-slate-600 dark:text-slate-400">HTTP Status</div>
                          <div className="text-2xl font-bold">{report.status}</div>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded">
                          <div className="text-xs text-slate-600 dark:text-slate-400">Latency</div>
                          <div className="text-2xl font-bold">{report.latency}ms</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* URL Submission Tab */}
                <TabsContent value="url-submission" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>URL Submission Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-sm font-medium mb-2">Endpoint</div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm font-mono">/api/bing/submit-urls</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-2 flex items-center justify-between">
                          Request Payload
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(JSON.stringify(report.requestPayload, null, 2))}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <pre className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs overflow-x-auto">
                          {JSON.stringify(report.requestPayload, null, 2)}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Content Submission Tab */}
                <TabsContent value="content" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Content Extraction</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium">Source Tag</div>
                          <Badge variant="outline">{report.content.sourceTag}</Badge>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Characters</div>
                          <Badge variant="outline">{report.content.characterCount}</Badge>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <div className="text-sm font-medium mb-2">Preview</div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded text-sm max-h-48 overflow-y-auto">
                          {report.content.sanitizedPreview.substring(0, 500)}...
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Metadata Tab */}
                <TabsContent value="metadata" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Metadata Extraction</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-sm font-medium">Title</div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm">{report.metadata.title}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Description</div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm">{report.metadata.description}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Canonical</div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm font-mono text-xs">{report.metadata.canonical}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Robots</div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm">{report.metadata.robots || 'Not set'}</div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Schema Tab */}
                <TabsContent value="schema" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Schema Markup</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium">Found</div>
                          <Badge variant={report.schema.found ? 'default' : 'secondary'}>
                            {report.schema.found ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Count</div>
                          <Badge variant="outline">{report.schema.count}</Badge>
                        </div>
                      </div>
                      {report.schema.types.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-2">Types</div>
                          <div className="flex flex-wrap gap-2">
                            {report.schema.types.map((type) => (
                              <Badge key={type} variant="outline">{type}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {report.schema.schemas.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-2 flex items-center justify-between">
                            Raw JSON-LD
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(JSON.stringify(report.schema.schemas, null, 2))}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          <pre className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs overflow-x-auto max-h-64">
                            {JSON.stringify(report.schema.schemas, null, 2)}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* HTML Tab */}
                <TabsContent value="html" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>HTML Snapshot</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {report.htmlSnapshot ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded">
                              <div className="text-xs text-slate-600 dark:text-slate-400">Total Size</div>
                              <div className="text-lg font-bold">{(report.htmlSnapshot.fullSize / 1024).toFixed(2)} KB</div>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded">
                              <div className="text-xs text-slate-600 dark:text-slate-400">Charset</div>
                              <div className="text-lg font-bold">{report.htmlSnapshot.charset}</div>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-2">Head Preview</div>
                            <pre className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs overflow-x-auto max-h-48">
                              {report.htmlSnapshot.head.substring(0, 500)}
                            </pre>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-2">Body Preview</div>
                            <pre className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs overflow-x-auto max-h-48">
                              {report.htmlSnapshot.bodyPreview.substring(0, 500)}
                            </pre>
                          </div>
                        </>
                      ) : (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>HTML snapshot not available</AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* API Response Tab */}
                <TabsContent value="api" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>API Response</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium">Endpoint</div>
                          <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm font-mono text-xs">{report.apiResponse.endpoint}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Status</div>
                          <Badge className={`${getVerdictColor(report.apiResponse.status.toString())}`}>
                            {report.apiResponse.status}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-2 flex items-center justify-between">
                          Response Body
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(report.apiResponse.body)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <pre className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs overflow-x-auto max-h-96">
                          {report.apiResponse.body}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Validation Checks Tab */}
                <TabsContent value="validation" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Validation Checks</CardTitle>
                      <CardDescription>{report.validations.length} checks performed</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {report.validations.map((check, idx) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-medium text-sm">{check.check}</span>
                            <Badge
                              className={
                                check.status === 'PASS'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-300'
                                  : check.status === 'WARN'
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-300'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-300'
                              }
                            >
                              {check.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{check.message}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
