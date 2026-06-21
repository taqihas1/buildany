import os

os.chdir('/Users/taqihasan/carbuyassistantgithub/Carbuyingassistant')

with open('src/screens/CarSearchScreen.tsx', 'r') as f:
    content = f.read()

changes = 0

# Fix 1: Move selectedSearchRadius chip OUT of zipCode block
old = """      </TouchableOpacity>

      {selectedSearchRadius && (
        <TouchableOpacity
          style={[styles.filterChip, styles.activeChip]}
          onPress={() => { setSelectedSearchRadius(null); loadListings(); }}
        >
          <Text style={styles.activeChipText}>{selectedSearchRadius} mi radius</Text>
          <Ionicons name="close-circle" size={14} color="#fff" />
        </TouchableOpacity>
      )}
    )}"""

new = """      </TouchableOpacity>
    )}

    {selectedSearchRadius && (
      <TouchableOpacity
        style={[styles.filterChip, styles.activeChip]}
        onPress={() => { setSelectedSearchRadius(null); loadListings(); }}
      >
        <Text style={styles.activeChipText}>{selectedSearchRadius} mi radius</Text>
        <Ionicons name="close-circle" size={14} color="#fff" />
      </TouchableOpacity>
    )}"""

if old in content:
    content = content.replace(old, new)
    changes += 1
    print('Fixed: moved selectedSearchRadius chip out of zipCode block')
else:
    print('WARNING: Could not find nested chip pattern')

# Fix 2: selectedSearchRadius initial value (uses userLocation before declaration)
old2 = 'const [selectedSearchRadius, setSelectedSearchRadius] = useState(userLocation.radius || 50);'
new2 = 'const [selectedSearchRadius, setSelectedSearchRadius] = useState<number | null>(null);'
if old2 in content:
    content = content.replace(old2, new2)
    changes += 1
    print('Fixed: selectedSearchRadius initial value')
else:
    print('WARNING: Could not find selectedSearchRadius state pattern')

# Fix 3: useEffect dependency array for loadListings
old3 = """  useEffect(() => {
    loadListings();
}, []);"""
new3 = """  useEffect(() => {
    loadListings();
  }, [loadListings]);"""
if old3 in content:
    content = content.replace(old3, new3)
    changes += 1
    print('Fixed: useEffect dependency array')
else:
    print('WARNING: Could not find useEffect pattern')

# Fix 4: zip input returnKeyType
old4 = 'returnKeyType="done"'
new4 = 'returnKeyType="search"'
if old4 in content:
    content = content.replace(old4, new4)
    changes += 1
    print('Fixed: zip input returnKeyType')
else:
    print('WARNING: Could not find returnKeyType="done"')

with open('src/screens/CarSearchScreen.tsx', 'w') as f:
    f.write(content)

print(f'Done! {changes} fix(es) applied.')
