# Confronto: TypeScript vs JavaScript

Questo documento mostra le differenze tra la versione TypeScript e JavaScript dell'SDK RS-CMP.

## Dimensioni File

| Versione | Sorgente | Build Dev | Build Prod (minified) | Gzipped |
|----------|----------|-----------|----------------------|---------|
| TypeScript | 30 KB (1030 righe) | 25.7 KB | 15.8 KB | ~6 KB |
| JavaScript | 33 KB (1165 righe) | 31.1 KB | 15.3 KB | ~6 KB |

**Conclusione**: Le due versioni hanno dimensioni praticamente identiche una volta minificate e compresse.

## Esempio: Type Definitions

### TypeScript (`src/cmp.ts`)
```typescript
export interface ConsentCategories {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

export interface ConsentData {
  categories: ConsentCategories;
  timestamp: string;
  version: string;
}
```

### JavaScript (`src/cmp.js`)
```javascript
/**
 * @typedef {Object} ConsentCategories
 * @property {boolean} necessary - Essential cookies required for the site
 * @property {boolean} analytics - Analytics and performance tracking
 * @property {boolean} marketing - Marketing and advertising cookies
 * @property {boolean} preferences - User preferences and settings
 */

/**
 * @typedef {Object} ConsentData
 * @property {ConsentCategories} categories - Consent choices for each category
 * @property {string} timestamp - ISO 8601 timestamp of consent
 * @property {string} version - Policy version
 */
```

## Esempio: Classe ConsentStorage

### TypeScript
```typescript
class ConsentStorage {
  /**
   * Save consent to localStorage and cookie
   */
  saveConsent(consent: ConsentData): void {
    const consentString = JSON.stringify(consent);

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, consentString);
    } catch (error) {
      console.warn('[RS-CMP] Failed to save to localStorage:', error);
    }

    // Save to cookie (first-party)
    this.setCookie(COOKIE_NAME, consentString, COOKIE_MAX_AGE);
  }

  /**
   * Get consent from localStorage or cookie
   */
  getConsent(): ConsentData | null {
    // Try localStorage first
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('[RS-CMP] Failed to read from localStorage:', error);
    }

    // Fallback to cookie
    const cookieValue = this.getCookie(COOKIE_NAME);
    if (cookieValue) {
      try {
        return JSON.parse(cookieValue);
      } catch (error) {
        console.warn('[RS-CMP] Failed to parse cookie:', error);
      }
    }

    return null;
  }

  private setCookie(name: string, value: string, maxAge: number): void {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax${secure}`;
  }

  private getCookie(name: string): string | null {
    // Implementation...
  }
}
```

### JavaScript
```javascript
class ConsentStorage {
  /**
   * Save consent to localStorage and cookie
   * @param {ConsentData} consent - Consent data to save
   * @returns {void}
   */
  saveConsent(consent) {
    const consentString = JSON.stringify(consent);

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, consentString);
    } catch (error) {
      console.warn('[RS-CMP] Failed to save to localStorage:', error);
    }

    // Save to cookie (first-party)
    this.setCookie(COOKIE_NAME, consentString, COOKIE_MAX_AGE);
  }

  /**
   * Get consent from localStorage or cookie
   * @returns {ConsentData | null} Stored consent or null
   */
  getConsent() {
    // Try localStorage first
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('[RS-CMP] Failed to read from localStorage:', error);
    }

    // Fallback to cookie
    const cookieValue = this.getCookie(COOKIE_NAME);
    if (cookieValue) {
      try {
        return JSON.parse(cookieValue);
      } catch (error) {
        console.warn('[RS-CMP] Failed to parse cookie:', error);
      }
    }

    return null;
  }

  /**
   * Set a cookie
   * @param {string} name - Cookie name
   * @param {string} value - Cookie value
   * @param {number} maxAge - Max age in seconds
   * @returns {void}
   * @private
   */
  setCookie(name, value, maxAge) {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax${secure}`;
  }

  /**
   * Get a cookie value
   * @param {string} name - Cookie name
   * @returns {string | null} Cookie value or null
   * @private
   */
  getCookie(name) {
    // Implementation...
  }
}
```

## Differenze Principali

### 1. Annotazioni di Tipo

| Aspetto | TypeScript | JavaScript |
|---------|-----------|------------|
| Definizioni tipi | `interface` e `type` | JSDoc `@typedef` |
| Parametri | `param: Type` | JSDoc `@param {Type} param` |
| Valori di ritorno | `: ReturnType` | JSDoc `@returns {ReturnType}` |
| Type safety | Compilatore TypeScript | Editor con JSDoc support |

### 2. Compilazione

| Aspetto | TypeScript | JavaScript |
|---------|-----------|------------|
| Compilazione necessaria | ✅ Sì (tsc o esbuild) | ❌ No |
| Errori a compile-time | ✅ Sì | ❌ No (solo runtime) |
| Uso diretto nel browser | ❌ No | ✅ Sì |
| Build step | Sempre richiesto | Opzionale (solo per minify) |

### 3. IDE Support

| Aspetto | TypeScript | JavaScript con JSDoc |
|---------|-----------|----------------------|
| Autocompletamento | ⭐⭐⭐⭐⭐ Eccellente | ⭐⭐⭐⭐ Ottimo |
| Type checking | ⭐⭐⭐⭐⭐ Eccellente | ⭐⭐⭐ Buono |
| Refactoring | ⭐⭐⭐⭐⭐ Eccellente | ⭐⭐⭐ Buono |
| Error detection | ⭐⭐⭐⭐⭐ Prima del runtime | ⭐⭐ Solo runtime |

### 4. Debugging

| Aspetto | TypeScript | JavaScript |
|---------|-----------|------------|
| Source maps necessari | ✅ Sì | ❌ No |
| Codice leggibile | Con source maps | Sempre |
| Stack traces | Possono essere complessi | Diretti |

## Quando Usare Ciascuna Versione

### Usa TypeScript quando:
- ✅ Stai sviluppando un'applicazione complessa
- ✅ Hai un team di sviluppatori
- ✅ Vuoi type safety durante lo sviluppo
- ✅ Usi già TypeScript nel tuo progetto
- ✅ Hai un build process esistente

### Usa JavaScript quando:
- ✅ Vuoi semplicità e rapidità
- ✅ Non hai un build process
- ✅ Stai prototipando velocemente
- ✅ Vuoi debuggare facilmente
- ✅ Hai bisogno di modificare il codice al volo
- ✅ Stai imparando il CMP

## Build Commands

### TypeScript
```bash
# Development
npm run build:sdk:dev
# Output: dist/cmp.js

# Production
npm run build:sdk:prod
# Output: dist/cmp.min.js
```

### JavaScript
```bash
# Development
npm run build:sdk:js:dev
# Output: dist/cmp-js.js

# Production
npm run build:sdk:js:prod
# Output: dist/cmp-js.min.js
```

## Esempio di Utilizzo

### TypeScript (con build)
```html
<!DOCTYPE html>
<html>
<head>
  <!-- Devi prima compilare con: npm run build:sdk:prod -->
  <script src="dist/cmp.min.js" data-site-id="YOUR_SITE_ID"></script>
</head>
<body>
  <!-- Your content -->
</body>
</html>
```

### JavaScript (senza build)
```html
<!DOCTYPE html>
<html>
<head>
  <!-- Usa direttamente il file sorgente, nessun build richiesto -->
  <script src="src/cmp.js" data-site-id="YOUR_SITE_ID"></script>
</head>
<body>
  <!-- Your content -->
</body>
</html>
```

### JavaScript (con build per ottimizzazione)
```html
<!DOCTYPE html>
<html>
<head>
  <!-- Opzionalmente puoi buildare per avere minificazione -->
  <script src="dist/cmp-js.min.js" data-site-id="YOUR_SITE_ID"></script>
</head>
<body>
  <!-- Your content -->
</body>
</html>
```

## Compatibilità

Entrambe le versioni:
- ✅ ES2015+
- ✅ Tutti i browser moderni
- ✅ IE11 con polyfill per Promise
- ✅ Stesse funzionalità
- ✅ Stessa API
- ✅ Stesso comportamento

## Performance

Le performance sono **identiche** perché:
- Entrambe vengono compilate in JavaScript standard
- Il minified ha le stesse dimensioni
- Il gzipped è praticamente uguale
- Il browser esegue lo stesso codice

## Conclusione

Entrambe le versioni sono **ugualmente valide** e **completamente funzionali**.

**Scegli in base alle tue esigenze**:
- **TypeScript** per progetti grandi e complessi con team
- **JavaScript** per semplicità, rapidità e prototipi

L'SDK RS-CMP funziona perfettamente in entrambi i casi! 🎉
