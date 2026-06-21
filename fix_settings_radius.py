import os

os.chdir('/Users/taqihasan/carbuyassistantgithub/Carbuyingassistant')

# ============================================
# 1. Remove search radius from SettingsScreen
# ============================================
with open('src/screens/SettingsScreen.tsx', 'r') as f:
    lines = f.readlines()

# Remove setSearchRadius, getSearchRadius from import
for i, line in enumerate(lines):
    if "from '../store/locationStore'" in line:
        lines[i] = "import { getSearchRadius } from '../store/locationStore';\n"
        print('Fixed: import in SettingsScreen')
        break

# Remove searchRadius state
for i, line in enumerate(lines):
    if 'searchRadius, setSearchRadiusState' in line:
        lines[i] = ''
        print('Fixed: removed searchRadius state')
        break

# Remove useEffect for searchRadius
for i in range(len(lines)):
    if 'setSearchRadiusState(getSearchRadius())' in lines[i]:
        # Remove this useEffect block
        lines[i-1] = ''  # useEffect(() => {
        lines[i] = ''    # setSearchRadiusState(...)
        lines[i+1] = ''  # }, []);
        print('Fixed: removed useEffect for searchRadius')
        break

# Remove radiusOptions
for i, line in enumerate(lines):
    if 'radiusOptions' in line:
        lines[i] = ''
        print('Fixed: removed radiusOptions')
        break

# Remove handleRadiusChange
for i in range(len(lines)):
    if 'handleRadiusChange' in lines[i]:
        # Remove 4 lines of function
        for j in range(i, min(i+4, len(lines))):
            lines[j] = ''
        print('Fixed: removed handleRadiusChange')
        break

# Remove the Search Radius JSX section
for i in range(len(lines)):
    if 'Search Radius' in lines[i] and 'sectionTitle' not in lines[i]:
        # Find the start of this section - look for the text around it
        start_idx = None
        for j in range(max(0, i-10), i+1):
            if 'Show cars within' in lines[j] or 'Search Radius' in lines[j]:
                start_idx = j
                break
        if start_idx:
            # Find the end of this section (radiusOptions.map closing)
            for end_idx in range(start_idx, min(start_idx + 20, len(lines))):
                if '))}' in lines[end_idx] and end_idx > start_idx:
                    # Remove from start to end
                    for k in range(start_idx, end_idx + 1):
                        lines[k] = ''
                    print('Fixed: removed Search Radius JSX')
                    break
        break

with open('src/screens/SettingsScreen.tsx', 'w') as f:
    f.writelines(lines)

# ============================================
# 2. Set default selectedSearchRadius to 50 in CarSearchScreen
# ============================================
with open('src/screens/CarSearchScreen.tsx', 'r') as f:
    content = f.read()

old = 'const [selectedSearchRadius, setSelectedSearchRadius] = useState<number | null>(null);'
new = 'const [selectedSearchRadius, setSelectedSearchRadius] = useState<number | null>(50);'
if old in content:
    content = content.replace(old, new)
    print('Fixed: default selectedSearchRadius = 50')
else:
    print('WARNING: Could not find selectedSearchRadius state')

with open('src/screens/CarSearchScreen.tsx', 'w') as f:
    f.write(content)

print('Done! All changes applied.')
