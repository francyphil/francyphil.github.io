// Carica il breadcrumb e popola i link in base alla pagina corrente
(function() {
  // Non caricare breadcrumb sulla homepage
  const path = window.location.pathname;
  if (path === '/' || path === '/index.html' || path.endsWith('/github/') || path.endsWith('/github/index.html')) {
    return;
  }

  // Aspetta che il DOM sia caricato
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBreadcrumb);
  } else {
    initBreadcrumb();
  }

  function initBreadcrumb() {
    // Cerca il container esistente
    let breadcrumbContainer = document.getElementById('breadcrumbContainer');
    
    if (breadcrumbContainer) {
      // Usa il container esistente e aggiungi il breadcrumb
      breadcrumbContainer.className = 'breadcrumb-container';
      breadcrumbContainer.innerHTML = '<nav class="breadcrumb" id="breadcrumb"></nav>';
    } else {
      // Se non esiste, crea il breadcrumb container direttamente
      const breadcrumbHTML = '<div class="breadcrumb-container"><nav class="breadcrumb" id="breadcrumb"></nav></div>';
      
      // Appendi al body (essendo position fixed, la posizione nel DOM non importa)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = breadcrumbHTML;
      document.body.appendChild(tempDiv.firstElementChild);
    }
    
    // Usa setTimeout per assicurarsi che il DOM sia aggiornato
    setTimeout(() => {
      populateBreadcrumb();
    }, 0);
  }

  function populateBreadcrumb() {
    const breadcrumb = document.getElementById('breadcrumb');
    if (!breadcrumb) {
      console.log('Breadcrumb element not found');
      return;
    }
    
    console.log('Breadcrumb element found:', breadcrumb);
    console.log('Breadcrumb parent:', breadcrumb.parentElement);

    const path = window.location.pathname;
    const search = window.location.search;
    const items = [{ text: '&#127968;', link: '/' }];

    // Determina il percorso in base all'URL
    if (path.includes('/regno/')) {
      items.push({ text: 'Catalogo', link: null });
      items.push({ text: 'Regno', link: '/regno/indexRegno.html' });

      if (path.includes('catalog.html')) {
        items.push({ text: 'Targhette', link: null });
      } else if (path.includes('cittaDettaglio.html')) {
        const params = new URLSearchParams(search);
        const localita = params.get('localita');
        if (localita) {
          items.push({ text: localita, link: null });
        }
      } else if (path.includes('ufficioDettaglio.html')) {
        const params = new URLSearchParams(search);
        const localita = params.get('localita');
        const denominazione = params.get('denominazione');
        if (localita) {
          items.push({ text: localita, link: `cittaDettaglio.html?localita=${encodeURIComponent(localita)}` });
        }
        if (denominazione) {
          items.push({ text: denominazione, link: null });
        }
      } else if (path.includes('regnobarre.html')) {
        items.push({ text: 'Barre', link: null });
      } else if (path.includes('regnoonde.html')) {
        items.push({ text: 'Onde', link: null });
      } else if (path.includes('regnocontinui.html')) {
        items.push({ text: 'Continui', link: null });
      } else if (path.includes('regnosperimentali.html')) {
        items.push({ text: 'Sperimentali', link: null });
      } else if (path.includes('regnomanuali.html')) {
        items.push({ text: 'Manuali', link: null });
      } else if (path.includes('regnofalsi.html')) {
        items.push({ text: 'Falsi', link: null });
      } else if (path.includes('/targhetteTipo/')) {
        const fileName = path.split('/').pop().replace('.html', '');
        items.push({ text: 'Targhette', link: null });
      }
    } else if (path.includes('/static/info/')) {
      items.push({ text: 'Info', link: null });
      if (path.includes('biblio.html')) {
        items.push({ text: 'Bibliografia', link: null });
      } else if (path.includes('faq.html')) {
        items.push({ text: 'FAQ', link: null });
      }
    } else if (path.includes('/static/credits/')) {
      items.push({ text: 'Info', link: null });
      items.push({ text: 'Credits', link: null });
    } else if (path.includes('/static/ph/')) {
      items.push({ text: 'Storia Postale', link: '/static/ph/phindex.html' });
      if (path.includes('phindex.html')) {
        items.push({ text: 'Indice', link: null });
      } else if (path.includes('cartolina.html')) {
        items.push({ text: 'Cartolina', link: null });
      } else if (path.includes('destinazioni.html')) {
        items.push({ text: 'Destinazioni', link: null });
      } else if (path.includes('espresso.html')) {
        items.push({ text: 'Espresso', link: null });
      } else if (path.includes('intrusi.html')) {
        items.push({ text: 'Intrusi', link: null });
      } else if (path.includes('lettera.html')) {
        items.push({ text: 'Lettera', link: null });
      } else if (path.includes('usiEstero.html')) {
        items.push({ text: 'Usi Estero', link: null });
      } else if (path.includes('mecIntro.html')) {
        items.push({ text: 'Introduzione Meccanici', link: null });
      }
    } else if (path.includes('/static/catalogo/')) {
      items.push({ text: 'Catalogo', link: null });
      if (path.includes('intro.html')) {
        items.push({ text: 'Introduzione', link: null });
      }
    }

    // Costruisci l'HTML del breadcrumb
    const breadcrumbHTML = items.map((item, index) => {
      const isLast = index === items.length - 1;
      const separator = isLast ? '' : '<span class="breadcrumb-separator">/</span>';
      
      if (isLast) {
        return `<span class="breadcrumb-current">${item.text}</span>`;
      } else if (item.link) {
        return `<a href="${item.link}">${item.text}</a>${separator}`;
      } else {
        return `<span>${item.text}</span>${separator}`;
      }
    }).join('');
    
    breadcrumb.innerHTML = breadcrumbHTML;
    
    // Log del testo e HTML della breadcrumb
    const breadcrumbText = items.map(item => item.text).join(' > ');
    console.log('Breadcrumb text:', breadcrumbText);
    console.log('Breadcrumb HTML:', breadcrumbHTML);
    console.log('Final breadcrumb element:', breadcrumb);
    console.log('Final breadcrumb outerHTML:', breadcrumb.outerHTML);
  }
})();
