# START FROM SCRATCH — Complete Fresh Installation Guide
## Proposal & RFP Document System: Zero to Hero

**Scenario:** Brand new server. Nothing installed. Starting completely fresh.
**Goal:** Working proposal/RFP system in 30 minutes.

---

## STEP 0: What You're Building

```
FINAL SYSTEM ARCHITECTURE

┌─────────────────────────────────────────────────────────────┐
│  OpenClaw (AI Agent Framework)                              │
│  ├─ proposal-kb skill (knowledge base)                      │
│  ├─ proposal-craft skill (outbound proposals)             │
│  ├─ rfp-respond skill (inbound RFP responses)             │
│  └─ rfp-issue skill (RFP issuance)                        │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Python 3.8+ (Script Engine)                               │
│  ├─ query_kb.py (fetch relevant content)                  │
│  ├─ update_kb.py (maintain knowledge base)                │
│  ├─ generator.py (proposal-craft)                         │
│  └─ generator.py (rfp-respond)                            │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  JSON Data Files                                           │
│  ├─ kb.json (company profile, case studies, pricing)      │
│  └─ intake.json (client-specific project data)              │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Markdown Templates                                        │
│  ├─ proposal-template.md (outbound pitch)                 │
│  ├─ rfp-response-template.md (bid response)               │
│  └─ rfp-template.md (procurement document)                │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  OUTPUT: Professional Documents                            │
│  └─ proposal.md / rfp-response.md / rfp.md                │
└─────────────────────────────────────────────────────────────┘
```

**Tech stack:** OpenClaw + Python 3 + JSON + Markdown  
**No LLM required. No GPU. No API keys. No cloud. Works offline.**

---

## STEP 1: Prepare Your Server

### 1.1 Check Your Environment

```bash
# Run these commands to see what you have
whoami                           # Should show your username
pwd                              # Current directory
python3 --version               # Check Python (need 3.8+)
```

**If Python is missing:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-pip -y

# CentOS/RHEL/Fedora
sudo dnf install python3 python3-pip -y

# macOS
brew install python3
```

### 1.2 Create Your Working Directory

```bash
# Create a home for everything
mkdir -p ~/workspace
cd ~/workspace

# You'll use this folder for:
# - Downloading the skill files
# - Testing
# - Storing generated proposals
```

---

## STEP 2: Install OpenClaw

### 2.1 Install the OpenClaw Framework

```bash
# Option A: Official installer
curl -sSL https://install.openclaw.ai | bash

# Option B: If you have it in a package
# Follow your organization's OpenClaw installation procedure
```

### 2.2 Verify Installation

```bash
# Check OpenClaw is working
openclaw --version

# Expected output: something like "OpenClaw v0.9.1"

# Check the skills directory exists
ls ~/.openclaw/skills/

# If the directory doesn't exist, create it:
mkdir -p ~/.openclaw/skills
```

---

## STEP 3: Get the Skill Files

### 3.1 Download the Complete Toolkit

```bash
# Download from the chat (I sent you complete-toolkit-with-docs.tar.gz)
# OR download directly:
cd ~/workspace
wget [URL_FROM_CHAT] -O complete-toolkit-with-docs.tar.gz

# Extract it
tar xzvf complete-toolkit-with-docs.tar.gz

# You should now see:
ls -la
# complete-rfp-suite-v2.zip
# business-case-*.md
# migration-guide.md
```

### 3.2 Extract the Skills

```bash
# Create a temporary directory for extraction
mkdir -p /tmp/skills-setup
cd /tmp/skills-setup

# Copy the skill zip
cp ~/workspace/complete-rfp-suite-v2.zip .

# Extract
unzip complete-rfp-suite-v2.zip

# You should see 4 directories:
ls -la
# proposal-craft/
# rfp-respond/
# rfp-issue/
# proposal-kb/
```

---

## STEP 4: Install the Skills

### 4.1 Copy Skills to OpenClaw Directory

```bash
# Copy all 4 skills to the OpenClaw skills folder
cp -r /tmp/skills-setup/proposal-craft ~/.openclaw/skills/
cp -r /tmp/skills-setup/rfp-respond ~/.openclaw/skills/
cp -r /tmp/skills-setup/rfp-issue ~/.openclaw/skills/
cp -r /tmp/skills-setup/proposal-kb ~/.openclaw/skills/

# Verify they're in place
ls -la ~/.openclaw/skills/
```

### 4.2 Verify Skill Structure

```bash
# Check each skill has the required files
echo "=== proposal-craft ==="
ls ~/.openclaw/skills/proposal-craft/
echo ""
echo "=== rfp-respond ==="
ls ~/.openclaw/skills/rfp-respond/
echo ""
echo "=== proposal-kb ==="
ls ~/.openclaw/skills/proposal-kb/
```

**Expected structure for each skill:**
```
SKILL.md              ← Skill definition & documentation
assets/               ← Templates and data files
scripts/              ← Python generator scripts
references/           ← Sample files and schemas
```

---

## STEP 5: Configure the Knowledge Base (THE MOST IMPORTANT STEP)

### 5.1 Open the KB File

```bash
# Edit the knowledge base with YOUR company information
nano ~/.openclaw/skills/proposal-kb/assets/kb.json
```

### 5.2 What You MUST Change

**Minimum viable customization — these fields MUST be updated:**

```json
{
  "vendor": {
    "company_name": "YOUR COMPANY NAME HERE",
    "description": "One paragraph about YOUR company",
    "founded_year": 2010,
    "headquarters": "YOUR CITY, COUNTRY",
    "employees": 50,
    "website": "https://yourcompany.com",
    "partnerships": [
      "Microsoft Gold Partner",
      "AWS Advanced Consulting Partner"
    ],
    "certifications": [
      "ISO 27001",
      "SOC 2 Type II"
    ]
  },
  "pricing": {
    "currency": "USD",
    "daily_rates": {
      "engagement_manager": 1800,
      "solution_architect": 1600,
      "senior_consultant": 1400,
      "consultant": 1100,
      "analyst": 800
    }
  }
}
```

### 5.3 Replace Sample Case Studies

Find this section in `kb.json`:
```json
"case_studies": [
  {
    "title": "ACME Corp Cloud Migration",
    ...
  }
]
```

**Replace with your REAL projects:**

```json
"case_studies": [
  {
    "title": "[CLIENT] ERP Modernization",
    "industry": "manufacturing",
    "project_type": "erp_implementation",
    "duration_weeks": 32,
    "team_size": 12,
    "value": 850000,
    "currency": "USD",
    "description": "Brief description of what YOU did",
    "outcomes": [
      "Reduced month-end close from 15 days to 3 days",
      "Eliminated 3 redundant systems",
      "Improved inventory accuracy to 99.2%"
    ],
    "technologies": ["SAP S/4HANA", "Azure", "Power BI"],
    "anonymized_client": "Global manufacturer with $2B revenue"
  }
]
```

**Tips:**
- Keep 3-5 strong case studies (one per industry you serve)
- Anonymize client names but keep metrics real
- Include dollar values, team sizes, durations
- Focus on outcomes, not activities

### 5.4 Save and Exit

In nano: `Ctrl+O` (save), `Enter`, `Ctrl+X` (exit)

---

## STEP 6: First Test Run

### 6.1 Test the Knowledge Base Query

```bash
# Navigate to the KB skill
cd ~/.openclaw/skills/proposal-kb

# Run a test query
python3 scripts/query_kb.py \
  --kb assets/kb.json \
  --industry manufacturing \
  --project-type cloud_migration \
  --client "Test Industries" \
  --output /tmp/my-first-draft.json

# Check if it worked
ls -la /tmp/my-first-draft.json
cat /tmp/my-first-draft.json | head -50
```

**Expected:** A JSON file with your company info, relevant case studies, team template, and pricing estimate.

### 6.2 Test the Proposal Generator

```bash
# Navigate to proposal-craft
cd ~/.openclaw/skills/proposal-craft

# Generate a test proposal
python3 scripts/generator.py \
  --intake /tmp/my-first-draft.json \
  --template assets/proposal-template.md \
  --output /tmp/my-first-proposal.md

# Check the output
ls -la /tmp/my-first-proposal.md
wc -l /tmp/my-first-proposal.md  # Should be 200+ lines
```

### 6.3 View Your First Proposal

```bash
# Look at the first 100 lines
cat /tmp/my-first-proposal.md | head -100
```

**You should see:**
- Your company name (not placeholder)
- Your case studies (not sample ones)
- Auto-calculated pricing
- Professional formatting

---

## STEP 7: Restart OpenClaw (Load Skills)

```bash
# Restart to pick up the new skills
openclaw gateway restart

# Or if using systemd:
sudo systemctl restart openclaw

# Check status
openclaw gateway status
```

---

## STEP 8: Verify Everything Works

### 8.1 Run the Verification Script

Create this file: `/tmp/verify.sh`

```bash
#!/bin/bash
set -e

echo "=========================================="
echo "PROPOSAL SYSTEM VERIFICATION"
echo "=========================================="
echo ""

# Check 1: Python
echo "✓ Check 1: Python"
python3 --version || exit 1
echo ""

# Check 2: Skills exist
echo "✓ Check 2: Skill directories"
for skill in proposal-craft rfp-respond proposal-kb rfp-issue; do
    if [ -d "$HOME/.openclaw/skills/$skill" ]; then
        echo "  ✓ $skill found"
    else
        echo "  ✗ $skill MISSING"
        exit 1
    fi
done
echo ""

# Check 3: Key files exist
echo "✓ Check 3: Key files"
for file in \
    "$HOME/.openclaw/skills/proposal-craft/scripts/generator.py" \
    "$HOME/.openclaw/skills/rfp-respond/scripts/generator.py" \
    "$HOME/.openclaw/skills/proposal-kb/scripts/query_kb.py" \
    "$HOME/.openclaw/skills/proposal-kb/assets/kb.json"; do
    if [ -f "$file" ]; then
        echo "  ✓ $(basename $file)"
    else
        echo "  ✗ $(basename $file) MISSING"
        exit 1
    fi
done
echo ""

# Check 4: KB query works
echo "✓ Check 4: KB query"
cd "$HOME/.openclaw/skills/proposal-kb"
python3 scripts/query_kb.py \
    --kb assets/kb.json \
    --industry test \
    --project-type cloud_migration \
    --client "Verify" \
    --output /tmp/verify-output.json 2>/dev/null && echo "  ✓ Query successful" || {
        echo "  ✗ Query FAILED"
        exit 1
    }
echo ""

# Check 5: Proposal generation works
echo "✓ Check 5: Proposal generation"
cd "$HOME/.openclaw/skills/proposal-craft"
python3 scripts/generator.py \
    --intake /tmp/verify-output.json \
    --template assets/proposal-template.md \
    --output /tmp/verify-proposal.md 2>/dev/null && echo "  ✓ Generation successful" || {
        echo "  ✗ Generation FAILED"
        exit 1
    }
echo ""

# Check 6: Output is valid
echo "✓ Check 6: Output validation"
if [ -s /tmp/verify-proposal.md ]; then
    lines=$(wc -l < /tmp/verify-proposal.md)
    echo "  ✓ Proposal generated: $lines lines"
else
    echo "  ✗ Output is empty"
    exit 1
fi
echo ""

echo "=========================================="
echo "ALL CHECKS PASSED ✓"
echo "=========================================="
echo ""
echo "Your system is ready!"
echo ""
echo "Next steps:"
echo "  1. Customize kb.json with your real company data"
echo "  2. Test with a real client scenario"
echo "  3. Review the generated proposal"
```

Run it:
```bash
chmod +x /tmp/verify.sh
/tmp/verify.sh
```

**Expected output:**
```
==========================================
ALL CHECKS PASSED ✓
==========================================

Your system is ready!

Next steps:
  1. Customize kb.json with your real company data
  2. Test with a real client scenario
  3. Review the generated proposal
```

---

## STEP 9: First Real Use

### 9.1 Create a Real Intake

```bash
# Copy the draft and customize
cp /tmp/my-first-draft.json ~/workspace/my-real-client.json

# Edit with your real client info
nano ~/workspace/my-real-client.json
```

**Edit these fields:**
- `client.name` → Real client name
- `client.industry` → Their industry
- `needs.challenges` → What problems they face
- `solution.overview` → Your proposed solution
- `pricing.professional_services` → Your quote

### 9.2 Generate the Real Proposal

```bash
cd ~/.openclaw/skills/proposal-craft

python3 scripts/generator.py \
  --intake ~/workspace/my-real-client.json \
  --template assets/proposal-template.md \
  --output ~/workspace/proposal-for-[CLIENT].md
```

### 9.3 Convert and Send

```bash
# Option A: Copy to Word for formatting
cp ~/workspace/proposal-for-[CLIENT].md ~/workspace/proposal-for-[CLIENT]-to-word.md
# Open in Word, apply your company template

# Option B: Convert to PDF (if you have pandoc)
pandoc ~/workspace/proposal-for-[CLIENT].md \
  -o ~/workspace/proposal-for-[CLIENT].pdf \
  --from markdown --to pdf

# Option C: Send as-is (Markdown is readable)
```

---

## TROUBLESHOOTING: First-Time Setup

### Problem: "python3: command not found"
**Fix:** Install Python 3 (see STEP 1.1)

### Problem: "No such file or directory: ~/.openclaw/skills"
**Fix:** Create it: `mkdir -p ~/.openclaw/skills`

### Problem: "Permission denied" on scripts
**Fix:** `chmod +x ~/.openclaw/skills/*/scripts/*.py`

### Problem: "Template not found"
**Fix:** Check paths — template should be in `assets/` not `references/`

### Problem: "KeyError: 'company_name'"
**Fix:** Your `kb.json` is incomplete. Check for missing required fields.

### Problem: Output file is empty
**Fix:** Check that `intake.json` has all required fields (see `references/sample-intake.json`)

### Problem: "ModuleNotFoundError: No module named 'json'"
**Fix:** Python standard library issue — reinstall Python 3

### Problem: OpenClaw doesn't recognize the skills
**Fix:** `openclaw gateway restart` and check `~/.openclaw/skills/` is the correct path

---

## WORKFLOW CHEAT SHEET (After Setup)

### For Proactive Proposals:
```bash
# 1. Query KB
cd ~/.openclaw/skills/proposal-kb
python3 scripts/query_kb.py --kb assets/kb.json \
  --industry [INDUSTRY] --project-type [TYPE] \
  --client "[CLIENT]" --output /tmp/draft.json

# 2. Customize draft
nano /tmp/draft.json

# 3. Generate proposal
cd ~/.openclaw/skills/proposal-craft
python3 scripts/generator.py --intake /tmp/draft.json \
  --template assets/proposal-template.md --output proposal.md
```

### For RFP Responses:
```bash
# 1. Extract RFP requirements (manual or with pandoc)
# 2. Build intake.json (copy from references/sample-intake.json)
# 3. Generate response
cd ~/.openclaw/skills/rfp-respond
python3 scripts/generator.py --intake rfp-intake.json \
  --template assets/rfp-response-template.md --output response.md \
  --mode rfp_response
```

### For KB Maintenance:
```bash
# Add new case study
cd ~/.openclaw/skills/proposal-kb
python3 scripts/update_kb.py --add-case-study new-case.json --kb assets/kb.json

# Add win/loss record
python3 scripts/update_kb.py --add-win-loss winloss.json --kb assets/kb.json

# Update pricing
python3 scripts/update_kb.py --update-pricing updated-rates.json --kb assets/kb.json
```

---

## MAINTENANCE: Keeping the System Fresh

| When | Action | Command |
|---|---|---|
| After every win | Add case study | `update_kb.py --add-case-study` |
| After every loss | Log win/loss | `update_kb.py --add-win-loss` |
| Quarterly | Review differentiators | Edit `kb.json` directly |
| Rate change | Update pricing | `update_kb.py --update-pricing` |
| New hire | Update team template | Edit `kb.json` directly |
| New certification | Update vendor profile | Edit `kb.json` directly |

---

## QUICK REFERENCE: File Locations

| File | Path | Purpose |
|---|---|---|
| **KB data** | `~/.openclaw/skills/proposal-kb/assets/kb.json` | All reusable content |
| **Proposal template** | `~/.openclaw/skills/proposal-craft/assets/proposal-template.md` | Outbound document |
| **RFP response template** | `~/.openclaw/skills/rfp-respond/assets/rfp-response-template.md` | Bid document |
| **Sample intakes** | `~/.openclaw/skills/*/references/` | Examples to copy |
| **Generated docs** | `~/workspace/` or `/tmp/` | Your outputs |

---

## SUMMARY: Your First 30 Minutes

| Minute | Action | Result |
|---|---|---|
| 0-5 | Check Python, create workspace | Environment ready |
| 5-10 | Install OpenClaw, create skills dir | Framework ready |
| 10-15 | Download & extract skills | 4 skills installed |
| 15-25 | Customize kb.json (YOUR company data) | Content personalized |
| 25-30 | Test query + generate proposal | System verified |

**At minute 30:** You have a working system generating proposals with YOUR company data.

---

## NEXT: Beyond the Basics

After you're comfortable with the basics:

1. **RFP Response Skill** — Try responding to a real RFP (use `rfp-respond`)
2. **RFP Issue Skill** — Help a client create an RFP (use `rfp-issue`)
3. **PDF Output** — Install pandoc for branded PDF generation
4. **OpenViking** — Add semantic search when you have 50+ documents
5. **CRM Integration** — Auto-log proposals in your CRM

---

**You are ready. Start with Step 1.** 🔥
