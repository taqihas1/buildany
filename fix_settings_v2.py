import os

os.chdir('/Users/taqihasan/carbuyassistantgithub/Carbuyingassistant')

with open('src/screens/SettingsScreen.tsx', 'r') as f:
    lines = f.readlines()

result = []
i = 0
while i < len(lines):
    line = lines[i]
    
    # Skip searchRadius state declaration
    if 'searchRadius, setSearchRadiusState' in line:
        i += 1
        continue
    
    # Skip useEffect for searchRadius
    if 'useEffect(() => {' in line and i+2 < len(lines) and 'getSearchRadius()' in lines[i+1]:
        i += 3  # skip useEffect(() => {, setSearchRadiusState(...), }, []);
        continue
    
    # Skip radiusOptions
    if 'radiusOptions' in line and 'const' in line:
        i += 1
        continue
    
    # Skip handleRadiusChange function (4 lines)
    if 'handleRadiusChange' in line and 'const' in line:
        i += 4
        continue
    
    # Skip setSearchRadius import
    if 'setSearchRadius' in line and 'import' in line:
        line = line.replace('setSearchRadius, ', '').replace(', setSearchRadius', '')
    
    # In JSX: replace "Show cars within {searchRadius} miles" section
    if 'Show cars within' in line and 'searchRadius' in line:
        # Skip until we find the closing of radiusOptions.map
        # Look for the </View> that closes the radiusOptions
        depth = 0
        while i < len(lines):
            if '<View' in lines[i] or '<View ' in lines[i]:
                depth += 1
            if '</View>' in lines[i]:
                depth -= 1
                if depth <= 0:
                    i += 1
                    break
            i += 1
        # Add replacement text
        result.append('        <Text style={styles.sectionTitle}>Search Preferences</Text>\n')
        result.append('        <Text style={styles.settingDescription}>\n')
        result.append('          Adjust filters directly on the search page\n')
        result.append('        </Text>\n')
        continue
    
    # Remove radius styles from StyleSheet
    if 'radiusDescription' in line or 'radiusOptions' in line or 'radiusButton' in line or 'radiusButtonActive' in line or 'radiusButtonText' in line or 'radiusButtonTextActive' in line:
        i += 1
        continue
    
    result.append(line)
    i += 1

with open('src/screens/SettingsScreen.tsx', 'w') as f:
    f.writelines(result)

print('Done! SettingsScreen cleaned up.')

# Also fix CarSearchScreen default radius
with open('src/screens/CarSearchScreen.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'const [selectedSearchRadius, setSelectedSearchRadius] = useState<number | null>(null);',
    'const [selectedSearchRadius, setSelectedSearchRadius] = useState<number | null>(50);'
)

with open('src/screens/CarSearchScreen.tsx', 'w') as f:
    f.write(content)

print('Done! CarSearchScreen default radius = 50')
