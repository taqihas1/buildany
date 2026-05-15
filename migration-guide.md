# Migration Guide: Recreating Proposal/RFP Skills on a New Server

## Target Skills
- `proposal-craft` — Outbound proposal generator
- `rfp-respond` — Inbound RFP response generator  
- `proposal-kb` — Reusable content knowledge base

---

## Option 1: Copy the Packaged .skill Files (FASTEST — Recommended)

### Step 1: Package from Current Server

On your **current** server:

```bash
# Navigate to skills directory
cd ~/.openclaw/skills

# Verify the .skill files exist
ls -la *.skill

# If they don't exist, package them
python3 /usr/lib/node_modules/openclaw/skills/skill-creator/scripts/package_skill.py \
  proposal-craft ~/.openclaw/skills

python3 /usr/lib/node_modules/openclaw/skills/skill-creator/scripts/package_skill.py \
  rfp-respond ~/.openclaw/skills

python3 /usr/lib/node_modules/openclaw/skills/skill-creator/scripts/package_skill.py \
  proposal-kb ~/.openclaw/skills

# Copy to a transfer location
cp proposal-craft.skill /tmp/
cp rfp-respond.skill /tmp/
cp proposal-kb.skill /tmp/
```

### Step 2: Transfer to New Server

```bash
# Option A: SCP
scp /tmp/proposal-craft.skill user@new-server:/tmp/
scp /tmp/rfp-respond.skill user@new-server:/tmp/
scp /tmp/proposal-kb.skill user@new-server:/tmp/

# Option B: Download from chat (I can send you a zip)
# Option C: Copy via shared volume / USB / etc.
```

### Step 3: Install on New Server

On the **new** server:

```bash
# 1. Ensure OpenClaw is installed
openclaw --version

# 2. Ensure Python 3 is available
python3 --version

# 3. Create skills directory if needed
mkdir -p ~/.openclaw/skills

# 4. Copy .skill files to skills directory
cp /tmp/proposal-craft.skill ~/.openclaw/skills/
cp /tmp/rfp-respond.skill ~/.openclaw/skills/
cp /tmp/proposal-kb.skill ~/.openclaw/skills/

# 5. Extract .skill files (they are ZIP archives)
cd ~/.openclaw/skills
unzip -o proposal-craft.skill
unzip -o rfp-respond.skill
unzip -o proposal-kb.skill

# 6. Verify structure
ls -la proposal-craft/
ls -la rfp-respond/
ls -la proposal-kb/
```

### Step 4: Restart OpenClaw

```bash
# Restart OpenClaw to pick up new skills
openclaw gateway restart

# Or if using systemd
sudo systemctl restart openclaw
```

### Step 5: Verify

```bash
# Check skills are recognized
openclaw skills list

# Or test by looking for the skill directories
ls ~/.openclaw/skills/proposal-craft/SKILL.md
ls ~/.openclaw/skills/rfp-respond/SKILL.md
ls ~/.openclaw/skills/proposal-kb/SKILL.md
```

---

## Option 2: Manual Rebuild from Source (If .skill Files Not Available)

### Step 1: Install OpenClaw Skill Creator

```bash
# The skill-creator skill should be included with OpenClaw
# Check if available
ls /usr/lib/node_modules/openclaw/skills/skill-creator/scripts/

# If not, install OpenClaw first
curl -sSL https://install.openclaw.ai | bash
```

### Step 2: Initialize Each Skill

```bash
# Initialize the 3 skills
python3 /usr/lib/node_modules/openclaw/skills/skill-creator/scripts/init_skill.py \
  proposal-craft --path ~/.openclaw/skills --resources scripts,references,assets

python3 /usr/lib/node_modules/openclaw/skills/skill-creator/scripts/init_skill.py \
  rfp-respond --path ~/.openclaw/skills --resources scripts,references,assets

python3 /usr/lib/node_modules/openclaw/skills/skill-creator/scripts/init_skill.py \
  proposal-kb --path ~/.openclaw/skills --resources scripts,references,assets
```

### Step 3: Copy Content from Source

You need to manually recreate these files from the original server:

**proposal-craft:**
```
~/.openclaw/skills/proposal-craft/SKILL.md
~/.openclaw/skills/proposal-craft/assets/proposal-template.md
~/.openclaw/skills/proposal-craft/scripts/generator.py
~/.openclaw/skills/proposal-craft/references/sample-intake.json
~/.openclaw/skills/proposal-craft/references/intake-form.html
```

**rfp-respond:**
```
~/.openclaw/skills/rfp-respond/SKILL.md
~/.openclaw/skills/rfp-respond/assets/rfp-response-template.md
~/.openclaw/skills/rfp-respond/scripts/generator.py
~/.openclaw/skills/rfp-respond/references/rfp-master-template.md
~/.openclaw/skills/rfp-respond/references/sample-intake.json
```

**proposal-kb:**
```
~/.openclaw/skills/proposal-kb/SKILL.md
~/.openclaw/skills/proposal-kb/assets/kb.json
~/.openclaw/skills/proposal-kb/scripts/query_kb.py
~/.openclaw/skills/proposal-kb/scripts/update_kb.py
~/.openclaw/skills/proposal-kb/references/kb-schema.md
```

### Step 4: Copy Files

```bash
# From old server — create a tarball of just these files
cd ~/.openclaw/skills
tar czvf /tmp/proposal-skills-source.tar.gz \
  proposal-craft/SKILL.md \
  proposal-craft/assets/ \
  proposal-craft/scripts/ \
  proposal-craft/references/ \
  rfp-respond/SKILL.md \
  rfp-respond/assets/ \
  rfp-respond/scripts/ \
  rfp-respond/references/ \
  proposal-kb/SKILL.md \
  proposal-kb/assets/ \
  proposal-kb/scripts/ \
  proposal-kb/references/

# Transfer to new server
scp /tmp/proposal-skills-source.tar.gz user@new-server:/tmp/

# On new server — extract into initialized directories
cd ~/.openclaw/skills
tar xzvf /tmp/proposal-skills-source.tar.gz
```

---

## Option 3: The "Nuclear Option" — Copy Entire Skills Directory

If you want **everything** (all skills, not just these 3):

```bash
# On old server
tar czvf /tmp/all-skills.tar.gz -C ~/.openclaw skills/

# Transfer
scp /tmp/all-skills.tar.gz user@new-server:/tmp/

# On new server
rm -rf ~/.openclaw/skills  # CAREFUL — removes existing skills
tar xzvf /tmp/all-skills.tar.gz -C ~/.openclaw
```

---

## Post-Installation: Essential Customization

### 1. Customize the KB (CRITICAL)

Edit `~/.openclaw/skills/proposal-kb/assets/kb.json`:

```bash
# Replace placeholder content with YOUR company info
nano ~/.openclaw/skills/proposal-kb/assets/kb.json
```

**Must-update sections:**
- `vendor.company_name` → Your company name
- `vendor.description` → Your company story
- `vendor.partnerships` → Your actual partnerships
- `vendor.certifications` → Your actual certs
- `case_studies` → Replace with your real projects (anonymized)
- `pricing.daily_rates` → Your actual rate card
- `team_templates` → Your standard team structures
- `methodology` → Your actual methodologies

### 2. Test the Generator

```bash
# Test KB query
cd ~/.openclaw/skills/proposal-kb
python3 scripts/query_kb.py \
  --kb assets/kb.json \
  --industry manufacturing \
  --project-type cloud_migration \
  --client "Test Client" \
  --output /tmp/test-draft.json

# Test proposal generation
cd ~/.openclaw/skills/proposal-craft
python3 scripts/generator.py \
  --intake /tmp/test-draft.json \
  --template assets/proposal-template.md \
  --output /tmp/test-proposal.md

# Check output
ls -la /tmp/test-proposal.md
head -50 /tmp/test-proposal.md
```

### 3. Fix Permissions

```bash
# Ensure scripts are executable
chmod +x ~/.openclaw/skills/proposal-craft/scripts/generator.py
chmod +x ~/.openclaw/skills/rfp-respond/scripts/generator.py
chmod +x ~/.openclaw/skills/proposal-kb/scripts/query_kb.py
chmod +x ~/.openclaw/skills/proposal-kb/scripts/update_kb.py
```

---

## Prerequisites Checklist (New Server)

| Requirement | Check Command | Expected Result |
|---|---|---|
| OpenClaw installed | `openclaw --version` | Version number |
| Python 3.8+ | `python3 --version` | 3.8 or higher |
| pip available | `pip3 --version` | Version number |
| Skills directory exists | `ls ~/.openclaw/skills` | Directory listing |
| Write permissions | `touch ~/.openclaw/skills/test` | No error |

---

## Quick Verification Script

Save this as `verify-install.sh` on the new server:

```bash
#!/bin/bash
echo "=== Proposal Skills Verification ==="
echo ""

echo "1. Checking OpenClaw..."
openclaw --version || echo "❌ OpenClaw not found"
echo ""

echo "2. Checking Python..."
python3 --version || echo "❌ Python not found"
echo ""

echo "3. Checking skill files..."
for skill in proposal-craft rfp-respond proposal-kb; do
    if [ -f "$HOME/.openclaw/skills/$skill/SKILL.md" ]; then
        echo "✅ $skill: SKILL.md found"
    else
        echo "❌ $skill: SKILL.md MISSING"
    fi
done
echo ""

echo "4. Checking generators..."
for script in \
    "$HOME/.openclaw/skills/proposal-craft/scripts/generator.py" \
    "$HOME/.openclaw/skills/rfp-respond/scripts/generator.py" \
    "$HOME/.openclaw/skills/proposal-kb/scripts/query_kb.py"; do
    if [ -f "$script" ]; then
        echo "✅ $(basename $script) found"
    else
        echo "❌ $(basename $script) MISSING"
    fi
done
echo ""

echo "5. Testing KB query..."
cd "$HOME/.openclaw/skills/proposal-kb"
python3 scripts/query_kb.py \
    --kb assets/kb.json \
    --industry test \
    --project-type cloud_migration \
    --client "Verify" \
    --output /tmp/verify.json 2>/dev/null && echo "✅ KB query works" || echo "❌ KB query failed"
echo ""

echo "=== Verification Complete ==="
```

Run it:
```bash
chmod +x verify-install.sh
./verify-install.sh
```

---

## Troubleshooting

### Problem: "No module named 'json'"
**Fix:** Python standard library issue — reinstall Python 3

### Problem: "Permission denied" on scripts
**Fix:** `chmod +x scripts/*.py`

### Problem: "Template not found"
**Fix:** Verify paths — assets/ and scripts/ should be in the skill directory

### Problem: OpenClaw doesn't recognize skills
**Fix:** Restart gateway — `openclaw gateway restart`

### Problem: Generator outputs empty file
**Fix:** Check that intake JSON has required fields (see SKILL.md for schema)

---

## Summary: Fastest Path

```bash
# OLD SERVER
# 1. Package (if not already done)
# 2. Copy .skill files to /tmp

# NEW SERVER  
# 1. Install OpenClaw + Python
# 2. Copy .skill files to ~/.openclaw/skills/
# 3. cd ~/.openclaw/skills && unzip *.skill
# 4. Customize proposal-kb/assets/kb.json
# 5. Restart OpenClaw
# 6. Test with verify-install.sh
```

**Total time: 15-30 minutes** (mostly KB customization)
