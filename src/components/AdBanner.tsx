import { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { getBannerUnitId, initializeAds } from '../services/ads';

export default function AdBanner({ visible }: { visible: boolean }) {
  const [isReady, setIsReady] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initializeAds();
    }
    setIsReady(true);
  }, []);

  if (!visible || !isReady) return null;

  const screenWidth = Dimensions.get('window').width;
  const adWidth = screenWidth < 430 ? screenWidth : 430;

  return (
    <View style={styles.container} accessible={true} accessibilityLabel="advertisement">
      <BannerAd
        unitId={getBannerUnitId()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        width={adWidth}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => {}}
        onAdFailedToLoad={() => {}}
        onAdOpened={() => {}}
        onAdClosed={() => {}}
        onAdClicked={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  ad: {
    alignSelf: 'center',
  },
});
