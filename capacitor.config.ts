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
  plugins: {
    // Branded launch screen: Renderways logo + name shown while the web loads.
    SplashScreen: {
      launchShowDuration: 2200,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
  },
};

export default config;
