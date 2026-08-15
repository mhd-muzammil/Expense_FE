import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bazhilgroups.expensetrack',
  appName: 'Expense Tracking',
  webDir: 'dist',
  // Load the live web app directly. Any web deploy (auto-deploys on push) is
  // reflected in the app immediately — no APK rebuild needed. The bundled
  // `dist` acts only as a fallback if the config's server block is removed.
  server: {
    url: 'https://etracker.systimus.in',
    cleartext: false,
  },
};

export default config;
