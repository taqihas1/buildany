#!/bin/bash
# Playwright Installation Script for BuildAny VPS
# Run this on your VPS: bash install-playwright.sh

set -e

echo "🔧 Installing Playwright for BuildAny..."

# 1. Install Playwright as dev dependency
cd /root/buildany
npm install --save-dev @playwright/test

# 2. Install Playwright browsers (Chromium, Firefox, WebKit)
npx playwright install

# 3. Install system dependencies for browsers
npx playwright install-deps

# 4. Verify installation
echo "✅ Playwright installed!"
npx playwright --version

echo ""
echo "📁 Created files:"
echo "  - playwright.config.ts"
echo "  - e2e/example.spec.ts"
echo "  - e2e/project-test.spec.ts"
echo ""
echo "🎭 Run tests with:"
echo "  npx playwright test          # Run all tests"
echo "  npx playwright test --ui     # Run with UI mode"
echo "  npx playwright show-report   # View HTML report"
