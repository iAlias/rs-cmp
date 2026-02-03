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

**Endpoint:**
```
POST http://localhost:3000/v1/consent
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

**Endpoint:**
```
POST http://localhost:8000/php-logger.php
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
