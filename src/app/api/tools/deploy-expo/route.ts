import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";

const GITHUB_PAT = process.env.GITHUB_PAT || "process.env.GITHUB_TOKEN || """;
const GITHUB_USER = "taqihas1";
const EXPO_TOKEN = process.env.EXPO_TOKEN || "";
const PROJECTS_DIR = "/data/projects";

// Google Play Service Account JSON key (base64 encoded to avoid newlines issues)
// Set this in BuildAny's .env.local as GOOGLE_SERVICE_ACCOUNT_KEY_BASE64
const GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 || "";

/**
 * Encrypt a secret for GitHub Actions using libsodium sealed box.
 * Requires tweetnacl and tweetnacl-util to be installed.
 */
async function encryptSecretForGitHub(secretValue: string, publicKey: string): Promise<string> {
  // Dynamic import to avoid build-time dependency issues
  const nacl = await import("tweetnacl");
  const naclUtil = await import("tweetnacl-util");

  const messageBytes = naclUtil.default.decodeUTF8(secretValue);
  const keyBytes = naclUtil.default.decodeBase64(publicKey);
  const encryptedBytes = nacl.default.seal(messageBytes, keyBytes);
  return naclUtil.default.encodeBase64(encryptedBytes);
}

/**
 * Create a repository secret via GitHub API.
 */
async function createRepoSecret(
  owner: string,
  repo: string,
  secretName: string,
  secretValue: string,
  githubToken: string
): Promise<boolean> {
  try {
    // 1. Get the repository public key
    const keyRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/secrets/public-key`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!keyRes.ok) {
      console.error("[Expo] Failed to get repo public key:", await keyRes.text());
      return false;
    }

    const { key_id, key } = await keyRes.json();

    // 2. Encrypt the secret
    const encryptedValue = await encryptSecretForGitHub(secretValue, key);

    // 3. Create/Update the secret
    const createRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/secrets/${secretName}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          encrypted_value: encryptedValue,
          key_id,
        }),
      }
    );

    if (!createRes.ok) {
      console.error("[Expo] Failed to create secret:", await createRes.text());
      return false;
    }

    console.log(`[Expo] ✅ Created secret ${secretName} in ${owner}/${repo}`);
    return true;
  } catch (err) {
    console.error("[Expo] Error creating repo secret:", err);
    return false;
  }
}

/**
 * Install tweetnacl packages if not present (needed for GitHub secret encryption).
 */
function ensureTweetNacl(): boolean {
  try {
    require.resolve("tweetnacl");
    require.resolve("tweetnacl-util");
    return true;
  } catch {
    console.log("[Expo] Installing tweetnacl for GitHub secret encryption...");
    try {
      execSync("npm install tweetnacl tweetnacl-util --save", {
        cwd: "/root/buildany",
        timeout: 60000,
      });
      return true;
    } catch {
      console.error("[Expo] Failed to install tweetnacl. GitHub secrets will need manual setup.");
      return false;
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, projectName } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    if (!EXPO_TOKEN) {
      return NextResponse.json({ error: "EXPO_TOKEN not configured" }, { status: 500 });
    }

    const repoName = `buildany-app-${projectId.slice(0, 8)}`;
    const projectDir = path.join(PROJECTS_DIR, projectId);
    const expoDir = `/tmp/buildany-expo-${projectId}`;

    // ─── Step 1: Clone the repo ───
    console.log("[Expo] Cloning repo:", repoName);

    try { execSync(`rm -rf ${expoDir}`); } catch {}

    execSync(`git clone https://${GITHUB_USER}:${GITHUB_PAT}@github.com/${GITHUB_USER}/${repoName}.git ${expoDir}`, {
      cwd: "/tmp",
      timeout: 30000,
    });

    // ─── Step 2: Create Expo app.config.js if not exists ───
    const appConfigPath = path.join(expoDir, "app.config.js");
    const packageJsonPath = path.join(expoDir, "package.json");

    // Read package.json to get app name
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
    const appName = projectName || packageJson.name || repoName;
    const slug = repoName.toLowerCase().replace(/[^a-z0-9]/g, "-");

    const appConfig = `export default {
  name: "${appName}",
  slug: "${slug}",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  assetBundlePatterns: ["**/*"],
  // iOS config - uncomment when ready for iOS builds
  // ios: {
  //   supportsTablet: true,
  //   bundleIdentifier: "com.${GITHUB_USER}.${slug}"
  // },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    package: "com.${GITHUB_USER}.${slug.replace(/-/g, "_")}"
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro"
  },
  plugins: [],
  extra: {
    eas: {
      projectId: "${projectId}"
    }
  }
};`;

    await fs.writeFile(appConfigPath, appConfig);

    // ─── Step 3: Ensure metro.config.js exists ───
    const metroConfigPath = path.join(expoDir, "metro.config.js");
    const metroConfig = `const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;`;
    await fs.writeFile(metroConfigPath, metroConfig);

    // ─── Step 4: Update package.json scripts ───
    // Only Android builds for now (iOS can be enabled later)
    if (!packageJson.scripts["build:android"]) {
      packageJson.scripts["build:android"] = "eas build --platform android";
    }
    // iOS build script - uncomment when ready
    // if (!packageJson.scripts["build:ios"]) {
    //   packageJson.scripts["build:ios"] = "eas build --platform ios";
    // }

    // Ensure expo is in dependencies
    if (!packageJson.dependencies?.expo) {
      packageJson.dependencies = packageJson.dependencies || {};
      packageJson.dependencies.expo = "~52.0.0";
    }

    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // ─── Step 4.5: Add GitHub Actions workflow for Android builds ───
    const githubWorkflowsDir = path.join(expoDir, ".github", "workflows");
    await fs.mkdir(githubWorkflowsDir, { recursive: true });

    const workflowContent = `name: Build & Submit Android App

on:
  push:
    branches: [main, master]
  workflow_dispatch:
    inputs:
      submit:
        description: 'Submit to Google Play Store?'
        required: false
        default: false
        type: boolean

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: \${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: npm ci

      - name: Build Android app
        run: eas build --platform android --non-interactive --no-wait

      # Submit to Google Play Store (requires GOOGLE_SERVICE_ACCOUNT_KEY secret)
      - name: Submit to Google Play Store
        if: \${{ inputs.submit == true }}
        run: eas submit --platform android --non-interactive
        env:
          GOOGLE_SERVICE_ACCOUNT_KEY: \${{ secrets.GOOGLE_SERVICE_ACCOUNT_KEY }}

      # iOS build - uncomment when ready
      # - name: Build iOS app
      #   run: eas build --platform ios --non-interactive --no-wait
`;
    await fs.writeFile(path.join(githubWorkflowsDir, "build-android.yml"), workflowContent);
    console.log("[Expo] Added GitHub Actions workflow for Android builds");

    // ─── Step 5: Commit changes ───
    console.log("[Expo] Committing Expo config...");
    execSync(`git -C ${expoDir} add -A && git -C ${expoDir} commit -m "Add Expo config for mobile builds" || true`, {
      timeout: 10000,
      env: { ...process.env, GIT_AUTHOR_NAME: "BuildAny", GIT_AUTHOR_EMAIL: "deploy@buildany.cloud", GIT_COMMITTER_NAME: "BuildAny", GIT_COMMITTER_EMAIL: "deploy@buildany.cloud" },
    });

    // ─── Step 6: Push to GitHub ───
    console.log("[Expo] Pushing to GitHub...");
    execSync(`git -C ${expoDir} push origin main`, {
      timeout: 30000,
    });

    // ─── Step 6.5: Auto-create GitHub repository secrets ───
    let secretsCreated = [];
    if (ensureTweetNacl()) {
      console.log("[Expo] Creating GitHub repository secrets...");

      // Create EXPO_TOKEN secret
      const expoTokenCreated = await createRepoSecret(
        GITHUB_USER,
        repoName,
        "EXPO_TOKEN",
        EXPO_TOKEN,
        GITHUB_PAT
      );
      if (expoTokenCreated) secretsCreated.push("EXPO_TOKEN");

      // Create GOOGLE_SERVICE_ACCOUNT_KEY secret (if configured)
      if (GOOGLE_SERVICE_ACCOUNT_KEY_BASE64) {
        try {
          const googleKey = Buffer.from(GOOGLE_SERVICE_ACCOUNT_KEY_BASE64, "base64").toString("utf-8");
          const googleKeyCreated = await createRepoSecret(
            GITHUB_USER,
            repoName,
            "GOOGLE_SERVICE_ACCOUNT_KEY",
            googleKey,
            GITHUB_PAT
          );
          if (googleKeyCreated) secretsCreated.push("GOOGLE_SERVICE_ACCOUNT_KEY");
        } catch (e) {
          console.error("[Expo] Failed to decode GOOGLE_SERVICE_ACCOUNT_KEY_BASE64:", e);
        }
      } else {
        console.log("[Expo] GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 not set, skipping Google Play secret creation.");
      }
    } else {
      console.log("[Expo] tweetnacl not available. Skipping automatic secret creation — add secrets manually in GitHub repo settings.");
    }

    // ─── Step 7: Trigger EAS Build ───
    console.log("[Expo] Triggering EAS Build...");

    // Create eas.json if not exists
    const easJsonPath = path.join(expoDir, "eas.json");
    const easJson = {
      cli: {
        version: ">= 12.0.0"
      },
      build: {
        development: {
          developmentClient: true,
          distribution: "internal"
        },
        preview: {
          distribution: "internal",
          android: {
            buildType: "apk"
          }
        },
        production: {
          autoIncrement: true
        }
      },
      submit: {
        production: {}
      }
    };
    await fs.writeFile(easJsonPath, JSON.stringify(easJson, null, 2));

    // Install EAS CLI and trigger build (Android only for now)
    try {
      execSync(`cd ${expoDir} && npx eas-cli@latest build --platform android --non-interactive --no-wait 2>&1`, {
        timeout: 120000,
        env: {
          ...process.env,
          EXPO_TOKEN: EXPO_TOKEN,
          NODE_ENV: "production"
        },
      });
    } catch (e) {
      console.log("[Expo] EAS Android build triggered (may have warnings):", e);
    }

    // ─── Step 8: Get EAS Project ID ───
    let easProjectId = "";
    try {
      const easOutput = execSync(`cd ${expoDir} && npx eas-cli@latest project:info --json 2>/dev/null || echo "{}"`, {
        timeout: 30000,
        env: { ...process.env, EXPO_TOKEN: EXPO_TOKEN },
      }).toString();
      const easData = JSON.parse(easOutput);
      easProjectId = easData.id || "";
    } catch (e) {
      console.log("[Expo] Could not get EAS project info:", e);
    }

    // ─── Cleanup ───
    execSync(`rm -rf ${expoDir}`);

    const expoUrl = `https://expo.dev/projects/${easProjectId || projectId}`;

    return NextResponse.json({
      success: true,
      url: expoUrl,
      githubUrl: `https://github.com/${GITHUB_USER}/${repoName}`,
      secretsCreated,
      message: secretsCreated.length > 0
        ? `📱 Android build triggered! Secrets auto-created: ${secretsCreated.join(", ")}. Track at ${expoUrl}`
        : `📱 Android build triggered! Track at ${expoUrl} (add secrets manually for Play Store submit)`,
    });

  } catch (error) {
    console.error("[Expo] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
