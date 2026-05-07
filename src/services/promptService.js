import { OFFICIAL_STORE_DOMAINS, TRUSTED_STORE_HINTS } from '../config/searchPolicy.js';

const STORE_GROUPS = [
  {
    name: 'Amazon Italia',
    domains: ['amazon.it'],
    hints: ['Amazon.it pagina prodotto diretta', 'venduto da Amazon o venditore indicato nella pagina']
  },
  {
    name: 'MediaWorld e Unieuro',
    domains: ['mediaworld.it', 'unieuro.it'],
    hints: ['MediaWorld pagina prodotto diretta', 'Unieuro pagina prodotto diretta']
  },
  {
    name: 'Euronics, Trony, Expert',
    domains: ['euronics.it', 'trony.it', 'expert.it'],
    hints: ['Euronics pagina prodotto', 'Trony pagina prodotto', 'Expert pagina prodotto']
  },
  {
    name: 'GameStop, PlayStation Direct, ePRICE',
    domains: ['gamestop.it', 'direct.playstation.com', 'playstation.com', 'eprice.it'],
    hints: ['GameStop', 'PlayStation Direct', 'PlayStation Store', 'ePRICE pagina prodotto']
  },
  {
    name: 'eBay Italia inserzioni dirette',
    domains: ['ebay.it'],
    hints: ['eBay.it inserzione diretta', 'non pagine di ricerca generiche', 'venditore e condizione visibili']
  },
  {
    name: 'Comet, Monclick, Yeppon',
    domains: ['comet.it', 'monclick.it', 'yeppon.it'],
    hints: ['Comet pagina prodotto', 'Monclick pagina prodotto', 'Yeppon pagina prodotto']
  },
  {
    name: 'store ufficiali produttori elettronica',
    domains: ['apple.com', 'samsung.com', 'lenovo.com', 'dell.com', 'hp.com', 'asus.com', 'acer.com', 'msi.com'],
    hints: ['Apple Store', 'Samsung Shop', 'Lenovo Store', 'Dell Store', 'HP Store', 'ASUS Store', 'Acer Store', 'MSI Store']
  },
  {
    name: 'retailer casa, sport e fai-da-te',
    domains: ['zalando.it', 'decathlon.it', 'leroymerlin.it', 'ikea.com', 'bricoio.it'],
    hints: ['Zalando pagina prodotto', 'Decathlon pagina prodotto', 'Leroy Merlin pagina prodotto', 'IKEA pagina prodotto']
  },
  {
    name: 'ricerca ampia su store diretti ammessi',
    domains: OFFICIAL_STORE_DOMAINS,
    hints: TRUSTED_STORE_HINTS
  }
];

function buildCommonRules({ query, resultLimit, candidateLimit }) {
  return [
    'Cerca offerte reali e aggiornate per il prodotto richiesto usando la ricerca web.',
    '',
    'Obiettivo:',
    `- restituire fino a ${candidateLimit} offerte candidate realmente pertinenti`,
    `- l’app deve arrivare a ${resultLimit} risultati finali quando esistono abbastanza pagine prodotto valide sugli store ammessi`,
    '- i risultati devono essere ordinabili per prezzo crescente',
    '',
    'Regola obbligatoria sulle fonti:',
    '- Usa solo store ufficiali, siti ufficiali dei produttori, negozi online ufficiali, retailer diretti attendibili e marketplace con pagina prodotto/inserzione diretta.',
    '- Non usare comparatori, aggregatori, servizi di confronto prezzo, pagine SEO, blog, news, forum o pagine che rimandano ad altri negozi.',
    '- Non restituire risultati da Trovaprezzi, Idealo, Kelkoo, Google Shopping, Pagomeno, Bestshopping, Shoppydoo o servizi simili.',
    '- Ogni risultato deve avere un URL assoluto HTTPS o HTTP che punti alla pagina prodotto, alla scheda prodotto o alla pagina di inserzione dello store.',
    '- Non usare home page, pagine categoria generiche, pagine di ricerca interne senza prodotto specifico o link inventati.',
    '- Non inventare URL, prezzo, disponibilità, nome store o prodotti.',
    '- Preferisci offerte acquistabili/spedibili in Italia o UE.',
    '- Se un prezzo non è chiarissimo, usa price:null e priceText:"Prezzo non disponibile", ma restituisci comunque il link diretto solo se la fonte è uno store ammesso.',
    '- Non lasciare results vuoto quando trovi pagine prodotto o inserzioni dirette pertinenti su store ammessi.',
    '',
    'Pertinenza prodotto:',
    '- Il prodotto deve corrispondere alla query dell’utente: evita accessori, cover, cavi, ricambi, assicurazioni o bundle non pertinenti se l’utente cerca il prodotto principale.',
    '- Se includi bundle, scrivilo chiaramente nel title.',
    '- Se la condizione è usato o ricondizionato, scrivilo nel campo condition.',
    '',
    'Formato obbligatorio:',
    '{"results":[{"title":"...","priceText":"€ ...","price":123.45,"source":"Nome store ufficiale","url":"https://...","condition":"nuovo/usato/ricondizionato/n.d."}],"summary":"breve sintesi testuale, non JSON","warnings":[]}',
    '',
    'Regole JSON:',
    '- Restituisci solo JSON valido, senza markdown e senza testo extra.',
    '- Il campo price deve essere un numero JSON con punto decimale, esempio 599.99. Non usare mai 599,99 nel campo price.',
    '- Il campo priceText può invece contenere il formato leggibile italiano, esempio "€ 599,99".',
    '- Se non trovi il prezzo, usa price:null.',
    '',
    `Query utente: ${query}`
  ];
}

export function buildSearchPrompt({ query, resultLimit, candidateLimit }) {
  return [
    ...buildCommonRules({ query, resultLimit, candidateLimit }),
    '',
    'Domini ammessi/preferiti per la ricerca:',
    OFFICIAL_STORE_DOMAINS.join(', '),
    '',
    `Esempi di fonti ammesse, quando pertinenti: ${TRUSTED_STORE_HINTS.join(', ')}.`,
    '',
    'Strategia di ricerca richiesta:',
    '- Cerca prima su store italiani/europei pertinenti al prodotto.',
    '- Per ogni risultato preferisci pagine prodotto, non home page e non pagine categoria generiche.',
    '- Se la query è generica, interpreta il prodotto commerciale più probabile, ma non inventare offerte non trovate.',
    '- Per console/videogiochi considera PlayStation Direct, Amazon, MediaWorld, Unieuro, Euronics, Trony, Expert, GameStop, eBay inserzione diretta, ePRICE, Monclick, Comet.',
    '- Per elettronica considera anche sito produttore, Samsung, Apple, Lenovo, Dell, HP, ASUS, Acer, MSI, Amazon, MediaWorld, Unieuro, Euronics, Trony, Expert.',
    '- Elimina duplicati evidenti dello stesso URL o dello stesso prodotto nello stesso store.',
    '',
    'Regole quantitative:',
    `- restituisci fino a ${candidateLimit} candidati validi`,
    `- punta a trovare almeno ${resultLimit} risultati diversi quando disponibili`,
    '- se trovi meno risultati validi, restituisci solo quelli trovati senza testo fuori dal JSON',
    '- ordina preferibilmente per prezzo crescente, ma il server riordinerà comunque i risultati'
  ].join('\n');
}

export function buildFocusedStorePrompt({ query, resultLimit, candidateLimit, storeGroup }) {
  const group = storeGroup || STORE_GROUPS[0];

  return [
    ...buildCommonRules({ query, resultLimit, candidateLimit }),
    '',
    `Ricerca mirata: ${group.name}`,
    `Cerca solo su questi domini/store: ${group.domains.join(', ')}.`,
    `Fonti ammesse in questa chiamata: ${group.hints.join(', ')}.`,
    '',
    'Devi restituire offerte candidate pertinenti trovate in questa ricerca mirata.',
    'Non includere risultati da altri domini, comparatori o pagine non acquistabili.',
    `Restituisci massimo ${candidateLimit} risultati per questo gruppo store.`,
    `Cerca di coprire offerte diverse, così il risultato finale può arrivare a ${resultLimit} elementi quando disponibili.`
  ].join('\n');
}

export function getFallbackStoreGroups() {
  return STORE_GROUPS;
}

export function buildSummaryPrompt({ query, results }) {
  const compactResults = results.slice(0, 20).map((item, index) => ({
    index: index + 1,
    title: item.title,
    priceText: item.priceText,
    price: item.price,
    source: item.source,
    condition: item.condition,
    url: item.url
  }));

  return [
    'Analizza le offerte ricevute e genera una sintesi breve in italiano.',
    'Rispondi solo JSON valido, senza markdown, nella forma {"summary":"testo"}.',
    'Non copiare il JSON dei risultati nella sintesi.',
    'Non inventare informazioni non presenti nei risultati.',
    'I risultati sono già filtrati per store ufficiali/retailer diretti e ordinati per prezzo crescente.',
    '',
    'Cosa deve dire obbligatoriamente la sintesi:',
    '- indica subito quale offerta ha il miglior rapporto qualità/prezzo tra quelle disponibili',
    '- spiega in una frase perché è la migliore, usando solo prezzo, store, condizione, titolo e posizione in lista',
    '- indica anche se coincide o no con il prezzo più basso in assoluto',
    '- segnala eventuali dubbi pratici: condizione usato/ricondizionato, bundle, modello diverso, disponibilità o venditore da verificare',
    '- non dire frasi generiche come "confronta le offerte" senza scegliere un risultato preciso',
    '',
    'Criterio pratico:',
    '- se i prodotti sembrano equivalenti, il migliore qualità/prezzo è normalmente il prezzo più basso con condizione nuovo o non problematica',
    '- se il prezzo più basso è usato/ricondizionato/bundle ambiguo, preferisci la prima offerta nuova o più chiara se la differenza di prezzo è ragionevole',
    '',
    `Query utente: ${query}`,
    `Risultati: ${JSON.stringify(compactResults)}`
  ].join('\n');
}
