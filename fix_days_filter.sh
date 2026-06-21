cd /Users/taqihasan/carbuyassistantgithub/Carbuyingassistant

# Step 1: Add maxDaysOnMarket to SearchFilters and apply the filter
cat << 'EOF' > /tmp/add_days_filter.py
import re

path = 'src/services/carApi.ts'
with open(path, 'r') as f:
    content = f.read()

# Add maxDaysOnMarket to SearchFilters if not present
if 'maxDaysOnMarket' not in content:
    content = content.replace(
        "radius?: number;",
        "radius?: number;\n  maxDaysOnMarket?: number;"
    )

# Add the filter after the condition filter
if 'maxDaysOnMarket' not in content or 'daysOnMarket' not in content.split("condition?:")[1].split("// Sort")[0]:
    # Find the condition filter block and add after it
    content = content.replace(
        "if (filters.condition) {\n    listings = listings.filter(l => l.condition === filters.condition);\n  }",
        "if (filters.condition) {\n    listings = listings.filter(l => l.condition === filters.condition);\n  }\n\n  if (filters.maxDaysOnMarket) {\n    listings = listings.filter(l => l.daysOnMarket <= filters.maxDaysOnMarket!);\n  }"
    )

# Also set default maxDaysOnMarket in the searchCarListings function call area
# Add a default to the initial call - look for where listings are first generated
# Actually, let's just add a default parameter
with open(path, 'w') as f:
    f.write(content)
print("Updated carApi.ts with maxDaysOnMarket filter")
EOF
python3 /tmp/add_days_filter.py

# Step 2: Set default maxDaysOnMarket = 75 in CarSearchScreen initial filters
cat << 'EOF' > /tmp/add_days_ui.py
import re

path = 'src/screens/CarSearchScreen.tsx'
with open(path, 'r') as f:
    content = f.read()

# Update the default filters state to include maxDaysOnMarket
if 'maxDaysOnMarket' not in content:
    content = content.replace(
        "const [filters, setFilters] = useState<SearchFilters>({ sortBy: 'savings_desc' });",
        "const [filters, setFilters] = useState<SearchFilters>({ sortBy: 'savings_desc', maxDaysOnMarket: 75 });"
    )

with open(path, 'w') as f:
    f.write(content)
print("Updated CarSearchScreen.tsx with default 75-day filter")
EOF
python3 /tmp/add_days_ui.py

echo "Done! Now pushing to GitHub..."
git add -A
git commit -m "feat: filter out listings older than 75 days on market" || echo "Nothing to commit"
git push origin main

echo ""
echo "Press 'r' in Metro to reload. Listings older than 75 days will be hidden!"
