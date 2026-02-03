# OpenConsent v2 🍪

> ## **🚀 Native Google Consent Mode v2 Support Without Bloated Dependencies**
> 
> Zero dependencies. Full control. No monthly fees.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/rs-cmp.svg?style=flat)](https://www.npmjs.com/package/rs-cmp)
[![Size: <40kb](https://img.shields.io/badge/Size-<40kb-green.svg)]()
[![Google Consent Mode v2](https://img.shields.io/badge/Google%20Consent%20Mode-v2-4285F4.svg)]()
[![GDPR Compliant](https://img.shields.io/badge/GDPR-Compliant-success.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6.svg)]()
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-brightgreen.svg)]()

**The lightweight, dependency-free GDPR Consent Management Platform with native Google Consent Mode v2 support.**

The free, open-source alternative to Cookiebot, OneTrust, and Iubenda. Perfect for developers who want full control over their consent management without vendor lock-in or monthly fees.

## ✨ Why OpenConsent v2?

- 🚀 **No Dependencies** - Pure JavaScript, runs anywhere
- 🎯 **Google Consent Mode v2** - Native integration, no configuration needed
- 🔒 **GDPR First** - IP hashing, secure storage, data export built-in
- ⚡ **Lightweight** - < 40kb minified + gzipped (~15kb)
- 🎨 **Fully Customizable** - Colors, position, layout, and translations
- 🔄 **SPA Support** - MutationObserver for dynamic content
- 🛡️ **CSP Compatible** - Works with Content Security Policy (nonce support)
- 🍪 **Automatic Cookie Cleaning** - Removes cookies when consent is revoked
- 🎭 **Script Blocking** - Block tracking scripts until consent is given
- 📦 **Batteries Included** - Backend examples for Node.js and PHP

## Features

### ✅ Core Features (MVP)

- **One-Script Installation**: Install with a single `<script>` tag
- **Consent Banner**: Responsive, ARIA-compliant banner with Accept/Reject/Customize options
- **Automatic Script Blocking**: Block cookies and tracking scripts until consent is given
- **Consent Storage**: Dual storage (localStorage + first-party cookie)
- **Google Consent Mode v2**: Automatic integration with Google services
- **Multi-language Support**: Auto-detect user language
- **REST API**: Backend API for configuration and consent logging
- **GDPR Compliant**: IP hashing, secure storage, data export

### ⚡ Quick Start (Copy & Paste!)

**No configuration needed. Just paste this in your `<head>` and you're done:**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Your Website</title>
  
  <!-- 1️⃣ OpenConsent v2 - Copy this block -->
  <script src="./dist/cmp.min.js"></script>
  <script>
    window.RSCMP.init({
      siteId: 'YOUR_SITE_ID',  // ⚠️ CHANGE THIS to your unique site ID
    }).then(() => console.log('✅ CMP ready!'));
  </script>
  
  <!-- 2️⃣ Block tracking scripts with data-category -->
  <script type="text/plain" data-category="analytics">
    <!-- Google Analytics (gtag.js) -->
    (function() {
      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID';
      document.head.appendChild(script);
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'GA_MEASUREMENT_ID');
    })();
  </script>
  
  <script type="text/plain" data-category="marketing">
    <!-- Facebook Pixel -->
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window,document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', 'YOUR_PIXEL_ID');
    fbq('track', 'PageView');
  </script>
</head>
<body>
  <h1>Your Website</h1>
  <!-- Your content here -->
</body>
</html>
```

**🎉 That's it!** The CMP will:
- ✅ Show a GDPR-compliant consent banner on first visit
- ✅ Block ALL scripts marked with `data-category` until consent
- ✅ Automatically integrate with **Google Consent Mode v2** (zero config!)
- ✅ Store consent choices securely (localStorage + cookie)
- ✅ Work with Google Tag Manager, Google Analytics, Facebook Pixel, etc.

**📱 Try it now:** Open `examples/basic.html` in your browser to see it in action!

**🚀 Optional:** Set up backend logging (see `server-side/` folder for Node.js/PHP examples)

---

## 📂 Repository Structure

```
rs-cmp/
├── dist/                       # Minified production files
│   ├── cmp.min.js             # Ready-to-use CMP (<40kb)
│   └── cmp-js.min.js          # Alternative build name
├── src/                        # Source code
│   └── cmp.js                 # Main CMP implementation
├── examples/                   # 🌟 Live examples
│   ├── basic.html             # Simple implementation
│   └── gtm-implementation.html # Google Tag Manager integration
├── server-side/               # 🔧 Backend examples
│   ├── node-logger.js         # Node.js/Express logger
│   ├── php-logger.php         # PHP logger
│   └── README.md              # Server setup guide
├── LICENSE                     # MIT License
└── README.md                   # This file
```

### 🎯 Try the Examples

1. **Basic Example**: [`examples/basic.html`](examples/basic.html)
   - Simple implementation with all features
   - Test buttons for consent management
   - Live consent status display

2. **Google Tag Manager**: [`examples/gtm-implementation.html`](examples/gtm-implementation.html)
   - Complete GTM integration guide
   - Google Consent Mode v2 visualization
   - Live consent mode status display

3. **Backend Setup**: [`server-side/`](server-side/)
   - Node.js logger (Express)
   - PHP logger
   - Database examples (PostgreSQL, MySQL, MongoDB, SQLite)

### 📦 Installation

#### Quick Start

**IMPORTANT: The CMP script must be placed immediately after the `<title>` tag in your `<head>` section, before any other scripts!**

Add this script to your website's `<head>` section:

```html
<head>
  <meta charset="UTF-8">
  <title>Your Site Title</title>
  
  <!-- RS-CMP must be immediately after <title> -->
  <script src="https://cdn.rs-cmp.com/cmp.min.js" data-site-id="YOUR_SITE_ID"></script>
  <script>
    // Initialize the CMP explicitly
    window.RSCMP.init().then(() => {
      console.log('CMP initialized');
    });
  </script>
  
  <!-- Your other scripts come after -->
  <script src="your-other-scripts.js"></script>
</head>
```

The CMP will:
1. Block tracking scripts immediately (before they execute)
2. Load your site configuration
3. Show the consent banner if no consent exists
4. Apply user consent choices dynamically without page reload

#### Debug Mode

To enable cookie scanning in debug mode (scans only after consent changes):

```javascript
window.RSCMP.setDebugMode(true);
```

#### Manual Script Blocking

For precise control, mark scripts with `data-category` and `type="text/plain"`:

```html
<!-- Analytics script (Google Analytics) -->
<script type="text/plain" data-category="analytics">
  // Google Analytics code
  (function(i,s,o,g,r,a,m){...})(window,document,'script','//www.google-analytics.com/analytics.js','ga');
</script>

<!-- Marketing script (Facebook Pixel) -->
<script type="text/plain" data-category="marketing">
  // Facebook Pixel code
  !function(f,b,e,v,n,t,s){...}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
</script>

<!-- Preferences script -->
<script type="text/plain" data-category="preferences">
  // Your preferences code
</script>

<!-- Necessary scripts don't need type="text/plain" -->
<script data-category="necessary">
  // This will always run
</script>
```

**How it works:**
1. Scripts with `type="text/plain"` won't execute automatically
2. When user gives consent, the CMP unblocks scripts dynamically (no page reload)
3. Consented scripts are recreated with proper type and execute
4. Non-consented scripts remain blocked as `type="text/plain"`
5. All critical script attributes (type="module", nonce, integrity, crossorigin) are preserved

**Cookie Storage:**
- Consent data is stored primarily in localStorage
- A minimal cookie (`rs-cmp-consent=1`) is used only as a presence indicator
- Full consent state is maintained in localStorage for privacy and efficiency

### 🏗️ Architecture

#### Frontend SDK

**NEW: SDK disponibile in TypeScript E JavaScript!**

Due versioni complete dello stesso SDK:

**Versione TypeScript**:
- **File principale**: `src/cmp.ts` - Tutto in un unico file TypeScript
- **Vanilla TypeScript** (no dependencies)
- **< 16kb minified** (gzipped ~6-7kb)
- **ES2015 compatible**
- Type safety completo

**Versione JavaScript** 🆕:
- **File principale**: `src/cmp.js` - Versione JavaScript pura
- **Nessuna compilazione richiesta** - Usa direttamente nel browser
- **JSDoc completo** per documentazione tipi
- **Stesse dimensioni e funzionalità** della versione TypeScript
- **Vedi [JAVASCRIPT.md](JAVASCRIPT.md) per documentazione completa**

Il file consolidato include:
- Type definitions - Tutte le interfacce (TypeScript) o JSDoc (JavaScript)
- `ConsentStorage` - localStorage + cookie persistence
- `ConsentManager` - Consent state management
- `ScriptBlocker` - Automatic script blocking/unblocking
- `GoogleConsentMode` - Google Consent Mode v2 integration
- `BannerUI` - Banner UI with customization modal
- `RSCMP` - Main class with auto-initialization

**Documentazione**:
- TypeScript: vedi [USAGE.md](USAGE.md)
- JavaScript: vedi [JAVASCRIPT.md](JAVASCRIPT.md)

Struttura legacy (ancora presente per riferimento):
- `src/sdk/` - File separati originali (deprecati)

#### Backend API (`src/backend/`)
- **Fastify** - Fast, low-overhead web framework
- **PostgreSQL** - Consent logs and site configurations
- **Rate limiting** - Protection against abuse
- **IP hashing** - Privacy-first consent logging

Endpoints:
- `GET /v1/site/:id/config` - Get site configuration
- `POST /v1/consent` - Log user consent
- `GET /v1/consent/export` - Export consent logs (CSV)
- `POST /v1/site` - Create new site
- `PUT /v1/site/:id/config` - Update site configuration

### 🗄️ Database Schema

```sql
-- Sites table
CREATE TABLE sites (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    config_json JSONB NOT NULL,
    policy_version VARCHAR(20),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Consents table
CREATE TABLE consents (
    id SERIAL PRIMARY KEY,
    site_id VARCHAR(64) REFERENCES sites(id),
    timestamp TIMESTAMP NOT NULL,
    categories_json JSONB NOT NULL,
    ip_hash VARCHAR(64) NOT NULL,
    version VARCHAR(20)
);
```

### 🚀 Development

#### Prerequisites
- Node.js 18+
- PostgreSQL 14+

#### Setup

1. Install dependencies:
```bash
npm install
```

2. Set up database:
```bash
psql -U postgres -f database/schema.sql
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Build the SDK:
```bash
npm run build:sdk
```

5. Start the backend:
```bash
npm run dev:backend
```

#### Build Commands

```bash
# Build TypeScript SDK (development)
npm run build:sdk:dev

# Build TypeScript SDK (production, minified)
npm run build:sdk:prod

# Build both TypeScript SDK versions
npm run build:sdk

# Build JavaScript SDK (development)
npm run build:sdk:js:dev

# Build JavaScript SDK (production, minified)
npm run build:sdk:js:prod

# Build both JavaScript SDK versions
npm run build:sdk:js

# Build backend
npm run build:backend

# Build everything (TypeScript SDK + JavaScript SDK + Backend)
npm run build
```

### 📝 Configuration

Default configuration includes:

```json
{
  "banner": {
    "position": "bottom",
    "layout": "bar",
    "primaryColor": "#2563eb",
    "backgroundColor": "#ffffff",
    "textColor": "#1f2937",
    "buttonTextColor": "#ffffff",
    "showLogo": false
  },
  "categories": [
    {
      "id": "necessary",
      "name": "Necessary",
      "required": true,
      "enabled": true
    },
    {
      "id": "analytics",
      "name": "Analytics",
      "required": false,
      "enabled": false
    },
    {
      "id": "marketing",
      "name": "Marketing",
      "required": false,
      "enabled": false
    },
    {
      "id": "preferences",
      "name": "Preferences",
      "required": false,
      "enabled": false
    }
  ]
}
```

### 🌍 Supported Languages

- English (en)
- Italian (it)

More languages can be added in the site configuration.

### 🔒 Security Features

- **IP Hashing**: SHA-256 hashing of IP addresses before storage
- **Rate Limiting**: 100 requests per minute per IP
- **CORS Protection**: Configurable CORS policies
- **CSP Friendly**: Compatible with Content Security Policy
- **No Cookies Before Consent**: Zero cookies until user accepts

### 📊 Compliance

- ✅ GDPR compliant
- ✅ ePrivacy Directive compliant
- ✅ Google Consent Mode v2 ready

### 🎯 Performance

- Script size: **< 40kb** (minified + gzipped)
- Lighthouse impact: **< 10ms** blocking time
- 100% scripts blocked before consent
- Async loading supported

### 🔮 Roadmap (v2)

- [ ] A/B testing for banner variations
- [ ] Geo-targeting (EU-only mode)
- [ ] Server-side consent API
- [ ] WordPress plugin
- [ ] Shopify app
- [ ] Multi-domain support
- [ ] White-label options
- [ ] Advanced analytics dashboard
- [ ] Cookie scanner service
- [ ] Privacy policy generator

### 📄 License

MIT License - see LICENSE file for details

### 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

### 📧 Support

For support and questions, please open an issue on GitHub.