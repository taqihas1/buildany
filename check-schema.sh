#!/bin/bash
cd /root/buildany
echo "=== Projects table schema ==="
grep -n -A 30 "export const projects = sqliteTable" src/lib/db/schema.ts

echo ""
echo "=== Check what fields are required vs optional ==="
grep -n ",$\|notNull()\|default(" src/lib/db/schema.ts | head -30
