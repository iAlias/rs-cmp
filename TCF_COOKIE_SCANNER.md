# TCF 2.2 & Cookie Scanner Implementation

This document describes the implementation of IAB Transparency & Consent Framework 2.2 and the Automatic Cookie Scanner features in RS-CMP.

## Overview

Two major features have been added to the CMP:

1. **TCF 2.2 Compliance** - Full IAB Transparency & Consent Framework 2.2 support
2. **Automatic Cookie Scanner** - Detect, monitor, and categorize cookies automatically

## 1. TCF 2.2 Implementation

### Features

- ✅ Full IAB TCF 2.2 compliant `window.__tcfapi` implementation
- ✅ Standard IAB purposes and vendors (Google, Meta)
- ✅ TC String generation for passing to ad platforms
- ✅ Automatic consent-to-TCF mapping
- ✅ Real-time consent updates via TCF API events

### TCF Manager Class

The `TCFManager` class handles all TCF 2.2 functionality:

```typescript
class TCFManager {
  private tcfVersion = 2.2;
  private vendors: Map<number, TCFVendor>;
  private purposes: Map<number, TCFPurpose>;
  
  // Setup window.__tcfapi
  setupTCFAPI(): void;
  
  // Generate TC String
  generateTCString(): string;
  
  // Update from consent changes
  updateFromConsent(categories: ConsentCategories): void;
}
```

### Standard IAB Purposes

The following IAB TCF 2.2 standard purposes are implemented:

1. Store and/or access information on a device
2. Select basic ads
3. Create a personalised ads profile
4. Select personalised ads
7. Measure ad performance
8. Measure content performance
9. Apply market research to generate audience insights
10. Develop and improve products

### Supported Vendors

Pre-configured vendors include:

- **Google (ID: 755)** - Google Advertising Products
- **Meta (ID: 138)** - Meta Platforms Ireland Limited

More vendors can be added as needed.

### Usage

#### Accessing TCF Data

```javascript
// Get current TCF data
const tcfData = window.RSCMP.getTCFData();
console.log('TC String:', tcfData.tcString);
console.log('Purpose Consents:', tcfData.purposeConsents);
console.log('Vendor Consents:', tcfData.vendorConsents);
```

#### Using the __tcfapi

```javascript
// Ping the CMP
window.__tcfapi('ping', 2, function(pingReturn, success) {
  console.log('CMP Status:', pingReturn);
});

// Get TC Data
window.__tcfapi('getTCData', 2, function(tcData, success) {
  console.log('TC String:', tcData.tcString);
  console.log('GDPR Applies:', tcData.gdprApplies);
});

// Get Vendor List
window.__tcfapi('getVendorList', 2, function(vendorList, success) {
  console.log('Vendors:', vendorList.vendors);
  console.log('Purposes:', vendorList.purposes);
});

// Add Event Listener
window.__tcfapi('addEventListener', 2, function(tcData, success) {
  console.log('Consent changed:', tcData);
});
```

### Integration with Ad Platforms

The TC String is automatically generated and can be passed to advertising platforms:

```javascript
// Example: Passing to Google
if (window.googletag) {
  const tcfData = window.RSCMP.getTCFData();
  googletag.cmd.push(function() {
    googletag.pubads().setPrivacySettings({
      restrictDataProcessing: !tcfData.purposeConsents[1]
    });
  });
}
```

### Backend Integration

TC Strings are automatically sent to the backend with consent logs:

```json
{
  "siteId": "your-site-id",
  "categories": { ... },
  "timestamp": "2024-01-29T12:00:00.000Z",
  "version": "1.0",
  "tcfString": "CPXxyz..."
}
```

## 2. Cookie Scanner Implementation

### Features

- ✅ Automatic detection of all first-party cookies
- ✅ Real-time monitoring with MutationObserver
- ✅ Periodic polling (2-second intervals)
- ✅ Smart categorization of common cookies
- ✅ Integration with backend reporting

### Cookie Scanner Class

```typescript
class CookieScanner {
  // Scan all cookies
  async scanCookies(): Promise<CookieScanReport>;
  
  // Watch for new cookies
  watchCookieChanges(): void;
  
  // Stop watching
  stopWatching(): void;
  
  // Get detected cookies
  getDetectedCookies(): DetectedCookie[];
  
  // Send report to backend
  sendReportToBackend(siteId: string, apiUrl: string): Promise<void>;
}
```

### Cookie Categories

Cookies are automatically categorized into:

- **Necessary** - Session cookies, CSRF tokens, consent cookies
- **Analytics** - Google Analytics, Microsoft Clarity, Hotjar, Mixpanel, Amplitude
- **Marketing** - Facebook Pixel, TikTok Pixel, Google Ads, DoubleClick
- **Preferences** - Language, theme, timezone settings
- **Unclassified** - Unknown cookies

### Cookie Detection Patterns

#### Analytics Cookies
- `_ga`, `_gid`, `_gat`, `_gac` - Google Analytics
- `__utma`, `__utmb`, `__utmc`, `__utmz` - Legacy Google Analytics
- `_clck`, `_clsk`, `CLID` - Microsoft Clarity
- `_hjid`, `_hjSession*` - Hotjar
- `mp_*`, `mixpanel` - Mixpanel
- `amplitude_*` - Amplitude

#### Marketing Cookies
- `_fbp`, `_fbc`, `fr` - Facebook/Meta
- `_ttp`, `_tt_enable_cookie` - TikTok
- `_gcl_`, `_gac_` - Google Ads
- `IDE`, `test_cookie` - DoubleClick

#### Necessary Cookies
- `PHPSESSID`, `JSESSIONID` - Session cookies
- `csrftoken`, `_csrf` - CSRF protection
- `rs-cmp-consent` - CMP consent storage

#### Preferences Cookies
- `lang`, `language`, `locale` - Language
- `theme`, `dark_mode` - Theme
- `timezone`, `tz` - Timezone

### Usage

#### Get Detected Cookies

```javascript
// Get all detected cookies
const cookies = window.RSCMP.getDetectedCookies();
console.log('Found cookies:', cookies);

// Filter by category
const analyticsCookies = cookies.filter(c => c.category === 'analytics');
const marketingCookies = cookies.filter(c => c.category === 'marketing');
```

#### Cookie Data Structure

```typescript
interface DetectedCookie {
  name: string;        // Cookie name
  value: string;       // Cookie value
  domain: string;      // Cookie domain
  path: string;        // Cookie path
  category?: string;   // Auto-categorized
  expires?: string;    // Expiration date
}
```

### Backend Integration

Cookie scan reports are automatically sent to the backend:

**Endpoint:** `POST /v1/cookies/report`

**Request Body:**
```json
{
  "siteId": "your-site-id",
  "timestamp": "2024-01-29T12:00:00.000Z",
  "cookies": [
    {
      "name": "_ga",
      "value": "GA1.2.xxx",
      "domain": "example.com",
      "path": "/",
      "category": "analytics"
    }
  ],
  "autoCategories": {
    "_ga": "analytics",
    "_fbp": "marketing"
  }
}
```

**Response:**
```json
{
  "success": true
}
```

**Get Latest Report:** `GET /v1/cookies/report/:siteId`

## Database Schema Updates

### Consents Table

Added `tcf_string` column:

```sql
ALTER TABLE consents ADD COLUMN tcf_string TEXT;
```

### Cookie Scans Table

New table for cookie scan reports:

```sql
CREATE TABLE cookie_scans (
    id SERIAL PRIMARY KEY,
    site_id VARCHAR(64) NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL,
    cookies_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    categories_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing

A comprehensive test page is available at `demo/tcf-cookie-test.html`.

### Test Features:

1. **TCF API Tests**
   - Test `__tcfapi` ping
   - Get TC Data
   - Get Vendor List

2. **Cookie Scanner Tests**
   - Add test cookies
   - Run scanner
   - Show categorized cookies

3. **Integration Tests**
   - Accept/Reject consent
   - Check TC String generation
   - Verify consent updates

### Running Tests

```bash
# Build the SDK
npm run build:sdk

# Open the test page in a browser
# Open demo/tcf-cookie-test.html
```

## Production Considerations

### TCF String Encoding

The current implementation uses a simplified TC String encoding. For production use with real IAB vendors, consider using the official `@iabtcf/core` library for proper encoding:

```bash
npm install @iabtcf/core
```

### Vendor List Management

The vendor list should be regularly updated from the official IAB Global Vendor List:
- https://iabeurope.eu/vendor-list-tcf/

### Cookie Categorization

For better accuracy, consider integrating with:
- OneTrust Cookie Database
- Cookiebot Database
- Custom ML-based categorization

### Performance

- Cookie scanning runs on initialization and every 2 seconds
- Consider adjusting the polling interval based on your needs
- MutationObserver automatically detects script additions

## API Reference

### RSCMP Methods

```typescript
// Get TCF data
window.RSCMP.getTCFData(): TCFData | null

// Get detected cookies
window.RSCMP.getDetectedCookies(): DetectedCookie[]
```

### TCF API Methods

```typescript
window.__tcfapi(command: string, version: number, callback: Function, parameter?: any)
```

**Commands:**
- `ping` - Check CMP status
- `getTCData` - Get consent data and TC String
- `getVendorList` - Get vendor and purpose list
- `addEventListener` - Listen for consent changes
- `removeEventListener` - Remove event listener

## Compliance Notes

### GDPR Compliance

- ✅ TC Strings include all required IAB fields
- ✅ User consent choices are properly mapped to purposes
- ✅ Vendor consents are calculated correctly
- ✅ Backend stores all consent data with IP hashing

### ePrivacy Compliance

- ✅ Cookies are detected before consent
- ✅ Scripts remain blocked until consent
- ✅ Cookie categories match ePrivacy requirements

### IAB TCF 2.2 Compliance

- ✅ `__tcfapi` implements required methods
- ✅ TC String follows IAB encoding format
- ✅ Standard purposes and vendors supported
- ✅ Real-time consent updates via events

## Support

For issues or questions:
- GitHub Issues: https://github.com/iAlias/rs-cmp/issues
- Documentation: See README.md for basic usage

## Version

These features were added in version 1.1.0 (January 2024)
