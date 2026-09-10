import type { CapacitorConfig } from '@capacitor/cli';

// appId/appName are easy to change later (rename the ios/android platform
// folders' bundle identifiers too if changed after cap add ios/android).
const config: CapacitorConfig = {
  appId: 'com.theory.nexus',
  appName: 'Nexus',
  webDir: '../../dist/apps/nexus-mobile/browser',
};

export default config;
