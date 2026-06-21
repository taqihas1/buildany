import os

os.chdir('/Users/taqihasan/carbuyassistantgithub/Carbuyingassistant')

with open('src/screens/CarSearchScreen.tsx', 'r') as f:
    lines = f.readlines()

# Fix 1: Change selectedSearchRadius initial value (uses userLocation before declaration)
for i, line in enumerate(lines):
    if 'const [selectedSearchRadius, setSelectedSearchRadius] = useState(userLocation.radius' in line:
        lines[i] = '  const [selectedSearchRadius, setSelectedSearchRadius] = useState<number | null>(null);\n'
        print('Fixed: selectedSearchRadius initial value')
        break

# Fix 2: Fix useEffect deps from [] to [loadListings]
for i, range_start in enumerate(range(len(lines))):
    if '}, []);' in lines[range_start] and range_start > 100:
        # Check previous line has loadListings
        if 'loadListings();' in lines[range_start - 1] or 'loadListings();' in lines[range_start - 2]:
            lines[range_start] = lines[range_start].replace('}, []);', '}, [loadListings]);')
            print('Fixed: useEffect dependency array')
            break

# Fix 3: Fix JSX nesting - move selectedSearchRadius chip OUT of zipCode block
# Find the problematic pattern in renderFilterChips
for i in range(len(lines)):
    # Look for zipCode chip opening
    if '{zipCode && (' in lines[i] and i > 200:
        # Find the zipCode chip's TouchableOpacity closing tag
        for j in range(i, min(i + 20, len(lines))):
            if '</TouchableOpacity>' in lines[j]:
                # Check if selectedSearchRadius block follows before the zipCode block closes
                for k in range(j + 1, min(j + 15, len(lines))):
                    if '{selectedSearchRadius && (' in lines[k]:
                        # Found the nested pattern! Now find where the zipCode block closes
                        # The zipCode block should close with ')}' on its own line
                        # We need to find the zipCode block's closing and move selectedSearchRadius out
                        
                        # Find the line that closes selectedSearchRadius block
                        for sr_end in range(k, min(k + 15, len(lines))):
                            if ')}' in lines[sr_end] and 'selectedSearchRadius' not in lines[sr_end]:
                                # sr_end should be the zipCode closing line
                                # Replace it with just ')}' for zipCode, then add selectedSearchRadius after
                                
                                # Collect selectedSearchRadius block lines
                                sr_block = lines[k:sr_end + 1]
                                
                                # Remove selectedSearchRadius block from inside zipCode
                                lines[k:sr_end + 1] = []
                                
                                # Insert selectedSearchRadius block after zipCode block closes
                                # Find where zipCode block actually closes now
                                for zip_close in range(k, min(k + 5, len(lines))):
                                    if ')}' in lines[zip_close] or ')}' in lines[zip_close]:
                                        # Insert after this line
                                        insert_idx = zip_close + 1
                                        lines[insert_idx:insert_idx] = ['\n'] + sr_block
                                        print('Fixed: moved selectedSearchRadius chip out of zipCode block')
                                        break
                                break
                        break
                break
        break

# Fix 4: Change returnKeyType from "done" to "search" for zip input
for i, line in enumerate(lines):
    if 'returnKeyType="done"' in line and i > 250:
        lines[i] = line.replace('returnKeyType="done"', 'returnKeyType="search"')
        print('Fixed: zip input returnKeyType')
        break

with open('src/screens/CarSearchScreen.tsx', 'w') as f:
    f.writelines(lines)

print('All fixes applied!')
