import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'it.pockt.app',
  appName: 'Pockt',
  webDir: 'dist',
  server: {
    // Use the deployed API in production; in dev, Capacitor live reload proxies through Vite
    url: process.env.CAPACITOR_DEV_URL || undefined,
    cleartext: true,
  },
};

export default config;
