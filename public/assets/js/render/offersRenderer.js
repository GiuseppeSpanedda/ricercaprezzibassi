import { escapeHtml, escapeAttr } from '../core/html.js';

function getLinkLabel(linkStatus) {
  if (linkStatus === 'verified' || linkStatus === 'valid') return 'Link verificato';
  if (linkStatus === 'direct') return 'Link diretto';
  return '';
}

export function renderOffers(container, items) {
  container.innerHTML = items.map((item, index) => {
    const finalUrl = item.url || '#';
    const hasValidUrl = finalUrl && finalUrl !== '#';
    const linkLabel = getLinkLabel(item.linkStatus);

    return `
      <div class="offer-card">
        <div class="offer-info">
          <h3>${escapeHtml(item.title)}</h3>
          <div class="tag-container">
            <span class="tag">Posizione #${index + 1}</span>
            <span class="tag">${escapeHtml(item.source || 'Store')}</span>
            ${item.condition ? `<span class="tag">${escapeHtml(item.condition)}</span>` : ''}
            ${linkLabel ? `<span class="tag">${escapeHtml(linkLabel)}</span>` : ''}
          </div>
        </div>

        <div class="offer-price">
          <span class="price-value">${escapeHtml(item.priceText || 'Prezzo n.d.')}</span>
          ${
            hasValidUrl
              ? `<a href="${escapeAttr(finalUrl)}" target="_blank" rel="noopener noreferrer" class="link-out">Vedi Dettagli ↗</a>`
              : `<span class="link-out" style="opacity:.55; cursor:not-allowed;">Link non disponibile</span>`
          }
        </div>
      </div>
    `;
  }).join('');
}

export function renderEmpty(container, message) {
  container.innerHTML = `
    <div style="text-align:center; padding:40px; color:var(--text-dim);">
      ${escapeHtml(message)}
    </div>
  `;
}
