import re
import sys
import os

REPO = '/Users/taqihasan/carbuyassistantgithub/Carbuyingassistant'
os.chdir(REPO)

# =====================================================================
# 1. Update carApi.ts - add DAYS_ON_MARKET export
# =====================================================================
with open('src/services/carApi.ts', 'r') as f:
    lines = f.readlines()

# Check if DAYS_ON_MARKET already exists
content = ''.join(lines)
if 'DAYS_ON_MARKET' not in content:
    # Find the line with YEAR_RANGES = [
    insert_idx = None
    for i, line in enumerate(lines):
        if 'export const YEAR_RANGES' in line:
            insert_idx = i
            break
    
    if insert_idx is not None:
        # Find the end of YEAR_RANGES (closing ];)
        end_idx = insert_idx
        for j in range(insert_idx, min(insert_idx + 20, len(lines))):
            if '];' in lines[j] and j > insert_idx:
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
    else:
        print("WARNING: Could not find YEAR_RANGES in carApi.ts")
else:
    print("DAYS_ON_MARKET already exists in carApi.ts")

# =====================================================================
# 2. Update CarSearchScreen.tsx
# =====================================================================
with open('src/screens/CarSearchScreen.tsx', 'r') as f:
    lines = f.readlines()

content = ''.join(lines)
changes = []

# A. Add DAYS_ON_MARKET to imports
if 'DAYS_ON_MARKET' not in content:
    for i, line in enumerate(lines):
        if 'YEAR_RANGES,' in line:
            lines.insert(i+1, '  DAYS_ON_MARKET,\n')
            changes.append("Added DAYS_ON_MARKET import")
            break

# Reload after insert
content = ''.join(lines)

# B. Add selectedDaysOnMarket state after selectedYearRange
if 'selectedDaysOnMarket' not in content:
    for i, line in enumerate(lines):
        if 'const [selectedYearRange, setSelectedYearRange] = useState' in line:
            # Find the end of this line (semicolon)
            while i < len(lines) and ';' not in lines[i]:
                i += 1
            lines.insert(i+1, "  const [selectedDaysOnMarket, setSelectedDaysOnMarket] = useState({ label: 'Last 4 Weeks', days: 28 });\n")
            changes.append("Added selectedDaysOnMarket state")
            break

content = ''.join(lines)

# C. Add SEARCH_RADII state after selectedDaysOnMarket
if 'selectedSearchRadius' not in content:
    for i, line in enumerate(lines):
        if "const [selectedDaysOnMarket, setSelectedDaysOnMarket] = useState" in line:
            while i < len(lines) and ';' not in lines[i]:
                i += 1
            lines.insert(i+1, "  const [selectedSearchRadius, setSelectedSearchRadius] = useState(userLocation.radius || 50);\n")
            changes.append("Added selectedSearchRadius state")
            break

content = ''.join(lines)

# D. Add maxDaysOnMarket to currentFilters in loadListings
if 'maxDaysOnMarket' not in content.split('loadListings')[1].split('const data')[0] if 'loadListings' in content else content:
    for i, line in enumerate(lines):
        if 'radius: userLocation.radius,' in line:
            # Replace this line
            lines[i] = line.replace(
                'radius: userLocation.radius,',
                'radius: selectedSearchRadius || userLocation.radius,\n      maxDaysOnMarket: selectedDaysOnMarket?.days || 28,'
            )
            changes.append("Updated currentFilters with radius and maxDaysOnMarket")
            break

content = ''.join(lines)

# E. Update useCallback dependency array
old_deps = 'selectedYearRange, searchQuery, userLocation, zipCode];'
new_deps = 'selectedYearRange, selectedDaysOnMarket, selectedSearchRadius, searchQuery, userLocation, zipCode];'
if old_deps in content:
    for i, line in enumerate(lines):
        if old_deps in line:
            lines[i] = line.replace(old_deps, new_deps)
            changes.append("Updated dependency array")
            break

content = ''.join(lines)

# F. Add selectedDaysOnMarket chip to renderFilterChips (before zipCode)
chip_insert = "{zipCode && ("
if 'selectedDaysOnMarket' not in content.split('renderFilterChips')[1].split('</View>')[0] if 'renderFilterChips' in content else content:
    for i, line in enumerate(lines):
        if chip_insert in line and 'zipCode' in line and 'selectedDaysOnMarket' not in ''.join(lines[max(0,i-5):i]):
            # Insert before this line
            indent = '      '
            new_chip = [
                f"{indent}{{selectedDaysOnMarket && selectedDaysOnMarket.days !== 9999 && (\n",
                f"{indent}  <TouchableOpacity\n",
                f"{indent}    style={{[styles.filterChip, styles.activeChip]}}\n",
                f"{indent}    onPress={{{{ () => {{ setSelectedDaysOnMarket(null); loadListings(); }} }}}}\n",
                f"{indent}  >\n",
                f"{indent}    <Text style={{styles.activeChipText}}>{{selectedDaysOnMarket.label}}</Text>\n",
                f"{indent}    <Ionicons name=\"close-circle\" size={{14}} color=\"#fff\" />\n",
                f"{indent}  </TouchableOpacity>\n",
                f"{indent})}}\n",
                f"\n",
            ]
            lines = lines[:i] + new_chip + lines[i:]
            changes.append("Added days-on-market chip")
            break

content = ''.join(lines)

# G. Add search radius chip to renderFilterChips (after zipCode chip, before closing )
if 'selectedSearchRadius' not in content.split('renderFilterChips')[1].split('</View>')[0] if 'renderFilterChips' in content else content:
    for i, line in enumerate(lines):
        if '{zipCode && (' in line:
            # Find the closing </TouchableOpacity> for the zipCode chip, then insert after it
            j = i + 1
            close_count = 0
            while j < len(lines):
                if '<TouchableOpacity' in lines[j]:
                    close_count += 1
                if '</TouchableOpacity>' in lines[j]:
                    close_count -= 1
                    if close_count == 0 and j > i + 1:
                        # Insert after the closing </TouchableOpacity> of the zipCode chip
                        indent = '      '
                        new_radius_chip = [
                            f"\n",
                            f"{indent}{{selectedSearchRadius && (\n",
                            f"{indent}  <TouchableOpacity\n",
                            f"{indent}    style={{[styles.filterChip, styles.activeChip]}}\n",
                            f"{indent}    onPress={{{{ () => {{ setSelectedSearchRadius(null); loadListings(); }} }}}}\n",
                            f"{indent}  >\n",
                            f"{indent}    <Text style={{styles.activeChipText}}>{{selectedSearchRadius}} mi radius</Text>\n",
                            f"{indent}    <Ionicons name=\"close-circle\" size={{14}} color=\"#fff\" />\n",
                            f"{indent}  </TouchableOpacity>\n",
                            f"{indent})}}\n",
                        ]
                        lines = lines[:j+1] + new_radius_chip + lines[j+1:]
                        changes.append("Added search radius chip")
                        break
                j += 1
            break

content = ''.join(lines)

# H. Add Days on Market filter section AND Search Radius section before Apply Filters
# Find the "Apply Filters" button in the filters panel
apply_idx = None
for i, line in enumerate(lines):
    if 'Apply Filters' in line and '<TouchableOpacity' in lines[i-1] if i > 0 else False:
        apply_idx = i
        break

if apply_idx and 'Days on Market' not in content:
    # Find the line before the Apply Filters button (should be after Year section closing </View>)
    # Go back to find the start of the Apply Filters TouchableOpacity
    start_apply = apply_idx
    for j in range(apply_idx, max(0, apply_idx - 30), -1):
        if '<TouchableOpacity' in lines[j] and 'applyButton' in lines[j+1] if j+1 < len(lines) else False:
            start_apply = j
            break
    
    new_filters = [
        "\n",
        "        <Text style={styles.filterSectionTitle}>Days on Market</Text>\n",
        "        <View style={styles.filterGrid}>\n",
        "          {DAYS_ON_MARKET.map((range) => (\n",
        "            <TouchableOpacity\n",
        "              key={range.label}\n",
        "              style={[\n",
        "                styles.filterOption,\n",
        "                selectedDaysOnMarket?.label === range.label && styles.filterOptionActive,\n",
        "              ]}\n",
        "              onPress={() =>\n",
        "                setSelectedDaysOnMarket(\n",
        "                  selectedDaysOnMarket?.label === range.label ? null : range\n",
        "                )\n",
        "              }\n",
        "            >\n",
        "              <Text\n",
        "                style={[\n",
        "                  styles.filterOptionText,\n",
        "                  selectedDaysOnMarket?.label === range.label && styles.filterOptionTextActive,\n",
        "                ]}\n",
        "              >\n",
        "                {range.label}\n",
        "              </Text>\n",
        "            </TouchableOpacity>\n",
        "          ))}\n",
        "        </View>\n",
        "\n",
        "        <Text style={styles.filterSectionTitle}>Search Radius</Text>\n",
        "        <View style={styles.filterGrid}>\n",
        "          {[10, 25, 50, 100, 250].map((radius) => (\n",
        "            <TouchableOpacity\n",
        "              key={radius}\n",
        "              style={[\n",
        "                styles.filterOption,\n",
        "                selectedSearchRadius === radius && styles.filterOptionActive,\n",
        "              ]}\n",
        "              onPress={() =>\n",
        "                setSelectedSearchRadius(\n",
        "                  selectedSearchRadius === radius ? null : radius\n",
        "                )\n",
        "              }\n",
        "            >\n",
        "              <Text\n",
        "                style={[\n",
        "                  styles.filterOptionText,\n",
        "                  selectedSearchRadius === radius && styles.filterOptionTextActive,\n",
        "                ]}\n",
        "              >\n",
        "                {radius} mi\n",
        "              </Text>\n",
        "            </TouchableOpacity>\n",
        "          ))}\n",
        "        </View>\n",
    ]
    
    lines = lines[:start_apply] + new_filters + lines[start_apply:]
    changes.append("Added Days on Market and Search Radius filter sections")

with open('src/screens/CarSearchScreen.tsx', 'w') as f:
    f.writelines(lines)

print("\nChanges made to CarSearchScreen.tsx:")
for c in changes:
    print(f"  - {c}")

if not changes:
    print("  (no changes needed - everything already in place)")

print("\nDone!")
