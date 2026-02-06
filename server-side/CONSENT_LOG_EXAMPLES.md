# Esempio di Log Consensi - GDPR Compliant

Questo file mostra esempi di log dei consensi salvati dal backend in formato JSONL (JSON Lines).

## Formato del Log

Ogni riga nel file `consent_logs.jsonl` è un oggetto JSON separato che contiene:

### Campi Obbligatori (GDPR Art. 7)

1. **siteId**: Identificatore del sito
2. **categories**: Oggetto con le scelte per ogni categoria di cookie
3. **timestamp**: Data e ora del consenso (ISO 8601)
4. **version**: Versione della policy accettata
5. **ipHash**: Hash SHA-256 dell'IP (pseudonimizzazione GDPR Art. 5)

### Campi Aggiuntivi

6. **userAgent**: Browser e sistema operativo dell'utente
7. **serverTimestamp**: Timestamp del server quando riceve il consenso

## Esempi di Log

### Esempio 1: Utente accetta tutto
```json
{
  "siteId": "PAM",
  "categories": {
    "necessary": true,
    "analytics": true,
    "marketing": true,
    "preferences": true
  },
  "timestamp": "2026-02-06T15:39:41.195Z",
  "version": "1.0",
  "ipHash": "536ed9cd984b7c79",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "serverTimestamp": "2026-02-06T15:39:41.200Z"
}
```

### Esempio 2: Utente rifiuta analytics e marketing
```json
{
  "siteId": "PAM",
  "categories": {
    "necessary": true,
    "analytics": false,
    "marketing": false,
    "preferences": false
  },
  "timestamp": "2026-02-06T16:22:15.789Z",
  "version": "1.0",
  "ipHash": "a8f5f167f44f4964",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "serverTimestamp": "2026-02-06T16:22:15.795Z"
}
```

### Esempio 3: Utente accetta solo analytics
```json
{
  "siteId": "ECOMMERCE-IT",
  "categories": {
    "necessary": true,
    "analytics": true,
    "marketing": false,
    "preferences": false
  },
  "timestamp": "2026-02-06T17:45:30.123Z",
  "version": "2.0",
  "ipHash": "7c9fa136d4413fa6",
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
  "serverTimestamp": "2026-02-06T17:45:30.130Z"
}
```

### Esempio 4: Aggiornamento del consenso (stesso utente)
```json
{
  "siteId": "PAM",
  "categories": {
    "necessary": true,
    "analytics": false,
    "marketing": false,
    "preferences": false
  },
  "timestamp": "2026-02-07T09:15:22.456Z",
  "version": "1.0",
  "ipHash": "536ed9cd984b7c79",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "serverTimestamp": "2026-02-07T09:15:22.460Z"
}
```

## Conformità GDPR

### Art. 7(1) - Onere della prova
✅ **Dimostrazione del consenso**: I log mostrano esattamente quali categorie sono state accettate/rifiutate.

### Art. 5 - Principi
✅ **Minimizzazione dei dati**: Solo i dati necessari vengono salvati.
✅ **Pseudonimizzazione**: L'IP è hash SHA-256, non l'IP reale.

### Art. 13 - Informazioni da fornire
✅ **Versione della policy**: Il campo `version` permette di tracciare quale versione della policy è stata accettata.

### Art. 17 - Diritto alla cancellazione
Se un utente richiede la cancellazione dei propri dati:
```bash
# Trova tutti i log di un utente tramite ipHash
grep '"ipHash":"536ed9cd984b7c79"' consent_logs.jsonl

# Rimuovi i log di quell'utente
grep -v '"ipHash":"536ed9cd984b7c79"' consent_logs.jsonl > consent_logs_temp.jsonl
mv consent_logs_temp.jsonl consent_logs.jsonl
```

## Query di Esempio

### Conta consensi per sito
```bash
grep '"siteId":"PAM"' consent_logs.jsonl | wc -l
```

### Trova tutti gli utenti che hanno accettato marketing
```bash
grep '"marketing":true' consent_logs.jsonl
```

### Statistiche per categoria
```bash
# Analytics accettato
grep '"analytics":true' consent_logs.jsonl | wc -l

# Marketing rifiutato
grep '"marketing":false' consent_logs.jsonl | wc -l
```

### Esporta in CSV per analisi
```bash
# Con jq (JSON processor)
cat consent_logs.jsonl | jq -r '[.siteId, .timestamp, .categories.analytics, .categories.marketing] | @csv'
```

## Database SQL Alternative

Se usi PostgreSQL o MySQL invece di file JSONL:

### Schema PostgreSQL
```sql
CREATE TABLE consents (
    id SERIAL PRIMARY KEY,
    site_id VARCHAR(255) NOT NULL,
    categories JSONB NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    version VARCHAR(20),
    ip_hash VARCHAR(64) NOT NULL,
    user_agent TEXT,
    server_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_site_id (site_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_ip_hash (ip_hash)
);
```

### Query SQL di esempio
```sql
-- Conta consensi per sito
SELECT site_id, COUNT(*) as total
FROM consents
GROUP BY site_id;

-- Percentuale accettazione per categoria
SELECT 
    COUNT(*) FILTER (WHERE categories->>'analytics' = 'true') * 100.0 / COUNT(*) as analytics_acceptance_rate,
    COUNT(*) FILTER (WHERE categories->>'marketing' = 'true') * 100.0 / COUNT(*) as marketing_acceptance_rate
FROM consents
WHERE site_id = 'PAM';

-- Trova consensi di un utente (tramite ipHash)
SELECT * FROM consents
WHERE ip_hash = '536ed9cd984b7c79'
ORDER BY timestamp DESC;
```

## Conservazione dei Log

### Periodo di Conservazione
- **GDPR**: I log devono essere conservati per il tempo necessario (tipicamente 3 anni per dimostrazione compliance)
- **Dopo**: I log devono essere cancellati o anonimizzati ulteriormente

### Backup
```bash
# Backup giornaliero
cp consent_logs.jsonl backups/consent_logs_$(date +%Y%m%d).jsonl

# Compressione
gzip backups/consent_logs_*.jsonl
```

## Note Importanti

1. ⚠️ **Non salvare MAI l'IP reale** - Usa sempre l'hash
2. ⚠️ **Proteggi i file di log** - Permessi 600 o 640
3. ⚠️ **Backup regolari** - I log sono prove legali
4. ⚠️ **Retention policy** - Cancella log vecchi secondo policy aziendale
5. ⚠️ **Audit trail** - Mantieni log di chi accede ai dati di consenso
