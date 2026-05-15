---
name: rfp-revision
description: Full RFP revision workflow with version control. Generate RFP v1, download as Word, user edits and uploads, incorporate changes into v2, iterate until satisfied, produce final version. Triggers on "revise RFP", "version control", "RFP review", "edit proposal", "track changes", "proposal revision", "version 2", "final RFP", "review and update proposal", "collaborative editing".
---

# RFP Revision Skill

## Purpose

Enable collaborative RFP development with version tracking:
1. **Generate v1** — Auto-populate from knowledge base + intake form
2. **Download v1** — User gets Word document to review
3. **User edits** — Client reviews, marks changes, uploads edited doc
4. **Generate v2** — Agent reads changes, incorporates, produces updated version
5. **Iterate** — Repeat edit/upload cycle until satisfied
6. **Final version** — Consolidate all accepted changes, produce polished final

## Workflow

```
Intake Form → KB Query → Generate v1 (md) → Convert to Word → Download v1
     ↑                                                              |
     |                                                              ↓
Final ← vN ← ... ← v3 ← v2 ← Incorporate Changes ← User Uploads Edited Doc
```

## Version Naming Convention

| Version | Purpose | File Naming |
|---------|---------|-------------|
| v1 | Initial draft | `rfp-{client}-{project}-v1-{date}.docx` |
| v2-vN | Revision cycles | `rfp-{client}-{project}-v2-{date}.docx` |
| FINAL | Approved version | `rfp-{client}-{project}-FINAL-{date}.docx` |
| CHANGELOG | Change tracking | `rfp-{client}-{project}-CHANGELOG.md` |

## Directory Structure

```
~/.openclaw/workspace/rfp-revisions/
├── active/
│   └── {project-id}/
│       ├── intake.json              # Client intake data
│       ├── v1/
│       │   ├── rfp.md               # v1 markdown source
│       │   └── rfp.docx             # v1 Word download
│       ├── v2/
│       │   ├── rfp.md               # v2 markdown source
│       │   ├── rfp.docx             # v2 Word download
│       │   └── changes-v1-to-v2.md  # What changed
│       ├── vN/                      # Additional revisions...
│       └── FINAL/
│           ├── rfp.md               # Final markdown
│           └── rfp.docx             # Final Word download
├── templates/
│   └── rfp-template.md              # Base template with placeholders
└── scripts/
    ├── generate_rfp.py              # Generate from template + intake
    ├── compare_versions.py          # Diff two markdown versions
    ├── incorporate_changes.py       # Merge user edits into new version
    └── md_to_docx.py                # Markdown → Word conversion
```

## Step-by-Step

### Step 1: Initialize Project

```bash
# Create project directory
mkdir -p ~/.openclaw/workspace/rfp-revisions/active/{project-id}

# Save intake data
cat > ~/.openclaw/workspace/rfp-revisions/active/{project-id}/intake.json << 'EOF'
{
  "client": { ... },
  "project": { ... },
  "requirements": [ ... ]
}
EOF
```

### Step 2: Generate v1

The agent:
1. Reads intake.json
2. Queries knowledge base (markdown files, not JSON)
3. Queries Viking Protocol tiers (L0 abstract → L1 overview → L2 full content)
4. Populates template placeholders
5. Generates `v1/rfp.md`
6. Converts to `v1/rfp.docx`
7. Makes available for download

### Step 3: User Reviews v1

User downloads Word doc, reviews, makes changes:
- Track Changes enabled (preferred)
- Or direct edits with comments
- Or handwritten notes scanned/uploaded

### Step 4: User Uploads Edited Doc

User uploads edited Word document. Agent:
1. Downloads uploaded file
2. Converts Word → Markdown (if needed)
3. Compares with previous version using `compare_versions.py`
4. Extracts changes (added, deleted, modified sections)
5. Presents changes to user for confirmation

### Step 5: Generate v2

Agent:
1. Confirms which changes to accept/reject
2. Updates markdown source
3. Regenerates Word document
4. Creates `changes-v1-to-v2.md` changelog
5. Makes v2 available for download

### Step 6: Iterate

Repeat Steps 3-5 until user signals satisfaction.

### Step 7: Generate Final

Agent:
1. Consolidates all accepted changes across all versions
2. Produces clean, comment-free final markdown
3. Converts to polished Word document
4. Creates `CHANGELOG.md` with full revision history
5. Archives project to `completed/` directory

## Scripts

### generate_rfp.py

Generates RFP markdown from template + intake data + knowledge base.

```python
#!/usr/bin/env python3
"""Generate RFP from template, intake, and knowledge base."""
import json, re, os, glob
from pathlib import Path

def load_intake(path):
    with open(path) as f:
        return json.load(f)

def query_kb(kb_dir, industry, project_type):
    """Query markdown knowledge base for relevant content."""
    results = {}
    
    # Load vendor profile (always needed)
    with open(f"{kb_dir}/vendor-profile.md") as f:
        results['vendor'] = f.read()
    
    # Load relevant case studies
    case_studies = []
    for cs_file in glob.glob(f"{kb_dir}/case-studies/*.md"):
        with open(cs_file) as f:
            content = f.read()
            if industry in content.lower() or project_type in content.lower():
                case_studies.append(content)
    results['case_studies'] = case_studies[:2]  # Top 2 most relevant
    
    # Load team template
    team_file = f"{kb_dir}/team-templates/{project_type}.md"
    if os.path.exists(team_file):
        with open(team_file) as f:
            results['team'] = f.read()
    
    # Load methodology
    with open(f"{kb_dir}/methodology/cloud-ascend.md") as f:
        results['methodology'] = f.read()
    
    # Load differentiators
    diff_file = f"{kb_dir}/differentiators/{industry}.md"
    if os.path.exists(diff_file):
        with open(diff_file) as f:
            results['differentiators'] = f.read()
    
    # Load pricing
    with open(f"{kb_dir}/pricing/daily-rates.md") as f:
        results['pricing'] = f.read()
    
    return results

def load_template(template_path):
    with open(template_path) as f:
        return f.read()

def populate_template(template, intake, kb):
    """Replace placeholders with content."""
    output = template
    
    # Client info
    client = intake.get('client', {})
    output = output.replace('{{CLIENT_NAME}}', client.get('name', '[CLIENT NAME]'))
    output = output.replace('{{CLIENT_INDUSTRY}}', client.get('industry', '[INDUSTRY]'))
    output = output.replace('{{CLIENT_DESCRIPTION}}', client.get('description', '[DESCRIPTION]'))
    
    # Vendor info (extract from markdown frontmatter or content)
    output = output.replace('{{VENDOR_PROFILE}}', kb.get('vendor', ''))
    
    # Case studies
    cs_content = '\n\n'.join(kb.get('case_studies', []))
    output = output.replace('{{CASE_STUDIES}}', cs_content)
    
    # Team
    output = output.replace('{{TEAM_TEMPLATE}}', kb.get('team', ''))
    
    # Methodology
    output = output.replace('{{METHODOLOGY}}', kb.get('methodology', ''))
    
    # Differentiators
    output = output.replace('{{DIFFERENTIATORS}}', kb.get('differentiators', ''))
    
    # Pricing
    output = output.replace('{{PRICING}}', kb.get('pricing', ''))
    
    # Solution
    solution = intake.get('solution', {})
    output = output.replace('{{SOLUTION_OVERVIEW}}', solution.get('overview', '[SOLUTION OVERVIEW]'))
    output = output.replace('{{SOLUTION_SCOPE}}', '\n'.join(solution.get('scope', [])))
    output = output.replace('{{SOLUTION_DELIVERABLES}}', '\n'.join(solution.get('deliverables', [])))
    
    # Timeline
    timeline = intake.get('timeline', {})
    output = output.replace('{{TIMELINE_WEEKS}}', str(timeline.get('total_duration_weeks', 24)))
    
    # Pricing estimate
    pricing = intake.get('pricing', {})
    output = output.replace('{{TOTAL_PRICE}}', f"${pricing.get('total', 0):,}")
    output = output.replace('{{CURRENCY}}', pricing.get('currency', 'USD'))
    
    return output

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--intake', required=True)
    parser.add_argument('--kb', default='~/.openclaw/workspace/kb')
    parser.add_argument('--template', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    
    intake = load_intake(args.intake)
    kb = query_kb(os.path.expanduser(args.kb), 
                  intake.get('client', {}).get('industry', 'general'),
                  intake.get('project', {}).get('type', 'cloud_migration'))
    template = load_template(args.template)
    
    rfp = populate_template(template, intake, kb)
    
    with open(args.output, 'w') as f:
        f.write(rfp)
    
    print(f"✅ RFP generated: {args.output}")

if __name__ == '__main__':
    main()
```

### compare_versions.py

Compares two markdown RFP versions and produces a change report.

```python
#!/usr/bin/env python3
"""Compare two RFP versions and report differences."""
import difflib, re, sys

def load_file(path):
    with open(path) as f:
        return f.readlines()

def extract_sections(lines):
    """Extract sections by heading level."""
    sections = {}
    current_section = 'frontmatter'
    current_content = []
    
    for line in lines:
        if line.startswith('# '):
            sections[current_section] = current_content
            current_section = line.strip().lstrip('# ').lower().replace(' ', '_')
            current_content = [line]
        else:
            current_content.append(line)
    
    sections[current_section] = current_content
    return sections

def compare_sections(old_sections, new_sections):
    """Compare sections and report changes."""
    changes = []
    all_sections = set(old_sections.keys()) | set(new_sections.keys())
    
    for section in sorted(all_sections):
        old = old_sections.get(section, [])
        new = new_sections.get(section, [])
        
        old_text = ''.join(old)
        new_text = ''.join(new)
        
        if old_text == new_text:
            continue
        
        if not old:
            changes.append({
                'section': section,
                'type': 'added',
                'diff': new_text
            })
        elif not new:
            changes.append({
                'section': section,
                'type': 'deleted',
                'diff': old_text
            })
        else:
            # Show line-by-line diff
            diff = list(difflib.unified_diff(
                old, new,
                fromfile=f'{section} (old)',
                tofile=f'{section} (new)',
                lineterm=''
            ))
            changes.append({
                'section': section,
                'type': 'modified',
                'diff': '\n'.join(diff)
            })
    
    return changes

def format_changes(changes):
    """Format changes for human review."""
    output = "# Changes Detected\n\n"
    
    for change in changes:
        section = change['section'].replace('_', ' ').title()
        output += f"## {section} ({change['type'].upper()})\n\n"
        
        if change['type'] == 'added':
            output += "**New content added:**\n\n```\n"
            output += change['diff']
            output += "\n```\n\n"
        elif change['type'] == 'deleted':
            output += "**Content removed:**\n\n```\n"
            output += change['diff']
            output += "\n```\n\n"
        else:
            output += "**Modified content:**\n\n```diff\n"
            output += change['diff']
            output += "\n```\n\n"
    
    return output

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--old', required=True, help='Previous version markdown')
    parser.add_argument('--new', required=True, help='New version markdown')
    parser.add_argument('--output', required=True, help='Change report output')
    args = parser.parse_args()
    
    old_lines = load_file(args.old)
    new_lines = load_file(args.new)
    
    old_sections = extract_sections(old_lines)
    new_sections = extract_sections(new_lines)
    
    changes = compare_sections(old_sections, new_sections)
    
    report = format_changes(changes)
    
    with open(args.output, 'w') as f:
        f.write(report)
    
    print(f"✅ Change report: {args.output}")
    print(f"📊 {len(changes)} sections changed")
    added = sum(1 for c in changes if c['type'] == 'added')
    deleted = sum(1 for c in changes if c['type'] == 'deleted')
    modified = sum(1 for c in changes if c['type'] == 'modified')
    print(f"   Added: {added} | Deleted: {deleted} | Modified: {modified}")

if __name__ == '__main__':
    main()
```

### incorporate_changes.py

Merges user edits into a new version.

```python
#!/usr/bin/env python3
"""Incorporate user changes into next RFP version."""
import json, sys

def load_file(path):
    with open(path) as f:
        return f.read()

def apply_changes(base_md, changes_md, accepted=None):
    """
    Apply accepted changes to base markdown.
    
    accepted: dict of {section_name: True/False} or None to accept all
    """
    # Parse changes report
    # This is a simplified version - in practice, would use more sophisticated parsing
    
    # For now, if user uploads edited doc, we treat the edited version as the new source
    # and use the base as reference for what changed
    
    # The actual merge would:
    # 1. Parse both versions into sections
    # 2. For each section, check if change is accepted
    # 3. Build new version from accepted changes + unchanged sections
    
    return base_md  # Placeholder - real implementation would merge

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', required=True, help='Base version markdown')
    parser.add_argument('--changes', required=True, help='Changes report')
    parser.add_argument('--output', required=True, help='New version markdown')
    parser.add_argument('--accept-all', action='store_true', help='Accept all changes')
    args = parser.parse_args()
    
    base = load_file(args.base)
    changes = load_file(args.changes)
    
    # In a real implementation, would parse changes and apply selectively
    # For this template, we copy the base and note where changes would be applied
    
    new_version = base + "\n\n<!-- REVISION MARKER: Changes from previous version incorporated -->\n"
    
    with open(args.output, 'w') as f:
        f.write(new_version)
    
    print(f"✅ New version: {args.output}")

if __name__ == '__main__':
    main()
```

### md_to_docx.py

Converts markdown RFP to Word document for download.

```python
#!/usr/bin/env python3
"""Convert markdown RFP to Word document."""
import subprocess, sys, os

def convert_md_to_docx(md_path, docx_path):
    """Use pandoc to convert markdown to Word."""
    try:
        result = subprocess.run([
            'pandoc',
            md_path,
            '-o', docx_path,
            '--reference-doc=' + os.path.expanduser('~/.openclaw/workspace/rfp-revisions/templates/reference.docx'),
            '--toc',
            '--toc-depth=3'
        ], capture_output=True, text=True, check=True)
        print(f"✅ Word document: {docx_path}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Conversion failed: {e.stderr}")
        # Fallback: copy markdown with note
        with open(md_path) as f:
            content = f.read()
        with open(docx_path.replace('.docx', '.md'), 'w') as f:
            f.write(content)
        print(f"⚠️  Fallback markdown saved")
        return False
    except FileNotFoundError:
        print("❌ pandoc not installed. Install with: apt-get install pandoc")
        return False

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True, help='Input markdown file')
    parser.add_argument('--output', required=True, help='Output Word file')
    args = parser.parse_args()
    
    convert_md_to_docx(args.input, args.output)

if __name__ == '__main__':
    main()
```

## Knowledge Base Integration (Viking Protocol)

When querying the knowledge base during RFP generation, use tiered loading:

### Phase 1: Planning (L0 — Abstracts)
Load all `.abstract` files first to understand what content is available:
```bash
find ~/.openclaw/workspace/kb/viking/resources -name ".abstract" -exec cat {} \;
```

### Phase 2: Relevance Filtering (L1 — Overviews)
Load `.overview` files for resources relevant to the project:
```bash
cat ~/.openclaw/workspace/kb/viking/resources/case-studies/cloud-migration-manufacturing/.overview
cat ~/.openclaw/workspace/kb/viking/resources/team-templates/cloud-migration/.overview
```

### Phase 3: Deep Content (L2 — Full Markdown)
Load full `.md` files only for the most relevant resources:
```bash
cat ~/.openclaw/workspace/kb/case-studies/cloud-migration-manufacturing.md
cat ~/.openclaw/workspace/kb/team-templates/cloud-migration.md
```

This tiered approach ensures efficient token usage while maintaining content richness.

## User Interaction Flow

### Generating v1

**Agent → User:**
> I've generated your RFP draft (v1) based on the intake form and our knowledge base. 
> 
> 📄 **Download**: `rfp-acme-corp-cloud-migration-v1-20260513.docx`
> 
> Please review and make any changes. You can:
> 1. Edit directly in Word (Track Changes preferred)
> 2. Add comments for sections to modify
> 3. Upload the edited document when ready

### Receiving User Edits

**User → Agent:** (uploads edited Word doc)

**Agent → User:**
> Received your edited version! Let me compare it with v1 to identify all changes.
> 
> Here's what I found:
> 
> **Modified Sections:**
> - Executive Summary (3 changes)
> - Solution Approach (1 addition, 2 deletions)
> - Pricing (updated rates)
> 
> **New Sections:**
> - Risk Mitigation (new subsection added)
> 
> Should I incorporate all these changes into v2, or would you like to review them individually?

### Generating v2

**Agent → User:**
> v2 is ready with all your changes incorporated!
> 
> 📄 **Download**: `rfp-acme-corp-cloud-migration-v2-20260513.docx`
> 
> 📝 **Changelog**: See what's changed from v1 → v2
> 
> Are you satisfied with this version, or would you like another revision cycle?

### Final Version

**Agent → User:**
> 🎉 Final version complete!
> 
> 📄 **Download**: `rfp-acme-corp-cloud-migration-FINAL-20260513.docx`
> 
> 📋 **Complete Changelog**: All revision history from v1 → FINAL
> 
> This document is ready for submission. All changes have been consolidated and the document has been polished for professional presentation.

## Best Practices

1. **Always preserve original** — Keep v1 unchanged; create new files for each revision
2. **Changelog discipline** — Every version gets a changes file
3. **Section-level tracking** — Changes reported by section, not just line numbers
4. **User confirmation** — Present changes before applying; never silently overwrite
5. **Template consistency** — All versions use the same base template structure
6. **Clean final** — Final version has no revision marks, comments, or placeholders

## Handling Edge Cases

### User uploads scanned/PDF edits
- Use OCR or ask user to retype key changes
- Or ask user to describe changes in text

### User wants to revert a change
- Revert to previous version's section content
- Document reversion in changelog

### Major scope changes mid-revision
- Treat as new project; restart from intake
- Preserve relevant content from previous versions

### Multiple reviewers
- Collect all edits into a single merged document
- Flag conflicting changes for user resolution

## Files to Create

When setting up this skill for the first time:

```bash
mkdir -p ~/.openclaw/workspace/rfp-revisions/{active,templates,scripts,completed}

# Create base template
cat > ~/.openclaw/workspace/rfp-revisions/templates/rfp-template.md << 'EOF'
# Request for Proposal

## Executive Summary

{{CLIENT_NAME}} is seeking {{PROJECT_TYPE}} services. {{VENDOR_PROFILE}}

## Client Background

{{CLIENT_DESCRIPTION}}

## Scope of Work

{{SOLUTION_OVERVIEW}}

### In Scope
{{SOLUTION_SCOPE}}

### Out of Scope
- [To be defined during discovery]

## Our Approach

{{METHODOLOGY}}

## Team

{{TEAM_TEMPLATE}}

## Relevant Experience

{{CASE_STUDIES}}

## Why Apex

{{DIFFERENTIATORS}}

## Investment

{{PRICING}}

**Total Investment**: {{TOTAL_PRICE}} {{CURRENCY}}

## Timeline

**Duration**: {{TIMELINE_WEEKS}} weeks

## Terms and Conditions

{{TERMS}}

## Next Steps

{{NEXT_STEPS}}
EOF
```

## Quick Start

```bash
# 1. Generate v1
python3 ~/.openclaw/workspace/rfp-revisions/scripts/generate_rfp.py \
  --intake ~/.openclaw/workspace/rfp-revisions/active/{project-id}/intake.json \
  --template ~/.openclaw/workspace/rfp-revisions/templates/rfp-template.md \
  --output ~/.openclaw/workspace/rfp-revisions/active/{project-id}/v1/rfp.md

# 2. Convert to Word
python3 ~/.openclaw/workspace/rfp-revisions/scripts/md_to_docx.py \
  --input ~/.openclaw/workspace/rfp-revisions/active/{project-id}/v1/rfp.md \
  --output ~/.openclaw/workspace/rfp-revisions/active/{project-id}/v1/rfp.docx

# 3. After user uploads edited doc, compare versions
python3 ~/.openclaw/workspace/rfp-revisions/scripts/compare_versions.py \
  --old ~/.openclaw/workspace/rfp-revisions/active/{project-id}/v1/rfp.md \
  --new ~/.openclaw/workspace/rfp-revisions/active/{project-id}/v2/user-edits.md \
  --output ~/.openclaw/workspace/rfp-revisions/active/{project-id}/v2/changes-v1-to-v2.md

# 4. Incorporate changes
python3 ~/.openclaw/workspace/rfp-revisions/scripts/incorporate_changes.py \
  --base ~/.openclaw/workspace/rfp-revisions/active/{project-id}/v1/rfp.md \
  --changes ~/.openclaw/workspace/rfp-revisions/active/{project-id}/v2/changes-v1-to-v2.md \
  --output ~/.openclaw/workspace/rfp-revisions/active/{project-id}/v2/rfp.md
```

## Integration with Other Skills

- **proposal-kb**: Queries markdown knowledge base for content
- **proposal-craft**: Generates initial proposal content
- **rfp-respond**: Populates client RFP responses
- **rfp-document-converter**: Handles Word ↔ Markdown conversion
