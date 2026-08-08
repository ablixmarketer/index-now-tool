# Multi-Site Configuration Guide

This IndexNow Ping Console supports managing multiple websites with different API credentials all from a single deployment.

## How It Works

1. **Primary Site (Environment-based)**
   - Set via environment variables in `.env`
   - Used as the default when the app starts
   - Can be changed through the Site Selector

2. **Additional Sites (Browser Storage)**
   - Managed through the Site Selector UI
   - Stored in browser localStorage
   - Persists across sessions
   - No database required

## Setup Instructions

### Step 1: Configure Primary Site

Edit `.env` file:

```env
# Your primary domain
INDEXNOW_KEY_LOCATION=https://yourdomain.com

# IndexNow API key for this domain
# Get from: https://www.indexnow.org/
INDEXNOW_KEY=your-indexnow-key-here

# Bing Submission API key (optional)
# Get from: https://www.bing.com/webmasters/
BING_SUBMISSION_API_KEY=your_bing_key_here
```

### Step 2: Add Additional Sites

1. Launch the application
2. Click the **Site Selector** dropdown in the header (top right)
3. Click the **+ Add Site** button
4. Fill in the form:
   - **Domain**: e.g., `example.com`
   - **Display Name**: e.g., `My Website`
   - **IndexNow Key**: Your IndexNow API key
   - **IndexNow Key Location**: Full URL to your key file
   - **Bing API Key** (optional): Your Bing submission key
5. Click **Add Site**

### Step 3: Switch Between Sites

1. Use the **Site Selector** dropdown to switch
2. All operations (scan, ping, submit) use the active site's credentials
3. Each site's debug reports are stored separately

## API Key Management

### Getting IndexNow Keys

1. Visit https://www.indexnow.org/
2. Enter your domain URL
3. Download and host the key file on your server
4. Copy the key value and store in your environment/site config

### Getting Bing Submission Keys

1. Go to https://www.bing.com/webmasters/
2. Add/verify your property
3. Navigate to API settings
4. Copy your API key

### Security Best Practices

- **Never commit `.env` files** with real API keys to version control
- **Use environment variables** for production deployments
- **Rotate keys periodically** through your webmaster tools
- **Store sensitive data** in your hosting provider's secrets manager
- **Audit API usage** regularly in webmaster tools dashboards

## Data Storage

### Environment Configuration
- Stored in `.env` file
- Used for primary site
- Must be deployed with your application

### Site Configuration
- Stored in **browser localStorage** under key: `site_api_config`
- **Not synced** between devices/browsers
- Can be cleared by clearing site data in browser
- Contains all site credentials (handle with care if shared device)

### Debug Reports
- Stored in **browser localStorage** under keys: `debug_{url}__{engine}`
- Automatically managed (old reports cleaned up after 7 days)
- Can be exported as JSON/CSV from Deep Debug modal
- **Not synced** between devices/browsers

## Usage Examples

### Scanning Multiple Websites

1. Select "Sitemap Mode" tab
2. Use Site Selector to pick your first site
3. Scan sitemap and submit to search engines
4. Switch to next site using Site Selector
5. Repeat steps 2-3

### Batch Operations

```
Flow: Site Selector → Scan Sitemap → Select URLs → Ping Engines
```

Each step uses the currently active site's credentials.

### Debug Reports

Each site's submissions are tracked separately:
- Click "Deep Debug" on any URL to see detailed submission info
- View content extraction, metadata, schema, API responses
- Export reports as JSON or CSV
- Data organized by URL + Engine combination

## Troubleshooting

### Site Not Appearing
- Clear browser localStorage: DevTools → Application → Storage → LocalStorage → Clear
- Refresh the page
- Re-add the site

### API Errors
- Verify IndexNow key is correct in environment
- Check key file is accessible at the URL specified
- Ensure Bing key is valid (only if using Bing submission)
- Check API status pages for search engines

### Lost Configuration
- If using private/incognito browsing, data is cleared on close
- Use normal browsing mode for persistent storage
- Export debug reports regularly if needed

### Performance
- Batch size: up to 1000 URLs per request
- Recommended: 100-500 URLs per batch for stability
- Retry logic: automatic with exponential backoff

## Advanced: Custom Deployment

### Netlify
- Set environment variables in Site Settings
- Static site hosting with serverless functions
- Browser localStorage works normally

### Render/Railway
- Set environment variables in service settings
- Persistent deployment
- Browser localStorage works normally

### Local Development
```bash
# Create .env file with your keys
cp .env.example .env
# Edit .env with your values

# Start development server
npm run dev

# App runs on http://localhost:8080
```

## API Endpoints Used

| Endpoint | Purpose | Requires |
|----------|---------|----------|
| `/api/indexnow/bulk` | Bulk IndexNow submission | IndexNow key |
| `/api/bing/submit-urls/bulk` | Bulk Bing URL submission | Bing key |
| `/api/bing/submit-content/bulk` | Bulk Bing content submission | Bing key |
| `/api/sitemap/scan` | Scan and filter URLs | None |
| `/api/config` | Get environment config | None |

All endpoints respect the site's configured credentials via the site middleware.

## Future Enhancements

Potential improvements for multi-site management:
- Database-backed site configuration (sync across devices)
- Team collaboration features
- Scheduled submissions
- Advanced analytics dashboard
- Rate limit monitoring per site
- Custom notification webhooks
