// Carica automaticamente i favicon link nell'head
(function() {
  const faviconLinks = [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon/favicon.ico' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon/favicon-32x32.png' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon/favicon-16x16.png' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/favicon/apple-touch-icon.png' }
  ];

  faviconLinks.forEach(function(linkData) {
    const link = document.createElement('link');
    for (const key in linkData) {
      link.setAttribute(key, linkData[key]);
    }
    document.head.appendChild(link);
  });
})();
