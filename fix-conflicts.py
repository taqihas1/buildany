#!/usr/bin/env python3
import re, os, sys

files = [
    "src/components/AIChatPanel.tsx",
    "src/lib/orchestrator.ts",
    "src/app/api/hermes-chat/route.ts",
    "src/app/api/memory/route.ts",
    "src/middleware.ts",
    "src/components/ProjectWorkspace.tsx",
    "src/hooks/useHermesChat.ts",
    "src/lib/memory-client.ts",
]

cd = "/root/buildany"
os.chdir(cd)

for f in files:
    if not os.path.exists(f):
        print(f"❌ {f} - not found")
        continue
    with open(f, 'r') as fh:
        content = fh.read()
    
    # Pattern: 
    # <<<<<<< HEAD
    # (keep this)
    # =======
    # (discard this)
    # >>>>>>> <hash>
    new_content = re.sub(
        r'<<<<<<< HEAD\n(.*?)=======\n.*?>>>>>>> \w+\n',
        r'\1',
        content,
        flags=re.DOTALL
    )
    
    # Also handle variant without trailing newline on hash
    new_content = re.sub(
        r'<<<<<<< HEAD\n(.*?)=======\n.*?>>>>>>> \w+',
        r'\1',
        new_content,
        flags=re.DOTALL
    )
    
    if new_content != content:
        with open(f, 'w') as fh:
            fh.write(new_content)
        remaining = new_content.count('<<<<<<<') + new_content.count('=======') + new_content.count('>>>>>>>')
        print(f"✅ {f} - fixed (remaining markers: {remaining})")
    else:
        remaining = content.count('<<<<<<<') + content.count('=======') + content.count('>>>>>>>')
        if remaining:
            print(f"⚠️  {f} - still has {remaining} markers (complex conflict)")
        else:
            print(f"✅ {f} - clean")

# Final check
print("\n=== FINAL CHECK ===")
for f in files:
    if os.path.exists(f):
        with open(f) as fh:
            c = fh.read()
        r = c.count('<<<<<<<') + c.count('=======') + c.count('>>>>>>>')
        if r:
            print(f"❌ {f}: {r} markers remain")
        else:
            print(f"✅ {f}: clean")
