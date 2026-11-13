import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { homeBannerUnitId, useAdsStore } from '../services/adsService';
import { useTheme } from '../theme/ThemeContext';

/**
 * Anchored adaptive banner pinned to the bottom of the Home screen.
 * Renders nothing until consent + SDK init are done, and collapses again if
 * no ad is available, so the timetable never shows an empty grey strip.
 */
export const HomeBannerAd = () => {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const ready = useAdsStore(s => s.ready);
  const [failed, setFailed] = useState(false);
  const unitId = homeBannerUnitId();

  if (!ready || !unitId || failed) return null;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingBottom: insets.bottom,
          backgroundColor: t.colors.background,
          borderTopColor: t.colors.border,
        },
      ]}
    >
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
