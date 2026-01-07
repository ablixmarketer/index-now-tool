import { RequestHandler } from 'express';
import pLimit from 'p-limit';
import {
  SingleBingUrlSubmissionSchema,
  BulkBingUrlSubmissionSchema,
  BingUrlSubmissionResponse,
  BingSubmissionResult,
} from '@shared/bing-submission';
import {
  fetchUrlContent,
  extractPageContent,
  convertToBingPayload,
  sanitizeForDebug,
} from '../services/bing-submission/content-fetcher';
import {
  submitContentToBingAPI,
} from '../services/bing-submission/bing-api-client';
import {
  logSubmissionAttempt,
  logSubmissionResponse,
  generateSimpleHash,
} from '../services/bing-submission/debug-instrumenter';

// Rate limiter for concurrent content crawls
const limit = pLimit(3);

// Get API key from environment
const BING_API_KEY = process.env.BING_SUBMISSION_API_KEY;

// Store content hashes for change detection (in-memory, can be replaced with DB)
const contentHashStore = new Map<string, string>();

export const handleSingleBingContentSubmission: RequestHandler = async (req, res) => {
  try {
    // Handle Buffer body from serverless-http
    let bodyData = req.body;
    if (Buffer.isBuffer(bodyData)) {
      bodyData = JSON.parse(bodyData.toString('utf-8'));
    }

    // Validate request
    const validation = SingleBingUrlSubmissionSchema.safeParse(bodyData);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.errors,
      });
    }

    // Check API key
    if (!BING_API_KEY) {
      return res.status(400).json({
        error: 'Bing API not configured',
        message: 'BING_SUBMISSION_API_KEY environment variable is required',
      });
    }

    const { url, engines: selectedEngines, debug = false } = validation.data;

    const results: BingSubmissionResult[] = [];

    // Only process if bing-content is selected
    if (!selectedEngines.includes('bing-content')) {
      return res.json({ results: [], summary: { total: 0, succeeded: 0, failed: 0, rateLimited: 0 } });
    }

    if (debug) {
      console.log(`[DEBUG] Starting content submission for: ${url}`);
    }

    try {
      // Step 1: Fetch content
      if (debug) console.log(`[DEBUG] Fetching content from ${url}...`);

      const fetched = await fetchUrlContent(url);

      if (debug) {
        console.log(`[DEBUG] Successfully fetched ${fetched.html.length} bytes`);
      }

      // Step 2: Extract content
      if (debug) console.log(`[DEBUG] Extracting page content...`);

      const extracted = extractPageContent(fetched);

      if (debug) {
        console.log(`[DEBUG] Content Extraction:`, {
          sourceTag: extracted.sourceTag,
          contentLength: extracted.contentLength,
          schemaCount: extracted.schemas.length,
          warnings: extracted.warnings,
          preview: sanitizeForDebug(extracted.mainContent, 200),
        });
      }

      // Step 3: Check if content changed (hash comparison)
      const contentHash = generateSimpleHash(extracted.mainContent);
      const previousHash = contentHashStore.get(url);
      const contentChanged = contentHash !== previousHash;

      if (debug) {
        console.log(`[DEBUG] Content Hash:`, {
          current: contentHash,
          previous: previousHash,
          changed: contentChanged,
        });
      }

      // Skip if content hasn't changed
      if (!contentChanged && previousHash) {
        const result: BingSubmissionResult = {
          url,
          engine: 'bing-content',
          status: 304, // Not Modified
          meaning: 'Content unchanged - skipped',
          latency: 0,
          attempts: 1,
          final: true,
        };

        if (debug) {
          result.debug = {
            reason: 'Content hash matches previous submission',
            currentHash: contentHash,
            previousHash,
          };
          console.log(`[DEBUG] Skipping - content unchanged`);
        }

        results.push(result);
      } else {
        // Step 4: Convert to Bing payload
        const bingPayload = convertToBingPayload(extracted);

        if (debug) {
          logSubmissionAttempt(url, 'content', {
            ...bingPayload,
            httpMessage: bingPayload.httpMessage.substring(0, 200) + '...',
          } as unknown as Record<string, unknown>, true);
        }

        // Step 5: Submit to Bing
        const submissionResult = await submitContentToBingAPI(bingPayload, BING_API_KEY);

        // Store hash after successful submission
        if (submissionResult.status === 200 || submissionResult.status === 202) {
          contentHashStore.set(url, contentHash);
        }

        if (debug) {
          logSubmissionResponse(url, 'content', submissionResult.status, submissionResult.response || '', submissionResult.latency, true);

          submissionResult.debug = {
            debugModeEnabled: true,
            contentExtraction: {
              sourceTag: extracted.sourceTag,
              characterCount: extracted.contentLength,
              sanitizedPreview: sanitizeForDebug(extracted.mainContent),
              isValid: extracted.contentLength > 100,
              isEmpty: extracted.contentLength === 0,
              isHeaderFooterOnly: false,
              warnings: extracted.warnings,
            },
            metadata: {
              title: extracted.metadata.title,
              description: extracted.metadata.description,
              canonical: extracted.metadata.canonical,
              robots: extracted.metadata.robots,
              publishDate: extracted.metadata.publishDate,
              lastModified: extracted.metadata.lastModified,
            },
            schema: {
              found: extracted.schemas.length > 0,
              count: extracted.schemas.length,
              types: extracted.schemas.map((s) => (s['@type'] as string) || 'Unknown'),
              isValid: true,
              validationErrors: [],
              sentToBing: extracted.schemas.length > 0,
            },
            contentHash,
            previousHash,
            contentChanged,
          };
        }

        results.push(submissionResult);
      }
    } catch (error) {
      const latency = 0;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`[ERROR] Content submission failed for ${url}:`, error);

      const result: BingSubmissionResult = {
        url,
        engine: 'bing-content',
        status: 0,
        meaning: 'Failed - Crawl or Processing Error',
        latency,
        attempts: 1,
        final: true,
        error: errorMessage,
      };

      if (debug) {
        result.debug = {
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          errorMessage: errorMessage,
          fullError: error,
        };
      }

      results.push(result);
    }

    const summary = {
      total: results.length,
      succeeded: results.filter((r) => r.status === 200 || r.status === 202 || r.status === 204).length,
      failed: results.filter((r) => r.status >= 400 && r.status !== 429).length,
      rateLimited: results.filter((r) => r.status === 429).length,
    };

    const response: BingUrlSubmissionResponse = {
      results,
      summary,
    };

    if (debug) {
      console.log('[DEBUG] Single Content Submission Response:', response);
    }

    res.json(response);
  } catch (error) {
    console.error('Single Bing content submission error:', error);
    res.status(500).json({
      error: 'Failed to submit content to Bing',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const handleBulkBingContentSubmission: RequestHandler = async (req, res) => {
  try {
    // Handle Buffer body from serverless-http
    let bodyData = req.body;
    if (Buffer.isBuffer(bodyData)) {
      bodyData = JSON.parse(bodyData.toString('utf-8'));
    }

    // Validate request
    const validation = BulkBingUrlSubmissionSchema.safeParse(bodyData);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.errors,
      });
    }

    // Check API key
    if (!BING_API_KEY) {
      return res.status(400).json({
        error: 'Bing API not configured',
        message: 'BING_SUBMISSION_API_KEY environment variable is required',
      });
    }

    const { urls, engines: selectedEngines, debug = false } = validation.data;

    const results: BingSubmissionResult[] = [];

    // Only process if bing-content is selected
    if (!selectedEngines.includes('bing-content')) {
      return res.json({ results: [], summary: { total: 0, succeeded: 0, failed: 0, rateLimited: 0 } });
    }

    if (debug) {
      console.log(`[DEBUG] Starting bulk content submission for ${urls.length} URLs`);
    }

    // Process URLs with concurrency control (max 3 parallel crawls)
    const urlResults = await Promise.all(
      urls.map((url) =>
        limit(async () => {
          try {
            // Fetch content
            const fetched = await fetchUrlContent(url);
            const extracted = extractPageContent(fetched);

            // Check if content changed
            const contentHash = generateSimpleHash(extracted.mainContent);
            const previousHash = contentHashStore.get(url);
            const contentChanged = contentHash !== previousHash;

            if (!contentChanged && previousHash) {
              return {
                url,
                engine: 'bing-content' as const,
                status: 304,
                meaning: 'Content unchanged - skipped',
                latency: 0,
                attempts: 1,
                final: true,
              } as BingSubmissionResult;
            }

            // Submit to Bing
            const bingPayload = convertToBingPayload(extracted);
            const submissionResult = await submitContentToBingAPI(bingPayload, BING_API_KEY);

            // Store hash after successful submission
            if (submissionResult.status === 200 || submissionResult.status === 202) {
              contentHashStore.set(url, contentHash);
            }

            if (debug) {
              submissionResult.debug = {
                contentLength: extracted.contentLength,
                schemaCount: extracted.schemas.length,
                contentHash,
                previousHash,
                contentChanged,
              };
            }

            return submissionResult;
          } catch (error) {
            return {
              url,
              engine: 'bing-content' as const,
              status: 0,
              meaning: 'Failed - Crawl or Processing Error',
              latency: 0,
              attempts: 1,
              final: true,
              error: error instanceof Error ? error.message : 'Unknown error',
            } as BingSubmissionResult;
          }
        })
      )
    );

    results.push(...urlResults);

    const summary = {
      total: results.length,
      succeeded: results.filter((r) => r.status === 200 || r.status === 202 || r.status === 204).length,
      failed: results.filter((r) => r.status >= 400 && r.status !== 429).length,
      rateLimited: results.filter((r) => r.status === 429).length,
    };

    const response: BingUrlSubmissionResponse = {
      results,
      summary,
    };

    if (debug) {
      console.log('[DEBUG] Bulk Content Submission Response:', {
        totalUrls: urls.length,
        totalResults: results.length,
        summary,
      });
    }

    res.json(response);
  } catch (error) {
    console.error('Bulk Bing content submission error:', error);
    res.status(500).json({
      error: 'Failed to submit content to Bing',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
