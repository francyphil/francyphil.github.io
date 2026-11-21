(function () {
  function injectStyles() {
    const css = `
  .catalog-stats-container { margin-top: 16px; display: flex; justify-content: center; }
  .catalog-stats { max-width: 800px; width: 100%; border-collapse: collapse; margin-top: 8px; margin-left: auto; margin-right: auto; }
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
    fetch('/static/statistics/site_stats.json')
      .then(res => {
        if (!res.ok) throw new Error('site_stats.json not found');
        return res.json();
      })
      .then(stats => {
        const sections = stats.sections || {};
        const table = document.createElement('table');
        table.className = 'catalog-stats';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Sezione', 'Catalogati', 'Immagini', '% immagini', 'Datari', '% datari']
          .forEach(label => {
            const th = document.createElement('th');
            th.textContent = label;
            headerRow.appendChild(th);
          });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        const appendTextCell = (row, value) => {
          const cell = document.createElement('td');
          cell.textContent = String(value);
          row.appendChild(cell);
        };
        const appendProgressCell = (row, value) => {
          const pct = Number(value);
          const safePct = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
          const display = (Math.round(safePct * 10) / 10).toFixed(safePct % 1 === 0 ? 0 : 1);
          const cell = document.createElement('td');
          cell.className = 'pct';
          const progress = document.createElement('div');
          progress.className = 'progress';
          progress.setAttribute('role', 'progressbar');
          progress.setAttribute('aria-valuenow', String(safePct));
          progress.setAttribute('aria-valuemin', '0');
          progress.setAttribute('aria-valuemax', '100');
          const bar = document.createElement('div');
          bar.className = 'progress-bar';
          bar.style.width = `${safePct}%`;
          const text = document.createElement('div');
          text.className = 'progress-text';
          text.textContent = `${display}%`;
          progress.append(bar, text);
          cell.appendChild(progress);
          row.appendChild(cell);
        };

        Object.keys(sections).forEach(name => {
          const s = sections[name] || {};
          const row = document.createElement('tr');
          appendTextCell(row, name);
          appendTextCell(row, s.total_catalogati || 0);
          appendTextCell(row, s.images_present || 0);
          appendProgressCell(row, s.images_pct || 0);
          appendTextCell(row, s.datario_present || 0);
          appendProgressCell(row, s.datario_pct || 0);
          tbody.appendChild(row);
        });
        table.appendChild(tbody);
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
        container.replaceChildren(table);
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
