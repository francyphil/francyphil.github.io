// Carica la navbar da navbar.html e la inserisce nel body
async function loadNavbar() {
  try {
    const response = await fetch('/navbar.html');
    const navbarHTML = await response.text();
    const navbarContainer = document.createElement('div');
    navbarContainer.id = 'navbar-container';
    navbarContainer.innerHTML = navbarHTML;
    document.body.insertBefore(navbarContainer, document.body.firstChild);
    
    // Imposta sempre Home come link attivo
    const homeLink = document.getElementById('nav-home');
    if (homeLink) {
      homeLink.classList.add('active');
    }
  } catch (error) {
    console.error('Errore caricamento navbar:', error);
  }
}

// Carica la navbar quando il DOM è pronto
document.addEventListener('DOMContentLoaded', loadNavbar);
