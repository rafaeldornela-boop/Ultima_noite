import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ultimodia.sobrevivencia',
  appName: 'Último Dia — Sobrevivência',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
