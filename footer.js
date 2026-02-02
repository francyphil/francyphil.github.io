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
      clearInterval(interval);
    }
  }, 100);
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  waitForFooterAndSetup();
} else {
  window.addEventListener('DOMContentLoaded', waitForFooterAndSetup);
}
