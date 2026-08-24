import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.coolweather.mobile',
  appName: 'CoolWeather',
  webDir: 'dist/renderer',
  backgroundColor: '#070c14',
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
