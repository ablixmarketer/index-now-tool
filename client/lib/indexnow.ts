import pLimit from 'p-limit';
import { engines, type EngineId, type PingResult, statusToMeaning } from '@shared/indexnow';

export interface PingOptions {
  concurrency?: number;
  maxRetries?: number;
  baseDelay?: number;
}

export class IndexNowPinger {
  private limit: ReturnType<typeof pLimit>;
  private maxRetries: number;
  private baseDelay: number;

  constructor(options: PingOptions = {}) {
    this.limit = pLimit(options.concurrency || 5);
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
  }

  async pingUrls(
    urls: string[],
    selectedEngines: EngineId[],
    mode: 'update' | 'delete' = 'update',
    onProgress?: (result: PingResult) => void
  ): Promise<PingResult[]> {
    const results: PingResult[] = [];
    
    // Process each engine
    for (const engineId of selectedEngines) {
      const engine = engines[engineId];
      
      if (engine.type === 'bulk') {
        // Handle bulk engines (like IndexNow hub)
        const bulkResults = await this.pingBulk(urls, engineId, mode);
        results.push(...bulkResults);
        bulkResults.forEach(result => onProgress?.(result));
      } else {
        // Handle single URL engines (like Bing)
        const singleResults = await Promise.all(
          urls.map(url => 
            this.limit(() => this.pingSingle(url, engineId, mode))
          )
        );
        results.push(...singleResults);
        singleResults.forEach(result => onProgress?.(result));
      }
    }
    
    return results;
  }

  async pingSingle(
    url: string,
    engineId: EngineId,
    mode: 'update' | 'delete' = 'update'
  ): Promise<PingResult> {
    const engine = engines[engineId];
    const startTime = Date.now();
    
    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        const result = await this.performSinglePing(url, engineId, mode);
        const latency = Date.now() - startTime;
        
        return {
          ...result,
          latency,
          attempts: attempt,
          final: true
        };
      } catch (error) {
        if (attempt <= this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        const latency = Date.now() - startTime;
        return {
          url,
          engine: engineId,
          status: 0,
          meaning: 'Network Error',
          latency,
          attempts: attempt,
          final: true,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    // This should never be reached, but TypeScript requires it
    throw new Error('Unexpected end of retry loop');
  }

  private async performSinglePing(
    url: string,
    engineId: EngineId,
    mode: 'update' | 'delete'
  ): Promise<Omit<PingResult, 'latency' | 'attempts' | 'final'>> {
    // This would normally make a server request to avoid CORS and expose secrets
    // For demo purposes, we'll simulate the ping
    const response = await fetch('/api/indexnow/single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, engine: engineId, mode })
    });
    
    const data = await response.json();
    
    return {
      url,
      engine: engineId,
      status: data.status,
      meaning: statusToMeaning(data.status),
      response: data.response
    };
  }

  private async pingBulk(
    urls: string[],
    engineId: EngineId,
    mode: 'update' | 'delete'
  ): Promise<PingResult[]> {
    const batches = this.chunkUrls(urls, 10000);
    const results: PingResult[] = [];
    
    for (const batch of batches) {
      try {
        const response = await fetch('/api/indexnow/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            urls: batch, 
            engine: engineId, 
            mode 
          })
        });
        
        const data = await response.json();
        results.push(...data.results);
      } catch (error) {
        // Add error results for all URLs in failed batch
        const errorResults: PingResult[] = batch.map(url => ({
          url,
          engine: engineId,
          status: 0,
          meaning: 'Network Error',
          latency: 0,
          attempts: 1,
          final: true,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
        results.push(...errorResults);
      }
    }
    
    return results;
  }

  private chunkUrls(urls: string[], chunkSize: number): string[][] {
    const chunks: string[][] = [];
    for (let i = 0; i < urls.length; i += chunkSize) {
      chunks.push(urls.slice(i, i + chunkSize));
    }
    return chunks;
  }

  updateConcurrency(concurrency: number) {
    this.limit = pLimit(concurrency);
  }
}

export const indexNowPinger = new IndexNowPinger();
