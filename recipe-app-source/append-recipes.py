import sys

# Read the temp file with recipes r153-r176
with open('/root/.openclaw/workspace/recipe-app-source/high-protein-recipes-append-6.txt', 'r') as f:
    new_recipes = f.read()

# Read current recipes-new.ts
with open('/root/.openclaw/workspace/recipe-app/lib/data/recipes-new.ts', 'r') as f:
    content = f.read()

# Remove the trailing ];
if content.rstrip().endswith('];'):
    content = content.rstrip()[:-2].rstrip()

# Append new recipes and add closing
content = content + '\n' + new_recipes + '\n'

# Write back
with open('/root/.openclaw/workspace/recipe-app/lib/data/recipes-new.ts', 'w') as f:
    f.write(content)

print('Appended 24 recipes (r153-r176) successfully!')
