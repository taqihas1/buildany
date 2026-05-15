import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// Use Google's test ad unit IDs during development
// Replace with your real ad unit IDs before publishing
const AD_UNIT_ID = Platform.select({
  ios: TestIds.BANNER,
  android: 'ca-app-pub-3229563514854040/6330904976',
  default: TestIds.BANNER,
});

// Production ad unit IDs (replace these with your actual AdMob IDs)
// const PRODUCTION_AD_UNIT_ID = Platform.select({
//   ios: 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy',
//   android: 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy',
// });

interface AdBannerProps {
  size?: BannerAdSize;
  unitId?: string;
}

export default function AdBanner({ 
  size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
  unitId = AD_UNIT_ID 
}: AdBannerProps) {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={unitId}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => {
          console.log('Banner ad loaded');
        }}
        onAdFailedToLoad={(error) => {
          console.log('Banner ad failed to load:', error.message);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    // Non-intrusive: minimal padding, no borders
    paddingVertical: 4,
  },
});
