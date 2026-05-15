import React from 'react';
import { Pressable, Platform, GestureResponderEvent } from 'react-native';
import * as Haptics from 'expo-haptics';

interface HapticTabProps {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  onPressIn?: (e: GestureResponderEvent) => void;
}

export function HapticTab({ children, onPress, onPressIn }: HapticTabProps) {
  const handlePressIn = (e: GestureResponderEvent) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPressIn?.(e);
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn}>
      {children}
    </Pressable>
  );
}
