import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { debugLogger, FinalDebugVerdict, ContentSubmissionDebugInfo } from '@/lib/debug-logger';
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';

interface DebugOutputPanelProps {
  url: string;
}

export function DebugOutputPanel({ url }: DebugOutputPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'verdict' | 'url-submission' | 'content' | 'metadata' | 'schema' | 'full'
  >('verdict');

  const verdict = debugLogger.generateFinalVerdict(url);
  const allLogs = debugLogger.getUrlDebugLogs(url);
  const contentSubmission = allLogs[`content_submission_${url}`] as
    | ContentSubmissionDebugInfo
    | undefined;
  const urlSubmission = allLogs[`url_submission_${url}`];
  const metadata = allLogs[`metadata_${url}`];
  const schema = allLogs[`schema_${url}`];
  const contentExtraction = allLogs[`content_extraction_${url}`];

  const getStatusIcon = (status: 'PASS' | 'FAIL' | 'SKIPPED' | 'WORKING' | 'NEEDS_FIX' | 'PARTIAL') => {
    if (status === 'PASS' || status === 'WORKING') {
      return <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />;
    }
    if (status === 'FAIL' || status === 'NEEDS_FIX') {
      return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
    }
    return <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'PASS' || status === 'WORKING' || status === 'CONFIRMED') {
      return 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-300';
    }
    if (status === 'FAIL' || status === 'NEEDS_FIX') {
      return 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-300';
    }
    return 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300';
  };

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className="gap-2 w-full justify-start"
      >
        <ChevronDown className="w-4 h-4" />
        Show Debug Verdict for {url.substring(0, 30)}...
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(verdict.overallStatus as any)}
              <div>
                <CardTitle className="text-base">Debug Verdict</CardTitle>
                <CardDescription>Comprehensive submission audit</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Final Verdict Summary */}
          <div className={`rounded-lg p-4 space-y-3 ${getStatusColor(verdict.overallStatus)}`}>
            <div className="font-semibold">Overall Status: {verdict.overallStatus}</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                {getStatusIcon(verdict.urlSubmissionStatus)}
                <span>URL: {verdict.urlSubmissionStatus}</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(verdict.contentSubmissionStatus)}
                <span>Content: {verdict.contentSubmissionStatus}</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(verdict.schemaSubmissionStatus)}
                <span>Schema: {verdict.schemaSubmissionStatus}</span>
              </div>
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                <span>Bing: {verdict.bingAwarenessStatus}</span>
              </div>
            </div>
          </div>

          {/* Issues and Recommendations */}
          {verdict.issues.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Issues Detected:</div>
                <ul className="list-disc list-inside space-y-1">
                  {verdict.issues.map((issue, idx) => (
                    <li key={idx} className="text-sm">
                      {issue}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {verdict.recommendations.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Recommendations:</div>
                <ul className="list-disc list-inside space-y-1">
                  {verdict.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm">
                      {rec}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Detailed Tabs */}
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {(['verdict', 'url-submission', 'content', 'metadata', 'schema', 'full'] as const).map(
                (tab) => (
                  <Button
                    key={tab}
                    variant={activeTab === tab ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
                  </Button>
                )
              )}
            </div>

            <div className="bg-slate-900 dark:bg-slate-950 text-slate-50 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-96 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.pre
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="whitespace-pre-wrap word-break"
                >
                  {activeTab === 'verdict' && (
                    <>
                      {`FINAL DEBUG VERDICT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
URL: ${verdict.url}
URL Submission: ${verdict.urlSubmissionStatus}
Content Submission: ${verdict.contentSubmissionStatus}
Schema Submission: ${verdict.schemaSubmissionStatus}
Bing Awareness: ${verdict.bingAwarenessStatus}
Overall: ${verdict.overallStatus}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`}
                    </>
                  )}

                  {activeTab === 'url-submission' && urlSubmission && (
                    <>{JSON.stringify(urlSubmission, null, 2)}</>
                  )}

                  {activeTab === 'content' && contentExtraction && (
                    <>
                      {`CONTENT EXTRACTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Source: ${contentExtraction.sourceTag}
Characters: ${contentExtraction.characterCount}
Valid: ${contentExtraction.isValid}
Empty: ${contentExtraction.isEmpty}
Header/Footer Only: ${contentExtraction.isHeaderFooterOnly}

Preview:
${contentExtraction.sanitizedPreview}

${contentExtraction.warnings && contentExtraction.warnings.length > 0
  ? `\nWarnings:\n${contentExtraction.warnings.join('\n')}`
  : ''}`}
                    </>
                  )}

                  {activeTab === 'metadata' && metadata && (
                    <>
                      {`METADATA EXTRACTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title: ${metadata.title || 'Not found'}
Description: ${metadata.description || 'Not found'}
Canonical: ${metadata.canonical || 'Not found'}
Robots: ${metadata.robots || 'Not specified'}
Published: ${metadata.publishDate || 'Not found'}
Modified: ${metadata.lastModified || 'Not found'}`}
                    </>
                  )}

                  {activeTab === 'schema' && schema && (
                    <>
                      {`SCHEMA MARKUP ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Found: ${schema.found}
Count: ${schema.count}
Types: ${Array.isArray(schema.types) ? schema.types.join(', ') : 'N/A'}
Valid: ${schema.isValid}
Sent to Bing: ${schema.sentToBing}

${schema.validationErrors && schema.validationErrors.length > 0
  ? `Validation Errors:\n${schema.validationErrors.join('\n')}\n`
  : 'No validation errors'}

${schema.schemas && schema.schemas.length > 0
  ? `Schema Markup Details:\n${JSON.stringify(schema.schemas, null, 2)}`
  : 'No schema markup found'}`}
                    </>
                  )}

                  {activeTab === 'full' && (
                    <>{JSON.stringify(allLogs, null, 2)}</>
                  )}

                  {!allLogs[activeTab === 'url-submission' ? `url_submission_${url}` : activeTab === 'content' ? `content_extraction_${url}` : activeTab === 'metadata' ? `metadata_${url}` : activeTab === 'schema' ? `schema_${url}` : ''] &&
                    activeTab !== 'verdict' &&
                    activeTab !== 'full' && (
                      <>No debug data available for this section</>
                    )}
                </motion.pre>
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
