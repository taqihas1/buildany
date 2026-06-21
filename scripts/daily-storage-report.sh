#!/bin/bash
# Daily disk + app storage report

echo "📊 DAILY STORAGE REPORT"
echo "======================="
echo ""
echo "💾 DISK SPACE:"
df -h /
echo ""
echo "📱 APPS:"
echo ""
echo "=== CARBUYINGASSISTANT ==="
if [ -d ~/.openclaw/workspace/dealership-app ]; then
  echo "Source: $(du -sh ~/.openclaw/workspace/dealership-app 2>/dev/null | cut -f1)"
  echo "  └─ node_modules: $(du -sh ~/.openclaw/workspace/dealership-app/node_modules 2>/dev/null | cut -f1)"
fi
echo "APKs: $(ls -lh /tmp/*.apk 2>/dev/null | wc -l) file(s)"
ls -lhS /tmp/*.apk 2>/dev/null | awk '{print "  " $5, $9}'
echo ""
echo "=== RECIPEWISE ==="
if [ -f ~/.openclaw/workspace/downloads/recipewise* ]; then
  echo "Files: $(du -sh ~/.openclaw/workspace/downloads/recipewise* 2>/dev/null | awk '{print $1}')"
fi
echo ""
echo "=== WORKSPACE TOTAL ==="
du -sh ~/.openclaw/workspace
echo ""
echo "=== CACHES ==="
echo "npm cache: $(du -sh /root/.npm 2>/dev/null | cut -f1)"
echo "pnpm store: $(du -sh /root/.local/share/pnpm 2>/dev/null | cut -f1)"
echo ""
echo "⚠️ Alert at: ≤ 2 GB free"
FREE_GB=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$FREE_GB" -le 2 ]; then
  echo "🔴 WARNING: Only ${FREE_GB} GB free!"
else
  echo "🟢 OK: ${FREE_GB} GB free"
fi
