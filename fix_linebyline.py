import os

os.chdir('/Users/taqihasan/carbuyassistantgithub/Carbuyingassistant')

with open('src/screens/CarSearchScreen.tsx', 'r') as f:
    lines = f.readlines()

# FIX 1: Line 36 - selectedSearchRadius uses userLocation before declared
for i, line in enumerate(lines):
    if 'selectedSearchRadius' in line and 'userLocation' in line:
        lines[i] = '  const [selectedSearchRadius, setSelectedSearchRadius] = useState<number | null>(null);\n'
        print(f'Fixed line {i+1}: selectedSearchRadius initial value')
        break

# FIX 2: Move selectedSearchRadius chip OUT of zipCode block
# Find the zipCode chip block and the selectedSearchRadius chip inside it
for i, line in enumerate(lines):
    if '{zipCode && (' in line and i > 200:
        # Found the start of zipCode block at line i
        # Find the TouchableOpacity that starts the zipCode chip
        zip_start = i
        # Now look for the selectedSearchRadius block that follows AFTER the zipCode chip closes
        # The zipCode chip closes at </TouchableOpacity>, then selectedSearchRadius starts
        for j in range(zip_start, min(zip_start + 20, len(lines))):
            if '</TouchableOpacity>' in lines[j]:
                # Check if selectedSearchRadius follows this line
                for k in range(j+1, min(j+10, len(lines))):
                    if '{selectedSearchRadius && (' in lines[k]:
                        # Found! selectedSearchRadius is inside zipCode block
                        # Find where selectedSearchRadius block ends
                        for sr_end in range(k, min(k+15, len(lines))):
                            if sr_end > k and ')}' in lines[sr_end]:
                                # sr_end is the closing of zipCode block
                                # We need to:
                                # 1. Remove selectedSearchRadius lines from k to sr_end (exclusive)
                                # 2. Find where zipCode block should end (just after its </TouchableOpacity>)
                                # 3. Insert selectedSearchRadius after zipCode block
                                
                                # Extract selectedSearchRadius block
                                sr_block = lines[k:sr_end]
                                
                                # Remove it from current position
                                lines[k:sr_end] = []
                                
                                # Find the zipCode block end (the )} that closes zipCode)
                                # After removing sr_block, the )} should now be at position k
                                # We need to insert sr_block AFTER that )}
                                insert_pos = k + 1
                                
                                # Add blank line before
                                sr_block.insert(0, '\n')
                                
                                # Insert after zipCode block
                                lines[insert_pos:insert_pos] = sr_block
                                
                                print(f'Fixed: moved selectedSearchRadius chip out of zipCode block (lines {k+1}-{sr_end+1})')
                                break
                        break
                break
        break

# FIX 3: useEffect dependency array
for i, line in enumerate(lines):
    if '}, []);' in line and i > 70 and i < 90:
        lines[i] = lines[i].replace('}, []);', '}, [loadListings]);')
        print(f'Fixed line {i+1}: useEffect deps')
        break

# FIX 4: returnKeyType
for i, line in enumerate(lines):
    if 'returnKeyType="done"' in line:
        lines[i] = line.replace('returnKeyType="done"', 'returnKeyType="search"')
        print(f'Fixed line {i+1}: returnKeyType')
        break

with open('src/screens/CarSearchScreen.tsx', 'w') as f:
    f.writelines(lines)

print('Done! All fixes applied.')
