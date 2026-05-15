import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/use-colors';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
}

export function ScreenContainer({ children, scrollable }: ScreenContainerProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const Container = scrollable ? require('react-native').ScrollView : View;

  return (
    <Container
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + (Platform.OS === 'web' ? 16 : 8),
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: 16,
        },
      ]}
    >
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
