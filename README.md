# Radar Offerte AI - Node.js

App single-page Node.js + Express + Playwright che cerca offerte su Amazon, eBay, MediaWorld, Trony e Unieuro.

## Cosa fa

- ricerca automatica multi-store
- ordinamento automatico per prezzo crescente
- deduplica dei risultati simili
- massimo 10 offerte finali mostrate in UI
- riepilogo AI tramite Ollama remoto
- payload ridotto verso Ollama per contenere tempi e costo computazionale

## Requisiti

- Node.js 18+
- npm
- Playwright Chromium
- server Ollama remoto già configurato

## Avvio locale

```bash
npm install
npm run install:browsers
cp .env.example .env
npm start
```

Poi apri:

```text
http://localhost:8080
```

## Variabili ambiente

```env
PORT=8080
OLLAMA_HOST=http://185.2.101.226:3000
OLLAMA_API_KEY=OLLAMA_PROXY_9f7a3c2d_b41e_8xq_2026_secure
OLLAMA_MODEL=qwen2.5:3b
HEADLESS=true
```

## Note prestazionali

- l'app mostra al massimo 10 risultati finali
- il motore ordina sempre per prezzo crescente
- il riepilogo AI riceve solo titolo breve, prezzo, condizione e spedizione delle 10 offerte finali
- il modello è configurato per una risposta breve
