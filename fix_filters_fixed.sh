cd /Users/taqihasan/carbuyassistantgithub/Carbuyingassistant

cat > fix_filters.py << 'PYEOF'
import os
os.chdir('/Users/taqihasan/carbuyassistantgithub/Carbuyingassistant')

# 1. Add DAYS_ON_MARKET to carApi.ts
with open('src/services/carApi.ts', 'r') as f:
    lines = f.readlines()
content = ''.join(lines)

if 'DAYS_ON_MARKET' not in content:
    for i, line in enumerate(lines):
        if 'export const YEAR_RANGES' in line:
            end_idx = i
            for j in range(i, min(i+20, len(lines))):
                if '];' in lines[j] and j > i:
                    end_idx = j
                    break
            new_lines = [
                '\nexport const DAYS_ON_MARKET = [\n',
                "  { label: 'This Week', days: 7 },\n",
                "  { label: 'Last 2 Weeks', days: 14 },\n",
                "  { label: 'Last 4 Weeks', days: 28 },\n",
                "  { label: 'Any', days: 9999 },\n",
                '];\n',
            ]
            lines = lines[:end_idx+1] + new_lines + lines[end_idx+1:]
            with open('src/services/carApi.ts', 'w') as f:
                f.writelines(lines)
            print("Added DAYS_ON_MARKET to carApi.ts")
            break
else:
    print("DAYS_ON_MARKET already in carApi.ts")

# 2. Update CarSearchScreen.tsx
with open('src/screens/CarSearchScreen.tsx', 'r') as f:
    lines = f.readlines()
content = ''.join(lines)
changes = []

# A. Import DAYS_ON_MARKET
if 'DAYS_ON_MARKET' not in content:
    for i, line in enumerate(lines):
        if 'YEAR_RANGES,' in line:
            lines.insert(i+1, '  DAYS_ON_MARKET,\n')
            changes.append("Added DAYS_ON_MARKET import")
            break

content = ''.join(lines)

# B. Add selectedDaysOnMarket state
if 'selectedDaysOnMarket' not in content:
    for i, line in enumerate(lines):
        if 'const [selectedYearRange, setSelectedYearRange] = useState' in line:
            while i < len(lines) and ';' not in lines[i]:
                i += 1
            lines.insert(i+1, "  const [selectedDaysOnMarket, setSelectedDaysOnMarket] = useState({ label: 'Last 4 Weeks', days: 28 });\n")
            changes.append("Added selectedDaysOnMarket state")
            break

content = ''.join(lines)

# C. Add selectedSearchRadius state
if 'selectedSearchRadius' not in content:
    for i, line in enumerate(lines):
        if 'const [selectedDaysOnMarket, setSelectedDaysOnMarket] = useState' in line:
            while i < len(lines) and ';' not in lines[i]:
                i += 1
            lines.insert(i+1, "  const [selectedSearchRadius, setSelectedSearchRadius] = useState(userLocation.radius || 50);\n")
            changes.append("Added selectedSearchRadius state")
            break

content = ''.join(lines)

# D. Update currentFilters in loadListings
for i, line in enumerate(lines):
    if 'radius: userLocation.radius,' in line:
        lines[i] = line.replace(
            'radius: userLocation.radius,',
            'radius: selectedSearchRadius || userLocation.radius,\n      maxDaysOnMarket: selectedDaysOnMarket?.days || 28,'
        )
        changes.append("Updated currentFilters")
        break

content = ''.join(lines)

# E. Update dependency array
old_deps = 'selectedYearRange, searchQuery, userLocation, zipCode];'
new_deps = 'selectedYearRange, selectedDaysOnMarket, selectedSearchRadius, searchQuery, userLocation, zipCode];'
for i, line in enumerate(lines):
    if old_deps in line:
        lines[i] = line.replace(old_deps, new_deps)
        changes.append("Updated dependency array")
        break

content = ''.join(lines)

# F. Add days-on-market chip to renderFilterChips
if 'selectedDaysOnMarket' not in content.split('renderFilterChips')[1].split('</View>')[0]:
    for i, line in enumerate(lines):
        if '{zipCode && (' in line:
            indent = '      '
            new_chip = [
                indent + '{selectedDaysOnMarket && selectedDaysOnMarket.days !== 9999 && (\n',
                indent + '  <TouchableOpacity\n',
                indent + '    style={[styles.filterChip, styles.activeChip]}\n',
                indent + '    onPress={() => { setSelectedDaysOnMarket(null); loadListings(); }}\n',
                indent + '  >\n',
                indent + '    <Text style={styles.activeChipText}>{selectedDaysOnMarket.label}</Text>\n',
                indent + '    <Ionicons name="close-circle" size={14} color="#fff" />\n',
                indent + '  </TouchableOpacity>\n',
                indent + ')}\n',
                '\n',
            ]
            lines = lines[:i] + new_chip + lines[i:]
            changes.append("Added days-on-market chip")
            break

content = ''.join(lines)

# G. Add search radius chip to renderFilterChips
if 'selectedSearchRadius' not in content.split('renderFilterChips')[1].split('</View>')[0]:
    for i, line in enumerate(lines):
        if '{zipCode && (' in line:
            j = i + 1
            close_count = 0
            while j < len(lines):
                if '<TouchableOpacity' in lines[j]:
                    close_count += 1
                if '</TouchableOpacity>' in lines[j]:
                    close_count -= 1
                    if close_count == 0 and j > i + 1:
                        indent = '      '
                        new_chip = [
                            '\n',
                            indent + '{selectedSearchRadius && (\n',
                            indent + '  <TouchableOpacity\n',
                            indent + '    style={[styles.filterChip, styles.activeChip]}\n',
                            indent + '    onPress={() => { setSelectedSearchRadius(null); loadListings(); }}\n',
                            indent + '  >\n',
                            indent + '    <Text style={styles.activeChipText}>{selectedSearchRadius} mi radius</Text>\n',
                            indent + '    <Ionicons name="close-circle" size={14} color="#fff" />\n',
                            indent + '  </TouchableOpacity>\n',
                            indent + ')}\n',
                        ]
                        lines = lines[:j+1] + new_chip + lines[j+1:]
                        changes.append("Added search radius chip")
                        break
                j += 1
            break

content = ''.join(lines)

# H. Add filter sections before Apply Filters
apply_idx = None
for i, line in enumerate(lines):
    if 'Apply Filters' in line:
        apply_idx = i
        break

if apply_idx and 'Days on Market' not in content:
    start_apply = apply_idx
    for j in range(apply_idx, max(0, apply_idx - 30), -1):
        if '<TouchableOpacity' in lines[j] and j+1 < len(lines) and 'applyButton' in lines[j+1]:
            start_apply = j
            break
    
    indent = '        '
    new_filters = [
        '\n',
        indent + '<Text style={styles.filterSectionTitle}>Days on Market</Text>\n',
        indent + '<View style={styles.filterGrid}>\n',
        indent + '  {DAYS_ON_MARKET.map((range) => (\n',
        indent + '    <TouchableOpacity\n',
        indent + '      key={range.label}\n',
        indent + '      style={[\n',
        indent + '        styles.filterOption,\n',
        indent + '        selectedDaysOnMarket?.label === range.label && styles.filterOptionActive,\n',
        indent + '      ]}\n',
        indent + '      onPress={() =>\n',
        indent + '        setSelectedDaysOnMarket(\n',
        indent + '          selectedDaysOnMarket?.label === range.label ? null : range\n',
        indent + '        )\n',
        indent + '      }\n',
        indent + '    >\n',
        indent + '      <Text\n',
        indent + '        style={[\n',
        indent + '          styles.filterOptionText,\n',
        indent + '          selectedDaysOnMarket?.label === range.label && styles.filterOptionTextActive,\n',
        indent + '        ]}\n',
        indent + '      >\n',
        indent + '        {range.label}\n',
        indent + '      </Text>\n',
        indent + '    </TouchableOpacity>\n',
        indent + '  ))}\n',
        indent + '</View>\n',
        '\n',
        indent + '<Text style={styles.filterSectionTitle}>Search Radius</Text>\n',
        indent + '<View style={styles.filterGrid}>\n',
        indent + '  {[10, 25, 50, 100, 250].map((radius) => (\n',
        indent + '    <TouchableOpacity\n',
        indent + '      key={radius}\n',
        indent + '      style={[\n',
        indent + '        styles.filterOption,\n',
        indent + '        selectedSearchRadius === radius && styles.filterOptionActive,\n',
        indent + '      ]}\n',
        indent + '      onPress={() =>\n',
        indent + '        setSelectedSearchRadius(\n',
        indent + '          selectedSearchRadius === radius ? null : radius\n',
        indent + '        )\n',
        indent + '      }\n',
        indent + '    >\n',
        indent + '      <Text\n',
        indent + '        style={[\n',
        indent + '          styles.filterOptionText,\n',
        indent + '          selectedSearchRadius === radius && styles.filterOptionTextActive,\n',
        indent + '        ]}\n',
        indent + '      >\n',
        indent + '        {radius} mi\n',
        indent + '      </Text>\n',
        indent + '    </TouchableOpacity>\n',
        indent + '  ))}\n',
        indent + '</View>\n',
    ]
    
    lines = lines[:start_apply] + new_filters + lines[start_apply:]
    changes.append("Added Days on Market and Search Radius filter sections")

with open('src/screens/CarSearchScreen.tsx', 'w') as f:
    f.writelines(lines)

print("\nChanges made:")
for c in changes:
    print("  - " + c)
if not changes:
    print("  (no changes needed)")
print("\nDone!")
PYEOF

python3 fix_filters.py && git add -A && git commit -m "feat: days-on-market and search radius filters on search page" && git push origin main && rm fix_filters.py
