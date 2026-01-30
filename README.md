# RS-CMP - Consent Management Platform

A GDPR-compliant Consent Management Platform (CMP) that respects GDPR and ePrivacy standards.

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

### 📦 Installation

#### Quick Start

Add this script to your website's `<head>` section:

```html
<script src="https://cdn.rs-cmp.com/cmp.min.js" data-site-id="YOUR_SITE_ID"></script>
```

That's it! The CMP will automatically:
1. Load your site configuration
2. Block tracking scripts
3. Show the consent banner
4. Apply user consent choices

#### Manual Script Blocking

For precise control, mark scripts with `data-category`:

```html
<!-- Analytics script -->
<script type="text/plain" data-category="analytics">
  // Google Analytics code
</script>

<!-- Marketing script -->
<script type="text/plain" data-category="marketing">
  // Facebook Pixel code
</script>
```

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