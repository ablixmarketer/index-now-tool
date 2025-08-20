# IndexNow Ping Console

A beautiful, modern web application for scanning sitemaps and pinging search engines via the IndexNow API. Built with React, TypeScript, Tailwind CSS, and Express.

![IndexNow Console Screenshot](https://github.com/user-attachments/assets/screenshot.png)

## 🚀 Features

### Core Functionality
- **Sitemap Scanning**: Support for standard, news, image, video, gzipped, and sitemap index files
- **Date Filtering**: Filter URLs by last modified date (5, 7, 10, 15, 30, or custom days)
- **Pattern Filtering**: Include/exclude URLs using regex or prefix patterns
- **Multi-Engine Support**: Ping IndexNow hub, Bing, and custom engines
- **Single URL Ping**: Quick ping for individual URLs
- **Bulk Processing**: Handle up to 10,000 URLs per batch

### Advanced Features
- **Concurrency Control**: Configurable parallel request limits (1-20)
- **Retry Policy**: Exponential backoff with configurable retries (0-3)
- **Progress Tracking**: Real-time progress updates during bulk operations
- **Results Export**: Export results as CSV or JSON
- **Session Persistence**: Save and restore scanning sessions

### UI/UX
- **Modern Design**: Clean, high-contrast interface with beautiful gradients
- **Dark Mode**: Full dark mode support with system preference detection
- **Responsive**: Mobile-friendly responsive design
- **Accessibility**: Keyboard navigation, ARIA labels, screen reader support
- **Animations**: Subtle Framer Motion animations and transitions
- **Status Legend**: Clear explanations of HTTP status codes

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Express + Node.js
- **Routing**: React Router 6 (SPA mode)
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Validation**: Zod
- **HTTP Client**: Native Fetch API
- **Concurrency**: p-limit
- **XML Parsing**: fast-xml-parser

## 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd indexnow-console
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up environment variables**:
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your values
   INDEXNOW_KEY=your-indexnow-key-here
   INDEXNOW_KEY_LOCATION=https://yourdomain.com
   INDEXNOW_ENDPOINT=https://api.indexnow.org/indexnow
   ```

4. **Create IndexNow key file**:
   Create a file named `{YOUR_KEY}.txt` in the `public/` directory containing only your IndexNow key.

## 🚀 Development

1. **Start the development server**:
   ```bash
   pnpm dev
   ```
   This starts both the Express API server (port 3001) and Vite dev server (port 8080).

2. **Open your browser**:
   Navigate to `http://localhost:8080`

## 🏗️ Production Build

1. **Build the application**:
   ```bash
   pnpm build
   ```

2. **Start the production server**:
   ```bash
   pnpm start
   ```

## 🔧 Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `INDEXNOW_KEY` | ✅ | Your IndexNow API key | `558e9f294e5246d2993e4eaed06e54b4` |
| `INDEXNOW_KEY_LOCATION` | ❌ | URL where key file is hosted | `https://yourdomain.com` |
| `INDEXNOW_ENDPOINT` | ❌ | IndexNow API endpoint | `https://api.indexnow.org/indexnow` |
| `API_PORT` | ❌ | API server port | `3001` |

## 📖 Usage Guide

### 1. Sitemap Mode

1. **Enter Sitemap URL**: Input your sitemap.xml URL
2. **Configure Filters**: Set date range and include/exclude patterns
3. **Select Engines**: Choose which search engines to ping
4. **Adjust Settings**: Configure concurrency and retry policies
5. **Scan Sitemap**: Click "Scan Sitemap" to analyze URLs
6. **Review Results**: Preview filtered URLs in the preview panel
7. **Start Pinging**: Bulk ping selected URLs to search engines

### 2. Single URL Mode

1. **Enter URL**: Input the specific URL to ping
2. **Select Engines**: Choose target search engines
3. **Ping URL**: Click "Ping Single URL" to notify engines

### 3. Results Analysis

- **Summary Cards**: View success/failure statistics
- **Engine Performance**: Check success rates per engine
- **Status Legend**: Understand HTTP status code meanings
- **Results Table**: Detailed per-URL results with latency
- **Export Options**: Download results as CSV or JSON

## 🔍 API Endpoints

### Sitemap Scanning
```
POST /api/sitemap/scan
{
  "sitemapUrl": "string",
  "days": number,
  "include": ["string"],
  "exclude": ["string"]
}
```

### Bulk Ping
```
POST /api/indexnow/bulk
{
  "urls": ["string"],
  "engines": ["indexnow", "bing"],
  "mode": "update" | "delete"
}
```

### Single URL Ping
```
POST /api/indexnow/single
{
  "url": "string",
  "engines": ["indexnow", "bing"]
}
```

### Key Verification
```
POST /api/indexnow/verify-key
{
  "domain": "string"
}
```

## 📊 Status Code Meanings

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | Success | URL accepted and processed |
| 202 | Accepted | URL accepted, pending validation |
| 400 | Bad Request | Invalid payload or parameters |
| 403 | Forbidden | Key mismatch or inaccessible key file |
| 404 | Not Found | Endpoint or route missing |
| 410 | Gone | URL removed (valid for deletions) |
| 422 | Unprocessable | Host mismatch error |
| 429 | Rate Limited | Too many requests, retry with backoff |
| 5xx | Server Error | Search engine server error |

## 🔒 Security

- API keys are handled server-side only
- Client never exposes secrets
- CORS protection enabled
- Request size limits enforced
- Input validation with Zod schemas

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on git push

### Netlify
1. Connect repository to Netlify
2. Set build command: `pnpm build`
3. Set publish directory: `dist/spa`
4. Configure environment variables

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["npm", "start"]
```

## 🧪 Testing

```bash
# Run tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline help
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

## 🔗 Related Resources

- [IndexNow Documentation](https://www.indexnow.org/)
- [Microsoft IndexNow Guide](https://docs.microsoft.com/en-us/bingwebmaster/indexnow)
- [Sitemap Protocol](https://www.sitemaps.org/protocol.html)

---

**Made with ❤️ for the web community**
