# Deployment Checklist

## ✅ Completed: Environment Variable Management

### Code Changes
- [x] Updated `bing-content-submission.ts` to use `req.siteConfig`
- [x] Updated `bing-url-submission.ts` to use `req.siteConfig`
- [x] Updated `indexnow.ts` to use `req.siteConfig`
- [x] Fixed TypeScript errors in `server/index.ts`
- [x] Verified middleware properly injects site configuration
- [x] Confirmed `/api/config` endpoint works correctly
- [x] Verified client-side site manager loads environment first

### Build Verification
- [x] TypeScript compilation: **PASSED**
- [x] Client build: **PASSED** (dist/spa/)
- [x] Server build: **PASSED** (dist/server/index.mjs)
- [x] No hardcoded API keys remaining in code

## 📋 Pre-Deployment Checklist

Before deploying to production:

### 1. Environment Variables Setup
- [ ] Have your IndexNow key ready
- [ ] Have your IndexNow key location URL (domain)
- [ ] Have your Bing Submission API key ready
- [ ] Know the domain you're deploying for

### 2. Render Configuration
- [ ] Log in to Render dashboard
- [ ] Navigate to your service settings
- [ ] Go to Environment section
- [ ] Add/update these variables:
  ```
  INDEXNOW_KEY=<your-key>
  INDEXNOW_KEY_LOCATION=https://<your-domain>
  BING_SUBMISSION_API_KEY=<your-key>
  NODE_ENV=production
  API_PORT=3001
  ```

### 3. Code Deployment
- [ ] Push latest code to your Git repository
- [ ] Trigger Render deployment (auto if connected)
- [ ] Wait for build to complete
- [ ] Check Render logs for any errors

### 4. Post-Deployment Verification
- [ ] Visit your app URL
- [ ] Check Site Selector shows correct domain
- [ ] Fetch `/api/config` endpoint to verify configuration
  - Should return your domain, keys, etc.
- [ ] Submit a test URL with debug mode enabled
- [ ] Check network tab to verify correct credentials sent
- [ ] Verify successful response from Bing/IndexNow

## 🔄 Workflow: Updating Configuration for New Website

### Step 1: Prepare New Credentials
```
1. Get IndexNow key from: https://www.indexnow.org/
2. Upload key file to your website
3. Get Bing Submission API key
4. Note your domain name
```

### Step 2: Update Render Environment
```
Navigate to:
Render Dashboard → Your Service → Environment Variables

Update:
INDEXNOW_KEY=<new-key>
INDEXNOW_KEY_LOCATION=https://your-new-domain.com
BING_SUBMISSION_API_KEY=<new-key>
```

### Step 3: Trigger Deployment
```
Option A: Auto deployment
- Push to your deployment branch

Option B: Manual deployment
- Click "Manual Deploy" in Render dashboard
- Select branch and deploy
```

### Step 4: Verify
```
1. Wait for build to complete (watch Render logs)
2. Visit your app: https://your-render-url.com
3. Test with a URL from your site
4. Verify in debug output that correct domain was used
5. Check Bing/IndexNow responses are successful
```

## ⚠️ Common Mistakes to Avoid

### ❌ Mistake 1: Hardcoding Domain in Code
```typescript
// WRONG - Don't do this
const domain = "www.airi.health"; // hardcoded
```
```typescript
// CORRECT - Let environment variables drive it
const domain = siteReq.siteConfig?.indexNowKeyLocation;
```
✅ **Status:** Fixed - Using environment variables

### ❌ Mistake 2: Not Clearing Browser Cache
```javascript
// After changing environment variables, users need to:
localStorage.removeItem('site_api_config')
// Then refresh the page
```
✅ **Status:** Documented in troubleshooting

### ❌ Mistake 3: Wrong Domain/Key Pairs
```
If INDEXNOW_KEY_LOCATION=https://example1.com
But INDEXNOW_KEY is for example2.com
→ Will get "Host Mismatch" error
```
✅ **Status:** Middleware will fail safely with error message

### ❌ Mistake 4: Missing Environment Variables
```
If any of these are missing:
- INDEXNOW_KEY
- INDEXNOW_KEY_LOCATION  
- BING_SUBMISSION_API_KEY
→ API will return error: "not configured"
```
✅ **Status:** Routes check and return clear error messages

## 📊 Configuration Flow Diagram

```
                    ┌─────────────────────┐
                    │  Browser/App Loads  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  SiteManager.init() │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────────────────┐
                    │  Fetch /api/config              │
                    │  (Gets fresh env values)        │
                    └──────────┬──────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Load from localStorage       │
                    │  (User-added sites only)      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────────────────┐
                    │  Display in Site Selector       │
                    │  Default = Environment values   │
                    └─────────────────────────────────┘


        ┌──────────────────────────────────────────────┐
        │  When User Submits URL                       │
        └────────────┬─────────────────────────────────┘
                     │
        ┌────────────▼──────────────────────┐
        │  API Request sent to backend       │
        │  /api/bing/submit-content/bulk    │
        └────────────┬──────────────────────┘
                     │
        ┌────────────▼──────────────────────┐
        │  Express Middleware runs           │
        │  (siteMiddleware)                 │
        └────────────┬──────────────────────┘
                     │
        ┌────────────▼──────────────────────────────────┐
        │  Read from process.env:                       │
        │  - INDEXNOW_KEY                              │
        │  - INDEXNOW_KEY_LOCATION                     │
        │  - BING_SUBMISSION_API_KEY                   │
        │                                               │
        │  Attach to req.siteConfig                    │
        └────────────┬──────────────────────────────────┘
                     │
        ┌────────────▼──────────────────────┐
        │  Route Handler executes           │
        │  Uses req.siteConfig?.bingApiKey  │
        └────────────┬──────────────────────┘
                     │
        ┌────────────▼──────────────────────┐
        │  Send to Bing/IndexNow API        │
        │  With correct credentials         │
        └────────────┬──────────────────────┘
                     │
        ┌────────────▼──────────────────────┐
        │  Return response to client        │
        │  Include debug info if requested  │
        └─────────────────────────────────┘
```

## 🧪 Testing Checklist

### Unit: Configuration Loading
```
✓ /api/config returns current env values
✓ Middleware injects req.siteConfig
✓ Route handlers read from req.siteConfig
✓ No fallbacks to stale values
```

### Integration: Multi-Site Switching
```
✓ Deploy with Site A credentials
✓ Verify Site A domain in Site Selector
✓ Test with Site A URL - succeeds
✓ Update env vars to Site B
✓ Restart/redeploy
✓ Verify Site B domain in Site Selector
✓ Test with Site B URL - succeeds
✓ Old Site A credentials no longer used
```

### Regression: Backward Compatibility
```
✓ Single URL mode still works
✓ Bulk sitemap mode still works
✓ Debug mode still works
✓ All engines (IndexNow, Bing URL, Bing Content) work
```

## 📞 Support

If you encounter issues:

1. **Check `/api/config` endpoint**
   ```
   Visit: https://your-render-url/api/config
   Verify it returns your domain and keys
   ```

2. **Check Render logs**
   ```
   Render Dashboard → Logs
   Look for [SITE MIDDLEWARE] log entries
   Look for [INDEXNOW] or [BING] log entries
   ```

3. **Clear browser cache**
   ```javascript
   localStorage.removeItem('site_api_config')
   // Then refresh page
   ```

4. **Check credentials**
   ```
   Verify IndexNow key is uploaded to domain
   Verify Bing key is valid for domain
   Verify domain matches INDEXNOW_KEY_LOCATION
   ```

## ✨ Ready to Deploy!

All code changes are complete. The application is now:
- ✅ Using environment variables for all configuration
- ✅ Fresh per-request evaluation (no stale caching)
- ✅ Ready for multi-site deployments
- ✅ Built and type-checked

**Next Step:** Set your environment variables on Render and deploy!
