import { RequestHandler } from 'express';
import pLimit from 'p-limit';
import {
  SingleBingUrlSubmissionSchema,
  BulkBingUrlSubmissionSchema,
  BingUrlSubmissionResponse,
  BingSubmissionResult,
} from '@shared/bing-submission';
import { submitUrlsToBingAPI, SubmitUrlsPayload } from '../services/bing-submission/bing-api-client';
import { logSubmissionAttempt, logSubmissionResponse } from '../services/bing-submission/debug-instrumenter';

// Rate limiter for concurrent requests
const limit = pLimit(2);

// Get API key from environment
const BING_API_KEY = process.env.BING_SUBMISSION_API_KEY;

export const handleSingleBingUrlSubmission: RequestHandler = async (req, res) => {
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

    const { url, engines: selectedEngines } = validation.data;

    // Extract domain from URL for siteUrl parameter
    const siteUrl = new URL(url).origin;

    const results: BingSubmissionResult[] = [];

    // Process URL submission
    if (selectedEngines.includes('bing-url')) {
      const payload: SubmitUrlsPayload = {
        siteUrl,
        urlList: [url],
      };

      const urlResults = await submitUrlsToBingAPI(payload, BING_API_KEY);
      results.push(...urlResults);
    }

    // Note: bing-content is handled by a separate endpoint (not implemented yet)
    // This keeps URL submission and content submission logic separate

    const summary = {
      total: results.length,
      succeeded: results.filter((r) => r.status === 200 || r.status === 202 || r.status === 204)
        .length,
      failed: results.filter((r) => r.status >= 400 && r.status !== 429).length,
      rateLimited: results.filter((r) => r.status === 429).length,
    };

    const response: BingUrlSubmissionResponse = {
      results,
      summary,
    };

    res.json(response);
  } catch (error) {
    console.error('Single Bing URL submission error:', error);
    res.status(500).json({
      error: 'Failed to submit URL to Bing',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const handleBulkBingUrlSubmission: RequestHandler = async (req, res) => {
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

    const { urls, engines: selectedEngines, mode } = validation.data;

    // Extract domain from first URL for siteUrl parameter
    const siteUrl = new URL(urls[0]).origin;

    const results: BingSubmissionResult[] = [];

    // Process URL submission if selected
    if (selectedEngines.includes('bing-url')) {
      // Batch submission in chunks of 50 URLs (Bing's recommended batch size)
      const batchSize = 50;
      const batches = [];

      for (let i = 0; i < urls.length; i += batchSize) {
        const batchUrls = urls.slice(i, i + batchSize);
        batches.push(batchUrls);
      }

      // Submit batches with concurrency control
      const batchResults = await Promise.all(
        batches.map((batchUrls) =>
          limit(async () => {
            const payload: SubmitUrlsPayload = {
              siteUrl,
              urlList: batchUrls,
            };
            return submitUrlsToBingAPI(payload, BING_API_KEY);
          })
        )
      );

      results.push(...batchResults.flat());
    }

    // Note: bing-content is handled by a separate endpoint
    // This keeps the concerns separated and allows independent scaling

    const summary = {
      total: results.length,
      succeeded: results.filter((r) => r.status === 200 || r.status === 202 || r.status === 204)
        .length,
      failed: results.filter((r) => r.status >= 400 && r.status !== 429).length,
      rateLimited: results.filter((r) => r.status === 429).length,
    };

    const response: BingUrlSubmissionResponse = {
      results,
      summary,
    };

    res.json(response);
  } catch (error) {
    console.error('Bulk Bing URL submission error:', error);
    res.status(500).json({
      error: 'Failed to submit URLs to Bing',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
