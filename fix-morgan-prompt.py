#!/usr/bin/env python3
"""
Patch for /root/buildany/src/app/api/morgan-generate/route.ts
Apply on VPS: python3 /tmp/fix-morgan-prompt.py

This injects CRITICAL RULES into the DeepSeek generation prompt
to ensure Kelly creates real apps with state, demo data, and vibrant UI.
"""

import re

FILE_PATH = "/root/buildany/src/app/api/morgan-generate/route.ts"

def patch():
    with open(FILE_PATH, "r") as f:
        content = f.read()
    
    original = content
    changes = []
    
    # ========================================================================
    # FIX 1: Inject CRITICAL rules after the hooks rule
    # ========================================================================
    
    # Find the line about hooks and insert after it
    hooks_rule = '- CRITICAL: NEVER call hooks like useState() directly in JSX.'
    
    if hooks_rule in content:
        new_rules = '''- CRITICAL: page.tsx MUST be a FULLY FUNCTIONAL app with useState, useEffect, and 5-10 demo data items hardcoded as arrays.
- CRITICAL: NEVER generate placeholder text like "Welcome to Your App" or "Coming Soon" or "Content goes here".
- CRITICAL: Include INTERACTIVE elements: tabs, filters, search inputs, toggle switches, clickable cards with hover states.
- CRITICAL: Use a VIBRANT color palette with Tailwind — gradients, shadows, rounded corners, NOT just gray/white.
- CRITICAL: Make the UI feel MODERN and COLORFUL. This is a priority.'''
        
        content = content.replace(hooks_rule, hooks_rule + "\n" + new_rules)
        changes.append("✅ Injected 5 CRITICAL rules after hooks rule")
    else:
        changes.append("❌ Could not find hooks rule — file structure may differ")
    
    # ========================================================================
    # FIX 2: Strengthen page.tsx description
    # ========================================================================
    
    old_desc = '1. src/app/page.tsx (main page with ALL components inline)'
    new_desc = '1. src/app/page.tsx (main page with ALL components inline — MUST have useState, demoData array, interactive UI, vibrant Tailwind styling)'
    
    if old_desc in content:
        content = content.replace(old_desc, new_desc)
        changes.append("✅ Strengthened page.tsx description")
    else:
        changes.append("❌ Could not find page.tsx description")
    
    # ========================================================================
    # Write changes
    # ========================================================================
    
    if content != original:
        with open(FILE_PATH, "w") as f:
            f.write(content)
        changes.append(f"\n📝 Wrote changes to: {FILE_PATH}")
    else:
        changes.append(f"\n⚠️ No changes made")
    
    # ========================================================================
    # Report
    # ========================================================================
    
    print("=" * 60)
    print("MORGAN PROMPT PATCH REPORT")
    print("=" * 60)
    for change in changes:
        print(f"  {change}")
    print("=" * 60)
    
    # Quick verification
    with open(FILE_PATH, "r") as f:
        verify = f.read()
    
    print("\n🔍 VERIFICATION:")
    checks = [
        ("useState requirement", "useState" in verify and "demo data" in verify),
        ("No placeholder rule", "Welcome to Your App" in verify or "Coming Soon" in verify),
        ("Vibrant UI rule", "VIBRANT" in verify),
        ("Interactive elements", "tabs, filters" in verify),
    ]
    
    for label, passed in checks:
        status = "✅" if passed else "❌"
        print(f"  {status} {label}")
    
    print("\n🚀 NEXT: Restart the app or test with a new project!")

if __name__ == "__main__":
    patch()
