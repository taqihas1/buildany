#!/bin/bash
cd /root/buildany

echo "=== Current imports in hermes-chat route ==="
head -10 src/app/api/hermes-chat/route.ts

echo ""
echo "=== Fix: Add NextResponse import or use existing Response ==="
# Check if NextResponse is already imported
if grep -q "NextResponse" src/app/api/hermes-chat/route.ts; then
  echo "NextResponse already imported"
else
  # Add NextResponse to the existing import line
  sed -i 's/import { NextRequest } from "next\/server";/import { NextRequest, NextResponse } from "next\/server";/' src/app/api/hermes-chat/route.ts
  echo "Added NextResponse import"
fi

echo ""
echo "=== Verify ==="
head -10 src/app/api/hermes-chat/route.ts

echo ""
echo "Building..."
npm run build && pm2 restart buildany
