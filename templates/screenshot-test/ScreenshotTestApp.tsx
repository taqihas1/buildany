import { withScreenShotTest } from 'react-native-screenshot-test';

// Import your app screens
import HomeScreen from './src/screens/HomeScreen';
import PortfolioScreen from './src/screens/PortfolioScreen';
import NewsScreen from './src/screens/NewsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const App = () => {
  const testComponents = [
    {
      component: HomeScreen,
      title: 'Home Screen - Main Dashboard',
      id: 'home-screen',
    },
    {
      component: PortfolioScreen,
      title: 'Portfolio Screen - Holdings & Charts',
      id: 'portfolio-screen',
    },
    {
      component: NewsScreen,
      title: 'News Screen - Market News Feed',
      id: 'news-screen',
    },
    {
      component: SettingsScreen,
      title: 'Settings Screen - App Configuration',
      id: 'settings-screen',
    },
  ];

  const screenshotConfig = {
    path: 'ss-test',                    // Screenshots output folder
    serverUrl: 'http://127.0.0.1:8080', // Test server URL
    batchSize: 10,                      // Process 10 tests at a time
    maxWidth: 500,                      // Max width in HTML report
    quality: 0.9,                       // Screenshot quality (0-1)
    backgroundColor: '#ffffff',         // Background for screenshots
    showDiffInGrayScale: false,         // Show diff in red (not gray)
  };

  const isHeadless = true; // true = headless mode (no emulator needed)

  return withScreenShotTest(testComponents, isHeadless, screenshotConfig);
};

export default App;
