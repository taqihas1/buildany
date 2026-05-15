import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeAd, NativeAdView, AdBadge, HeadlineView, TaglineView, IconView, ImageView, StarRatingView, StoreView, PriceView, AdvertiserView, CallToActionView } from 'react-native-google-mobile-ads';

// Native Ad Unit ID
const NATIVE_AD_UNIT_ID = 'ca-app-pub-3229563514854040/2555311498';

interface NativeAdCardProps {
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: any) => void;
}

export default function NativeAdCard({ onAdLoaded, onAdFailedToLoad }: NativeAdCardProps) {
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Reset state when component mounts
    setLoading(true);
    setError(false);
  }, []);

  const handleNativeAdLoaded = (ad: NativeAd) => {
    setNativeAd(ad);
    setLoading(false);
    setError(false);
    onAdLoaded?.();
  };

  const handleNativeAdFailedToLoad = (err: any) => {
    setLoading(false);
    setError(true);
    onAdFailedToLoad?.(err);
  };

  if (error) {
    return null; // Silently fail - don't show broken ad
  }

  return (
    <NativeAdView
      adUnitId={NATIVE_AD_UNIT_ID}
      onNativeAdLoaded={handleNativeAdLoaded}
      onAdFailedToLoad={handleNativeAdFailedToLoad}
      requestOptions={{
        requestNonPersonalizedAdsOnly: true,
      }}
      style={styles.container}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#9ca3af" />
        </View>
      ) : (
        <View style={styles.adContent}>
          {/* Ad Badge */}
          <AdBadge style={styles.adBadge} textStyle={styles.adBadgeText} />
          
          {/* Header Row: Icon + Headline + Star Rating */}
          <View style={styles.headerRow}>
            <IconView style={styles.icon} />
            <View style={styles.headerText}>
              <HeadlineView style={styles.headline} />
              <View style={styles.ratingRow}>
                <StarRatingView starSize={12} style={styles.starRating} />
                <AdvertiserView style={styles.advertiser} />
              </View>
            </View>
          </View>

          {/* Main Image */}
          <ImageView style={styles.mainImage} />

          {/* Tagline / Description */}
          <TaglineView style={styles.tagline} />

          {/* CTA Button */}
          <CallToActionView
            style={styles.ctaButton}
            textStyle={styles.ctaButtonText}
            buttonAndroidStyle={{
              backgroundColor: '#3b82f6',
              borderRadius: 8,
            }}
          />
        </View>
      )}
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adContent: {
    padding: 16,
  },
  adBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headline: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starRating: {
    marginRight: 8,
  },
  advertiser: {
    fontSize: 12,
    color: '#6b7280',
  },
  mainImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 12,
    resizeMode: 'cover',
  },
  tagline: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  ctaButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
