#!/usr/bin/env python3
"""Check Hermes config and skill loading"""
import subprocess, json

# Check Hermes config inside container
print("="*60)
print("🔍 HERMES CONFIG (inside container)")
print("="*60)
r = subprocess.run([
    "docker", "exec", "hermes-gateway", "cat", "/opt/data/.hermes/config.yaml"
], capture_output=True, text=True)
if r.returncode == 0:
    print(r.stdout)
else:
    print("Config not at /opt/data/.hermes/config.yaml")
    # Try other locations
    r2 = subprocess.run([
        "docker", "exec", "hermes-gateway", "find", "/opt/data", "-name", "config.yaml"
    ], capture_output=True, text=True)
    print(f"Found: {r2.stdout.strip() or 'None'}")

# Check skills dir inside container
print("\n" + "="*60)
print("🔍 SKILLS INSIDE CONTAINER")
print("="*60)
r = subprocess.run([
    "docker", "exec", "hermes-gateway", "ls", "-la", "/opt/data/skills/"
], capture_output=True, text=True)
print(r.stdout if r.returncode == 0 else f"Error: {r.stderr}")

# Check hermes env inside container
print("\n" + "="*60)
print("🔍 HERMES ENV")
print("="*60)
r = subprocess.run([
    "docker", "exec", "hermes-gateway", "cat", "/opt/data/.env"
], capture_output=True, text=True)
print(r.stdout[:1000] if r.returncode == 0 else f"Error: {r.stderr}")
