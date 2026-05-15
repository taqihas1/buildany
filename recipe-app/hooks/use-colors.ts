import { useColorScheme } from 'react-native';

export function useColors() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return {
    background: isDark ? '#121212' : '#FFFFFF',
    surface: isDark ? '#1E1E1E' : '#F5F5F5',
    primary: '#2E7D32',
    text: isDark ? '#FFFFFF' : '#121212',
    textSecondary: isDark ? '#AAAAAA' : '#666666',
    border: isDark ? '#333333' : '#E0E0E0',
    error: '#D32F2F',
    success: '#2E7D32',
    warning: '#F57F17',
  };
}
