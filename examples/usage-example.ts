/**
 * Esempio di come importare e usare RS-CMP in un progetto TypeScript/JavaScript
 */

// ============================================================================
// ESEMPIO 1: Import in TypeScript
// ============================================================================

import RSCMP from '../src/cmp';
import type { 
  ConsentCategories, 
  ConsentData, 
  Config, 
  BannerConfig,
  CategoryConfig,
  Translations 
} from '../src/cmp';

// Creare un'istanza manualmente
const cmp = new RSCMP();

// Inizializzare (normalmente avviene automaticamente)
// Nota: questo richiede un contesto async o ES2022+
async function initExample() {
  await cmp.init();
}

// ============================================================================
// ESEMPIO 2: Accesso all'istanza globale (se auto-inizializzato nel browser)
// ============================================================================

// L'SDK si auto-inizializza quando caricato nel browser
// ed è accessibile tramite window.RSCMP

declare global {
  interface Window {
    RSCMP: RSCMP;
  }
}

// Accedere all'istanza globale
if (typeof window !== 'undefined' && window.RSCMP) {
  console.log('RS-CMP è già inizializzato');
}

// ============================================================================
// ESEMPIO 3: Uso in un'applicazione React/Vue/Angular
// ============================================================================

// Inizializzare quando l'app parte
const initCMP = async () => {
  const cmpInstance = new RSCMP();
  await cmpInstance.init();
};

// In React:
// useEffect(() => {
//   initCMP();
// }, []);

// In Vue:
// mounted() {
//   initCMP();
// }

// In Angular:
// ngOnInit() {
//   initCMP();
// }

// ============================================================================
// ESEMPIO 4: Uso dei tipi TypeScript
// ============================================================================
const myConfig: Config = {
  siteId: 'my-site',
  siteName: 'My Website',
  domain: 'example.com',
  policyVersion: '1.0',
  banner: {
    position: 'bottom',
    layout: 'bar',
    primaryColor: '#2563eb',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    buttonTextColor: '#ffffff',
    showLogo: false,
  },
  categories: [
    {
      id: 'necessary',
      name: 'Necessari',
      description: 'Cookie necessari per il funzionamento del sito',
      required: true,
      enabled: true,
    },
  ],
  translations: {
    it: {
      title: 'Gestiamo i tuoi dati',
      description: 'Utilizziamo cookie per migliorare la tua esperienza',
      acceptAll: 'Accetta tutti',
      rejectAll: 'Rifiuta tutti',
      customize: 'Personalizza',
      save: 'Salva',
      close: 'Chiudi',
      categories: {
        necessary: {
          name: 'Necessari',
          description: 'Cookie necessari per il funzionamento del sito',
        },
      },
    },
  },
};

// ============================================================================
// ESEMPIO 5: Build personalizzata con webpack/vite
// ============================================================================

// Nel tuo webpack.config.js o vite.config.js, puoi importare direttamente:
// import './src/cmp.ts'

// Oppure, se vuoi bundlarlo con il tuo codice:
// entry: {
//   app: './src/main.ts',
//   cmp: './src/cmp.ts'
// }

// ============================================================================
// NOTE IMPORTANTI
// ============================================================================

/**
 * 1. Il file src/cmp.ts contiene tutto il codice in un unico file
 * 2. Non ha dipendenze esterne
 * 3. Si auto-inizializza quando caricato in un browser
 * 4. Espone window.RSCMP per controllo manuale
 * 5. Tutti i tipi TypeScript sono esportati
 * 6. Compatibile con ES6 modules e IIFE
 */

export {};
