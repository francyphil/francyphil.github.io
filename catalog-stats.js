(function () {
  function injectStyles() {
    const css = `
  .catalog-stats-container { margin-top: 16px; display: flex; justify-content: center; }
  .catalog-stats { max-width: 720px; width: 100%; border-collapse: collapse; margin-top: 8px; margin-left: auto; margin-right: auto; }
  .catalog-stats th, .catalog-stats td { border: 1px solid #e0e0e0; padding: 8px 10px; text-align: center; }
  .catalog-stats th { background: #f7f7f7; font-weight: 700; }
  .catalog-stats .pct { text-align: center; width: 180px; }
  .catalog-stats .progress { background: #f1f1f1; border-radius: 14px; overflow: hidden; height: 20px; position: relative; }
  .catalog-stats .progress-bar { background: linear-gradient(90deg, #4caf50, #2e7d32); height: 100%; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; white-space: nowrap; }
  .catalog-stats .progress-text { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-size: 12px; font-weight: 700; color: #000; pointer-events: none; z-index: 2; }
  `;
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function renderCatalogStats() {
    fetch('/site_stats.json')
      .then(res => {
        if (!res.ok) throw new Error('site_stats.json not found');
        return res.json();
      })
      .then(stats => {
        const sections = stats.sections || {};
        const rows = Object.keys(sections).map(name => {
          const s = sections[name] || {};
          const pct = Number(s.images_pct || 0);
          const pctDisplay = (Math.round(pct * 10) / 10).toFixed(pct % 1 === 0 ? 0 : 1);
          const pctSafe = Math.max(0, Math.min(100, pct));
          return `<tr>
            <td>${name}</td>
            <td>${s.total_catalogati || 0}</td>
            <td>${s.images_present || 0}</td>
            <td class="pct">
              <div class="progress" aria-valuenow="${pctSafe}" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar" style="width: ${pctSafe}%;"></div>
                <div class="progress-text">${pctDisplay}%</div>
              </div>
            </td>
          </tr>`;
        }).join('');
        const table = `<table class="catalog-stats">
          <thead><tr><th>Sezione</th><th>Catalogati</th><th>Immagini</th><th>% immagini</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
        let container = document.getElementById('catalogStatsContainer');
        if (!container) {
          const card = document.getElementById('cardContainer');
          if (card) {
            container = document.createElement('div');
            container.id = 'catalogStatsContainer';
            container.className = 'catalog-stats-container';
            card.insertAdjacentElement('afterend', container);
          } else return;
        }
        container.innerHTML = table;
      })
      .catch(() => {
        // silently ignore if stats not available
      });
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    renderCatalogStats();
  });

  window.renderCatalogStats = renderCatalogStats;
})();
