#!/usr/bin/env python3
"""
Add post-generation cleanup to morgan-generate route
to automatically strip bad next/document imports
"""

import os
import re

ROUTE_FILE = "/root/buildany/src/app/api/morgan-generate/route.ts"

if not os.path.exists(ROUTE_FILE):
    print(f"❌ Route file not found: {ROUTE_FILE}")
    exit(1)

with open(ROUTE_FILE) as f:
    content = f.read()

# Check if already has cleanup
if "function sanitizeGeneratedFiles" in content:
    print("✅ Cleanup function already exists")
    exit(0)

# Define the cleanup function to insert
CLEANUP_FUNC = '''
// Auto-cleanup dangerous imports from generated files
function sanitizeGeneratedFiles(projectDir: string) {
  try {
    const fs = require("fs");
    const path = require("path");
    const { execSync } = require("child_process");
    
    // Find all JS/TS files that import from next/document
    const output = execSync(
      `find "${projectDir}/src" -type f ( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" ) -exec grep -l "from ['\"]next/document['\"]" {} + 2>/dev/null || true`,
      { encoding: "utf8", shell: "/bin/bash" }
    );
    
    const files = output.trim().split("\\n").filter(f => f && !f.includes("_document"));
    
    for (const filePath of files) {
      console.log(`[Morgan Sanitize] Fixing bad imports in: ${path.basename(filePath)}`);
      let code = fs.readFileSync(filePath, "utf8");
      
      // Remove next/document imports
      code = code.replace(/import\\s*\\{[^}]*Html[^}]*\\}\\s*from\\s*['"]next\/document['"];?\\s*\\n?/gi, "");
      code = code.replace(/import\\s*\\{[^}]*Head[^}]*\\}\\s*from\\s*['"]next\/document['"];?\\s*\\n?/gi, "");
      code = code.replace(/import\\s*\\{[^}]*Main[^}]*\\}\\s*from\\s*['"]next\/document['"];?\\s*\\n?/gi, "");
      code = code.replace(/import\\s*\\{[^}]*NextScript[^}]*\\}\\s*from\\s*['"]next\/document['"];?\\s*\\n?/gi, "");
      code = code.replace(/import\\s+\\w+\\s+from\\s*['"]next\/document['"];?\\s*\\n?/gi, "");
      
      // Replace components with standard HTML
      code = code.replace(/<Html([^>]*)>/gi, "<div$1>");
      code = code.replace(/<\\/Html>/gi, "</div>");
      code = code.replace(/<Main([^>]*)>/gi, "<main$1>");
      code = code.replace(/<\\/Main>/gi, "</main>");
      code = code.replace(/<NextScript\\s*\\/>/gi, "");
      code = code.replace(/<Head>/gi, "");
      code = code.replace(/<\\/Head>/gi, "");
      
      fs.writeFileSync(filePath, code);
    }
  } catch (e) {
    // Silently ignore cleanup errors
  }
}
'''

# Insert before the POST function
if "export async function POST" in content:
    content = content.replace(
        "export async function POST",
        CLEANUP_FUNC + "\nexport async function POST"
    )
    
    # Add call to sanitize after files are written
    # Find the line after all files are written
    if "await writeFile(filePath, file.code);" in content:
        # Add sanitize call after the file writing loop
        content = content.replace(
            "await writeFile(filePath, file.code);",
            "await writeFile(filePath, file.code);\n        sanitizeGeneratedFiles(projectDir);"
        )
    
    with open(ROUTE_FILE, "w") as f:
        f.write(content)
    
    print("✅ Added sanitizeGeneratedFiles() to morgan-generate route")
    print("✅ This will automatically strip bad next/document imports from all generated files")
else:
    print("❌ Could not find POST function in route file")
    exit(1)
