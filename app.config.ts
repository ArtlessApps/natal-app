// Expo reads this instead of app.json. Env vars come from `.env` /
// `.env.local` (gitignored) — never hardcode API keys here.
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'natal-app',
  slug: 'natal-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'natalapp',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/images/icon.png',
    bundleIdentifier: 'com.artlessapps.natal',
    supportsTablet: false,
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#faf7f2',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    [
      'expo-notifications',
      {
        color: '#4a6e8a',
        defaultChannel: 'daily',
      },
    ],
    'expo-sharing',
    'expo-font',
    [
      '@sentry/react-native/expo',
      {
        url: 'https://sentry.io/',
        project: 'natal-app',
        organization: 'artlessapps',
      },
    ],
  ],
  extra: {
    eas: {
      projectId: 'bcbaba47-871c-4dd4-abc8-440f00b249e7',
    },
    router: {},
    // Public RevenueCat Apple API key (safe to ship in the binary).
    // Sourced from EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY in `.env`.
    revenueCatAppleApiKey: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY,
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  owner: 'ndame',
});
