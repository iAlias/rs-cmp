# RS-CMP - Versione JavaScript

Questa è la versione JavaScript pura dell'SDK RS-CMP. Non richiede TypeScript o compilazione e può essere utilizzata direttamente nei browser.

## File Disponibili

### Sorgente JavaScript
- **`src/cmp.js`** - Codice sorgente JavaScript completo (1165 righe)
- Include tutti i tipi documentati con JSDoc
- Compatibile ES2015+
- Nessuna dipendenza esterna

### Build Compilati
Dopo aver eseguito `npm run build:sdk:js`:
- **`dist/cmp-js.js`** - Versione development (31KB)
- **`dist/cmp-js.min.js`** - Versione production minificata (15KB)

## Installazione

### Metodo 1: Uso Diretto nel Browser

Puoi usare il file JavaScript direttamente senza compilazione:

```html
<!-- Copia src/cmp.js nel tuo progetto e includi -->
<script src="path/to/cmp.js" data-site-id="YOUR_SITE_ID"></script>
```

### Metodo 2: Uso della Versione Compilata

```html
<!-- Versione development -->
<script src="dist/cmp-js.js" data-site-id="YOUR_SITE_ID"></script>

<!-- Versione production (minificata) -->
<script src="dist/cmp-js.min.js" data-site-id="YOUR_SITE_ID"></script>
```

### Metodo 3: CDN (quando disponibile)

```html
<script src="https://cdn.rs-cmp.com/cmp-js.min.js" data-site-id="YOUR_SITE_ID"></script>
```

## Build da Sorgente

Se vuoi compilare il file JavaScript:

```bash
# Installa le dipendenze
npm install

# Build versione development
npm run build:sdk:js:dev

# Build versione production (minificata)
npm run build:sdk:js:prod

# Build entrambe le versioni
npm run build:sdk:js
```

## Utilizzo

### Auto-inizializzazione

Il modo più semplice è lasciare che lo script si inizializzi automaticamente:

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Aggiungi semplicemente lo script con data-site-id -->
  <script src="cmp.js" data-site-id="YOUR_SITE_ID"></script>
</head>
<body>
  <!-- Il tuo contenuto -->
</body>
</html>
```

### Inizializzazione Manuale

Puoi anche creare un'istanza manualmente per un controllo più preciso:

```html
<!DOCTYPE html>
<html>
<head>
  <script src="cmp.js"></script>
  <script>
    // Impedisci auto-inizializzazione rimuovendo data-site-id
    
    // Inizializza manualmente quando pronto
    document.addEventListener('DOMContentLoaded', function() {
      // Nota: con inizializzazione manuale, devi gestire il siteId
      var cmp = new RSCMP();
      cmp.init().then(function() {
        console.log('CMP inizializzato con successo');
      }).catch(function(error) {
        console.error('Errore inizializzazione CMP:', error);
      });
    });
  </script>
</head>
<body>
  <!-- Il tuo contenuto -->
</body>
</html>
```

### Accesso all'Istanza Globale

Quando si auto-inizializza, l'istanza CMP è disponibile globalmente:

```javascript
// Accedi all'istanza CMP
var cmp = window.RSCMP;

// Ascolta eventi di consenso
cmp.consentManager.on('consentUpdated', function(categories) {
  console.log('Consenso aggiornato:', categories);
  
  if (categories.analytics) {
    console.log('Analytics abilitato');
    // Inizializza il tuo codice analytics
  }
  
  if (categories.marketing) {
    console.log('Marketing abilitato');
    // Inizializza il tuo codice marketing
  }
});

// Mostra il banner manualmente
cmp.bannerUI.show(cmp.config);

// Ottieni il consenso corrente
var consent = cmp.consentManager.getConsent();
console.log('Consenso corrente:', consent);

// Verifica se una categoria specifica è consentita
var hasAnalytics = cmp.consentManager.hasConsent('analytics');
console.log('Analytics consentito?', hasAnalytics);
```

## Blocco Script

### Blocco Automatico

Marca gli script con `data-category` per bloccarli automaticamente fino al consenso:

```html
<!-- Google Analytics (bloccato fino al consenso analytics) -->
<script type="text/plain" data-category="analytics">
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
  
  ga('create', 'UA-XXXXX-Y', 'auto');
  ga('send', 'pageview');
</script>

<!-- Facebook Pixel (bloccato fino al consenso marketing) -->
<script type="text/plain" data-category="marketing">
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'YOUR_PIXEL_ID');
  fbq('track', 'PageView');
</script>
```

### Script Comuni Rilevati Automaticamente

Lo script blocca automaticamente questi servizi comuni:
- **Google Analytics / gtag** (analytics)
- **Facebook Pixel** (marketing)
- **Hotjar** (analytics)

## Documentazione JSDoc

Il file JavaScript include documentazione completa JSDoc per tutti i tipi:

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

// ... e molti altri tipi documentati
```

## Differenze con la Versione TypeScript

La versione JavaScript è **funzionalmente identica** alla versione TypeScript, con queste differenze:

### Vantaggi JavaScript
✅ **Nessuna compilazione richiesta** - Usa direttamente nel browser  
✅ **Più semplice da debuggare** - Codice leggibile senza transpiling  
✅ **Più facile da personalizzare** - Modifica direttamente il codice  
✅ **Stesso peso** - File minificato ~15KB (uguale a TypeScript)  

### Vantaggi TypeScript
✅ **Type safety** - Controllo dei tipi durante lo sviluppo  
✅ **Migliore IDE support** - Autocompletamento più preciso  
✅ **Refactoring più sicuro** - Il compilatore rileva errori  

## Classi Principali

### 1. ConsentStorage
Gestisce la persistenza del consenso in localStorage e cookie.

```javascript
var storage = new ConsentStorage();
storage.saveConsent(consentData);
var consent = storage.getConsent();
storage.clearConsent();
```

### 2. ConsentManager
Gestisce lo stato del consenso ed eventi.

```javascript
var manager = new ConsentManager(storage);
manager.setConsent(categories, version);
manager.acceptAll(version);
manager.rejectAll(version);
var hasAnalytics = manager.hasConsent('analytics');
```

### 3. ScriptBlocker
Blocca e sblocca gli script in base al consenso.

```javascript
var blocker = new ScriptBlocker(consentManager);
blocker.blockScripts();
blocker.unblockScripts(categories);
```

### 4. GoogleConsentMode
Integrazione con Google Consent Mode v2.

```javascript
var gcm = new GoogleConsentMode(consentManager);
gcm.update(categories);
```

### 5. BannerUI
Gestisce l'interfaccia utente del banner.

```javascript
var banner = new BannerUI(consentManager);
banner.show(config);
banner.hide();
```

### 6. RSCMP (classe principale)
Coordina tutti i componenti.

```javascript
var cmp = new RSCMP();
cmp.init().then(function() {
  console.log('CMP pronto');
});
```

## Configurazione API URL Personalizzato

Puoi specificare un URL API personalizzato:

```html
<script 
  src="cmp.js" 
  data-site-id="YOUR_SITE_ID"
  data-api-url="https://your-api.example.com"
></script>
```

## Eventi

Ascolta gli eventi di consenso:

```javascript
var cmp = window.RSCMP;

// Evento: consenso aggiornato
cmp.consentManager.on('consentUpdated', function(categories) {
  console.log('Nuovo consenso:', categories);
});

// Evento: banner mostrato
cmp.consentManager.on('bannerShown', function() {
  console.log('Banner mostrato all\'utente');
});

// Evento: banner chiuso
cmp.consentManager.on('bannerClosed', function() {
  console.log('Banner chiuso');
});
```

## Compatibilità Browser

La versione JavaScript è compatibile con:
- ✅ Chrome 51+
- ✅ Firefox 54+
- ✅ Safari 10+
- ✅ Edge 15+
- ✅ Opera 38+
- ✅ IE 11 (con polyfill per Promise)

### Polyfill per IE11

Se devi supportare IE11, includi un polyfill per Promise:

```html
<!-- Polyfill per IE11 -->
<script src="https://cdn.jsdelivr.net/npm/promise-polyfill@8/dist/polyfill.min.js"></script>

<!-- Poi includi CMP -->
<script src="cmp.js" data-site-id="YOUR_SITE_ID"></script>
```

## Confronto Dimensioni

| Versione | Sorgente | Minificato | Gzipped |
|----------|----------|------------|---------|
| TypeScript (`cmp.ts`) | 30 KB | 15.8 KB | ~6 KB |
| JavaScript (`cmp.js`) | 33 KB | 15.3 KB | ~6 KB |

Le due versioni hanno dimensioni praticamente identiche una volta minificate.

## Esempio Completo

```html
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Esempio RS-CMP JavaScript</title>
  
  <!-- RS-CMP SDK -->
  <script src="cmp.js" data-site-id="demo-site-123"></script>
  
  <!-- Google Analytics (bloccato fino al consenso) -->
  <script type="text/plain" data-category="analytics">
    // Codice Google Analytics
    console.log('Google Analytics caricato');
  </script>
  
  <!-- Facebook Pixel (bloccato fino al consenso) -->
  <script type="text/plain" data-category="marketing">
    // Codice Facebook Pixel
    console.log('Facebook Pixel caricato');
  </script>
  
  <script>
    // Ascolta eventi di consenso
    window.addEventListener('load', function() {
      var cmp = window.RSCMP;
      
      cmp.consentManager.on('consentUpdated', function(categories) {
        console.log('Consenso aggiornato:', categories);
        
        // Esegui azioni in base al consenso
        if (categories.analytics) {
          console.log('✓ Analytics abilitato');
        }
        if (categories.marketing) {
          console.log('✓ Marketing abilitato');
        }
      });
    });
  </script>
</head>
<body>
  <h1>Benvenuto</h1>
  <p>Questo sito utilizza cookie per migliorare l'esperienza utente.</p>
  
  <button onclick="window.RSCMP.bannerUI.show(window.RSCMP.config)">
    Mostra Banner Consenso
  </button>
</body>
</html>
```

## Supporto

Per domande o problemi:
- Apri un issue su GitHub
- Consulta la documentazione completa nel README.md
- Vedi [USAGE.md](USAGE.md) per più esempi

## Licenza

MIT License - vedi file LICENSE per dettagli
