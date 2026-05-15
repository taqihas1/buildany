import re

with open('/root/.openclaw/workspace/recipe-app/lib/data/recipes-new.ts', 'r') as f:
    content = f.read()

# Find all occurrences of r152
matches = list(re.finditer(r"\{[\s\S]*?id: 'r152',[\s\S]*?\},", content))
print(f"Found {len(matches)} occurrences of r152")

if len(matches) >= 2:
    # Remove the second occurrence
    second_start = matches[1].start()
    second_end = matches[1].end()
    content = content[:second_start] + content[second_end:]
    
    with open('/root/.openclaw/workspace/recipe-app/lib/data/recipes-new.ts', 'w') as f:
        f.write(content)
    print("Removed duplicate r152")
else:
    print("No duplicate found or only 1 occurrence")

# Verify
ids = re.findall(r"id: 'r(\d+)'", content)
print(f"Total recipes: {len(ids)}")
print(f"Last ID: r{max(int(x) for x in ids)}")
print(f"First ID: r{min(int(x) for x in ids)}")

# Check for duplicates
duplicates = [x for x in ids if ids.count(x) > 1]
if duplicates:
    print(f"Duplicates found: {set(duplicates)}")
else:
    print("No duplicates found")
