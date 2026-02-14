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
      console.log('[footer] detected footer elements');
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
  if (window.__cookieConsentLoaded) {
    console.log('[footer] cookie consent already loaded');
    return;
  }
  window.__cookieConsentLoaded = true;

  // CSS
  const cssHref = '/footer/cookie-consent.css';
  if (!document.querySelector('link[href="' + cssHref + '"]')) {
    console.log('[footer] injecting cookie CSS', cssHref);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssHref;
    link.onload = function(){ console.log('[footer] cookie CSS loaded'); };
    link.onerror = function(){ console.error('[footer] cookie CSS failed to load', cssHref); };
    document.head.appendChild(link);
  } else {
    console.log('[footer] cookie CSS already present');
  }

  // JS
  const jsSrc = '/footer/cookie-consent.js';
  // If the cookie script already initialized (sets window._cookieConsent), skip.
  if (window._cookieConsent) {
    console.log('[footer] cookie consent already initialized');
  } else {
    // If a script tag exists but the script did not run (e.g. inserted via innerHTML),
    // still create and append a fresh script element to force execution.
    if (document.querySelector('script[src="' + jsSrc + '"]')) {
      console.log('[footer] cookie JS present but not initialized — reinjecting', jsSrc);
    } else {
      console.log('[footer] injecting cookie JS', jsSrc);
    }
    const script = document.createElement('script');
    script.src = jsSrc;
    script.defer = false;
    script.onload = function(){ console.log('[footer] cookie JS loaded'); };
    script.onerror = function(){ console.error('[footer] cookie JS failed to load', jsSrc); };
    document.body.appendChild(script);
  }
}
