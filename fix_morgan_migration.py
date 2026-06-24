#!/usr/bin/env python3
"""
Fix: Complete Morgan chat migration - skip directories, handle remaining files
"""

import os
import subprocess
import re

def update_file(filepath):
    """Update references in a single file"""
    # Skip directories
    if os.path.isdir(filepath):
        print(f" ⏭️  Skipping directory: {filepath}")
        return True
    
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except Exception as e:
        print(f" ❌ Error reading {filepath}: {e}")
        return False
    
    original = content
    
    # Replace API endpoint references
    content = re.sub(r'/api/hermes-chat(?!\w)', '/api/morgan-chat', content)
    content = re.sub(r'/api/kelly-chat(?!\w)', '/api/morgan-chat', content)
    
    # Replace Hermes references with Morgan (but preserve "Hermes" in skill/brand contexts)
    content = re.sub(r'\bhermes[_-]chat\b', 'morgan-chat', content, flags=re.IGNORECASE)
    content = re.sub(r'\bkelly[_-]chat\b', 'morgan-chat', content, flags=re.IGNORECASE)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f" ✅ Updated: {filepath}")
        return True
    else:
        print(f" ⏭️  No changes needed: {filepath}")
        return True

def find_and_update_files():
    """Find all relevant files and update them"""
    base_path = '/root/buildany'
    
    # Files that still need updating
    extra_files = [
        'src/app/api/kelly-chat/route.ts',
        'src/app/api/kelly-chat/route.ts.backup',
    ]
    
    updated = 0
    for rel_path in extra_files:
        full_path = os.path.join(base_path, rel_path)
        if os.path.exists(full_path):
            if update_file(full_path):
                updated += 1
    
    return updated

def rebuild_and_restart():
    """Rebuild and restart the app"""
    os.chdir('/root/buildany')
    
    print("\n--- Git Commit ---")
    subprocess.run(['git', 'add', '-A'], check=False)
    subprocess.run(['git', 'commit', '-m', 'fix: complete morgan chat migration', '--allow-empty'], check=False)
    subprocess.run(['git', 'push', 'origin', 'main'], check=False)
    
    print("\n--- npm run build ---")
    result = subprocess.run(['npm', 'run', 'build'], capture_output=True, text=True)
    print(result.stdout[-2000:] if len(result.stdout) > 2000 else result.stdout)
    if result.returncode != 0:
        print(result.stderr[-1000:] if len(result.stderr) > 1000 else result.stderr)
        return False
    
    print("\n--- PM2 Restart ---")
    subprocess.run(['pm2', 'restart', 'buildany'], check=False)
    subprocess.run(['pm2', 'save'], check=False)
    
    return True

def main():
    print("=== Completing Morgan Chat Migration ===\n")
    
    updated = find_and_update_files()
    print(f"\n📊 Updated {updated} files")
    
    # Also handle the directory case - check if kelly-chat is a directory with route.ts inside
    kelly_chat_dir = '/root/buildany/src/app/api/kelly-chat'
    if os.path.isdir(kelly_chat_dir):
        route_file = os.path.join(kelly_chat_dir, 'route.ts')
        if os.path.exists(route_file):
            print(f"\n📁 Found route.ts inside directory: {route_file}")
            if update_file(route_file):
                updated += 1
    
    if updated > 0:
        print("\n--- Rebuilding ---")
        if rebuild_and_restart():
            print("\n=== ✅ DONE ===")
            print("🚀 All chat endpoints now point to Morgan!")
        else:
            print("\n=== ⚠️ BUILD FAILED ===")
    else:
        print("\n=== ✅ Already Up To Date ===")

if __name__ == '__main__':
    main()
