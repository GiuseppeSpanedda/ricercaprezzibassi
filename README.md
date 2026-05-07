# Ricerca Prezzi Bassi

App con frontend modulare e backend proxy server-side per OpenAI.

La chiave OpenAI non viene mai inserita nel frontend: viene letta dal server tramite variabile ambiente `OPENAI_API_KEY`.

## Avvio locale

```bash
npm install
cp .env.example .env
npm start
```

Su Windows puoi copiare manualmente `.env.example` e rinominarlo `.env`.

Nel file `.env` devi inserire almeno:

```env
OPENAI_API_KEY=sk-...
```

Poi apri:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/health
```

## Variabili consigliate

```env
PORT=3000
NODE_ENV=development

OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4.1-mini
OPENAI_TIMEOUT_MS=90000
OPENAI_USE_WEB_SEARCH=true
OPENAI_FORCE_WEB_SEARCH=true
OPENAI_TOOL_CHOICE=auto
OPENAI_SEARCH_CONTEXT_SIZE=medium
OPENAI_USE_DOMAIN_FILTERS=false
OPENAI_INCLUDE_SOURCES=true
OPENAI_STRUCTURED_OUTPUT=true
OPENAI_TEXT_MODE_FALLBACK=true

RESULTS_LIMIT=20
SEARCH_CANDIDATE_LIMIT=80
MIN_RESULTS_BEFORE_STORE_FALLBACK=20
STORE_FALLBACK_ENABLED=true
STORE_FALLBACK_MAX_GROUPS=9
STORE_FALLBACK_CANDIDATES_PER_GROUP=8

VALIDATE_LINKS=true
STRICT_LINK_VALIDATION=false
FAST_LINK_VALIDATION=true
LINK_VALIDATION_CANDIDATE_LIMIT=80
LINK_VALIDATION_TIMEOUT_MS=2500
LINK_VALIDATION_CONCURRENCY=12
FALLBACK_TO_DIRECT_LINKS=true
```

## Cosa è stato corretto

### Riepilogo AI qualità/prezzo

Il frontend ora ha `useAiSummary: true`, quindi dopo la ricerca viene chiamato `/api/agent/summary` sui risultati finali già filtrati e ordinati.

Il prompt di sintesi obbliga l’AI a:

1. scegliere una singola offerta come miglior rapporto qualità/prezzo;
2. spiegare perché è la migliore usando solo titolo, prezzo, store e condizione;
3. dire se coincide con il prezzo più basso in assoluto;
4. segnalare dubbi su usato, ricondizionato, bundle, disponibilità o venditore.

Se la chiamata AI fallisce o restituisce JSON/testo non valido, il backend genera comunque un riepilogo locale di fallback, così il box non resta vuoto e non mostra JSON grezzo.

### Target 20 risultati

Il backend ora cerca più candidati (`SEARCH_CANDIDATE_LIMIT=80`) e prova a mostrare `RESULTS_LIMIT=20` risultati finali.

La correzione principale è questa: il fallback sugli store non viene più deciso solo sui risultati grezzi dell’AI. Ora il backend prepara prima i risultati, elimina duplicati, blocca comparatori, valida i link e solo dopo controlla quanti risultati finali restano. Se sono meno di 20, avvia ricerche mirate parallele su gruppi di store ufficiali/retailer diretti:

- Amazon Italia;
- MediaWorld e Unieuro;
- Euronics, Trony, Expert;
- GameStop, PlayStation Direct, ePRICE;
- eBay Italia, solo inserzioni dirette;
- Comet, Monclick, Yeppon;
- store ufficiali produttori elettronica;
- altri retailer diretti ammessi.

Se esistono abbastanza pagine prodotto valide sugli store ammessi, l’app arriva a 20 risultati. Se per quella query gli store ufficiali disponibili sono meno di 20, restituisce solo quelli validi senza inserire comparatori o risultati inventati.

### Store ufficiali e no comparatori

Restano esclusi comparatori e aggregatori come:

- Trovaprezzi;
- Idealo;
- Kelkoo;
- Google Shopping;
- Pagomeno;
- Bestshopping;
- Shoppydoo;
- servizi simili.

La ricerca continua a privilegiare solo store ufficiali, produttori, retailer diretti e marketplace con pagina prodotto/inserzione diretta.

### Sicurezza chiave OpenAI

È stata rimossa la chiave OpenAI hardcoded da `src/config/env.js`. La chiave deve stare solo in `.env` locale o nelle variabili ambiente del server.

Se la chiave presente nel vecchio file era reale, revocala e generane una nuova.

## Deploy Hostinger

Su Hostinger imposta almeno:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
OPENAI_USE_DOMAIN_FILTERS=false
RESULTS_LIMIT=20
SEARCH_CANDIDATE_LIMIT=80
STORE_FALLBACK_ENABLED=true
```

Comando di avvio:

```bash
npm start
```

Il frontend chiama solo endpoint interni:

```text
/api/agent/search
/api/agent/summary
```

La secret key resta lato server.
