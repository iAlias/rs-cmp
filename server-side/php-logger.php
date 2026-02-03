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

// Only accept POST requests for logging consent
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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
