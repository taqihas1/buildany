import os, re

os.chdir('/Users/taqihasan/carbuyassistantgithub/Carbuyingassistant')

with open('src/screens/CarSearchScreen.tsx', 'r') as f:
    content = f.read()

changes = []

# FIX 1: selectedSearchRadius state uses userLocation before declaration
# Change: useState(userLocation.radius || 50) -> useState<number | null>(null)
old = 'const [selectedSearchRadius, setSelectedSearchRadius] = useState(userLocation.radius || 50);'
new = 'const [selectedSearchRadius, setSelectedSearchRadius] = useState<number | null>(null);'
if old in content:
    content = content.replace(old, new)
    changes.append('selectedSearchRadius initial value')
else:
    print('WARNING: Could not find selectedSearchRadius pattern')

# FIX 2: Move selectedSearchRadius chip OUT of zipCode block
# The nested pattern in renderFilterChips
old = '''      </TouchableOpacity>

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
new = '''      </TouchableOpacity>
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
if old in content:
    content = content.replace(old, new)
    changes.append('moved selectedSearchRadius chip out of zipCode block')
else:
    print('WARNING: Could not find nested chip pattern')

# FIX 3: useEffect dependency array (empty [] should be [loadListings])
old = '''  useEffect(() => {
    loadListings();
}, []);'''
new = '''  useEffect(() => {
    loadListings();
  }, [loadListings]);'''
if old in content:
    content = content.replace(old, new)
    changes.append('useEffect dependency array')
else:
    print('WARNING: Could not find useEffect pattern')

# FIX 4: returnKeyType="done" -> "search"
if 'returnKeyType="done"' in content:
    content = content.replace('returnKeyType="done"', 'returnKeyType="search"')
    changes.append('zip input returnKeyType')
else:
    print('WARNING: Could not find returnKeyType="done"')

with open('src/screens/CarSearchScreen.tsx', 'w') as f:
    f.write(content)

if changes:
    print(f'Done! Fixed {len(changes)} issue(s):')
    for c in changes:
        print(f'  - {c}')
else:
    print('No changes applied. File may already be fixed or patterns did not match.')
