# Server-Side Consent Logger Examples

This folder contains backend examples for GDPR-compliant consent logging. These examples show you how to receive and store consent data from the OpenConsent v2 CMP.

## 🔒 GDPR Compliance

All examples demonstrate:
- **IP Anonymization**: User IPs are hashed before storage (GDPR requirement)
- **Minimal Data Storage**: Only necessary consent information is logged
- **Secure Storage**: Examples for file, database storage
- **CORS Configuration**: Properly configured for cross-origin requests

## 📁 Available Examples

### Node.js (Express)
**File**: `node-logger.js`

A lightweight Express server for consent logging.

**Installation:**
```bash
npm install express
```

**Usage:**
```bash
node node-logger.js
```

**Features:**
- ✅ Express framework
- ✅ IP anonymization with SHA-256
- ✅ JSONL file logging (easy to parse)
- ✅ Commented examples for MongoDB and PostgreSQL
- ✅ CORS support
- ✅ Server-side cookie detection (HttpOnly, redirects, CDN/pixel)

**Endpoints:**
```
POST http://localhost:3000/v1/consent
GET  http://localhost:3000/v1/site/:siteId/server-cookies
POST http://localhost:3000/v1/site/:siteId/server-cookies
```

---

### PHP
**File**: `php-logger.php`

A simple PHP script that can run on standard PHP hosting (requires PHP 7.0+).

**Requirements:**
- PHP 7.0 or higher
- File write permissions for logging
- Standard PHP functions: `json_encode`, `file_put_contents`, `hash`

**Installation:**
No installation required - just place on your PHP server.

**Usage:**
```bash
# Using PHP built-in server (for testing)
php -S localhost:8000 php-logger.php
```

**Features:**
- ✅ No dependencies required
- ✅ IP anonymization with SHA-256
- ✅ JSONL file logging
- ✅ Commented examples for MySQL and SQLite
- ✅ CORS support
- ✅ Server-side cookie detection (HttpOnly, redirects, CDN/pixel)

**Endpoints:**
```
POST http://localhost:8000/php-logger.php
GET  http://localhost:8000/php-logger.php?action=server-cookies&siteId=your-site-id
POST http://localhost:8000/php-logger.php?action=server-cookies&siteId=your-site-id
```

---

## 🚀 Quick Start

### 1. Choose Your Backend

Pick the example that matches your stack:
- **Node.js/JavaScript**: Use `node-logger.js`
- **PHP**: Use `php-logger.php`

### 2. Install Dependencies (Node.js only)

```bash
cd server-side
npm install express
```

### 3. Start the Server

**Node.js:**
```bash
node node-logger.js
```

**PHP:**
```bash
php -S localhost:8000 php-logger.php
```

### 4. Configure Your CMP

Update your frontend CMP initialization:

```javascript
window.RSCMP.init({
    siteId: 'your-site-id',
    apiUrl: 'http://localhost:3000',  // or http://localhost:8000 for PHP
    config: { /* ... */ }
});
```

### 5. Test It

Open your browser's developer console and check for:
```
✅ Consent logged: { siteId: '...', ipHash: '...', timestamp: '...' }
```

---

## 🍪 Server-Side Cookie Detection

The client-side SDK can read cookies via `document.cookie`, but it **cannot** detect:

- **HttpOnly cookies** – not accessible via JavaScript by definition
- **Cookies set by redirects** – set via `Set-Cookie` headers during 301/302 redirects
- **Cookies set by initial async requests** – set before the SDK loads
- **Cookies set by CDN or server-side pixels** – set at the network level

Both backend examples include endpoints for **server-side cookie detection** that complement the client-side scanner.

### How It Works

1. **Your server/proxy/middleware** intercepts `Set-Cookie` headers from upstream responses (redirects, CDN, pixels, etc.)
2. **Reports them** to the `POST /v1/site/:siteId/server-cookies` endpoint
3. **The CMP SDK** fetches these server-detected cookies via `GET /v1/site/:siteId/server-cookies` during initialization
4. **Merges** them with client-detected cookies, providing a complete picture

### Reporting Server-Detected Cookies

**From a reverse proxy (e.g., nginx, Express middleware):**

```javascript
// Express middleware example: intercept Set-Cookie headers from upstream
app.use((req, res, next) => {
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = function(name, value) {
    if (name.toLowerCase() === 'set-cookie') {
      const cookies = Array.isArray(value) ? value : [value];
      // Report to CMP backend (fire and forget)
      fetch('http://localhost:3000/v1/site/your-site-id/server-cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: 'your-site-id',
          url: req.protocol + '://' + req.get('host') + req.originalUrl,
          cookies: cookies.map(h => ({ header: h }))
        })
      }).catch(() => {});
    }
    return originalSetHeader(name, value);
  };
  next();
});
```

### Retrieving Server-Detected Cookies

The SDK does this automatically when `siteId` and `apiUrl` are configured. You can also fetch them manually:

```javascript
// Automatic (during SDK init)
window.RSCMP.init({ siteId: 'your-site-id' });

// Manual fetch
const serverCookies = await window.RSCMP.fetchServerCookies();
console.log('Server-detected cookies:', serverCookies);

// Get all server-detected cookies from cache
const cached = window.RSCMP.getServerDetectedCookies();
```

### API Reference

**POST `/v1/site/:siteId/server-cookies`** – Report detected cookies

```json
{
  "siteId": "your-site-id",
  "url": "https://example.com/page",
  "cookies": [
    { "header": "session_id=abc123; Path=/; HttpOnly; Secure; SameSite=Strict" },
    { "header": "_ga=GA1.2.123456; Domain=.example.com; Path=/; Expires=Thu, 01 Jan 2028 00:00:00 GMT" }
  ]
}
```

**GET `/v1/site/:siteId/server-cookies`** – Retrieve detected cookies

```json
{
  "status": "ok",
  "siteId": "your-site-id",
  "cookies": [
    {
      "name": "session_id",
      "domain": "example.com",
      "httpOnly": true,
      "secure": true,
      "sameSite": "Strict",
      "source": "server",
      "category": "necessary"
    }
  ]
}
```

---

## 📊 Storage Options

Both examples support multiple storage backends:

### Option 1: File Storage (Default)
- Simple JSONL format (one JSON object per line)
- Good for: Development, low-traffic sites
- File: `consent_logs.jsonl`

### Option 2: Database Storage
Commented examples included for:
- **MongoDB** (Node.js)
- **PostgreSQL** (Node.js)
- **MySQL** (PHP)
- **SQLite** (PHP)

To use database storage, uncomment the relevant section in the code.

---

## 🔐 Production Deployment

### Security Checklist

- [ ] **CORS**: Change `Access-Control-Allow-Origin` from `*` to your specific domain
- [ ] **HTTPS**: Always use HTTPS in production
- [ ] **Rate Limiting**: Add rate limiting to prevent abuse
- [ ] **Database**: Use a proper database instead of file storage
- [ ] **Backups**: Set up automated backups of consent logs
- [ ] **Monitoring**: Add logging and error tracking
- [ ] **Environment Variables**: Store sensitive data in environment variables

### Example CORS Configuration (Production)

**Node.js:**
```javascript
app.use((req, res, next) => {
  const allowedOrigins = ['https://example.com', 'https://www.example.com'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});
```

**PHP:**
```php
$allowedOrigins = ['https://example.com', 'https://www.example.com'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
}
```

---

## 📝 Database Schema Examples

### PostgreSQL
```sql
CREATE TABLE consents (
    id SERIAL PRIMARY KEY,
    site_id VARCHAR(255) NOT NULL,
    categories JSONB NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    ip_hash VARCHAR(64) NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_site_id ON consents(site_id);
CREATE INDEX idx_timestamp ON consents(timestamp);
```

### MySQL
```sql
CREATE TABLE consents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id VARCHAR(255) NOT NULL,
    categories JSON NOT NULL,
    timestamp DATETIME NOT NULL,
    ip_hash VARCHAR(64) NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_site_id (site_id),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 🔍 Querying Consent Logs

### JSONL File
```bash
# Count total consents
wc -l consent_logs.jsonl

# View latest consents
tail -n 10 consent_logs.jsonl | jq

# Find consents for a specific site
grep '"siteId":"your-site-id"' consent_logs.jsonl | jq
```

### PostgreSQL
```sql
-- Consent stats by category
SELECT 
    categories->>'analytics' as analytics,
    categories->>'marketing' as marketing,
    COUNT(*) as count
FROM consents
WHERE site_id = 'your-site-id'
GROUP BY analytics, marketing;
```

---

## 🛠️ Troubleshooting

### CORS Errors
If you see CORS errors in the browser console:
1. Make sure the server is running
2. Check that CORS headers are correctly set
3. Verify the `apiUrl` in your CMP configuration

### File Permission Errors
```bash
# Linux/Mac: Give write permissions
chmod 644 consent_logs.jsonl
```

### Port Already in Use
```bash
# Find and kill the process using the port
# Linux/Mac:
lsof -ti:3000 | xargs kill

# Windows:
netstat -ano | findstr :3000
taskkill /PID [PID] /F
```

---

## 📚 Related Documentation

- [Main README](../README.md)
- [Basic Example](../examples/basic.html)
- [GTM Example](../examples/gtm-implementation.html)

---

## 💡 Tips

1. **Development**: Use file storage for quick testing
2. **Production**: Always use a proper database
3. **Scaling**: Consider using a message queue for high-traffic sites
4. **Compliance**: Keep logs for the legally required period (typically 3 years in EU)
5. **Privacy**: Never store raw IP addresses - always hash them first

---

## 📧 Support

For questions or issues, please open an issue on GitHub.
