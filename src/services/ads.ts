import { MobileAds, TestIds } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';

export function initializeAds(): void {
  void MobileAds().initialize();
}

export function getBannerUnitId(): string {
  return __DEV__ ? TestIds.BANNER : (Platform.OS === 'android' ? 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY' : 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY');
}
