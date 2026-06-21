cd /Users/taqihasan/carbuyassistantgithub/Carbuyingassistant

cat > fix_chips.py << 'PYEOF'
import os
os.chdir('/Users/taqihasan/carbuyassistantgithub/Carbuyingassistant')

with open('src/screens/CarSearchScreen.tsx', 'r') as f:
    content = f.read()

# 1. Fix the selectedSearchRadius chip nested inside zipCode block
bad = '''      </TouchableOpacity>

      {selectedSearchRadius && (
        <TouchableOpacity
          style={[styles.filterChip, styles.activeChip]}
          onPress={() => { setSelectedSearchRadius(null); loadListings(); }}
        >
          <Text style={styles.activeChipText}>{selectedSearchRadius} mi radius</Text>
          <Ionicons name="close-circle" size={14} color="#fff" />
        </TouchableOpacity>
      )}
    )}'''

good = '''      </TouchableOpacity>
    )}

    {selectedSearchRadius && (
      <TouchableOpacity
        style={[styles.filterChip, styles.activeChip]}
        onPress={() => { setSelectedSearchRadius(null); loadListings(); }}
      >
        <Text style={styles.activeChipText}>{selectedSearchRadius} mi radius</Text>
        <Ionicons name="close-circle" size={14} color="#fff" />
      </TouchableOpacity>
    )}'''

if bad in content:
    content = content.replace(bad, good)
    print("Fixed: moved selectedSearchRadius chip outside zipCode block")
else:
    print("WARNING: Could not find nested chip pattern")

# 2. Fix dependency array — add selectedDaysOnMarket and selectedSearchRadius
old_deps = 'selectedYearRange, searchQuery, userLocation, zipCode];'
new_deps = 'selectedYearRange, selectedDaysOnMarket, selectedSearchRadius, searchQuery, userLocation, zipCode];'
if old_deps in content:
    content = content.replace(old_deps, new_deps)
    print("Fixed: updated useCallback dependency array")
else:
    # Try alternate format
    old2 = 'selectedYearRange, searchQuery, userLocation, zipCode'
    new2 = 'selectedYearRange, selectedDaysOnMarket, selectedSearchRadius, searchQuery, userLocation, zipCode'
    if old2 in content:
        content = content.replace(old2, new2)
        print("Fixed: updated dependency array (alternate format)")
    else:
        print("WARNING: Could not find dependency array")

with open('src/screens/CarSearchScreen.tsx', 'w') as f:
    f.write(content)

print("Done!")
PYEOF

python3 fix_chips.py && git add -A && git commit -m "fix: move radius chip out of zipCode block, add missing deps" && git push origin main && rm fix_chips.py
