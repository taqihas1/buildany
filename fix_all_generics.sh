#!/bin/bash
set -e

PROJECT_DIR="/Users/taqihasan/carbuyassistantgithub/Carbuyingassistant"
cd "$PROJECT_DIR"

echo "🔍 Finding all .tsx files with << corruption..."
# Find files with <<Type pattern (TypeScript generics corrupted by heredoc)
grep -rln '<<[A-Z][a-zA-Z]*>' --include="*.tsx" --include="*.ts" src/ || true

echo ""
echo "🔧 Fixing << to < in all TypeScript files..."
# Use perl for safer replacement: replace << followed by capital letter with <
find src -name "*.tsx" -o -name "*.ts" | while read f; do
    if grep -q '<<[A-Z][a-zA-Z]*>' "$f"; then
        perl -i -pe 's/<<([A-Z][a-zA-Z]*)/<$1/g' "$f"
        echo "  Fixed: $f"
    fi
done

echo ""
echo "🔧 Fixing any remaining standalone << patterns..."
# Also catch patterns like useState<<CarListing>() -> useState<CarListing>()
find src -name "*.tsx" -o -name "*.ts" | while read f; do
    if grep -q '<<' "$f"; then
        echo "  WARNING: Still has << in $f"
        grep -n '<<' "$f" | head -5
    fi
done

echo ""
echo "🔧 Ensuring useRoute comes from @react-navigation/native..."
# Check CarDetailScreen imports
DETAIL_FILE="src/screens/CarDetailScreen.tsx"
if [ -f "$DETAIL_FILE" ]; then
    if grep -q "from 'react-router-native'" "$DETAIL_FILE"; then
        echo "  BAD IMPORT FOUND in CarDetailScreen.tsx — replacing..."
        sed -i '' "s/from 'react-router-native'/from '@react-navigation\/native'/g" "$DETAIL_FILE"
    else
        echo "  ✓ CarDetailScreen.tsx imports look good"
    fi
fi

echo ""
echo "✅ All fixes applied!"
echo ""
echo "📋 Quick verification:"
grep -n "useState<<" src/screens/*.tsx || echo "  No corrupted useState found ✓"
grep -n "Navigator<<" src/navigation/*.tsx || echo "  No corrupted Navigator found ✓"
grep -n "createNativeStackNavigator<<" src/navigation/*.tsx || echo "  No corrupted Stack found ✓"
