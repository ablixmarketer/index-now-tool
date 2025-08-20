import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SitemapScanner } from '@/components/SitemapScanner';
import { SingleUrlPing } from '@/components/SingleUrlPing';
import { BulkPingButton } from '@/components/BulkPingButton';
import { ResultsTable } from '@/components/ResultsTable';
import { EngineStatus } from '@/components/EngineStatus';
import { StatusLegend } from '@/components/StatusLegend';
import { ExportButtons } from '@/components/ExportButtons';
import { UrlPreview } from '@/components/UrlPreview';
import { RunSummary } from '@/components/RunSummary';
import { 
  Globe, 
  Zap, 
  Activity, 
  Settings, 
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import { type PingResult, type SitemapUrl } from '@shared/indexnow';

export default function Index() {
  const [scannedUrls, setScannedUrls] = useState<SitemapUrl[]>([]);
  const [pingResults, setPingResults] = useState<PingResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('sitemap');

  const handleScanComplete = (urls: SitemapUrl[]) => {
    setScannedUrls(urls);
    const includedUrls = urls.filter(url => url.reason === 'included').map(url => url.url);
    setSelectedUrls(includedUrls);
  };

  const handlePingProgress = (result: PingResult) => {
    setPingResults(prev => [...prev, result]);
  };

  const handlePingComplete = (results: PingResult[]) => {
    setPingResults(results);
    setIsPinging(false);
  };

  const includedUrls = scannedUrls.filter(url => url.reason === 'included');
  const totalScanned = scannedUrls.length;
  const totalIncluded = includedUrls.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50"
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                IndexNow Ping Console
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Scan sitemaps, filter by dates, and ping search engines instantly
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="hidden sm:flex">
              <Activity className="w-3 h-3 mr-1" />
              Ready
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Console Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="sitemap" className="flex items-center space-x-2">
                  <Globe className="w-4 h-4" />
                  <span>Sitemap Mode</span>
                </TabsTrigger>
                <TabsTrigger value="single" className="flex items-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span>Single URL</span>
                </TabsTrigger>
              </TabsList>

              {/* Sitemap Mode */}
              <TabsContent value="sitemap" className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Input Card */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Settings className="w-5 h-5" />
                          <span>Sitemap Configuration</span>
                        </CardTitle>
                        <CardDescription>
                          Configure your sitemap scanning and filtering options
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <SitemapScanner
                          onScanStart={() => setIsScanning(true)}
                          onScanComplete={handleScanComplete}
                          onScanError={() => setIsScanning(false)}
                          disabled={isPinging}
                        />
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Preview Card */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <BarChart3 className="w-5 h-5" />
                            <span>URL Preview</span>
                          </div>
                          {isScanning && (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                              <span className="text-sm text-slate-600 dark:text-slate-400">Scanning...</span>
                            </div>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Preview and select URLs to ping
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {totalScanned > 0 ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                  {totalScanned.toLocaleString()}
                                </div>
                                <div className="text-sm text-slate-600 dark:text-slate-400">Total URLs</div>
                              </div>
                              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                                  {totalIncluded.toLocaleString()}
                                </div>
                                <div className="text-sm text-green-600 dark:text-green-400">To Ping</div>
                              </div>
                            </div>
                            <UrlPreview 
                              urls={scannedUrls}
                              selectedUrls={selectedUrls}
                              onSelectionChange={setSelectedUrls}
                            />
                          </div>
                        ) : (
                          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                            <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Scan a sitemap to preview URLs</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Bulk Ping Card */}
                {totalIncluded > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="col-span-full"
                  >
                    <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Zap className="w-5 h-5" />
                          <span>Bulk Ping URLs</span>
                        </CardTitle>
                        <CardDescription>
                          Send {selectedUrls.length} selected URLs to search engines
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <BulkPingButton
                          selectedUrls={selectedUrls}
                          onPingStart={() => setIsPinging(true)}
                          onPingProgress={handlePingProgress}
                          onPingComplete={handlePingComplete}
                          disabled={isScanning}
                        />
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Progress Card */}
                {isPinging && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="col-span-full"
                  >
                    <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Clock className="w-5 h-5" />
                          </motion.div>
                          <span>Pinging URLs...</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Progress value={(pingResults.length / selectedUrls.length) * 100} className="mb-2" />
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {pingResults.length} of {selectedUrls.length} URLs processed
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </TabsContent>

              {/* Single URL Mode */}
              <TabsContent value="single" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-2xl mx-auto"
                >
                  <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Zap className="w-5 h-5" />
                        <span>Single URL Ping</span>
                      </CardTitle>
                      <CardDescription>
                        Quickly ping a single URL to all selected search engines
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <SingleUrlPing
                        onPingComplete={handlePingComplete}
                        disabled={isPinging}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Results Section */}
          {pingResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Separator />
              
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Results
                </h2>
                <ExportButtons results={pingResults} />
              </div>

              {/* Summary Cards */}
              <RunSummary results={pingResults} />

              {/* Status Legend */}
              <StatusLegend />

              {/* Engine Status */}
              <EngineStatus results={pingResults} />

              {/* Results Table */}
              <ResultsTable results={pingResults} />
            </motion.div>
          )}

          {/* Empty State */}
          {scannedUrls.length === 0 && pingResults.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center py-16"
            >
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center">
                  <Globe className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Welcome to IndexNow Console
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Start by scanning a sitemap or pinging a single URL to notify search engines about your content updates.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => setActiveTab('sitemap')}
                    className="flex items-center space-x-2"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Scan Sitemap</span>
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setActiveTab('single')}
                    className="flex items-center space-x-2"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Ping Single URL</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
