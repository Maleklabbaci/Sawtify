import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';
import './styles/scrollbar.css';

// Après un déploiement, un onglet resté ouvert peut réclamer d'anciens fichiers
// hachés (/assets/*.js) qui n'existent plus : on recharge une seule fois.
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem('sawtify-reload-once')) return;
  sessionStorage.setItem('sawtify-reload-once', '1');
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
);
