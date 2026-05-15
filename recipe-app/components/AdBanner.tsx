/**
 * AdBanner — Production-ready AdMob banner component
 *
 * Behaviour by environment:
 * ─────────────────────────────────────────────────────────────────────
 * • Published APK / IPA (EAS Build)  → Real BannerAd from react-native-google-mobile-ads
 * • Expo Go                          → House ad (premium upsell) — AdMob native module
 *                                      is not bundled in Expo Go binary
 * • Web browser preview              → House ad — AdMob is native-only
 *
 * Ad Unit IDs:
 * ─────────────────────────────────────────────────────────────────────
 * Set the following env vars via the Secrets panel for production:
 *   EXPO_PUBLIC_ADMOB_BANNER_ANDROID_ID   → Your Android banner ad unit ID
 *   EXPO_PUBLIC_ADMOB_BANNER_IOS_ID       → Your iOS banner ad unit ID
 *
 * If not set, Google's official test IDs are used automatically.
 * Test IDs show real test ads but generate no revenue — safe for testing.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { getIsPremium } from '@/lib/store';
import { useColors } from '@/hooks/use-colors';

// ─── Ad Unit IDs ────────────────────────────────────────────────────────────
// Google's official test IDs (safe to use during development & testing)
const TEST_BANNER_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_BANNER_IOS = 'ca-app-pub-3940256099942544/2934735716';

// Real production ad unit IDs — hardcoded as fallback so builds work without env vars
// Android: HomeBannerRecipewise
const REAL_BANNER_ANDROID = 'ca-app-pub-3229563514854040/3728030626';
// iOS: HomeBannerRecipewiseiOS
const REAL_BANNER_IOS = 'ca-app-pub-3229563514854040/9122685897';

const BANNER_ID_ANDROID =
  process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID_ID || REAL_BANNER_ANDROID;
const BANNER_ID_IOS =
  process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS_ID || REAL_BANNER_IOS;

const AD_UNIT_ID = Platform.OS === 'ios' ? BANNER_ID_IOS : BANNER_ID_ANDROID;

// ─── Detect if native AdMob module is available ─────────────────────────────
// react-native-google-mobile-ads requires a custom native binary (EAS Build).
// In Expo Go the TurboModule is missing, so we catch the error and fall back
// to the house ad to avoid a crash.
let NativeBannerAd: React.ComponentType<any> | null = null;
let BannerAdSize: any = null;

try {
  const admob = require('react-native-google-mobile-ads');
  // If the module loaded without throwing, the native binary is present
  NativeBannerAd = admob.BannerAd;
  BannerAdSize = admob.BannerAdSize;
} catch {
  // Native module not available (Expo Go or web) — will use house ad fallback
  NativeBannerAd = null;
}

// ─── House Ad (Premium Upsell) ───────────────────────────────────────────────
function HouseAd() {
  const colors = useColors();
  const router = useRouter();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.houseAdContainer,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.85 },
      ]}
      onPress={() => router.push('/premium' as any)}
    >
      <View style={styles.houseAdInner}>
        <View style={[styles.badge, { backgroundColor: colors.primary + '18' }]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>✨ PRO</Text>
        </View>
        <Text style={[styles.houseAdText, { color: colors.foreground }]}>
          Unlock no ads, meal planning & nutrition tracking
        </Text>
        <Text style={[styles.houseAdCta, { color: colors.primary }]}>Try free →</Text>
      </View>
    </Pressable>
  );
}

// ─── Main AdBanner Component ─────────────────────────────────────────────────
interface AdBannerProps {
  placement?: string;
}

export function AdBanner({ placement = 'default' }: AdBannerProps) {
  const [isPremium, setIsPremium] = useState(true); // default true to avoid flash
  const [adFailed, setAdFailed] = useState(false);

  useEffect(() => {
    getIsPremium().then(setIsPremium);
  }, []);

  // Premium users never see ads
  if (isPremium) return null;

  // Web platform — show house ad
  if (Platform.OS === 'web') {
    return <HouseAd />;
  }

  // Native module not available (Expo Go) — show house ad
  if (!NativeBannerAd || !BannerAdSize) {
    return <HouseAd />;
  }

  // Ad failed to load — fall back to house ad
  if (adFailed) {
    return <HouseAd />;
  }

  // Production build with native AdMob available — show real banner ad
  return (
    <View style={styles.bannerContainer}>
      <NativeBannerAd
        unitId={AD_UNIT_ID}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdFailedToLoad={() => setAdFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    alignItems: 'center',
    marginVertical: 6,
  },
  houseAdContainer: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  houseAdInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  houseAdText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  houseAdCta: {
    fontSize: 12,
    fontWeight: '700',
  },
});
