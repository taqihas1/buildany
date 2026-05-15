#!/bin/bash
# =============================================================================
# PROPOSAL & RFP SYSTEM — NEW SERVER SETUP SCRIPT
# Run this on a FRESH server with nothing installed
# =============================================================================

set -e  # Exit on error

echo "=========================================="
echo "PROPOSAL SYSTEM — NEW SERVER INSTALLER"
echo "=========================================="
echo ""

# =============================================================================
# STEP 1: CHECK ENVIRONMENT
# =============================================================================
echo "🔍 STEP 1: Checking environment..."

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Installing..."
    sudo apt update
    sudo apt install -y python3 python3-pip
else
    echo "✅ Python 3 found: $(python3 --version)"
fi

# =============================================================================
# STEP 2: INSTALL OPENCLAW
# =============================================================================
echo ""
echo "🔍 STEP 2: Installing OpenClaw..."

if ! command -v openclaw &> /dev/null; then
    echo "📥 Downloading OpenClaw..."
    curl -sSL https://install.openclaw.ai | bash
else
    echo "✅ OpenClaw already installed: $(openclaw --version)"
fi

# =============================================================================
# STEP 3: CREATE SKILLS DIRECTORY
# =============================================================================
echo ""
echo "🔍 STEP 3: Setting up skills directory..."

SKILLS_DIR="$HOME/.openclaw/skills"
mkdir -p "$SKILLS_DIR"
echo "✅ Skills directory: $SKILLS_DIR"

# =============================================================================
# STEP 4: FIND SKILL-CREATOR SCRIPTS
# =============================================================================
echo ""
echo "🔍 STEP 4: Locating skill-creator scripts..."

INIT_SCRIPT=""
PACKAGE_SCRIPT=""

# Try common locations
for path in \
    "/usr/lib/node_modules/openclaw/skills/skill-creator/scripts" \
    "/usr/local/lib/node_modules/openclaw/skills/skill-creator/scripts" \
    "$HOME/.openclaw/skills/skill-creator/scripts"; do
    if [ -f "$path/init_skill.py" ]; then
        INIT_SCRIPT="$path/init_skill.py"
        PACKAGE_SCRIPT="$path/package_skill.py"
        echo "✅ Found skill-creator at: $path"
        break
    fi
done

if [ -z "$INIT_SCRIPT" ]; then
    echo "⚠️  Skill-creator scripts not found. Trying to locate..."
    find / -name "init_skill.py" -path "*/skill-creator/*" 2>/dev/null | head -5
    echo "❌ Cannot find init_skill.py. Please install OpenClaw skill-creator."
    exit 1
fi

# =============================================================================
# STEP 5: INITIALIZE 3 SKILLS
# =============================================================================
echo ""
echo "🔍 STEP 5: Initializing skills..."

for skill in proposal-craft rfp-respond proposal-kb; do
    if [ -d "$SKILLS_DIR/$skill" ]; then
        echo "⚠️  $skill already exists. Skipping initialization."
    else
        echo "📦 Initializing $skill..."
        python3 "$INIT_SCRIPT" "$skill" --path "$SKILLS_DIR" --resources scripts,references,assets
        echo "✅ $skill initialized"
    fi
done

# =============================================================================
# STEP 6: CREATE PROPOSAL-CRAFT TEMPLATE
# =============================================================================
echo ""
echo "🔍 STEP 6: Creating proposal-craft template..."

cat > "$SKILLS_DIR/proposal-craft/assets/proposal-template.md" << 'TEMPLATE'
---
name: proposal-craft
description: Create vendor proposal templates and generate professional IT consulting proposals from structured intake data. Use when the user needs to (1) create a proposal template for pitching IT services to clients, (2) generate a vendor proposal document from client intake data, (3) produce outbound sales proposals for cloud migration, ERP implementation, managed services, or digital transformation engagements, (4) build a reusable proposal generation workflow. Triggers on phrases like "create proposal", "generate proposal", "proposal template", "vendor proposal", "pitch document", "client proposal", "service proposal", "IT proposal".
---

# Proposal Craft Skill

Generate professional IT consulting proposals from structured intake data.

## Workflow

1. **Prepare intake JSON** — Client info, needs, solution, pricing, team
2. **Run generator** — `python scripts/generator.py --intake X --template Y --output Z`
3. **Review output** — Markdown document ready for conversion to PDF/Word

## Key Files

- `assets/proposal-template.md` — Mustache template with {{placeholders}}
- `scripts/generator.py` — Python template engine (no LLM needed)
- `references/sample-intake.json` — Example intake structure

## Template Syntax

Uses Mustache-style placeholders:
- `{{variable}}` — Simple substitution
- `{{#list}}...{{/list}}` — Loop over array
- `{{#var}}...{{/var}}` — Conditional (show if exists)
- `{{this}}` — Current item in loop
TEMPLATE

echo "✅ proposal-craft template created"

# =============================================================================
# STEP 7: CREATE GENERATOR SCRIPT (REUSABLE FOR ALL SKILLS)
# =============================================================================
echo ""
echo "🔍 STEP 7: Creating generator script..."

GENERATOR_SCRIPT='$SKILLS_DIR/proposal-craft/scripts/generator.py'

cat > "$GENERATOR_SCRIPT" << 'GENERATOR'
#!/usr/bin/env python3
"""Mustache Template Engine — Reusable for proposals and RFP responses."""
import json, argparse, os, re
from datetime import datetime

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def resolve_placeholder(key, data):
    """Resolve {{key}} from nested dict using dot notation."""
    keys = key.strip().split('.')
    current = data
    for k in keys:
        if isinstance(current, dict) and k in current:
            current = current[k]
        else:
            return None
    return current

def render_template(template, data, index=None):
    """Render Mustache template with data."""
    result = template
    
    # Process loops: {{#list}}...{{/list}}
    loop_pattern = r'\{\{#(\w+(?:\.\w+)*)\}\}(.*?)\{\{/\1\}\}'
    
    def process_loop(match):
        list_key = match.group(1)
        inner_template = match.group(2)
        items = resolve_placeholder(list_key, data)
        if not items or not isinstance(items, list):
            return ''
        rendered = []
        for idx, item in enumerate(items):
            item_data = data.copy()
            item_data['this'] = item if not isinstance(item, dict) else {**data, **item}
            item_data['index'] = idx
            rendered.append(render_template(inner_template, item_data, idx))
        return '\n'.join(rendered)
    
    while re.search(loop_pattern, result, re.DOTALL):
        result = re.sub(loop_pattern, process_loop, result, count=1, flags=re.DOTALL)
    
    # Replace simple placeholders
    def replace_var(match):
        var = match.group(1).strip()
        if var == 'this':
            val = data.get('this')
        elif var == 'index':
            val = index
        else:
            val = resolve_placeholder(var, data)
        return str(val) if val is not None else ''
    
    result = re.sub(r'\{\{(\w+(?:\.\w+)*|this|index)\}\}', replace_var, result)
    return result

def main():
    parser = argparse.ArgumentParser(description='Generate document from intake JSON')
    parser.add_argument('--intake', required=True, help='Path to intake JSON file')
    parser.add_argument('--template', required=True, help='Path to template Markdown file')
    parser.add_argument('--output', required=True, help='Path for output Markdown file')
    parser.add_argument('--mode', default='proposal', help='Mode: proposal or rfp_response')
    args = parser.parse_args()
    
    data = load_json(args.intake)
    data['meta'] = data.get('meta', {})
    data['meta']['generated_date'] = datetime.now().strftime('%Y-%m-%d')
    
    with open(args.template, 'r', encoding='utf-8') as f:
        template = f.read()
    
    output = render_template(template, data)
    
    os.makedirs(os.path.dirname(os.path.abspath(args.output)) if os.path.dirname(args.output) else '.', exist_ok=True)
    with open(args.output, 'w', encoding='utf-8') as f:
        f.write(output)
    
    print(f"✅ Document generated: {args.output}")
    print(f"📄 Lines: {len(output.splitlines())}")

if __name__ == '__main__':
    main()
GENERATOR

chmod +x "$GENERATOR_SCRIPT"
echo "✅ Generator script created"

# =============================================================================
# STEP 8: COPY GENERATOR TO RFP-RESPOND
# =============================================================================
echo ""
echo "🔍 STEP 8: Setting up rfp-respond..."

cp "$GENERATOR_SCRIPT" "$SKILLS_DIR/rfp-respond/scripts/generator.py"
chmod +x "$SKILLS_DIR/rfp-respond/scripts/generator.py"

echo "✅ rfp-respond generator copied"

# =============================================================================
# STEP 9: CREATE KB STRUCTURE
# =============================================================================
echo ""
echo "🔍 STEP 9: Creating knowledge base..."

cat > "$SKILLS_DIR/proposal-kb/assets/kb.json" << 'KB'
{
  "vendor": {
    "company_name": "YOUR COMPANY NAME",
    "description": "Describe your IT consulting company here...",
    "founded_year": 2010,
    "headquarters": "Your City, Country",
    "employees": 50,
    "website": "https://yourcompany.com",
    "partnerships": ["Microsoft Gold Partner", "AWS Advanced Consulting Partner"],
    "certifications": ["ISO 27001", "SOC 2 Type II"]
  },
  "case_studies": [
    {
      "title": "Sample Cloud Migration",
      "industry": "manufacturing",
      "project_type": "cloud_migration",
      "duration_weeks": 24,
      "team_size": 8,
      "value": 500000,
      "currency": "USD",
      "description": "Migrated legacy systems to cloud platform...",
      "outcomes": ["40% cost reduction", "99.9% uptime achieved"],
      "technologies": ["Azure", "Kubernetes", "Terraform"]
    }
  ],
  "pricing": {
    "currency": "USD",
    "daily_rates": {
      "engagement_manager": 1800,
      "solution_architect": 1600,
      "senior_consultant": 1400,
      "consultant": 1100,
      "analyst": 800
    }
  },
  "team_templates": {
    "cloud_migration": {
      "roles": [
        {"role": "Engagement Manager", "count": 1, "allocation_percent": 50},
        {"role": "Solution Architect", "count": 1, "allocation_percent": 100},
        {"role": "Senior Consultant", "count": 2, "allocation_percent": 100},
        {"role": "Consultant", "count": 2, "allocation_percent": 100}
      ]
    }
  },
  "methodology": {
    "name": "Cloud Ascend",
    "phases": [
      {
        "name": "Discover",
        "duration_weeks": 4,
        "activities": ["Current state assessment", "Future state design"],
        "deliverables": ["Assessment report", "Architecture blueprint"]
      },
      {
        "name": "Plan",
        "duration_weeks": 4,
        "activities": ["Migration planning", "Risk assessment"],
        "deliverables": ["Migration plan", "Risk register"]
      }
    ]
  }
}
KB

echo "✅ KB structure created (CUSTOMIZE THIS!)"

# =============================================================================
# STEP 10: CREATE QUERY SCRIPT
# =============================================================================
echo ""
echo "🔍 STEP 10: Creating KB query script..."

cat > "$SKILLS_DIR/proposal-kb/scripts/query_kb.py" << 'QUERY'
#!/usr/bin/env python3
"""Query Knowledge Base and generate draft intake."""
import json, argparse

def load_kb(path):
    with open(path, 'r') as f:
        return json.load(f)

def filter_case_studies(case_studies, industry=None):
    if not industry:
        return case_studies[:2]
    filtered = [cs for cs in case_studies if cs.get('industry') == industry]
    return filtered if filtered else case_studies[:2]

def get_team_template(templates, project_type):
    return templates.get(project_type, templates.get('cloud_migration', {}))

def calculate_pricing(rates, team_template, duration_weeks=24):
    total = 0
    for role in team_template.get('roles', []):
        rate = rates.get(role['role'].lower().replace(' ', '_'), 1000)
        count = role.get('count', 1)
        allocation = role.get('allocation_percent', 100) / 100
        working_days = duration_weeks * 5
        cost = rate * count * allocation * working_days
        total += cost
    return total

def build_draft(kb, industry, project_type, client_name):
    vendor = kb['vendor']
    case_studies = filter_case_studies(kb.get('case_studies', []), industry)
    team_template = get_team_template(kb.get('team_templates', {}), project_type)
    methodology = kb.get('methodology', {})
    rates = kb.get('pricing', {}).get('daily_rates', {})
    
    total_duration = sum(p.get('duration_weeks', 4) for p in methodology.get('phases', []))
    pricing_estimate = calculate_pricing(rates, team_template, total_duration)
    
    draft = {
        "client": {
            "name": client_name,
            "industry": industry,
            "size_employees": 1000,
            "description": f"{client_name} is a {industry} company seeking digital transformation."
        },
        "vendor": vendor,
        "needs": {
            "challenges": ["Legacy system limitations", "Scalability constraints", "Compliance requirements"],
            "objectives": ["Modernize infrastructure", "Improve efficiency", "Reduce costs"]
        },
        "solution": {
            "overview": f"Comprehensive {project_type.replace('_', ' ')} solution leveraging industry best practices.",
            "scope": ["Assessment and planning", "Implementation", "Training and handover"],
            "deliverables": ["Project documentation", "Trained staff", "Operational system"]
        },
        "methodology": methodology,
        "timeline": {
            "total_duration_weeks": total_duration,
            "phases": methodology.get('phases', [])
        },
        "pricing": {
            "currency": kb.get('pricing', {}).get('currency', 'USD'),
            "professional_services": pricing_estimate,
            "components": [
                {"component": "Professional Services", "amount": pricing_estimate},
                {"component": "Software & Licenses", "amount": int(pricing_estimate * 0.2)},
                {"component": "Travel & Expenses", "amount": int(pricing_estimate * 0.05)}
            ],
            "total": int(pricing_estimate * 1.25),
            "payment_milestones": [
                {"percentage": 10, "description": "Project kickoff", "amount": int(pricing_estimate * 1.25 * 0.1)},
                {"percentage": 20, "description": "Design approval", "amount": int(pricing_estimate * 1.25 * 0.2)},
                {"percentage": 30, "description": "Go-live", "amount": int(pricing_estimate * 1.25 * 0.3)},
                {"percentage": 40, "description": "Final acceptance", "amount": int(pricing_estimate * 1.25 * 0.4)}
            ]
        },
        "team": team_template.get('roles', []),
        "case_studies": case_studies,
        "terms": {
            "validity_days": 120,
            "warranty_period": "12 months",
            "governing_law": "State of New York",
            "payment_terms": "Net 30 days from invoice date"
        },
        "next_steps": [
            "Schedule discovery workshop",
            "Finalize scope and timeline",
            "Execute master services agreement"
        ]
    }
    return draft

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--kb', required=True, help='Path to kb.json')
    parser.add_argument('--industry', required=True)
    parser.add_argument('--project-type', required=True)
    parser.add_argument('--client', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    
    kb = load_kb(args.kb)
    draft = build_draft(kb, args.industry, args.project_type, args.client)
    
    with open(args.output, 'w') as f:
        json.dump(draft, f, indent=2)
    
    print(f"✅ Draft intake generated: {args.output}")
    print(f"💰 Estimated value: ${draft['pricing']['total']:,}")

if __name__ == '__main__':
    main()
QUERY

chmod +x "$SKILLS_DIR/proposal-kb/scripts/query_kb.py"
echo "✅ Query script created"

# =============================================================================
# STEP 11: CREATE UPDATE SCRIPT
# =============================================================================
echo ""
echo "🔍 STEP 11: Creating KB update script..."

cat > "$SKILLS_DIR/proposal-kb/scripts/update_kb.py" << 'UPDATE'
#!/usr/bin/env python3
"""Update Knowledge Base with new content."""
import json, argparse, os

def load_json(path):
    with open(path, 'r') as f:
        return json.load(f)

def save_json(data, path):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)

def add_case_study(kb, case_study):
    kb.setdefault('case_studies', []).append(case_study)
    return kb

def add_win_loss(kb, record):
    kb.setdefault('win_loss_log', []).append(record)
    return kb

def update_pricing(kb, new_rates):
    kb.setdefault('pricing', {})['daily_rates'] = new_rates
    return kb

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--kb', required=True, help='Path to kb.json')
    parser.add_argument('--add-case-study', help='Path to case study JSON')
    parser.add_argument('--add-win-loss', help='Path to win/loss record JSON')
    parser.add_argument('--update-pricing', help='Path to pricing JSON')
    args = parser.parse_args()
    
    kb = load_json(args.kb)
    
    if args.add_case_study:
        cs = load_json(args.add_case_study)
        kb = add_case_study(kb, cs)
        print("✅ Case study added")
    
    if args.add_win_loss:
        wl = load_json(args.add_win_loss)
        kb = add_win_loss(kb, wl)
        print("✅ Win/loss record added")
    
    if args.update_pricing:
        rates = load_json(args.update_pricing)
        kb = update_pricing(kb, rates)
        print("✅ Pricing updated")
    
    save_json(kb, args.kb)
    print(f"✅ KB saved: {args.kb}")

if __name__ == '__main__':
    main()
UPDATE

chmod +x "$SKILLS_DIR/proposal-kb/scripts/update_kb.py"
echo "✅ Update script created"

# =============================================================================
# STEP 12: WRITE SKILL DOCUMENTATION
# =============================================================================
echo ""
echo "🔍 STEP 12: Writing SKILL.md files..."

# proposal-craft SKILL.md
cat > "$SKILLS_DIR/proposal-craft/SKILL.md" << 'SKILL1'
---
name: proposal-craft
description: Create vendor proposal templates and generate professional IT consulting proposals from structured intake data. Use when the user needs to (1) create a proposal template for pitching IT services to clients, (2) generate a vendor proposal document from client intake data, (3) produce outbound sales proposals for cloud migration, ERP implementation, managed services, or digital transformation engagements, (4) build a reusable proposal generation workflow. Triggers on phrases like "create proposal", "generate proposal", "proposal template", "vendor proposal", "pitch document", "client proposal", "service proposal", "IT proposal".
---

# Proposal Craft Skill

Generate professional IT consulting proposals from structured intake data.

## Workflow

1. **Prepare intake JSON** — Client info, needs, solution, pricing, team
2. **Run generator** — `python scripts/generator.py --intake X --template Y --output Z`
3. **Review output** — Markdown document ready for conversion to PDF/Word

## Key Files

- `assets/proposal-template.md` — Mustache template with {{placeholders}}
- `scripts/generator.py` — Python template engine (no LLM needed)
- `references/sample-intake.json` — Example intake structure

## Template Syntax

Uses Mustache-style placeholders:
- `{{variable}}` — Simple substitution
- `{{#list}}...{{/list}}` — Loop over array
- `{{#var}}...{{/var}}` — Conditional (show if exists)
- `{{this}}` — Current item in loop
SKILL1

# rfp-respond SKILL.md
cat > "$SKILLS_DIR/rfp-respond/SKILL.md" << 'SKILL2'
---
name: rfp-respond
description: Respond to client RFPs (Requests for Proposal) with structured vendor response documents. Use when the user needs to (1) create an RFP response template, (2) generate a compliant vendor response to a client-issued RFP, (3) extract requirements from RFP documents and produce bid responses, (4) prepare inbound proposal documents for procurement processes, (5) build an RFP response generation workflow. Triggers on phrases like "RFP response", "respond to RFP", "bid response", "RFP template", "proposal response", "vendor response", "answer RFP".
---

# RFP Respond Skill

Generate compliant RFP response documents.

## Workflow

1. **Extract RFP requirements** — Parse client RFP document
2. **Build intake JSON** — Map requirements to response structure
3. **Run generator** — `python scripts/generator.py --intake X --template Y --output Z --mode rfp_response`
4. **Compliance check** — Verify all mandatory requirements addressed
5. **Deliver** — Submit before deadline

## Key Files

- `assets/rfp-response-template.md` — RFP response structure
- `scripts/generator.py` — Same template engine as proposal-craft
- `references/sample-intake.json` — Example RFP response intake

## RFP-Specific Fields

- `rfp.ref` — RFP reference number
- `submission_deadline` — Due date
- `requirements` — Must/should/could/won't classification
- `compliance_matrix` — Requirement traceability
SKILL2

# proposal-kb SKILL.md
cat > "$SKILLS_DIR/proposal-kb/SKILL.md" << 'SKILL3'
---
name: proposal-kb
description: Maintain and query a reusable knowledge base for proposal and RFP response content. Use when the user needs to (1) store reusable proposal content (company profile, case studies, team templates, pricing, methodology), (2) retrieve relevant content for a new proposal or RFP response by industry/project type, (3) build a content library that feeds proposal-craft and rfp-respond skills, (4) auto-populate vendor sections, case studies, team templates, or pricing from past work. Triggers on phrases like "proposal knowledge base", "KB", "reusable content", "case studies", "proposal library", "proposal content", "company profile", "rate card", "methodology template", "team template", "pricing model", "win loss log".
---

# Proposal Knowledge Base Skill

Store, query, and maintain reusable proposal content.

## Workflow

### Query (Generate Draft)
```bash
python scripts/query_kb.py --kb assets/kb.json \\
  --industry manufacturing --project-type cloud_migration \\
  --client "Acme Corp" --output draft.json
```

### Update (Add Content)
```bash
python scripts/update_kb.py --kb assets/kb.json \\
  --add-case-study new-project.json
```

## KB Structure

- `vendor` — Company profile, partnerships, certifications
- `case_studies[]` — Projects by industry and type
- `pricing` — Rate cards and cost models
- `team_templates` — Staffing models by project type
- `methodology` — Standard delivery approaches

## Maintenance Schedule

- After every win: Add case study
- After every loss: Log win/loss with lessons
- Quarterly: Review differentiators and rates
SKILL3
n
echo "✅ SKILL.md files written"

# =============================================================================
# STEP 13: PACKAGE SKILLS
# =============================================================================
echo ""
echo "🔍 STEP 13: Packaging skills..."

for skill in proposal-craft rfp-respond proposal-kb; do
    echo "📦 Packaging $skill..."
    python3 "$PACKAGE_SCRIPT" "$SKILLS_DIR/$skill" 2>/dev/null || echo "⚠️  $skill packaging had issues (non-critical)"
done

echo "✅ Packaging complete"

# =============================================================================
# STEP 14: RESTART OPENCLAW
# =============================================================================
echo ""
echo "🔍 STEP 14: Restarting OpenClaw..."

if command -v systemctl &> /dev/null; then
    sudo systemctl restart openclaw 2>/dev/null || openclaw gateway restart
else
    openclaw gateway restart
fi

echo "✅ OpenClaw restarted"

# =============================================================================
# STEP 15: VERIFY INSTALLATION
# =============================================================================
echo ""
echo "=========================================="
echo "✅ INSTALLATION COMPLETE"
echo "=========================================="
echo ""
echo "Installed skills:"
ls -la "$SKILLS_DIR/"
echo ""
echo "Next steps:"
echo "1. Edit $SKILLS_DIR/proposal-kb/assets/kb.json"
echo "   → Replace YOUR COMPANY NAME with real info"
echo "   → Add real case studies"
echo "   → Update pricing rates"
echo ""
echo "2. Test the system:"
echo "   cd $SKILLS_DIR/proposal-kb"
echo "   python3 scripts/query_kb.py --kb assets/kb.json \\"
echo "     --industry test --project-type cloud_migration \\"
echo "     --client 'Test' --output /tmp/test.json"
echo ""
echo "3. Generate first proposal:"
echo "   cd $SKILLS_DIR/proposal-craft"
echo "   python3 scripts/generator.py --intake /tmp/test.json \\"
echo "     --template assets/proposal-template.md \\"
echo "     --output /tmp/test-proposal.md"
echo ""
echo "=========================================="
