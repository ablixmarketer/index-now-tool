import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { debugLogger } from '@/lib/debug-logger';
import { Bug, Download, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface DebugModeToggleProps {
  onDebugModeChange?: (enabled: boolean) => void;
}

export function DebugModeToggle({ onDebugModeChange }: DebugModeToggleProps) {
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);

  useEffect(() => {
    // Load debug state on mount
    setIsDebugEnabled(debugLogger.isDebugModeEnabled());
  }, []);

  const handleToggleDebugMode = () => {
    const newState = !isDebugEnabled;
    debugLogger.setEnabled(newState);
    setIsDebugEnabled(newState);
    onDebugModeChange?.(newState);
  };

  const handleExportLogs = () => {
    const logsJSON = debugLogger.exportLogsAsJSON();
    const blob = new Blob([logsJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = () => {
    debugLogger.clearLogs();
  };

  return (
    <div className="flex items-center gap-2">
      {/* Debug Mode Toggle Button */}
      <Button
        variant={isDebugEnabled ? 'default' : 'outline'}
        size="sm"
        onClick={handleToggleDebugMode}
        className="gap-2"
        title={
          isDebugEnabled
            ? 'Debug Mode is ON - Deep inspection and logging enabled'
            : 'Debug Mode is OFF - Production environment'
        }
      >
        <Bug className="w-4 h-4" />
        {isDebugEnabled ? 'Debug Mode' : 'Debug Off'}
      </Button>

      {/* Status Badge */}
      {isDebugEnabled && (
        <Badge variant="secondary" className="gap-1">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Debug Active
        </Badge>
      )}

      {/* Debug Controls (only show when debug is enabled) */}
      {isDebugEnabled && (
        <>
          {/* Export Logs Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportLogs}
            className="gap-2"
            title="Download debug logs as JSON"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>

          {/* Clear Logs Dialog */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                title="Clear all debug logs"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Debug Logs</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to clear all debug logs? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex gap-2 justify-end">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearLogs} className="bg-destructive">
                  Clear Logs
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {/* Debug Info Tooltip */}
      {isDebugEnabled && (
        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded">
          📊 Deep inspection enabled - See browser console for detailed logs
        </div>
      )}
    </div>
  );
}
