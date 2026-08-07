# Environment Configuration Setup

## Overview

The application now properly manages all API keys, domains, and credentials through **environment variables**, enabling it to work across multiple websites without hardcoding values.

## How It Works

### Backend (Server-Side)

#### 1. **Site Middleware** (`code/server/middleware/site-middleware.ts`)
- Runs on every request
- Reads environment variables from the deployment environment
- Attaches configuration to the request object (`req.siteConfig`)
- Variables read:
  - `INDEXNOW_KEY`
  - `INDEXNOW_KEY_LOCATION`
  - `BING_SUBMISSION_API_KEY`

#### 2. **Route Handlers** (Updated)
All API route handlers now use `req.siteConfig` instead of reading `process.env` directly:

**Updated Files:**
- `code/server/routes/bing-content-submission.ts`
- `code/server/routes/bing-url-submission.ts`
- `code/server/routes/indexnow.ts`

**Example Usage:**
```typescript
const siteReq = req as SiteRequest;
const bingApiKey = siteReq.siteConfig?.bingApiKey;
```

#### 3. **Configuration Endpoint** (`code/server/index.ts`)
- `/api/config` - Returns current environment configuration
- Reads fresh values on every request
- Returns:
  ```json
  {
    "domain": "www.example.com",
    "indexNowKey": "your-key-here",
    "indexNowKeyLocation": "https://www.example.com",
    "bingApiKey": "your-bing-key"
  }
  ```

### Frontend (Client-Side)

#### 1. **Site Manager** (`code/client/lib/site-manager.ts`)
- Initializes on app startup
- **Always loads environment config first** via `/api/config`
- Then merges user-added sites from localStorage
- Default site from environment is always fresh

**Key Logic:**
```typescript
async init(): Promise<void> {
  // Load environment config FIRST (fresh from server)
  await this.loadFromEnvironment();
  
  // Then merge localStorage sites (non-default only)
  // Ensures fresh environment values override stale local storage
}
```

#### 2. **Site Selector** (`code/client/components/SiteSelector.tsx`)
- Displays available sites
- Allows switching between sites
- Default site always comes from current deployment's environment

## Deployment Instructions

### For Each New Website/Domain:

1. **Set Environment Variables on Render:**
   ```bash
   INDEXNOW_KEY=<your-indexnow-key>
   INDEXNOW_KEY_LOCATION=https://<your-domain>
   BING_SUBMISSION_API_KEY=<your-bing-key>
   NODE_ENV=production
   API_PORT=3001
   ```

2. **Deploy the application:**
   ```bash
   git push origin <branch>
   # or trigger Render deployment
   ```

3. **Verify Configuration:**
   - Visit `https://your-render-url/` (the app)
   - The Site Selector should show your domain as the default
   - Make a test request to verify credentials work

### Example Environment Variables:

**For website A (www.example1.com):**
```
INDEXNOW_KEY=abc123def456
INDEXNOW_KEY_LOCATION=https://www.example1.com
BING_SUBMISSION_API_KEY=bing-key-for-example1
NODE_ENV=production
API_PORT=3001
```

**For website B (www.example2.com):**
```
INDEXNOW_KEY=xyz789uvw456
INDEXNOW_KEY_LOCATION=https://www.example2.com
BING_SUBMISSION_API_KEY=bing-key-for-example2
NODE_ENV=production
API_PORT=3001
```

## How Configuration Flows

### Request Flow:
```
1. Client makes API request
   ↓
2. Express middleware runs (site-middleware)
   ↓
3. Environment variables → req.siteConfig
   ↓
4. Route handler reads req.siteConfig
   ↓
5. API credentials are sent to Bing/IndexNow
```

### Client Initialization Flow:
```
1. App loads
   ↓
2. Site Manager init()
   ↓
3. Fetch /api/config (gets fresh env values)
   ↓
4. Load from localStorage (non-default sites)
   ↓
5. Set as "default" site (environment values)
   ↓
6. Display in Site Selector
```

## Key Benefits

✅ **Fresh Configuration on Each Deployment**
- No stale values persisting from previous deployments
- Environment variables are the source of truth

✅ **Multiple Website Support**
- Each deployment can serve a different domain
- User-added sites (via browser UI) can augment the default

✅ **Per-Request Evaluation**
- Environment variables read fresh on every request
- No module-level caching of credentials

✅ **Fallback to Defaults**
- If environment variables not set, graceful errors
- Clear error messages for missing configuration

## Troubleshooting

### Issue: Still using old domain credentials

**Solution:**
1. Check Render environment variables are set correctly
2. Verify `/api/config` returns correct values
3. Clear browser localStorage: 
   ```javascript
   localStorage.removeItem('site_api_config')
   ```
4. Refresh the app

### Issue: "Host Mismatch" error from IndexNow/Bing

**Likely Cause:** Environment variables don't match the domain being tested

**Solution:**
1. Verify `INDEXNOW_KEY_LOCATION` matches the domain you're testing
2. Verify `INDEXNOW_KEY` is valid for that domain
3. Verify `BING_SUBMISSION_API_KEY` is valid for that domain
4. Check that IndexNow key file exists at the location

### Issue: Keys not loading on app startup

**Solution:**
1. Check `/api/config` endpoint returns data
2. Verify Site Manager initialization completes
3. Check browser console for errors
4. Clear localStorage cache and reload

## Files Modified

- `code/server/middleware/site-middleware.ts` - Safe environment variable reading
- `code/server/routes/bing-content-submission.ts` - Uses req.siteConfig
- `code/server/routes/bing-url-submission.ts` - Uses req.siteConfig
- `code/server/routes/indexnow.ts` - Uses req.siteConfig
- `code/server/index.ts` - /api/config endpoint (already correct)
- `code/client/lib/site-manager.ts` - Loads environment first (already correct)

## Security Notes

⚠️ **Never commit API keys to repository**
- Use Render's environment variable system
- Or use `.env` file (in .gitignore)

⚠️ **API Keys in Frontend**
- Bing API key and IndexNow key are transmitted to frontend
- This is acceptable as they're meant for submissions
- Never expose database credentials in frontend

⚠️ **Environment Variables in Logs**
- Ensure production logs don't expose full API keys
- Current implementation logs only first 8 characters: `key...`
