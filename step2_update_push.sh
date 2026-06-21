#!/bin/bash
set -e

cd /Users/taqihasan/carbuyassistantgithub/Carbuyingassistant

echo "=== UPDATING EXISTING FILES ==="

# Update AppNavigator.tsx - add Admin route
python3 << 'NAVPY'
path = 'src/navigation/AppNavigator.tsx'
with open(path, 'r') as f:
    content = f.read()

# Add AdminScreen import
if "import AdminScreen" not in content:
    content = content.replace(
        "import SettingsScreen from '../screens/SettingsScreen';",
        "import SettingsScreen from '../screens/SettingsScreen';\nimport AdminScreen from '../screens/AdminScreen';"
    )

# Add Admin to RootStackParamList
if 'Admin: undefined' not in content:
    content = content.replace(
        "CarDetail: { carId: string };",
        "CarDetail: { carId: string };\n  Admin: undefined;"
    )

# Add Admin Screen
if '<Stack.Screen name="Admin"' not in content:
    content = content.replace(
        '<Stack.Screen\n          name="CarDetail"',
        '<Stack.Screen name="Admin" component={AdminScreen} />\n        <Stack.Screen\n          name="CarDetail"'
    )

with open(path, 'w') as f:
    f.write(content)
print("Updated AppNavigator.tsx")
NAVPY

# Update SettingsScreen.tsx - add Admin Panel link
python3 << 'SETTPY'
path = 'src/screens/SettingsScreen.tsx'
with open(path, 'r') as f:
    content = f.read()

# Add navigation import
if 'useNavigation' not in content:
    content = content.replace(
        "import { SafeAreaView } from 'react-native-safe-area-context';",
        "import { SafeAreaView } from 'react-native-safe-area-context';\nimport { useNavigation } from '@react-navigation/native';\nimport { NativeStackNavigationProp } from '@react-navigation/native-stack';"
    )

# Add navigation hook
if 'const navigation' not in content:
    content = content.replace(
        "export default function SettingsScreen() {",
        "type NavigationProp = NativeStackNavigationProp<any>;\n\nexport default function SettingsScreen() {\n  const navigation = useNavigation<NavigationProp>();"
    )

# Add Admin Panel section before About
if 'Admin Panel' not in content:
    content = content.replace(
        "{/* About */}",
        "{/* Admin Panel */}\n        <View style={styles.section}>\n          <Text style={styles.sectionTitle}>Advanced</Text>\n          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Admin')}>\n            <Ionicons name=\"shield-outline\" size={22} color=\"#3b82f6\" />\n            <Text style={styles.menuText}>Admin Panel</Text>\n            <Ionicons name=\"chevron-forward\" size={20} color=\"#9ca3af\" />\n          </TouchableOpacity>\n        </View>\n\n        {/* About */}"
    )

with open(path, 'w') as f:
    f.write(content)
print("Updated SettingsScreen.tsx")
SETTPY

# Check carApi.ts for dealerAddress
if ! grep -q "dealerAddress" src/services/carApi.ts; then
    echo "Adding dealerAddress to carApi.ts..."
    python3 << 'CARPY'
path = 'src/services/carApi.ts'
with open(path, 'r') as f:
    content = f.read()

if 'dealerAddress: dealer.address' not in content:
    content = content.replace(
        "dealerName: dealer.name,",
        "dealerName: dealer.name,\n    dealerAddress: dealer.address || '',"
    )

with open(path, 'w') as f:
    f.write(content)
print("Added dealerAddress to carApi.ts")
CARPY
fi

echo ""
echo "=== GIT PUSH ==="
git add -A
git commit -m "feat: admin panel, clean splash, dealer addresses, location zip utils" || echo "Nothing new to commit"
git push origin main

echo ""
echo "=== DONE ==="
echo "Press 'r' in Metro to reload"
