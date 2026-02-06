# GDPR Compliance Guide

## Risposta alla domanda: "è GDPR compliant? posso metterla in produzione?"

**Sì! ✅** Questa CMP è GDPR compliant e può essere utilizzata in produzione, a condizione che tu configuri correttamente i link alle policy come descritto di seguito.

## Requisiti GDPR Implementati

Questa CMP rispetta i seguenti requisiti GDPR:

### 1. ✅ Link alla Privacy Policy e Cookie Policy
**Requisito GDPR**: Art. 13 - L'utente deve avere accesso a informazioni dettagliate sul trattamento dei dati prima di dare il consenso.

**Implementazione**: Aggiungi `privacyPolicyUrl` e `cookiePolicyUrl` nella configurazione del banner. I link appariranno automaticamente nel banner del consenso.

### 2. ✅ Scadenza del Consenso (12 mesi)
**Requisito**: Il consenso deve essere richiesto nuovamente dopo un periodo massimo (EDPB raccomanda 12 mesi).

**Implementazione**: Il consenso scade automaticamente dopo 365 giorni e viene rimosso, richiedendo all'utente di fornire nuovamente il consenso.

### 3. ✅ Diritto di Revocare il Consenso
**Requisito GDPR**: Art. 7(3) - L'utente deve poter revocare il consenso facilmente come lo ha dato.

**Implementazione**: 
- Pulsante "Impostazioni Privacy" sempre visibile in basso a sinistra
- Metodi `resetConsent()` e `showPreferences()` disponibili
- L'utente può modificare le scelte in qualsiasi momento

### 4. ✅ Anonimizzazione IP
**Requisito GDPR**: Art. 5 - Minimizzazione dei dati e pseudonymizzazione.

**Implementazione**: Il backend (node-logger.js, php-logger.php) utilizza hash SHA-256 degli indirizzi IP prima di salvarli.

### 5. ✅ Blocco Cookie Prima del Consenso
**Requisito**: Cookie/tracking non essenziali non possono essere impostati prima del consenso.

**Implementazione**: Tutti gli script con `data-category` vengono bloccati finché l'utente non dà il consenso.

### 6. ✅ Scelte Granulari
**Requisito**: L'utente deve poter scegliere quali categorie di cookie accettare.

**Implementazione**: 4 categorie configurabili: Necessari, Analitici, Marketing, Preferenze.

### 7. ✅ Google Consent Mode v2
**Requisito**: Integrazione con Google per rispettare il Digital Markets Act (DMA).

**Implementazione**: Integrazione nativa automatica con Google Consent Mode v2.

### 8. ✅ Rimozione Cookie alla Revoca
**Requisito**: I cookie devono essere rimossi quando l'utente revoca il consenso.

**Implementazione**: Rimozione automatica dei cookie quando il consenso viene revocato.

## Configurazione per la Produzione

### Passo 1: Crea le Pagine delle Policy

Prima di mettere in produzione, devi creare:

1. **Privacy Policy** (obbligatoria per GDPR Art. 13)
   - Chi sei (titolare del trattamento)
   - Quali dati raccogli e perché
   - Base giuridica del trattamento (es. consenso)
   - Per quanto tempo conservi i dati
   - I diritti dell'utente (accesso, rettifica, cancellazione, etc.)
   - Come contattarti (DPO se applicabile)

2. **Cookie Policy** (raccomandata)
   - Lista dei cookie utilizzati
   - Scopo di ciascun cookie
   - Durata di ciascun cookie
   - Terze parti che impostano cookie

### Passo 2: Configura la CMP

```html
<!DOCTYPE html>
<html>
<head>
  <title>Il Tuo Sito</title>
  
  <!-- OpenConsent v2 CMP -->
  <script src="https://cdn.jsdelivr.net/gh/iAlias/rs-cmp@latest/dist/cmp-js.min.js" 
          data-auto-init="false"></script>
  <script>
    // Attendi che il DOM sia caricato
    document.addEventListener('DOMContentLoaded', function() {
      window.RSCMP.init({
        siteId: 'IL-TUO-SITE-ID',
        config: {
          banner: {
            position: 'bottom',
            layout: 'bar',
            primaryColor: '#2563eb',
            backgroundColor: '#ffffff',
            textColor: '#1f2937',
            buttonTextColor: '#ffffff',
            // ⚠️ IMPORTANTE: Configura i tuoi URL delle policy!
            privacyPolicyUrl: 'https://tuosito.com/privacy-policy',
            cookiePolicyUrl: 'https://tuosito.com/cookie-policy'
          }
        }
      });
    });
  </script>
  
  <!-- I tuoi script di tracking bloccati -->
  <script type="text/plain" data-category="analytics">
    // Google Analytics o altri script di tracciamento
  </script>
</head>
<body>
  <!-- Il tuo contenuto -->
</body>
</html>
```

**Nota Importante**: Usa `data-auto-init="false"` e chiama `init()` manualmente dopo il caricamento del DOM per garantire che la configurazione venga applicata correttamente.

### Passo 3: Configura il Backend

Se usi il backend per il logging dei consensi:

1. Modifica `server-side/node-logger.js` o `server-side/php-logger.php`
2. Cambia `Access-Control-Allow-Origin: *` con il tuo dominio specifico
3. Configura rate limiting per prevenire abusi
4. Usa un database invece del file per la produzione

Esempio CORS per Node.js:
```javascript
const allowedOrigins = [
  'https://tuosito.com',
  'https://www.tuosito.com'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});
```

## Checklist Pre-Produzione

Prima di mettere in produzione, verifica che:

- [ ] Hai creato la Privacy Policy con tutte le informazioni richieste da GDPR Art. 13
- [ ] Hai creato la Cookie Policy con la lista dei cookie
- [ ] Hai configurato `privacyPolicyUrl` e `cookiePolicyUrl` nella CMP
- [ ] I link alle policy sono visibili e cliccabili nel banner
- [ ] I link aprono le pagine corrette
- [ ] Il pulsante "Impostazioni Privacy" è sempre accessibile
- [ ] Gli script di tracking sono bloccati correttamente con `data-category`
- [ ] Il backend (se usato) ha CORS configurato per i tuoi domini
- [ ] Il backend usa rate limiting
- [ ] Hai testato su diversi browser (Chrome, Firefox, Safari, Edge)
- [ ] Hai testato su mobile e desktop

## Domande Frequenti

### Q: Devo avere un backend per il logging dei consensi?
**A**: No, non è obbligatorio. Il consenso è già salvato localmente nel browser dell'utente (localStorage + cookie). Il backend è utile per:
- Statistiche aggregate sui consensi
- Compliance con eventuali requisiti interni
- Audit trail per dimostrare la conformità

### Q: Quanto deve durare il consenso?
**A**: L'EDPB (European Data Protection Board) raccomanda un massimo di 12 mesi. Questa CMP è configurata per 365 giorni.

### Q: Posso personalizzare i testi?
**A**: Sì! Puoi sovrascrivere tutte le traduzioni nel parametro `translations` della configurazione.

### Q: Funziona con Google Tag Manager?
**A**: Sì! Vedi `examples/gtm-implementation.html` per un esempio completo.

### Q: È compatibile con il CCPA (California)?
**A**: La CMP è progettata per GDPR ma può essere adattata per CCPA. Contatta il maintainer del progetto per maggiori informazioni.

## Risorse Utili

- [GDPR Full Text](https://gdpr-info.eu/)
- [EDPB Guidelines on Consent](https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en)
- [ICO Cookie Guidance](https://ico.org.uk/for-organisations/guide-to-pecr/cookies-and-similar-technologies/)
- [CNIL Cookie Guide (FR)](https://www.cnil.fr/fr/cookies-et-autres-traceurs)

## Supporto

Per domande o problemi, apri un'issue su GitHub: https://github.com/iAlias/rs-cmp/issues
