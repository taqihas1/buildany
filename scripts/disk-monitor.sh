#!/bin/bash
# Disk monitor — alerts when free space drops below 2GB

FREE_GB=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$FREE_GB" -le 2 ]; then
  echo "🚨 DISK ALERT — only ${FREE_GB} GB free! Clean up space before we hit the wall."
fi
