import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Filter, X } from 'lucide-react';
import { type BulkDebugReport } from '@/lib/debug-storage';

interface DebugReportSearchProps {
  reports: BulkDebugReport[];
  onSelect: (report: BulkDebugReport) => void;
}

export function DebugReportSearch({ reports, onSelect }: DebugReportSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    overallStatus: 'all' as 'all' | 'WORKING' | 'PARTIAL' | 'NEEDS_FIX',
    hasIssues: false,
    engine: 'all' as 'all' | string,
  });

  // Get unique engines
  const engines = useMemo(() => {
    return Array.from(new Set(reports.map(r => r.engine)));
  }, [reports]);

  // Filter and search reports
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      // Search by URL
      if (searchQuery && !report.url.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Filter by overall status
      if (filters.overallStatus !== 'all' && report.verdict.overall !== filters.overallStatus) {
        return false;
      }

      // Filter by issues
      if (filters.hasIssues && report.validations.filter(v => v.status !== 'PASS').length === 0) {
        return false;
      }

      // Filter by engine
      if (filters.engine !== 'all' && report.engine !== filters.engine) {
        return false;
      }

      return true;
    });
  }, [reports, searchQuery, filters]);

  const issueCount = filteredReports.reduce(
    (sum, r) => sum + r.validations.filter(v => v.status !== 'PASS').length,
    0
  );

  const getStatusColor = (status: string) => {
    if (status === 'WORKING') return 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-300';
    if (status === 'NEEDS_FIX') return 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-300';
    return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-300';
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Search by URL..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-8 w-8"
            onClick={() => setSearchQuery('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Overall Status</Label>
            <div className="flex flex-wrap gap-2">
              {['all', 'WORKING', 'PARTIAL', 'NEEDS_FIX'].map((status) => (
                <Badge
                  key={status}
                  variant={filters.overallStatus === status ? 'default' : 'outline'}
                  className={`cursor-pointer ${
                    filters.overallStatus === status ? '' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => setFilters(prev => ({ ...prev, overallStatus: status as any }))}
                >
                  {status === 'all' ? 'All' : status}
                </Badge>
              ))}
            </div>
          </div>

          {/* Engine Filter */}
          {engines.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Engine</Label>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={filters.engine === 'all' ? 'default' : 'outline'}
                  className={`cursor-pointer ${
                    filters.engine === 'all' ? '' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => setFilters(prev => ({ ...prev, engine: 'all' }))}
                >
                  All
                </Badge>
                {engines.map((engine) => (
                  <Badge
                    key={engine}
                    variant={filters.engine === engine ? 'default' : 'outline'}
                    className={`cursor-pointer ${
                      filters.engine === engine ? '' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    onClick={() => setFilters(prev => ({ ...prev, engine }))}
                  >
                    {engine}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Issues Filter */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="has-issues"
              checked={filters.hasIssues}
              onCheckedChange={(checked) =>
                setFilters(prev => ({ ...prev, hasIssues: checked as boolean }))
              }
            />
            <Label htmlFor="has-issues" className="text-sm font-medium cursor-pointer">
              Only show URLs with issues
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-600 dark:text-slate-400">Results</div>
            <div className="text-2xl font-bold">{filteredReports.length}</div>
            <div className="text-xs text-slate-500">of {reports.length} total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-600 dark:text-slate-400">Issues Found</div>
            <div className="text-2xl font-bold">{issueCount}</div>
            <div className="text-xs text-slate-500">across results</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-600 dark:text-slate-400">Avg Status</div>
            <div className="text-2xl font-bold">
              {filteredReports.length > 0
                ? filteredReports.filter(r => r.verdict.overall === 'WORKING').length /
                  filteredReports.length
                  ? ((filteredReports.filter(r => r.verdict.overall === 'WORKING').length /
                    filteredReports.length) * 100).toFixed(0)
                  : '0'
                : '0'}
              %
            </div>
            <div className="text-xs text-slate-500">success rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Results List */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Found {filteredReports.length} Report(s)</Label>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredReports.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-sm text-slate-600 dark:text-slate-400">
                No reports match your search criteria
              </CardContent>
            </Card>
          ) : (
            filteredReports.map(report => (
              <Card
                key={report.url}
                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition"
                onClick={() => onSelect(report)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{report.url}</p>
                      <p className="text-xs text-slate-500 mt-1">{report.engine}</p>
                    </div>
                    <Badge className={getStatusColor(report.verdict.overall)}>
                      {report.verdict.overall}
                    </Badge>
                  </div>
                  {report.validations.filter(v => v.status !== 'PASS').length > 0 && (
                    <div className="mt-3 flex gap-1 flex-wrap">
                      {report.validations
                        .filter(v => v.status !== 'PASS')
                        .slice(0, 3)
                        .map(v => (
                          <Badge
                            key={v.check}
                            variant="outline"
                            className="text-xs"
                          >
                            {v.check}
                          </Badge>
                        ))}
                      {report.validations.filter(v => v.status !== 'PASS').length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{report.validations.filter(v => v.status !== 'PASS').length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
