#!/bin/bash
# Disk Space Alert - Triggers when free space < 1GB
# This script is meant to be run manually or via cron

# Get available space in KB, then convert to GB
AVAILABLE_KB=$(df / | tail -1 | awk '{print $4}')
AVAILABLE_GB=$((AVAILABLE_KB / 1024 / 1024))

echo "========================================"
echo "  DISK SPACE CHECK"
echo "========================================"
echo "Free space: ${AVAILABLE_GB} GB"
echo "Threshold:  1 GB"
echo "========================================"

if [ "$AVAILABLE_GB" -lt 1 ]; then
    echo "⚠️  WARNING: Disk space is LOW!"
    echo "⚠️  Only ${AVAILABLE_GB} GB remaining"
    echo ""
    echo "🔥 ACTION NEEDED:"
    echo "   - Clear /tmp: rm -rf /tmp/*"
    echo "   - Clear npm cache: npm cache clean --force"
    echo "   - Check large files: du -sh /root/.openclaw/workspace/*"
    exit 1
else
    echo "✅ Disk space OK (${AVAILABLE_GB} GB free)"
    exit 0
fi
