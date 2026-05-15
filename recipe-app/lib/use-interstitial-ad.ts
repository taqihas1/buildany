/**
 * useInterstitialAd — Production-ready AdMob interstitial hook
 *
 * Ad unit: FullScreenInterstitialFinishRecipe
 * Android Ad Unit ID: ca-app-pub-3229563514854040/5582670797
 *
 * Behaviour by environment:
 * ─────────────────────────────────────────────────────────────────────
 * • Published APK (EAS Build)  → Real InterstitialAd from react-native-google-mobile-ads
 * • Expo Go / Web              → No-op (graceful fallback, no crash)
 *
 * Usage:
 *   const { showInterstitial } = useInterstitialAd();
 *   // Call showInterstitial() when the user finishes a recipe.
 *   // It preloads the ad on mount and reloads after each show.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';

// ─── Ad Unit IDs ─────────────────────────────────────────────────────────────
// Google's official test interstitial ID (safe for development & testing)
const TEST_INTERSTITIAL_ANDROID = 'ca-app-pub-3940256099942544/1033173712';
const TEST_INTERSTITIAL_IOS     = 'ca-app-pub-3940256099942544/4411468910';

// Real production interstitial IDs
// Android: FullScreenInterstitialFinishRecipe
const REAL_INTERSTITIAL_ANDROID = 'ca-app-pub-3229563514854040/5582670797';
// iOS: FullScreenInterstitialFinishRecipeiOS
const REAL_INTERSTITIAL_IOS = 'ca-app-pub-3229563514854040/3810649460';

const INTERSTITIAL_ID_ANDROID =
  process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID_ID || REAL_INTERSTITIAL_ANDROID;
const INTERSTITIAL_ID_IOS =
  process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS_ID || REAL_INTERSTITIAL_IOS;

const AD_UNIT_ID = Platform.OS === 'ios' ? INTERSTITIAL_ID_IOS : INTERSTITIAL_ID_ANDROID;

// ─── Detect native AdMob module ───────────────────────────────────────────────
let NativeInterstitialAd: any = null;
let AdEventType: any = null;

try {
  const admob = require('react-native-google-mobile-ads');
  NativeInterstitialAd = admob.InterstitialAd;
  AdEventType = admob.AdEventType;
} catch {
  // Native module not available (Expo Go or web) — will use no-op fallback
  NativeInterstitialAd = null;
  AdEventType = null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useInterstitialAd() {
  const adRef = useRef<any>(null);
  const loadedRef = useRef(false);

  const loadAd = useCallback(() => {
    // Only load on native builds with AdMob available
    if (Platform.OS === 'web' || !NativeInterstitialAd || !AdEventType) return;

    try {
      const ad = NativeInterstitialAd.createForAdRequest(AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: false,
      });

      // Listen for load success
      const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        loadedRef.current = true;
      });

      // Listen for close — reload immediately so the next finish is ready
      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        loadedRef.current = false;
        unsubLoaded();
        unsubClosed();
        // Reload for next time
        loadAd();
      });

      // Listen for errors — silently fail, no crash
      const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
        loadedRef.current = false;
        unsubLoaded();
        unsubClosed();
        unsubError();
      });

      ad.load();
      adRef.current = ad;
    } catch {
      // Silently ignore any native errors
    }
  }, []);

  // Preload on mount
  useEffect(() => {
    loadAd();
    return () => {
      adRef.current = null;
      loadedRef.current = false;
    };
  }, [loadAd]);

  /**
   * Show the interstitial if loaded. Safe to call even if ad is not ready —
   * it will simply do nothing rather than crash.
   */
  const showInterstitial = useCallback(() => {
    if (Platform.OS === 'web') return;
    if (!adRef.current || !loadedRef.current) return;
    try {
      adRef.current.show();
    } catch {
      // Silently ignore show errors
    }
  }, []);

  return { showInterstitial };
}
