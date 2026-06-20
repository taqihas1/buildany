#!/bin/bash
set -e
echo "Installing Playwright..."
cd /root/buildany
npm install --save-dev @playwright/test
npx playwright install
npx playwright install-deps
echo "Playwright installed!"
