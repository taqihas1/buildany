import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/components/SplashScreen';

export default function App() {
  const [appReady, setAppReady] = useState(false);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {!appReady && <SplashScreen onFinish={() => setAppReady(true)} />}
      {appReady && <AppNavigator />}
    </SafeAreaProvider>
  );
}
