(function(){
  const STORAGE_KEY = 'cookie_consent_status';

  console.log('[cookie-consent] script loaded');

  function setConsent(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch(e){}
    console.log('[cookie-consent] setConsent ->', value);
    hideBanner();
  }

  function getConsent() {
    try { return localStorage.getItem(STORAGE_KEY); } catch(e){ return null; }
  }

  function showBanner() {
    const el = document.getElementById('cookieConsentBanner');
    if (!el) return;
    console.log('[cookie-consent] showBanner');
    el.style.display = 'block';
  }

  function hideBanner() {
    const el = document.getElementById('cookieConsentBanner');
    if (!el) return;
    console.log('[cookie-consent] hideBanner');
    el.style.display = 'none';
  }

  function init() {
    // Delay init until DOM is ready (footer is loaded dynamically)
    function run() {
      if (!document.body) return;
      const existing = document.getElementById('cookieConsentBanner');
      if (!existing) return;
      const consent = getConsent();
      console.log('[cookie-consent] current consent ->', consent);
      if (!consent) {
        showBanner();
      }

      // Buttons
      const acceptBtn = document.getElementById('cookieAcceptBtn');
      const rejectBtn = document.getElementById('cookieRejectBtn');
      if (acceptBtn) acceptBtn.addEventListener('click', function(){ console.log('[cookie-consent] accept clicked'); setConsent('accepted'); });
      if (rejectBtn) rejectBtn.addEventListener('click', function(){ console.log('[cookie-consent] reject clicked'); setConsent('rejected'); });
    }

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  }

  // Expose a function to reset consent (for debugging)
  window._cookieConsent = { reset: function(){ localStorage.removeItem(STORAGE_KEY); location.reload(); } };

  init();
})();
