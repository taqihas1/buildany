#!/usr/bin/env python3
import os, re, sys

PROJECT_DIR = f"/data/projects/{sys.argv[1] if len(sys.argv) > 1 else 'a4cda818-cc52-4f16-b62f-2218fc4f684a'}"

if not os.path.exists(PROJECT_DIR):
    print(f"❌ Project not found: {PROJECT_DIR}")
    exit(1)

print(f"🔍 Scanning {PROJECT_DIR}...")

fixed = []
for root, dirs, files in os.walk(os.path.join(PROJECT_DIR, "src")):
    for fname in files:
        if not fname.endswith((".tsx", ".ts", ".jsx", ".js")):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath) as f:
            content = f.read()
        
        if "next/document" not in content:
            continue
        
        if "_document" in fpath:
            continue  # Skip actual _document files
        
        print(f"  🧹 Fixing: {fpath}")
        orig = content
        # Remove imports
        content = re.sub(r'import\s*\{[^}]*Html[^}]*\}\s*from\s*["\']next/document["\'];?\s*\n?', '', content, flags=re.I)
        content = re.sub(r'import\s*\{[^}]*Head[^}]*\}\s*from\s*["\']next/document["\'];?\s*\n?', '', content, flags=re.I)
        content = re.sub(r'import\s*\{[^}]*Main[^}]*\}\s*from\s*["\']next/document["\'];?\s*\n?', '', content, flags=re.I)
        content = re.sub(r'import\s*\{[^}]*NextScript[^}]*\}\s*from\s*["\']next/document["\'];?\s*\n?', '', content, flags=re.I)
        content = re.sub(r'import\s+\w+\s+from\s*["\']next/document["\'];?\s*\n?', '', content, flags=re.I)
        # Replace tags
        content = re.sub(r'<Html([^>]*)>', r'<div\1>', content, flags=re.I)
        content = re.sub(r'</Html>', '</div>', content, flags=re.I)
        content = re.sub(r'<Main([^>]*)>', r'<main\1>', content, flags=re.I)
        content = re.sub(r'</Main>', '</main>', content, flags=re.I)
        content = re.sub(r'<NextScript\s*/?>', '', content, flags=re.I)
        
        if content != orig:
            with open(fpath, "w") as f:
                f.write(content)
            fixed.append(fpath)

if fixed:
    print(f"\n✅ Fixed {len(fixed)} files")
    # Rebuild
    os.chdir(PROJECT_DIR)
    os.system("rm -rf .next out && npm run build")
else:
    print("\n✅ No bad imports found")
