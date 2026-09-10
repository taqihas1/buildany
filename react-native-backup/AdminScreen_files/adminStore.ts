import AsyncStorage from '@react-native-async-storage/async-storage';

const REAL_DATA_KEY = '@admin_real_data_mode';

export async function getRealDataMode(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(REAL_DATA_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export async function setRealDataMode(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(REAL_DATA_KEY, String(enabled));
  } catch {
    // silently fail
  }
}
