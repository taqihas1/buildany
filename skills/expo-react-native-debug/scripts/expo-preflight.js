#!/usr/bin/env node
/**
 * Expo React Native Pre-Flight Diagnostic Script
 * Run before `expo start` to catch common issues
 * Usage: node scripts/expo-preflight.js [project-directory]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectDir = process.argv[2] || process.cwd();
const issues = [];
const fixes = [];

function check(condition, issue, fix) {
  if (!condition) {
    issues.push(issue);
    if (fix) fixes.push(fix);
    console.log(`  ❌ ${issue}`);
  } else {
    console.log(`  ✅ ${issue.split(':')[0]}`);
  }
}

function run(cmd, cwd = projectDir) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    return null;
  }
}

console.log(`\n🔍 Expo Pre-Flight Check: ${projectDir}\n`);

// 1. Check project structure
const pkgPath = path.join(projectDir, 'package.json');
const hasPackage = fs.existsSync(pkgPath);
check(hasPackage, 'package.json exists: No package.json found', 'Ensure you are in the project root');

if (!hasPackage) {
  console.log('\n❌ Cannot proceed without package.json\n');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// 2. Check Expo SDK version
const expoVersion = pkg.dependencies?.expo || 'not installed';
const expoMatch = expoVersion.match(/~(\d+)/);
const sdkVersion = expoMatch ? expoMatch[1] : 'unknown';
console.log(`\n📦 Expo SDK: ${expoVersion}`);

// 3. Check React version alignment
const reactVersion = pkg.dependencies?.react || 'not installed';
const rnVersion = pkg.dependencies?.['react-native'] || 'not installed';
console.log(`⚛️ React: ${reactVersion}`);
console.log(`📱 React Native: ${rnVersion}`);

// Check if react-native-renderer exists and matches
const rnrPath = path.join(projectDir, 'node_modules', 'react-native-renderer', 'package.json');
let rnrVersion = null;
if (fs.existsSync(rnrPath)) {
  const rnrPkg = JSON.parse(fs.readFileSync(rnrPath, 'utf8'));
  rnrVersion = rnrPkg.version;
}

// Check what RN expects for react
const rnPkgPath = path.join(projectDir, 'node_modules', 'react-native', 'package.json');
let rnExpectedReact = null;
if (fs.existsSync(rnPkgPath)) {
  const rnPkg = JSON.parse(fs.readFileSync(rnPkgPath, 'utf8'));
  rnExpectedReact = rnPkg.peerDependencies?.react;
}

// React version checks
const reactInstalled = run(`node -e "console.log(require('react/package.json').version)"`);
const rnrInstalled = fs.existsSync(rnrPath) ? run(`node -e "console.log(require('react-native-renderer/package.json').version)"`) : null;

console.log(`\n🔬 Version Alignment Checks:`);

if (rnExpectedReact && reactInstalled) {
  const expectedMajor = rnExpectedReact.match(/\^?(\d+)/)?.[1];
  const installedMajor = reactInstalled.match(/(\d+)/)?.[1];
  check(
    expectedMajor === installedMajor,
    `React version alignment: RN expects ${rnExpectedReact}, got ${reactInstalled}`,
    `npm install react@${rnExpectedReact.replace('^', '')} --save --legacy-peer-deps`
  );
}

if (rnrInstalled && reactInstalled) {
  const rnrParts = rnrInstalled.split('.');
  const reactParts = reactInstalled.split('.');
  const match = rnrParts[0] === reactParts[0] && rnrParts[1] === reactParts[1];
  check(
    match,
    `react-native-renderer alignment: renderer@${rnrInstalled} vs react@${reactInstalled}`,
    `npm install react@${rnrInstalled} --save --legacy-peer-deps`
  );
}

// 4. Check for port 8081 conflicts
console.log(`\n🔌 Network Checks:`);
const portCheck = run('lsof -i :8081 2>/dev/null || ss -tlnp 2>/dev/null | grep 8081 || echo "FREE"');
check(
  portCheck === 'FREE',
  `Port 8081: Already in use by another process`,
  'pkill -f "expo start" && sleep 2 && rm -rf .expo/'
);

// 5. Check Metro status (if running)
const metroStatus = run('curl -s --max-time 5 http://localhost:8081/status 2>/dev/null || echo "NOT_RUNNING"');
if (metroStatus !== 'NOT_RUNNING' && metroStatus !== null) {
  console.log(`  ℹ️ Metro is running: ${metroStatus}`);
  
  // Check bundle health
  const bundleTail = run('curl -s --max-time 10 "http://localhost:8081/node_modules/expo/AppEntry.bundle?platform=ios&dev=true&hot=false&lazy=true" 2>/dev/null | tail -3');
  if (bundleTail) {
    const healthy = bundleTail.includes('__r(0)') && bundleTail.includes('sourceMappingURL');
    check(
      healthy,
      `Metro bundle: Bundle appears truncated or corrupted`,
      'Kill expo, then npx expo start --clear'
    );
  }
}

// 6. Check ngrok tunnel
const tunnelData = run('curl -s --max-time 5 http://localhost:4040/api/tunnels 2>/dev/null || echo "{}"');
if (tunnelData && tunnelData !== '{}') {
  try {
    const tunnels = JSON.parse(tunnelData);
    const publicUrl = tunnels.tunnels?.[0]?.public_url;
    if (publicUrl) {
      const tunnelHealth = run(`curl -s --max-time 10 -o /dev/null -w "%{http_code}" "${publicUrl}" 2>/dev/null || echo "FAIL"`);
      check(
        tunnelHealth === '200',
        `ngrok tunnel: Tunnel URL returning ${tunnelHealth || 'no response'}`,
        'pkill -f "expo start" && pkill -f ngrok && npx expo start --tunnel --clear'
      );
      if (tunnelHealth === '200') {
        console.log(`  ✅ Tunnel URL: ${publicUrl}`);
      }
    }
  } catch (e) {
    check(false, 'ngrok tunnel: Could not parse tunnel data', 'Restart expo with --tunnel');
  }
}

// 7. Check node_modules integrity
console.log(`\n📁 Project Integrity:`);
const hasNodeModules = fs.existsSync(path.join(projectDir, 'node_modules'));
check(hasNodeModules, 'node_modules exists: No node_modules folder', 'npm install --legacy-peer-deps');

if (hasNodeModules) {
  const expoExists = fs.existsSync(path.join(projectDir, 'node_modules', 'expo'));
  const rnExists = fs.existsSync(path.join(projectDir, 'node_modules', 'react-native'));
  check(expoExists, 'expo package installed: expo not found in node_modules', 'npm install expo --save --legacy-peer-deps');
  check(rnExists, 'react-native package installed: react-native not found in node_modules', 'npm install react-native --save --legacy-peer-deps');
}

// 8. Summary
console.log(`\n${'='.repeat(50)}`);
if (issues.length === 0) {
  console.log(`🎉 All checks passed! Ready to run: npx expo start --tunnel`);
} else {
  console.log(`⚠️  Found ${issues.length} issue(s):`);
  issues.forEach((issue, i) => {
    console.log(`   ${i + 1}. ${issue}`);
  });
  console.log(`\n🔧 Recommended fixes (in order):`);
  fixes.forEach((fix, i) => {
    console.log(`   ${i + 1}. ${fix}`);
  });
  console.log(`\n📝 Quick recovery command:`);
  console.log(`   pkill -f "expo start" && rm -rf .expo/ && npx expo start --tunnel --clear`);
}
console.log(`${'='.repeat(50)}\n`);
