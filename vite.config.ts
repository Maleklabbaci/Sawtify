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
    build: {
      // ── DECOUPAGE EN LOTS STABLES ────────────────────────────────────────
      // Sans ce reglage, TOUT le JS tient dans un seul fichier : au moindre
      // deploiement, son empreinte change et le navigateur de l'utilisateur
      // retelecharge les 300 ko — React et Supabase compris, alors qu'ils
      // n'ont pas bouge.
      // Ici, React / Supabase / les icones / les animations vivent dans des
      // fichiers separes et immuables : apres un deploiement, seul le code de
      // l'appli (quelques dizaines de ko) est retelecharge. C'est le gain le
      // plus visible pour un visiteur qui revient souvent.
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            // lamejs / ffmpeg ne servent QU'au clic « MP3 » : on les laisse
            // dans leur propre fichier, charge a la demande. Les ranger ici
            // les ferait revenir dans le JS de demarrage (185 ko pour rien).
            if (id.includes('lamejs') || id.includes('@ffmpeg')) return undefined;
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'vendor-react';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('motion')) return 'vendor-motion';
            if (id.includes('react-helmet-async')) return 'vendor-helmet';
            return 'vendor';
          },
        },
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
