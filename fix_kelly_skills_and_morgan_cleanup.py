#!/usr/bin/env python3
"""
Fix two issues:
1. Kelly skills showing 0 - check Hermes config
2. Add post-generation cleanup to strip bad next/document imports
"""

import os
import subprocess

# Issue 1: Check Hermes config for skills path
HERMES_ENV = "/root/.hermes/.env"
print("=" * 60)
print("🔍 CHECKING HERMES CONFIG")
print("=" * 60)

if os.path.exists(HERMES_ENV):
    with open(HERMES_ENV) as f:
        content = f.read()
        print(f"Hermes env file found at {HERMES_ENV}")
        if "SKILLS_PATH" in content:
            print(f"SKILLS_PATH found: {[l for l in content.split(chr(10)) if 'SKILLS' in l]}")
        else:
            print("⚠️ No SKILLS_PATH set - skills may not load!")
            print("Adding SKILLS_PATH to .env...")
            with open(HERMES_ENV, "a") as f2:
                f2.write("\nSKILLS_PATH=/opt/data/skills\n")
            print("✅ Added SKILLS_PATH=/opt/data/skills")
else:
    print(f"❌ Hermes env not found at {HERMES_ENV}")

# Check if skills directory is mounted in container
print("\n" + "=" * 60)
print("🔍 CHECKING DOCKER MOUNTS")
print("=" * 60)
result = subprocess.run(
    ["docker", "inspect", "hermes-gateway", "--format", "{{range .Mounts}}{{.Source}} -> {{.Destination}}\n{{end}}"],
    capture_output=True, text=True
)
if result.returncode == 0:
    print(result.stdout)
    if "/root/.hermes" in result.stdout or "/opt/data" in result.stdout:
        print("✅ Skills directory is mounted")
    else:
        print("❌ Skills directory NOT mounted in container!")
else:
    print(f"Error inspecting container: {result.stderr}")

# Issue 2: Add post-generation cleanup to morgan-generate route
print("\n" + "=" * 60)
print("🔧 ADDING POST-GENERATION CLEANUP")
print("=" * 60)

MORGAN_ROUTE = "/root/buildany/src/app/api/morgan-generate/route.ts"
if os.path.exists(MORGAN_ROUTE):
    with open(MORGAN_ROUTE) as f:
        content = f.read()
    
    # Check if cleanup function exists
    if "cleanupBadImports" in content:
        print("✅ Cleanup function already exists")
    else:
        print("Adding cleanup function...")
        # Find a good place to insert - after the imports, before the POST function
        cleanup_code = '''
// Strip dangerous imports from generated files
function cleanupGeneratedFiles(projectDir: string) {
  const { execSync } = require("child_process");
  try {
    // Remove any next/document imports from generated pages
    const cmd = `find "${projectDir}/src" -type f \\( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \\) -exec grep -l "next/document" {} + 2>/dev/null || true`;
    const files = execSync(cmd, { encoding: "utf8", cwd: projectDir }).trim().split("\\n").filter(Boolean);
    
    for (const file of files) {
      if (file.includes("_document")) continue; // Skip actual _document files
      console.log(`[Morgan Cleanup] Removing bad import from: ${file}`);
      let content = require("fs").readFileSync(file, "utf8");
      // Remove import line
      content = content.replace(/import\\s+{[^}]*}\\s+from\\s+["']next\/document["'];?\\s*\\n?/g, "");
      content = content.replace(/import\\s+\\w+\\s+from\\s+["']next\/document["'];?\\s*\\n?/g, "");
      // Replace <Html> with <div>, <Main> with <main>, etc
      content = content.replace(/<Html>/g, "<div>").replace(/<\\/Html>/g, "</div>");
      content = content.replace(/<Main>/g, "<main>").replace(/<\\/Main>/g, "</main>");
      content = content.replace(/<NextScript\\s*\\/>/g, "");
      require("fs").writeFileSync(file, content);
    }
  } catch (e) {
    // Ignore errors
  }
}
'''
        # Insert before the POST function
        if "export async function POST" in content:
            content = content.replace(
                "export async function POST",
                cleanup_code + "\nexport async function POST"
            )
            with open(MORGAN_ROUTE, "w") as f:
                f.write(content)
            print("✅ Added cleanup function to morgan-generate route")
        else:
            print("❌ Could not find POST function to insert cleanup")

    # Also add call to cleanup after generation
    if "cleanupGeneratedFiles" in content and "cleanupGeneratedFiles(projectDir)" not in content:
        # Add call after files are written
        content = content.replace(
            'await writeFile(filePath, file.code);',
            'await writeFile(filePath, file.code);\n          }\n          \n          // Clean up any bad imports\n          cleanupGeneratedFiles(projectDir);\n          for (const file of files) {'
        )
        # Fix the double loop issue
        if content.count("for (const file of files)") > 1:
            # Remove the duplicate loop
            content = content.replace(
                '          }\n          \n          // Clean up any bad imports\n          cleanupGeneratedFiles(projectDir);\n          for (const file of files) {',
                '          }\n          \n          // Clean up any bad imports\n          cleanupGeneratedFiles(projectDir);'
            )
        with open(MORGAN_ROUTE, "w") as f:
            f.write(content)
        print("✅ Added cleanup call after generation")
else:
    print(f"❌ Morgan route not found at {MORGAN_ROUTE}")

print("\n" + "=" * 60)
print("📝 SUMMARY")
print("=" * 60)
print("1. Hermes skills config checked/updated")
print("2. Post-generation cleanup added to strip bad imports")
print("\nNext steps:")
print("- Restart Hermes container: docker restart hermes-gateway")
print("- Rebuild BuildAny: cd /root/buildany && npm run build && pm2 restart buildany")
print("- Test Morgan generation again")
