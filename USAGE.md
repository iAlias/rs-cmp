# RS-CMP - Come usare il file consolidato

Il codice dell'SDK è stato consolidato in un singolo file TypeScript per facilitarne l'importazione e l'utilizzo in qualsiasi progetto.

## File Principale

Il file principale consolidato è:
- **Sorgente TypeScript**: `src/cmp.ts` (tutto il codice in un unico file)
- **Build JavaScript**: `dist/cmp.js` (versione development)
- **Build JavaScript minificato**: `dist/cmp.min.js` (versione production)

## Come Usare

### 1. Importare direttamente il file TypeScript

Se usi TypeScript nel tuo progetto, puoi importare direttamente il file sorgente:

```typescript
import RSCMP from './src/cmp';

// Creare un'istanza manualmente
const cmp = new RSCMP();
await cmp.init();
```

### 2. Usare il file JavaScript compilato

Puoi anche usare il file JavaScript già compilato:

```html
<!-- Versione development (non minificata) -->
<script src="dist/cmp.js" data-site-id="YOUR_SITE_ID"></script>

<!-- Versione production (minificata) -->
<script src="dist/cmp.min.js" data-site-id="YOUR_SITE_ID"></script>
```

### 3. Build personalizzata

Per compilare il file per il tuo progetto:

```bash
npm run build:sdk:dev    # Build versione development
npm run build:sdk:prod   # Build versione production minificata
npm run build:sdk        # Build entrambe le versioni
```

## Contenuto del File

Il file `src/cmp.ts` contiene tutto il codice necessario:

1. **Type Definitions** - Tutte le interfacce e tipi TypeScript
2. **ConsentStorage** - Gestione localStorage e cookie
3. **ConsentManager** - Gestione dello stato del consenso
4. **ScriptBlocker** - Blocco/sblocco degli script in base al consenso
5. **GoogleConsentMode** - Integrazione Google Consent Mode v2
6. **BannerUI** - Interfaccia banner con Accept/Reject/Customize
7. **RSCMP** - Classe principale con auto-inizializzazione

## Esportazioni

Il file esporta:
- **RSCMP** (classe principale) - export default
- Tutti i **tipi TypeScript** - export named

```typescript
// Importa la classe principale
import RSCMP from './src/cmp';

// Importa anche i tipi se necessario
import { ConsentCategories, Config, BannerConfig } from './src/cmp';
```

## Dimensioni

- **File TypeScript sorgente**: ~28 KB
- **Build JavaScript (dev)**: ~25.5 KB
- **Build JavaScript (prod minified)**: ~15.7 KB
- **Build gzipped**: ~6-7 KB (stimato)

## Note

- Il file è completamente standalone e non ha dipendenze esterne
- Funziona sia in browser (IIFE) che come modulo ES6
- Include auto-inizializzazione quando caricato nel browser
- Espone `window.RSCMP` per controllo manuale
