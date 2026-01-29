# RS-CMP Improvements Documentation

This document describes the recent improvements to the RS-CMP JavaScript SDK based on features from `cmp-perp.js` and `rs.cookieManager.js`.

## New Features Overview

| Feature | Status | Description |
|---------|--------|-------------|
| Advanced Script Detection | ✅ | Automatically detects and categorizes analytics and marketing scripts |
| Service Loaders | ✅ | Built-in loaders for Meta Pixel, Clarity, TikTok Pixel, Google Ads |
| Inline Configuration | ✅ | Use CMP without API - configure directly in JavaScript |
| Debug Mode | ✅ | Enable detailed logging and diagnostics |
| Detailed Services UI | ✅ | Show service details in consent modal |
| GTM DataLayer Integration | ✅ | Automatic push of consent events to dataLayer |
| Public Methods | ✅ | New methods for programmatic control |

---

## 1. Advanced Script Detection

The CMP now automatically detects and categorizes common tracking scripts without requiring manual `data-category` attributes.

### Supported Services

**Analytics:**
- Google Analytics / gtag
- Google Tag Manager
- Microsoft Clarity
- Hotjar
- Mixpanel
- Amplitude

**Marketing:**
- Meta (Facebook) Pixel
- TikTok Pixel
- Google Ads
- DoubleClick
- Google Ad Services

### How It Works

```javascript
// The detectCategory() method automatically identifies scripts
const category = scriptBlocker.detectCategory(scriptSource);
// Returns: 'analytics', 'marketing', or null
```

Scripts are automatically categorized during initialization, so you don't need to add `data-category` attributes manually.

---

## 2. Service Loaders

Built-in loaders for popular third-party services that load automatically when user grants consent.

### Available Services

- **meta-pixel** - Facebook/Meta Pixel (marketing)
- **clarity** - Microsoft Clarity (analytics)
- **tiktok-pixel** - TikTok Pixel (marketing)
- **google-ads** - Google Ads (marketing, via Consent Mode)

### Configuration

```javascript
// Configure services after CMP initialization
window.RSCMP.configureService('meta-pixel', { id: '1234567890' });
window.RSCMP.configureService('clarity', { id: 'abc123xyz' });
window.RSCMP.configureService('tiktok-pixel', { id: 'TIKTOK123' });
```

### Usage

Services load automatically when:
1. User grants consent for the service's category
2. Service has been configured with an ID

```javascript
// Services will auto-load after consent is granted
// No additional code needed!
```

---

## 3. Inline Configuration (Standalone Usage)

Use the CMP without an API backend. Perfect for static sites or quick implementations.

### Default Configuration

```javascript
// Initialize with default configuration (no API needed)
window.RSCMP.init();
```

### Custom Configuration

```javascript
// Initialize with custom settings
window.RSCMP.init({
  siteName: 'My Website',
  domain: window.location.hostname,
  banner: {
    position: 'bottom',
    layout: 'bar',
    primaryColor: '#ff6b6b',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    buttonTextColor: '#ffffff'
  },
  categories: [
    { id: 'necessary', name: 'Necessary', description: 'Required', required: true, enabled: true },
    { id: 'analytics', name: 'Analytics', description: 'Help us improve', required: false, enabled: false },
    { id: 'marketing', name: 'Marketing', description: 'Ads', required: false, enabled: false },
    { id: 'preferences', name: 'Preferences', description: 'Your settings', required: false, enabled: false }
  ],
  translations: {
    en: {
      title: 'We respect your privacy',
      description: 'We use cookies to improve your experience.',
      acceptAll: 'Accept All',
      rejectAll: 'Reject All',
      customize: 'Customize',
      save: 'Save Preferences',
      close: 'Close',
      categories: {
        necessary: { name: 'Necessary', description: 'Essential cookies' },
        analytics: { name: 'Analytics', description: 'Usage statistics' },
        marketing: { name: 'Marketing', description: 'Advertising cookies' },
        preferences: { name: 'Preferences', description: 'Your settings' }
      }
    }
  }
});
```

### Priority Order

The CMP checks for configuration in this order:
1. **Inline configuration** - if passed to `init()`
2. **API configuration** - if `data-site-id` attribute exists
3. **Default configuration** - as fallback

---

## 4. Debug Mode and Diagnostics

Enable detailed logging and diagnostics for troubleshooting.

### Enable/Disable Debug Mode

```javascript
// Enable debug mode
window.RSCMP.enableDebug();

// Disable debug mode
window.RSCMP.disableDebug();

// Manual logging (only shows if debug mode is on)
window.RSCMP.log('Custom debug message');
```

### Get CMP Status

```javascript
const status = window.RSCMP.getStatus();
console.log(status);
```

**Returns:**
```javascript
{
  initialized: true,
  siteId: 'your-site-id',
  consent: {
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false
  },
  blockedScripts: 5,
  bannerVisible: false
}
```

### Test Google Consent Mode

```javascript
window.RSCMP.testConsentMode();
// Check console for consent state
```

---

## 5. Detailed Category Services UI

The consent modal now shows detailed information about services in each category.

### Service Details Displayed

For each category, users can expand to see:
- **Service Name** - e.g., "Google Analytics 4"
- **Provider** - e.g., "Google"
- **Duration** - e.g., "2 years"

### Services by Category

**Analytics:**
- Google Analytics 4 (Google, 2 years)
- Microsoft Clarity (Microsoft, 1 year)

**Marketing:**
- Google Ads (Google, 90 days)
- Meta Pixel (Meta, 90 days)
- TikTok Pixel (TikTok, 13 months)

**Preferences:**
- Language Settings (First-party, 1 year)
- Theme Preferences (First-party, 1 year)

### Customization

You can customize the services list by modifying the `getServicesForCategory()` method in `BannerUI` class.

---

## 6. GTM DataLayer Integration

Consent choices are automatically pushed to Google Tag Manager's dataLayer.

### Event Structure

```javascript
window.dataLayer.push({
  event: 'cookie_consent_update',
  cookie_consent_analytics: true,
  cookie_consent_marketing: false,
  cookie_consent_preferences: false,
  cookie_consent_necessary: true,
  consent_timestamp: '2024-01-29T12:34:56.789Z'
});
```

### Usage in GTM

Create triggers in GTM based on these dataLayer events:

1. **Create Custom Event Trigger**
   - Event name: `cookie_consent_update`

2. **Use Variables**
   - `cookie_consent_analytics`
   - `cookie_consent_marketing`
   - `cookie_consent_preferences`
   - `cookie_consent_necessary`

3. **Example Tag Configuration**
   - Fire Google Analytics tag when `cookie_consent_analytics = true`
   - Fire Facebook Pixel when `cookie_consent_marketing = true`

---

## 7. Public Methods for Preferences Management

New public methods for programmatic control of the CMP.

### Show Preferences Banner

```javascript
// Open preferences modal/banner
window.RSCMP.showPreferences();
```

**Usage Example:**
```html
<button onclick="window.RSCMP.showPreferences()">
  Cookie Settings
</button>
```

### Reset Consent

```javascript
// Clear all consent and show banner again
window.RSCMP.resetConsent();
```

**Usage Example:**
```html
<button onclick="window.RSCMP.resetConsent()">
  Reset Cookie Preferences
</button>
```

### Complete API Reference

```javascript
// Initialization
window.RSCMP.init(inlineConfig?)

// Service Configuration
window.RSCMP.configureService(serviceId, config)

// Preferences Management
window.RSCMP.showPreferences()
window.RSCMP.resetConsent()

// Debug & Diagnostics
window.RSCMP.enableDebug()
window.RSCMP.disableDebug()
window.RSCMP.log(...args)
window.RSCMP.getStatus()
window.RSCMP.testConsentMode()
```

---

## Migration Guide

### From Previous Version

If you're upgrading from a previous version, these improvements are **fully backwards compatible**. Your existing implementation will continue to work without changes.

### Optional Enhancements

You can progressively adopt new features:

1. **Add Service Loaders:**
   ```javascript
   window.RSCMP.configureService('meta-pixel', { id: 'YOUR_ID' });
   ```

2. **Enable Debug Mode (Development):**
   ```javascript
   if (window.location.hostname === 'localhost') {
     window.RSCMP.enableDebug();
   }
   ```

3. **Add Cookie Settings Link:**
   ```html
   <a href="#" onclick="window.RSCMP.showPreferences(); return false;">
     Cookie Settings
   </a>
   ```

4. **Use GTM Events:**
   - Events are automatically pushed
   - Configure triggers in GTM to use consent data

---

## Examples

### Complete Implementation Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>My Website</title>
</head>
<body>
    <h1>Welcome</h1>
    
    <!-- Cookie Settings Link -->
    <button onclick="window.RSCMP.showPreferences()">
        Cookie Settings
    </button>
    
    <!-- Load CMP SDK -->
    <script src="https://cdn.rs-cmp.com/cmp.min.js"></script>
    
    <script>
        // Initialize with inline config
        window.RSCMP.init({
            siteName: 'My Website',
            banner: {
                position: 'bottom',
                primaryColor: '#0084ff'
            }
        });
        
        // Configure services
        window.RSCMP.configureService('meta-pixel', { id: '1234567890' });
        window.RSCMP.configureService('clarity', { id: 'abc123xyz' });
        
        // Enable debug in development
        if (window.location.hostname === 'localhost') {
            window.RSCMP.enableDebug();
        }
    </script>
</body>
</html>
```

### GTM Integration Example

```javascript
// Listen for consent updates in your own code
window.dataLayer = window.dataLayer || [];

// Check dataLayer for consent events
const consentEvents = window.dataLayer.filter(
    item => item.event === 'cookie_consent_update'
);

if (consentEvents.length > 0) {
    const latest = consentEvents[consentEvents.length - 1];
    console.log('Current consent:', {
        analytics: latest.cookie_consent_analytics,
        marketing: latest.cookie_consent_marketing
    });
}
```

---

## Browser Compatibility

All new features are compatible with:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Demo

A comprehensive demo is available at `demo/cmp-improvements-demo.html` showing all new features in action.

To run the demo:

1. Build the SDK: `npm run build:sdk:js`
2. Open `demo/cmp-improvements-demo.html` in a browser
3. Test all features interactively

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/iAlias/rs-cmp/issues
- Documentation: See USAGE.md for basic usage

---

## Changelog

### v1.1.0 (2024-01-29)

**Added:**
- Advanced script auto-detection for analytics and marketing services
- Service loaders for Meta Pixel, Clarity, TikTok Pixel, Google Ads
- Inline configuration support (no API required)
- Debug mode with logging and diagnostics
- Detailed service information in consent modal
- GTM dataLayer integration
- Public methods: `showPreferences()`, `resetConsent()`, `configureService()`
- Diagnostic methods: `getStatus()`, `testConsentMode()`

**Changed:**
- Enhanced `scanAndBlockCommonScripts()` with smarter detection
- Improved consent modal UI with expandable service details

**Fixed:**
- None (new features)
