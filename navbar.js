// Carica la navbar da navbar.html e la inserisce nel body
async function loadNavbar() {
  try {
    const response = await fetch('/navbar.html');
    const navbarHTML = await response.text();
    const navbarContainer = document.createElement('div');
    navbarContainer.id = 'navbar-container';
    navbarContainer.innerHTML = navbarHTML;
    document.body.insertBefore(navbarContainer, document.body.firstChild);
    
    // Imposta il link attivo in base alla pagina corrente
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const homeLink = document.getElementById('nav-home');
    const catalogLink = document.getElementById('nav-catalog');
    const phindexLink = document.getElementById('nav-phindex');

    if (currentPage === 'index.html' || currentPage === '') {
      homeLink.classList.add('active');
    } else if (currentPage === 'catalog.html') {
      catalogLink.classList.add('active');
    }
  } catch (error) {
    console.error('Errore caricamento navbar:', error);
  }
}

// Carica la navbar quando il DOM è pronto
document.addEventListener('DOMContentLoaded', loadNavbar);
