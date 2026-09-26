import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Vite refuse par defaut toute requete dont l'en-tete « Host » n'est pas
      // localhost (protection contre le DNS rebinding). Les apercus de
      // l'editeur en ligne arrivent par un domaine « *.e2b.app », d'ou le 403
      // « Blocked request ». Sans effet en production : ce reglage ne concerne
      // QUE le serveur de developpement.
      allowedHosts: ['.e2b.app', '.e2b.dev'],
    },
  };
});
