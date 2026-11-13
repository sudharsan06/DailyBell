import { Platform } from 'react-native';
import mobileAds, {
  AdEventType,
  AdsConsent,
  InterstitialAd,
  TestIds,
} from 'react-native-google-mobile-ads';
import { create } from 'zustand';

/**
 * AdMob banner unit for the Home screen. Debug builds always use Google's
 * test unit: tapping your own live ads can get the AdMob account suspended.
 * (App IDs live in app.json under "react-native-google-mobile-ads".)
 */
const HOME_BANNER_UNIT = Platform.select({
  android: 'ca-app-pub-6508060827158792/8892132209',
  // TODO: create an iOS banner unit in AdMob and put it here.
  default: undefined,
});

export const homeBannerUnitId = (): string | undefined =>
  __DEV__ ? TestIds.ADAPTIVE_BANNER : HOME_BANNER_UNIT;

/** Full-screen ad shown when the user opens Settings. */
const SETTINGS_INTERSTITIAL_UNIT = Platform.select({
  android: 'ca-app-pub-6508060827158792/4155131645',
  // TODO: create an iOS interstitial unit in AdMob and put it here.
  default: undefined,
});

const settingsInterstitialUnitId = (): string | undefined =>
  __DEV__ ? TestIds.INTERSTITIAL : SETTINGS_INTERSTITIAL_UNIT;

/**
 * At most one interstitial per this many ms. Showing one on literally every
 * Settings visit annoys users and risks AdMob's "unexpected interstitial"
 * policy, so quick back-and-forth visits are skipped.
 */
const INTERSTITIAL_MIN_INTERVAL_MS = 3 * 60 * 1000;

let interstitial: InterstitialAd | undefined;
let interstitialLoaded = false;
let interstitialShowing = false;
let lastInterstitialAt = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

/** Creates the interstitial once and keeps one ad preloaded. */
const prepareInterstitial = () => {
  const unitId = settingsInterstitialUnitId();
  if (!unitId || interstitial) return;
  const ad = InterstitialAd.createForAdRequest(unitId);
  interstitial = ad;
  const load = () => {
    interstitialLoaded = false;
    try {
      ad.load();
    } catch {
      // already loading
    }
  };
  ad.addAdEventListener(AdEventType.LOADED, () => {
    interstitialLoaded = true;
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => {
    interstitialShowing = false;
    load(); // preload the next one
  });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    interstitialLoaded = false;
    interstitialShowing = false;
    // No fill / offline: try again later instead of hammering the network.
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(load, 60 * 1000);
  });
  load();
};

/**
 * Call on each Settings visit. Shows the preloaded interstitial if one is
 * ready and the frequency cap allows; otherwise does nothing (never blocks).
 */
export const maybeShowSettingsInterstitial = () => {
  if (!useAdsStore.getState().ready || !interstitial) return;
  if (!interstitialLoaded || interstitialShowing) return;
  if (Date.now() - lastInterstitialAt < INTERSTITIAL_MIN_INTERVAL_MS) return;
  interstitialShowing = true;
  interstitialLoaded = false;
  lastInterstitialAt = Date.now();
  interstitial.show().catch(() => {
    interstitialShowing = false;
  });
};

interface AdsState {
  /** True once consent is settled and the SDK is initialised. */
  ready: boolean;
}

export const useAdsStore = create<AdsState>(() => ({ ready: false }));

let started = false;

/**
 * Gathers UMP consent (shows Google's consent form only where required,
 * e.g. EEA/UK), then initialises the Mobile Ads SDK. Ads are requested only
 * if consent allows it. Never throws: on failure the app simply shows no ads.
 */
export const initAds = async () => {
  if (started) return;
  started = true;
  try {
    let canRequestAds = false;
    try {
      ({ canRequestAds } = await AdsConsent.gatherConsent());
    } catch {
      // Consent info unavailable (offline etc.): use what was stored before.
      ({ canRequestAds } = await AdsConsent.getConsentInfo());
    }
    if (!canRequestAds) return;
    await mobileAds().initialize();
    useAdsStore.setState({ ready: true });
    prepareInterstitial();
  } catch (e) {
    console.warn('[DailyBell] ads init failed', e);
  }
};
