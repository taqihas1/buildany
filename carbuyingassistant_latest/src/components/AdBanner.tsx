import React from 'react';
import { View, StyleSheet } from 'react-native';

// SAFE MODE: AdBanner disabled to prevent release crash
// Google Mobile Ads may not be properly initialized in standalone APK
export default function AdBanner() {
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 0, // Hidden
  },
});
