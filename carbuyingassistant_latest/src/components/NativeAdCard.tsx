import React from 'react';
import { View, StyleSheet } from 'react-native';

// SAFE MODE: NativeAdCard disabled to prevent release crash
export default function NativeAdCard() {
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 0, // Hidden
  },
});
