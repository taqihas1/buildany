cd /Users/taqihasan/carbuyassistantgithub/Carbuyingassistant

# Step 1: Add DAYS_ON_MARKET options to carApi.ts
python3 << 'PYEOF'
path = 'src/services/carApi.ts'
with open(path, 'r') as f:
    content = f.read()

# Add DAYS_ON_MARKET after YEAR_RANGES if not present
if 'DAYS_ON_MARKET' not in content:
    # Find YEAR_RANGES and add after it
    old = "export const YEAR_RANGES"
    new = "export const DAYS_ON_MARKET = [\n  { label: 'This Week', days: 7 },\n  { label: 'Last 2 Weeks', days: 14 },\n  { label: 'Last 4 Weeks', days: 28 },\n  { label: 'Any', days: 9999 },\n];\n\nexport const YEAR_RANGES"
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
    print("Added DAYS_ON_MARKET to carApi.ts")
else:
    print("DAYS_ON_MARKET already exists")
PYEOF

# Step 2: Update CarSearchScreen with days on market filter UI
python3 << 'PYEOF'
path = 'src/screens/CarSearchScreen.tsx'
with open(path, 'r') as f:
    content = f.read()

# Add DAYS_ON_MARKET to imports
if 'DAYS_ON_MARKET' not in content:
    content = content.replace(
        "YEAR_RANGES,",
        "YEAR_RANGES,\n  DAYS_ON_MARKET,"
    )

# Add selectedDaysOnMarket state after selectedYearRange
if 'selectedDaysOnMarket' not in content:
    content = content.replace(
        "const [selectedYearRange, setSelectedYearRange] = useState(null);",
        "const [selectedYearRange, setSelectedYearRange] = useState(null);\n  const [selectedDaysOnMarket, setSelectedDaysOnMarket] = useState({ label: 'Last 4 Weeks', days: 28 });"
    )

# Add maxDaysOnMarket to currentFilters in loadListings
if 'maxDaysOnMarket' not in content.split('loadListings')[1].split('const data')[0]:
    content = content.replace(
        "radius: userLocation.radius,",
        "radius: userLocation.radius,\n      maxDaysOnMarket: selectedDaysOnMarket?.days,"
    )

# Add selectedDaysOnMarket to useCallback dependency array
old_deps = "}, [filters, selectedMake, selectedBodyType, selectedPriceRange, selectedYearRange, searchQuery, userLocation, zipCode];"
new_deps = "}, [filters, selectedMake, selectedBodyType, selectedPriceRange, selectedYearRange, selectedDaysOnMarket, searchQuery, userLocation, zipCode];"
content = content.replace(old_deps, new_deps)

# Add days filter chip to renderFilterChips
if 'selectedDaysOnMarket' not in content.split('renderFilterChips')[1].split(')')[0]:
    # Add after year filter chip
    content = content.replace(
        "{zipCode && (",
        "{selectedDaysOnMarket && selectedDaysOnMarket.days !== 9999 && (\n        <TouchableOpacity\n          style={[styles.filterChip, styles.activeChip]}\n          onPress={() => { setSelectedDaysOnMarket(null); loadListings(); }}\n        >\n          <Text style={styles.activeChipText}>{selectedDaysOnMarket.label}</Text>\n          <Ionicons name=\"close-circle\" size={14} color=\"#fff\" />\n        </TouchableOpacity>\n      )}\n\n      {zipCode && ("
    )

# Add Days on Market filter section in the filters panel, after Year section
if 'Days on Market' not in content:
    # Find the end of the Year filter section (before Apply Filters)
    old = "Apply Filters\n        </TouchableOpacity>\n      )}"
    new = "Days on Market\n          {DAYS_ON_MARKET.map((range) => (\n            <TouchableOpacity\n              key={range.label}\n              style={[\n                styles.filterOption,\n                selectedDaysOnMarket?.label === range.label \u0026& styles.filterOptionActive,\n              ]}\n              onPress={() =>\n                setSelectedDaysOnMarket(\n                  selectedDaysOnMarket?.label === range.label ? null : range\n                )\n              }\n            >\n              <Text\n                style={[\n                  styles.filterOptionText,\n                  selectedDaysOnMarket?.label === range.label \u0026& styles.filterOptionTextActive,\n                ]}\n              >\n                {range.label}\n              </Text>\n            </TouchableOpacity>\n          ))}\n        </View>\n\n        <TouchableOpacity style={styles.applyButton} onPress={() => { setShowFilters(false); loadListings(); }}\n        >\n          <Text style={styles.applyButtonText}>Apply Filters</Text>\n        </TouchableOpacity\n      )}"
    
    # Wait, the original end is: Apply Filters text, then closing tags. Let me find the exact pattern.
    # The structure is: Apply Filters</Text></TouchableOpacity> followed by closing )} for showFilters
    
    old_exact = """        <TouchableOpacity style={styles.applyButton} onPress={() => { setShowFilters(false); loadListings(); }}
        >
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </TouchableOpacity>
      )}"""
    
    new_exact = """        <View style={styles.filterGrid}>
          {DAYS_ON_MARKET.map((range) => (
            <TouchableOpacity
              key={range.label}
              style={[
                styles.filterOption,
                selectedDaysOnMarket?.label === range.label && styles.filterOptionActive,
              ]}
              onPress={() =>
                setSelectedDaysOnMarket(
                  selectedDaysOnMarket?.label === range.label ? null : range
                )
              }
            >
              <Text
                style={[
                  styles.filterOptionText,
                  selectedDaysOnMarket?.label === range.label && styles.filterOptionTextActive,
                ]}
              >
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.applyButton} onPress={() => { setShowFilters(false); loadListings(); }}
        >
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </TouchableOpacity>
      )}"""
    
    content = content.replace(old_exact, new_exact)

with open(path, 'w') as f:
    f.write(content)
print("Updated CarSearchScreen.tsx")
PYEOF

git add -A && git commit -m "feat: add days-on-market filter (this week, last 2 weeks, last 4 weeks)" && git push origin main

echo "Done! Press 'r' in Metro to reload."
echo ""
echo "Filter options:"
echo "  - This Week (0-7 days)"
echo "  - Last 2 Weeks (0-14 days)"
echo "  - Last 4 Weeks (0-28 days) -- DEFAULT"
echo "  - Any (no limit)"
