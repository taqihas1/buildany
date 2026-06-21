import os, re

os.chdir('/Users/taqihasan/carbuyassistantgithub/Carbuyingassistant')

# ============================================
# 1. Fix SettingsScreen - remove search radius
# ============================================
with open('src/screens/SettingsScreen.tsx', 'r') as f:
    content = f.read()

# Remove setSearchRadius from import (keep getSearchRadius)
content = content.replace(
    "import { setSearchRadius, getSearchRadius } from '../store/locationStore';",
    "import { getSearchRadius } from '../store/locationStore';"
)

# Remove searchRadius state
content = content.replace(
    '  const [searchRadius, setSearchRadiusState] = useState(50);\n\n',
    ''
)

# Remove useEffect for searchRadius
content = content.replace(
    """  useEffect(() => {
    setSearchRadiusState(getSearchRadius());
  }, []);

""",
    ''
)

# Remove radiusOptions
content = content.replace(
    '  const radiusOptions = [10, 25, 50, 100, 250];\n\n',
    ''
)

# Remove handleRadiusChange
content = content.replace(
    """  const handleRadiusChange = (radius: number) => {
    setSearchRadiusState(radius);
    setSearchRadius(radius);
  };

""",
    ''
)

# Remove Search Radius JSX section
old_jsx = """        <Text style={styles.sectionTitle}>Search Preferences</Text>
        <Text style={styles.radiusDescription}>
          Show cars within {searchRadius} miles
        </Text>
        <View style={styles.radiusOptions}>
          {radiusOptions.map((radius) => (
            <TouchableOpacity
              key={radius}
              style={[
                styles.radiusButton,
                searchRadius === radius && styles.radiusButtonActive,
              ]}
              onPress={() => handleRadiusChange(radius)}
            >
              <Text
                style={[
                  styles.radiusButtonText,
                  searchRadius === radius && styles.radiusButtonTextActive,
                ]}
              >
                {radius} mi
              </Text>
            </TouchableOpacity>
          ))}
        </View>"""

new_jsx = """        <Text style={styles.sectionTitle}>Search Preferences</Text>
        <Text style={styles.settingDescription}>
          Adjust filters directly on the search page
        </Text>"""

content = content.replace(old_jsx, new_jsx)

# Remove unused radius styles from StyleSheet
content = content.replace(
    """  radiusDescription: { fontSize: 14, color: '#6b7280', paddingHorizontal: 16, marginBottom: 8 },
  radiusOptions: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  radiusButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  radiusButtonActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  radiusButtonText: { fontSize: 14, color: '#4b5563' },
  radiusButtonTextActive: { color: '#fff', fontWeight: '600' },
""",
    ''
)

with open('src/screens/SettingsScreen.tsx', 'w') as f:
    f.write(content)

print('Fixed SettingsScreen: removed search radius')

# ============================================
# 2. Fix CarSearchScreen default radius = 50
# ============================================
with open('src/screens/CarSearchScreen.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'const [selectedSearchRadius, setSelectedSearchRadius] = useState<number | null>(null);',
    'const [selectedSearchRadius, setSelectedSearchRadius] = useState<number | null>(50);'
)

with open('src/screens/CarSearchScreen.tsx', 'w') as f:
    f.write(content)

print('Fixed CarSearchScreen: default radius = 50')
print('Done!')
