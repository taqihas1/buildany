cd /Users/taqihasan/carbuyassistantgithub/Carbuyingassistant

cat > clean_settings.py << 'PYEOF'
import os

os.chdir('/Users/taqihasan/carbuyassistantgithub/Carbuyingassistant')

with open('src/screens/SettingsScreen.tsx', 'r') as f:
    content = f.read()

# Remove the entire "Adjust filters directly on the search page" text block
# This removes the second SEARCH PREFERENCES section
content = content.replace(
    """        <Text style={styles.sectionTitle}>Search Preferences</Text>
        <Text style={styles.settingDescription}>
          Adjust filters directly on the search page
        </Text>""",
    ''
)

# Also remove "SEARCH RADIUS" section title if it exists
content = content.replace(
    """        <Text style={styles.sectionTitle}>Search Radius</Text>""",
    ''
)

# Remove any standalone "Adjust filters directly on the search page" text
content = content.replace(
    '          Adjust filters directly on the search page\n',
    ''
)

with open('src/screens/SettingsScreen.tsx', 'w') as f:
    f.write(content)

print('Done! Removed duplicate Search Preferences section and Search Radius header.')
PYEOF

python3 clean_settings.py
