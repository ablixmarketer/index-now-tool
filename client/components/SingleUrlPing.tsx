import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Globe, Zap, AlertCircle } from 'lucide-react';
import { engines, type EngineId, type PingResult } from '@shared/indexnow';

interface SingleUrlPingProps {
  onPingComplete: (results: PingResult[]) => void;
  disabled?: boolean;
}

export function SingleUrlPing({ onPingComplete, disabled }: SingleUrlPingProps) {
  const [url, setUrl] = useState('');
  const [selectedEngines, setSelectedEngines] = useState<EngineId[]>(['indexnow']);
  const [isPinging, setIsPinging] = useState(false);
  const [error, setError] = useState('');

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

    try {
      const response = await fetch('/api/indexnow/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          engines: selectedEngines
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      onPingComplete(data.results);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to ping URL';
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
    </div>
  );
}
