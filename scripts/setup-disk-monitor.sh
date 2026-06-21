#!/bin/bash
# Setup cron job for disk space monitoring
# Run this to install the low-disk alert

SCRIPT="/root/.openclaw/workspace/scripts/disk-alert.sh"
LOG="/tmp/disk-monitor.log"

echo "Setting up disk space monitor (alerts when < 1GB)..."

# Add cron job - runs every 30 minutes
(crontab -l 2>/dev/null; echo "*/30 * * * * $SCRIPT >> $LOG 2>&1") | crontab -

echo "✅ Cron job installed!"
echo "   Checks every 30 minutes"
echo "   Logs to: $LOG"
echo ""
echo "To check manually anytime, run:"
echo "   /root/.openclaw/workspace/scripts/disk-alert.sh"
echo ""
echo "To remove the cron job:"
echo "   crontab -e   (delete the line with disk-alert.sh)"
