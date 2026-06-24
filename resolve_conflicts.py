#!/usr/bin/env python3
import subprocess, os, re

def run(cmd, cwd="/root/buildany"):
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    return result.stdout.strip(), result.stderr.strip(), result.returncode

# Check which files have conflicts
stdout, _, _ = run("git diff --name-only --diff-filter=U")
conflicted = stdout.split('\n') if stdout else []

print(f"Conflicted files: {conflicted}")

for f in conflicted:
    if not f:
        continue
    fpath = f"/root/buildany/{f}"
    print(f"\n=== {f} ===")
    
    # Read file and show conflict markers
    with open(fpath) as fh:
        content = fh.read()
    
    # Find conflict sections
    conflicts = re.findall(r'<<<<<<<.*?=======(.*?)>>>>>>>.*?\n', content, re.DOTALL)
    print(f"  Found {len(conflicts)} conflict section(s)")
    
    # Strategy: For each conflict, take the NEW version (from origin/main)
    # This is: everything between ======= and >>>>>>>
    
    resolved = re.sub(
        r'<<<<<<<.*?\n(.*?)=======(.*?)>>>>>>>.*?\n',
        r'\2',  # Take the "theirs" (new code from origin/main)
        content,
        flags=re.DOTALL
    )
    
    # Also clean up any remaining conflict markers
    resolved = re.sub(r'<<<<<<<.*?\n', '', resolved)
    resolved = re.sub(r'=======(.*?)>>>>>>>.*?\n', r'\1', resolved, flags=re.DOTALL)
    resolved = re.sub(r'>>>>>>>.*?\n', '', resolved)
    
    with open(fpath, 'w') as fh:
        fh.write(resolved)
    
    run(f"git add {f}")
    print(f"  ✅ Resolved: {f}")

# Commit the merge
run('git commit -m "Merge: resolved conflicts with new chat-first flow"')

# Check if stash has anything to pop
stdout, _, _ = run("git stash list")
if stdout:
    print(f"\nStash found: {stdout}")
    print("⚠️  Your local changes are stashed. Run 'git stash pop' AFTER confirming build works.")

print("\n✅ All conflicts resolved! Now building...")
