// Dirección del servidor que compila, ejecuta y califica (la API). Vacío = el mismo dominio de la página.
// La página se publica en GitHub Pages y la API corre en el VPS (detrás de Caddy con HTTPS).
window.API_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? '' : 'https://recuperacion.23-95-192-198.sslip.io';
