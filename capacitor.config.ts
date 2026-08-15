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
    // Brief static splash that hands off to the animated in-app splash
    // (components/AppSplash.tsx) once the web app boots.
    SplashScreen: {
      launchShowDuration: 1000,
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
