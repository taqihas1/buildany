/**
 * AdMob stub for web platform.
 * react-native-google-mobile-ads is native-only; this stub prevents
 * Metro from trying to bundle native components on web.
 */

const noop = () => {};
const noopComponent = () => null;

module.exports = {
  BannerAd: noopComponent,
  InterstitialAd: { createForAdRequest: () => ({ load: noop, show: noop, addAdEventListener: noop, removeAllListeners: noop }) },
  RewardedAd: { createForAdRequest: () => ({ load: noop, show: noop, addAdEventListener: noop, removeAllListeners: noop }) },
  BannerAdSize: {
    BANNER: 'BANNER',
    FULL_BANNER: 'FULL_BANNER',
    LARGE_BANNER: 'LARGE_BANNER',
    LEADERBOARD: 'LEADERBOARD',
    MEDIUM_RECTANGLE: 'MEDIUM_RECTANGLE',
    WIDE_SKYSCRAPER: 'WIDE_SKYSCRAPER',
    ADAPTIVE_BANNER: 'ADAPTIVE_BANNER',
  },
  TestIds: {
    BANNER: 'ca-app-pub-3940256099942544/2934735716',
    INTERSTITIAL: 'ca-app-pub-3940256099942544/4411468910',
    REWARDED: 'ca-app-pub-3940256099942544/1712485313',
  },
  AdEventType: { LOADED: 'loaded', ERROR: 'error', OPENED: 'opened', CLOSED: 'closed' },
  RewardedAdEventType: { LOADED: 'loaded', EARNED_REWARD: 'earned_reward' },
  MaxAdContentRating: { G: 'G', PG: 'PG', T: 'T', MA: 'MA' },
  initialize: () => Promise.resolve([]),
};
