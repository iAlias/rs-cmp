/**
 * OpenConsent v2 - Node.js Logger Example
 * 
 * A simple Express server for GDPR-compliant consent logging.
 * This example shows how to:
 * - Accept consent data from the CMP frontend
 * - Anonymize user IP addresses (GDPR requirement)
 * - Log consent to a file (or database)
 * - Handle CORS for cross-origin requests
 * 
 * Installation:
 *   npm install express
 * 
 * Usage:
 *   node node-logger.js
 */

const express = require('express');
const fs = require('fs');
const crypto = require('crypto');
const app = express();

// Middleware
app.use(express.json());

// CORS Configuration
// ⚠️ IMPORTANT: In production, replace "*" with your specific domain(s)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Change to your domain: "https://example.com"
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

/**
 * Anonymize IP address for GDPR compliance
 * Creates a consistent hash of the IP that can be used for session tracking
 * without storing the actual IP address
 * 
 * @param {string} ip - The IP address to anonymize
 * @returns {string} - Anonymized IP hash (16 characters)
 */
const anonymizeIp = (ip) => {
  if (!ip) return 'unknown';
  
  // Use SHA-256 hash for pseudonymization
  // This makes the IP pseudonymous but still allows session correlation
  return crypto.createHash('sha256')
    .update(ip)
    .digest('hex')
    .substring(0, 16);
};

/**
 * Extract real IP address from request
 * Handles proxies, load balancers, and CDNs
 * 
 * @param {object} req - Express request object
 * @returns {string} - Client IP address
 */
const getClientIp = (req) => {
  // Try various headers that proxies/CDNs use
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.socket.remoteAddress ||
         'unknown';
};

/**
 * POST /v1/consent
 * 
 * Log user consent choices
 * 
 * ⚠️ SECURITY NOTE: This example does not include rate limiting.
 * In production, add rate limiting middleware to prevent abuse:
 * 
 * const rateLimit = require('express-rate-limit');
 * const limiter = rateLimit({
 *   windowMs: 60 * 1000, // 1 minute
 *   max: 100 // limit each IP to 100 requests per minute
 * });
 * app.post('/v1/consent', limiter, (req, res) => { ... });
 * 
 * Request body:
 * {
 *   "siteId": "your-site-id",
 *   "categories": {
 *     "necessary": true,
 *     "analytics": false,
 *     "marketing": false,
 *     "preferences": false
 *   },
 *   "timestamp": "2026-02-03T17:00:00.000Z",
 *   "version": "1.0"
 * }
 */
app.post('/v1/consent', (req, res) => {
  const userIp = getClientIp(req);
  
  // Validate required fields
  if (!req.body.siteId || !req.body.categories || !req.body.timestamp) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Missing required fields: siteId, categories, timestamp' 
    });
  }
  
  // Create log entry with anonymized IP
  const logEntry = {
    ...req.body, // siteId, categories, timestamp, version
    ipHash: anonymizeIp(userIp),
    userAgent: req.headers['user-agent'] || 'unknown',
    serverTimestamp: new Date().toISOString()
  };

  // Option 1: Save to file (JSONL format - one JSON object per line)
  // In production, consider using a proper database (MongoDB, PostgreSQL, etc.)
  fs.appendFile('consent_logs.jsonl', JSON.stringify(logEntry) + '\n', (err) => {
    if (err) {
      console.error('Failed to write log:', err);
      return res.status(500).json({ status: 'error', message: 'Failed to save consent' });
    }
    
    console.log('✅ Consent logged:', {
      siteId: logEntry.siteId,
      categories: logEntry.categories,
      ipHash: logEntry.ipHash,
      timestamp: logEntry.timestamp,
      version: logEntry.version
    });
    
    res.json({ status: 'ok', timestamp: logEntry.serverTimestamp });
  });

  /* Option 2: Save to MongoDB (example)
  const MongoClient = require('mongodb').MongoClient;
  
  MongoClient.connect('mongodb://localhost:27017', (err, client) => {
    if (err) return res.status(500).json({ status: 'error' });
    
    const db = client.db('consent_logs');
    db.collection('consents').insertOne(logEntry, (err, result) => {
      client.close();
      if (err) return res.status(500).json({ status: 'error' });
      res.json({ status: 'ok' });
    });
  });
  */

  /* Option 3: Save to PostgreSQL (example)
  const { Pool } = require('pg');
  const pool = new Pool({
    host: 'localhost',
    database: 'consent_logs',
    user: 'postgres',
    password: 'password'
  });
  
  pool.query(
    'INSERT INTO consents (site_id, categories, timestamp, ip_hash, user_agent) VALUES ($1, $2, $3, $4, $5)',
    [logEntry.siteId, JSON.stringify(logEntry.categories), logEntry.timestamp, logEntry.ipHash, logEntry.userAgent],
    (err, result) => {
      if (err) return res.status(500).json({ status: 'error' });
      res.json({ status: 'ok' });
    }
  );
  */
});

/**
 * GET /v1/site/:siteId/config
 * 
 * Get site configuration (optional)
 * This allows you to manage CMP configuration server-side
 */
app.get('/v1/site/:siteId/config', (req, res) => {
  const { siteId } = req.params;
  
  // Example: Return configuration from database or file
  // For now, return a default config
  const config = {
    banner: {
      position: 'bottom',
      layout: 'bar',
      primaryColor: '#2563eb',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      buttonTextColor: '#ffffff'
    },
    categories: [
      {
        id: 'necessary',
        name: 'Necessary',
        description: 'Essential cookies required for the site to function',
        required: true,
        enabled: true
      },
      {
        id: 'analytics',
        name: 'Analytics',
        description: 'Help us understand how visitors interact with our website',
        required: false,
        enabled: false
      },
      {
        id: 'marketing',
        name: 'Marketing',
        description: 'Used to track visitors across websites for marketing purposes',
        required: false,
        enabled: false
      },
      {
        id: 'preferences',
        name: 'Preferences',
        description: 'Remember your preferences and settings',
        required: false,
        enabled: false
      }
    ]
  };
  
  res.json(config);
});

// ============================================================================
// SERVER-SIDE COOKIE DETECTION
// ============================================================================

/**
 * In-memory store for server-detected cookies per site.
 * In production, use a database or Redis for persistence.
 * 
 * Structure: { [siteId]: { [cookieName]: cookieData } }
 */
const serverCookieStore = {};

/**
 * Parse a Set-Cookie header string into a structured object.
 * 
 * @param {string} setCookieHeader - Raw Set-Cookie header value
 * @param {string} requestDomain - The domain the cookie was received from
 * @returns {object|null} Parsed cookie data or null if invalid
 */
function parseSetCookieHeader(setCookieHeader, requestDomain) {
  if (!setCookieHeader) return null;
  
  const parts = setCookieHeader.split(';').map(p => p.trim());
  const [nameValue, ...attributes] = parts;
  
  if (!nameValue || !nameValue.includes('=')) return null;
  
  const eqIndex = nameValue.indexOf('=');
  const name = nameValue.substring(0, eqIndex).trim();
  const value = nameValue.substring(eqIndex + 1).trim();
  
  if (!name) return null;
  
  const cookie = {
    name,
    value: '[redacted]', // Don't store actual values for privacy
    domain: requestDomain || '',
    path: '/',
    secure: false,
    httpOnly: false,
    sameSite: 'Lax',
    expires: null,
    isFirstParty: true,
    source: 'server',
    detectedAt: Date.now()
  };
  
  for (const attr of attributes) {
    const lowerAttr = attr.toLowerCase();
    
    if (lowerAttr === 'httponly') {
      cookie.httpOnly = true;
    } else if (lowerAttr === 'secure') {
      cookie.secure = true;
    } else if (lowerAttr.startsWith('samesite=')) {
      cookie.sameSite = attr.split('=')[1] || 'Lax';
    } else if (lowerAttr.startsWith('domain=')) {
      cookie.domain = attr.split('=')[1] || requestDomain;
    } else if (lowerAttr.startsWith('path=')) {
      cookie.path = attr.split('=')[1] || '/';
    } else if (lowerAttr.startsWith('max-age=')) {
      const maxAge = parseInt(attr.split('=')[1], 10);
      if (!isNaN(maxAge)) {
        cookie.expires = Date.now() + (maxAge * 1000);
      }
    } else if (lowerAttr.startsWith('expires=')) {
      const expiresDate = new Date(attr.substring(attr.indexOf('=') + 1));
      if (!isNaN(expiresDate.getTime())) {
        cookie.expires = expiresDate.getTime();
      }
    }
  }
  
  return cookie;
}

/**
 * POST /v1/site/:siteId/server-cookies
 * 
 * Report cookies detected from server-side Set-Cookie headers.
 * This endpoint is called by:
 * - A reverse proxy or middleware that intercepts Set-Cookie headers
 * - The CMP SDK when it observes response headers
 * 
 * This allows detection of:
 * - HttpOnly cookies (invisible to document.cookie)
 * - Cookies set by 301/302 redirects
 * - Cookies set by initial async requests (before SDK loads)
 * - Cookies set by CDN or server-side tracking pixels
 * 
 * Request body:
 * {
 *   "siteId": "your-site-id",
 *   "url": "https://example.com/page",
 *   "cookies": [
 *     { "header": "session_id=abc123; Path=/; HttpOnly; Secure; SameSite=Strict" }
 *   ],
 *   "timestamp": "2026-02-03T17:00:00.000Z"
 * }
 * 
 * Alternative format (pre-parsed cookies):
 * {
 *   "siteId": "your-site-id",
 *   "cookies": [
 *     { "name": "_ga", "domain": ".example.com", "httpOnly": false, "secure": true, ... }
 *   ]
 * }
 */
app.post('/v1/site/:siteId/server-cookies', (req, res) => {
  const { siteId } = req.params;
  const { cookies, url } = req.body;
  
  if (!cookies || !Array.isArray(cookies)) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required field: cookies (array)'
    });
  }
  
  if (!serverCookieStore[siteId]) {
    serverCookieStore[siteId] = {};
  }
  
  let processedCount = 0;
  const requestDomain = url ? new URL(url).hostname : '';
  
  for (const cookieData of cookies) {
    let parsed;
    
    if (cookieData.header) {
      // Raw Set-Cookie header string
      parsed = parseSetCookieHeader(cookieData.header, requestDomain);
    } else if (cookieData.name) {
      // Pre-parsed cookie object
      parsed = {
        name: cookieData.name,
        value: '[redacted]',
        domain: cookieData.domain || requestDomain,
        path: cookieData.path || '/',
        secure: cookieData.secure || false,
        httpOnly: cookieData.httpOnly || false,
        sameSite: cookieData.sameSite || 'Lax',
        expires: cookieData.expires || null,
        isFirstParty: cookieData.isFirstParty != null ? cookieData.isFirstParty : true,
        source: 'server',
        detectedAt: Date.now()
      };
    }
    
    if (parsed) {
      serverCookieStore[siteId][parsed.name] = parsed;
      processedCount++;
    }
  }
  
  console.log(`🍪 Server cookies reported for site ${siteId}: ${processedCount} cookies from ${url || 'unknown URL'}`);
  
  res.json({
    status: 'ok',
    processed: processedCount,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /v1/site/:siteId/server-cookies
 * 
 * Retrieve server-detected cookies for a site.
 * Called by the CMP SDK to get cookies that are invisible to client-side JS:
 * - HttpOnly cookies
 * - Cookies set by redirects
 * - Cookies set by initial async requests
 * - Cookies set by CDN or server-side pixels
 * 
 * Response:
 * {
 *   "status": "ok",
 *   "siteId": "your-site-id",
 *   "cookies": [
 *     {
 *       "name": "session_id",
 *       "domain": ".example.com",
 *       "httpOnly": true,
 *       "secure": true,
 *       "sameSite": "Strict",
 *       "source": "server",
 *       ...
 *     }
 *   ]
 * }
 */
app.get('/v1/site/:siteId/server-cookies', (req, res) => {
  const { siteId } = req.params;
  const cookies = serverCookieStore[siteId]
    ? Object.values(serverCookieStore[siteId])
    : [];
  
  res.json({
    status: 'ok',
    siteId: siteId,
    cookies: cookies
  });
});

/**
 * GET /health
 * 
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 OpenConsent v2 Logger running on port ' + PORT);
  console.log('📝 Consent logs will be saved to: consent_logs.jsonl');
  console.log('🔗 Endpoint: POST http://localhost:' + PORT + '/v1/consent');
  console.log('🍪 Endpoint: GET/POST http://localhost:' + PORT + '/v1/site/:siteId/server-cookies');
  console.log('');
  console.log('⚠️  Remember to configure CORS for your production domain!');
});
