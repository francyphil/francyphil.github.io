// Bottone scroll to top

// Gestione bottone scroll-to-top compatibile con caricamento dinamico
function setupScrollToTopBtn() {
  const scrollBtn = document.getElementById('scrollToTopBtn');
  if (!scrollBtn) return;
  scrollBtn.style.display = 'none';
  window.addEventListener('scroll', function() {
    if (window.scrollY > 200) {
      scrollBtn.style.display = 'flex';
    } else {
      scrollBtn.style.display = 'none';
    }
  });
  scrollBtn.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// Se il footer viene caricato dinamicamente, attendo che sia presente
function waitForFooterAndSetup() {
  const interval = setInterval(() => {
    if (document.getElementById('scrollToTopBtn')) {
      setupScrollToTopBtn();
      // Footer has been injected into the page: load cookie consent assets
      try {
        loadCookieConsentAssets();
      } catch (e) { console.error('[footer] loadCookieConsentAssets error', e); }
      clearInterval(interval);
    }
  }, 100);
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  waitForFooterAndSetup();
} else {
  window.addEventListener('DOMContentLoaded', waitForFooterAndSetup);
}

// Dynamically add cookie consent CSS and JS after footer is present
function loadCookieConsentAssets() {
  if (window.__cookieConsentLoaded) return;
  window.__cookieConsentLoaded = true;

  // CSS
  const cssHref = '/footer/cookie-consent.css';
  if (!document.querySelector('link[href="' + cssHref + '"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssHref;
    link.onerror = function(){ console.error('[footer] cookie CSS failed to load', cssHref); };
    document.head.appendChild(link);
  }

  // JS
  const jsSrc = '/footer/cookie-consent.js';
  // If the cookie script already initialized (sets window._cookieConsent), skip.
  if (!window._cookieConsent) {
    const script = document.createElement('script');
    script.src = jsSrc;
    script.defer = false;
    script.onerror = function(){ console.error('[footer] cookie JS failed to load', jsSrc); };
    document.body.appendChild(script);
  }
}
