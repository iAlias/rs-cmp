<?php
/**
 * OpenConsent v2 - PHP Logger Example
 * 
 * A simple PHP script for GDPR-compliant consent logging.
 * This example shows how to:
 * - Accept consent data from the CMP frontend
 * - Anonymize user IP addresses (GDPR requirement)
 * - Log consent to a file (or database)
 * - Handle CORS for cross-origin requests
 * 
 * Usage:
 *   Place this file on your PHP server (e.g., /api/consent.php)
 *   Configure your web server to route POST requests to this script
 */

// CORS Configuration
// ⚠️ IMPORTANT: In production, replace "*" with your specific domain(s)
header("Access-Control-Allow-Origin: *"); // Change to: "https://example.com"
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/**
 * Anonymize IP address for GDPR compliance
 * Creates a consistent hash of the IP that can be used for session tracking
 * without storing the actual IP address
 * 
 * @param string $ip The IP address to anonymize
 * @return string Anonymized IP hash (16 characters)
 */
function anonymizeIp($ip) {
    if (empty($ip)) {
        return 'unknown';
    }
    
    // Use SHA-256 hash for pseudonymization
    return substr(hash('sha256', $ip), 0, 16);
}

/**
 * Extract real IP address from request
 * Handles proxies, load balancers, and CDNs
 * 
 * @return string Client IP address
 */
function getClientIp() {
    // Try various headers that proxies/CDNs use
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        return trim($ips[0]);
    }
    
    if (!empty($_SERVER['HTTP_X_REAL_IP'])) {
        return $_SERVER['HTTP_X_REAL_IP'];
    }
    
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

/**
 * Send JSON response
 * 
 * @param array $data Response data
 * @param int $statusCode HTTP status code
 */
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// ============================================================================
// ROUTING
// ============================================================================

// Determine the requested action based on query parameter or URI
$action = $_GET['action'] ?? 'consent';
$requestMethod = $_SERVER['REQUEST_METHOD'];

// ============================================================================
// SERVER-SIDE COOKIE DETECTION
// ============================================================================

/**
 * Server-detected cookie store file.
 * In production, use a database for persistence and performance.
 */
$serverCookieFile = __DIR__ . '/server_cookies.json';

/**
 * Parse a Set-Cookie header string into a structured array.
 *
 * @param string $setCookieHeader Raw Set-Cookie header value
 * @param string $requestDomain The domain the cookie was received from
 * @return array|null Parsed cookie data or null if invalid
 */
function parseSetCookieHeader($setCookieHeader, $requestDomain = '') {
    if (empty($setCookieHeader)) return null;

    $parts = array_map('trim', explode(';', $setCookieHeader));
    $nameValue = array_shift($parts);

    if (empty($nameValue) || strpos($nameValue, '=') === false) return null;

    $eqPos = strpos($nameValue, '=');
    $name = trim(substr($nameValue, 0, $eqPos));
    $value = trim(substr($nameValue, $eqPos + 1));

    if (empty($name)) return null;

    $cookie = [
        'name' => $name,
        'value' => '[redacted]',
        'domain' => $requestDomain,
        'path' => '/',
        'secure' => false,
        'httpOnly' => false,
        'sameSite' => 'Lax',
        'expires' => null,
        'isFirstParty' => true,
        'source' => 'server',
        'detectedAt' => round(microtime(true) * 1000)
    ];

    foreach ($parts as $attr) {
        $lowerAttr = strtolower($attr);

        if ($lowerAttr === 'httponly') {
            $cookie['httpOnly'] = true;
        } elseif ($lowerAttr === 'secure') {
            $cookie['secure'] = true;
        } elseif (strpos($lowerAttr, 'samesite=') === 0) {
            $cookie['sameSite'] = explode('=', $attr, 2)[1] ?? 'Lax';
        } elseif (strpos($lowerAttr, 'domain=') === 0) {
            $cookie['domain'] = explode('=', $attr, 2)[1] ?? $requestDomain;
        } elseif (strpos($lowerAttr, 'path=') === 0) {
            $cookie['path'] = explode('=', $attr, 2)[1] ?? '/';
        } elseif (strpos($lowerAttr, 'max-age=') === 0) {
            $maxAge = intval(explode('=', $attr, 2)[1] ?? 0);
            $cookie['expires'] = round(microtime(true) * 1000) + ($maxAge * 1000);
        } elseif (strpos($lowerAttr, 'expires=') === 0) {
            $expiresStr = substr($attr, strpos($attr, '=') + 1);
            $expiresTime = strtotime($expiresStr);
            if ($expiresTime !== false) {
                $cookie['expires'] = $expiresTime * 1000;
            }
        }
    }

    return $cookie;
}

/**
 * Load server cookie store from file
 *
 * @param string $file Path to the cookie store file
 * @return array Cookie store indexed by siteId
 */
function loadServerCookieStore($file) {
    if (!file_exists($file)) return [];
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : [];
}

/**
 * Save server cookie store to file
 *
 * @param string $file Path to the cookie store file
 * @param array $store Cookie store data
 */
function saveServerCookieStore($file, $store) {
    file_put_contents($file, json_encode($store, JSON_PRETTY_PRINT), LOCK_EX);
}

// ============================================================================
// HANDLE SERVER-COOKIE ENDPOINTS
// ============================================================================

if ($action === 'server-cookies') {
    $siteId = $_GET['siteId'] ?? '';

    if (empty($siteId)) {
        sendResponse(['status' => 'error', 'message' => 'Missing required parameter: siteId'], 400);
    }

    if ($requestMethod === 'GET') {
        // GET: Return server-detected cookies for the site
        $store = loadServerCookieStore($serverCookieFile);
        $cookies = isset($store[$siteId]) ? array_values($store[$siteId]) : [];

        sendResponse([
            'status' => 'ok',
            'siteId' => $siteId,
            'cookies' => $cookies
        ]);
    } elseif ($requestMethod === 'POST') {
        // POST: Report server-detected cookies
        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            sendResponse(['status' => 'error', 'message' => 'Invalid JSON'], 400);
        }

        if (empty($data['cookies']) || !is_array($data['cookies'])) {
            sendResponse(['status' => 'error', 'message' => 'Missing required field: cookies (array)'], 400);
        }

        $store = loadServerCookieStore($serverCookieFile);
        if (!isset($store[$siteId])) {
            $store[$siteId] = [];
        }

        $requestDomain = '';
        if (!empty($data['url'])) {
            $parsedUrl = parse_url($data['url']);
            $requestDomain = $parsedUrl['host'] ?? '';
        }

        $processedCount = 0;
        foreach ($data['cookies'] as $cookieData) {
            $parsed = null;

            if (!empty($cookieData['header'])) {
                $parsed = parseSetCookieHeader($cookieData['header'], $requestDomain);
            } elseif (!empty($cookieData['name'])) {
                $parsed = [
                    'name' => $cookieData['name'],
                    'value' => '[redacted]',
                    'domain' => $cookieData['domain'] ?? $requestDomain,
                    'path' => $cookieData['path'] ?? '/',
                    'secure' => $cookieData['secure'] ?? false,
                    'httpOnly' => $cookieData['httpOnly'] ?? false,
                    'sameSite' => $cookieData['sameSite'] ?? 'Lax',
                    'expires' => $cookieData['expires'] ?? null,
                    'isFirstParty' => $cookieData['isFirstParty'] ?? true,
                    'source' => 'server',
                    'detectedAt' => round(microtime(true) * 1000)
                ];
            }

            if ($parsed) {
                $store[$siteId][$parsed['name']] = $parsed;
                $processedCount++;
            }
        }

        saveServerCookieStore($serverCookieFile, $store);

        error_log(sprintf(
            '🍪 Server cookies reported for site %s: %d cookies from %s',
            $siteId,
            $processedCount,
            $data['url'] ?? 'unknown URL'
        ));

        sendResponse([
            'status' => 'ok',
            'processed' => $processedCount,
            'timestamp' => date('c')
        ]);
    } else {
        sendResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
}

// ============================================================================
// HANDLE CONSENT LOGGING (default action)
// ============================================================================

// Only accept POST requests for logging consent
if ($requestMethod !== 'POST') {
    sendResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

// Get and parse request body
$requestBody = file_get_contents('php://input');
$data = json_decode($requestBody, true);

// Validate JSON
if (json_last_error() !== JSON_ERROR_NONE) {
    sendResponse(['status' => 'error', 'message' => 'Invalid JSON'], 400);
}

// Validate required fields
if (empty($data['siteId']) || empty($data['categories']) || empty($data['timestamp'])) {
    sendResponse([
        'status' => 'error',
        'message' => 'Missing required fields: siteId, categories, timestamp'
    ], 400);
}

// Get client info
$userIp = getClientIp();
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';

// Create log entry with anonymized IP
$logEntry = [
    'siteId' => $data['siteId'],
    'categories' => $data['categories'],
    'timestamp' => $data['timestamp'],
    'version' => $data['version'] ?? '1.0',
    'ipHash' => anonymizeIp($userIp),
    'userAgent' => $userAgent,
    'serverTimestamp' => date('c') // ISO 8601 format
];

// Option 1: Save to file (JSONL format - one JSON object per line)
$logFile = __DIR__ . '/consent_logs.jsonl';
$logLine = json_encode($logEntry) . PHP_EOL;

if (file_put_contents($logFile, $logLine, FILE_APPEND | LOCK_EX) === false) {
    error_log('Failed to write consent log to file');
    sendResponse(['status' => 'error', 'message' => 'Failed to save consent'], 500);
}

// Log successful save
error_log(sprintf(
    '✅ Consent logged - Site: %s, IP Hash: %s, Timestamp: %s',
    $logEntry['siteId'],
    $logEntry['ipHash'],
    $logEntry['timestamp']
));

sendResponse([
    'status' => 'ok',
    'timestamp' => $logEntry['serverTimestamp']
]);

/* Option 2: Save to MySQL (example)

// Database configuration
$dbHost = 'localhost';
$dbName = 'consent_logs';
$dbUser = 'root';
$dbPass = 'password';

try {
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $pdo->prepare('
        INSERT INTO consents (site_id, categories, timestamp, ip_hash, user_agent, created_at)
        VALUES (:site_id, :categories, :timestamp, :ip_hash, :user_agent, NOW())
    ');
    
    $stmt->execute([
        ':site_id' => $logEntry['siteId'],
        ':categories' => json_encode($logEntry['categories']),
        ':timestamp' => $logEntry['timestamp'],
        ':ip_hash' => $logEntry['ipHash'],
        ':user_agent' => $logEntry['userAgent']
    ]);
    
    sendResponse(['status' => 'ok', 'timestamp' => date('c')]);
    
} catch (PDOException $e) {
    error_log('Database error: ' . $e->getMessage());
    sendResponse(['status' => 'error', 'message' => 'Failed to save consent'], 500);
}

*/

/* Option 3: Save to SQLite (example)

$dbFile = __DIR__ . '/consent_logs.sqlite';
$db = new SQLite3($dbFile);

// Create table if not exists
$db->exec('
    CREATE TABLE IF NOT EXISTS consents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id TEXT NOT NULL,
        categories TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        ip_hash TEXT NOT NULL,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
');

$stmt = $db->prepare('
    INSERT INTO consents (site_id, categories, timestamp, ip_hash, user_agent)
    VALUES (:site_id, :categories, :timestamp, :ip_hash, :user_agent)
');

$stmt->bindValue(':site_id', $logEntry['siteId'], SQLITE3_TEXT);
$stmt->bindValue(':categories', json_encode($logEntry['categories']), SQLITE3_TEXT);
$stmt->bindValue(':timestamp', $logEntry['timestamp'], SQLITE3_TEXT);
$stmt->bindValue(':ip_hash', $logEntry['ipHash'], SQLITE3_TEXT);
$stmt->bindValue(':user_agent', $logEntry['userAgent'], SQLITE3_TEXT);

if ($stmt->execute()) {
    sendResponse(['status' => 'ok', 'timestamp' => date('c')]);
} else {
    sendResponse(['status' => 'error', 'message' => 'Failed to save consent'], 500);
}

*/

/* MySQL Table Schema:

CREATE TABLE consents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id VARCHAR(255) NOT NULL,
    categories JSON NOT NULL,
    timestamp DATETIME NOT NULL,
    ip_hash VARCHAR(64) NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_site_id (site_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_ip_hash (ip_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

*/
?>
