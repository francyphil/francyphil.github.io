// Carica la navbar da navbar.html e la inserisce nel body
async function loadNavbar() {
  try {
    const response = await fetch('/navbar/navbar.html');
    const navbarHTML = await response.text();
    const navbarContainer = document.createElement('div');
    navbarContainer.id = 'navbar-container';
    navbarContainer.innerHTML = navbarHTML;
    document.body.insertBefore(navbarContainer, document.body.firstChild);
    
    // Evidenzia la voce di menu corrente
    const path = window.location.pathname;
    if (path === '/' || path === '/index.html') {
      const homeLink = document.getElementById('nav-home');
      if (homeLink) homeLink.classList.add('active');
    } else if (path.includes('/static/ph/')) {
      const phLink = document.getElementById('nav-phindex');
      if (phLink) phLink.classList.add('active');
    } else if (path.includes('/regno/') || path.includes('/static/catalogo/') || path.includes('colonie') || path.includes('trieste')) {
      const catLink = document.getElementById('nav-catalog');
      if (catLink) catLink.classList.add('active');
    } else if (path.includes('/static/info/') || path.includes('/static/credits/')) {
      const infoLink = document.getElementById('nav-info');
      if (infoLink) infoLink.classList.add('active');
    }

    // Mobile: gestisci apertura/chiusura sottomenu con click
    setupMobileDropdowns();
  } catch (error) {
    // Errore silenzioso in produzione
  }
}

function setupMobileDropdowns() {
  const isMobile = () => window.innerWidth <= 768;
  
  // Gestisci click sui link dropdown principali (Catalogo, Info)
  document.querySelectorAll('.dropdown > a').forEach(link => {
    link.addEventListener('click', function(e) {
      if (!isMobile()) return;
      e.preventDefault();
      const submenu = this.nextElementSibling;
      if (submenu) {
        // Chiudi gli altri sottomenu aperti
        document.querySelectorAll('.dropdown-content.sub-open').forEach(el => {
          if (el !== submenu) el.classList.remove('sub-open');
        });
        submenu.classList.toggle('sub-open');
      }
    });
  });

  // Gestisci click sui sotto-sottomenu (Regno, Colonie, Trieste A)
  document.querySelectorAll('.dropdown-submenu > a').forEach(link => {
    link.addEventListener('click', function(e) {
      if (!isMobile()) return;
      const submenu = this.nextElementSibling;
      if (submenu && submenu.classList.contains('dropdown-content-sub')) {
        e.preventDefault();
        // Chiudi gli altri sotto-sottomenu aperti
        document.querySelectorAll('.dropdown-content-sub.sub-open').forEach(el => {
          if (el !== submenu) el.classList.remove('sub-open');
        });
        submenu.classList.toggle('sub-open');
      }
      // Se non ha sotto-sottomenu (es. Introduzione), lascia navigare normalmente
    });
  });

  // Chiudi menu quando si clicca su un link finale
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', function() {
      if (!isMobile()) return;
      if (!this.parentElement.classList.contains('dropdown') && 
          !this.nextElementSibling?.classList?.contains('dropdown-content-sub')) {
        document.querySelector('nav ul')?.classList.remove('nav-open');
        document.getElementById('hamburger-btn')?.classList.remove('active');
        document.querySelectorAll('.sub-open').forEach(el => el.classList.remove('sub-open'));
      }
    });
  });
}

// Carica la navbar quando il DOM è pronto
document.addEventListener('DOMContentLoaded', loadNavbar);
