#!/usr/bin/env python3
"""
Skill Generator from Template — Reverse-engineers a Markdown template into a complete OpenClaw skill.

Usage:
  python3 skill_from_template.py --template my-proposal.md --name my-proposal-skill --output-dir ~/.openclaw/skills

What it does:
  1. Parses the Markdown template for {{placeholders}}
  2. Builds a JSON schema matching the template structure
  3. Generates generator.py (Mustache engine)
  4. Generates SKILL.md
  5. Creates sample intake JSON
  6. Packages the skill

Author: TaqClaw (OpenClaw Agent)
"""

import re, json, os, sys, argparse
from datetime import datetime

def parse_template(template_path):
    """Extract all Mustache placeholders from template."""
    with open(template_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    variables = set()
    loops = {}      # key -> list of inner variables
    conditionals = set()
    
    # Simple variables: {{variable}}
    simple_pattern = r'\{\{(\w+(?:\.\w+)*)\}\}'
    for match in re.finditer(simple_pattern, content):
        var = match.group(1)
        if var not in ('this', 'index'):
            variables.add(var)
    
    # Loops: {{#list}}...{{/list}}
    loop_pattern = r'\{\{#(\w+(?:\.\w+)*)\}\}(.*?)\{\{/\1\}\}'
    for match in re.finditer(loop_pattern, content, re.DOTALL):
        list_key = match.group(1)
        inner = match.group(2)
        inner_vars = set(re.findall(r'\{\{(\w+(?:\.\w+)*)\}\}', inner))
        loops[list_key] = inner_vars
        # Remove loop vars from top-level
        variables.discard(list_key)
    
    # Conditionals: {{#var}}...{{/var}} (non-loop, no inner vars from same pattern)
    for match in re.finditer(loop_pattern, content, re.DOTALL):
        list_key = match.group(1)
        inner = match.group(2)
        if not re.search(r'\{\{', inner):  # No inner placeholders = simple conditional
            conditionals.add(list_key)
            variables.discard(list_key)
    
    return {
        'variables': sorted(variables),
        'loops': {k: sorted(v) for k, v in loops.items()},
        'conditionals': sorted(conditionals)
    }

def build_intake_schema(parsed):
    """Build a JSON schema (example structure) from parsed placeholders."""
    schema = {}
    
    # Handle simple variables with dot notation
    for var in parsed['variables']:
        parts = var.split('.')
        current = schema
        for i, part in enumerate(parts[:-1]):
            if part not in current:
                current[part] = {}
            current = current[part]
        current[parts[-1]] = f"[Enter {parts[-1]}]"
    
    # Handle loops (arrays of objects)
    for loop_key, inner_vars in parsed['loops'].items():
        parts = loop_key.split('.')
        current = schema
        for part in parts[:-1]:
            if part not in current:
                current[part] = {}
            current = current[part]
        
        # Build sample item from inner variables
        sample_item = {}
        for iv in inner_vars:
            if iv == 'this':
                sample_item[iv] = f"[Item value]"
            elif iv == 'index':
                continue
            else:
                iv_parts = iv.split('.')
                s_current = sample_item
                for p in iv_parts[:-1]:
                    if p not in s_current:
                        s_current[p] = {}
                    s_current = s_current[p]
                s_current[iv_parts[-1]] = f"[Enter {iv_parts[-1]}]"
        
        current[parts[-1]] = [sample_item] if sample_item else ["[Item 1]", "[Item 2]"]
    
    # Handle conditionals
    for cond in parsed['conditionals']:
        parts = cond.split('.')
        current = schema
        for part in parts[:-1]:
            if part not in current:
                current[part] = {}
            current = current[part]
        current[parts[-1]] = "[Optional value — section shows if present]"
    
    return schema

def generate_generator_script(skill_dir):
    """Write the standard Mustache generator.py."""
    script_path = os.path.join(skill_dir, 'scripts', 'generator.py')
    
    script_content = '''#!/usr/bin/env python3
"""Mustache Template Engine — Auto-generated from template analysis."""
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
    loop_pattern = r'\\{\\{#(\\w+(?:\\.\\w+)*)\\}\\}(.*?)\\{\\{/\\1\\}\\}'
    
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
        return '\\n'.join(rendered)
    
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
    
    result = re.sub(r'\\{\\{(\\w+(?:\\.\\w+)*|this|index)\\}\\}', replace_var, result)
    return result

def main():
    parser = argparse.ArgumentParser(description='Generate document from intake JSON')
    parser.add_argument('--intake', required=True, help='Path to intake JSON file')
    parser.add_argument('--template', required=True, help='Path to template Markdown file')
    parser.add_argument('--output', required=True, help='Path for output Markdown file')
    args = parser.parse_args()
    
    data = load_json(args.intake)
    data['meta'] = data.get('meta', {})
    data['meta']['generated_date'] = datetime.now().strftime('%Y-%m-%d')
    
    with open(args.template, 'r', encoding='utf-8') as f:
        template = f.read()
    
    output = render_template(template, data)
    
    out_dir = os.path.dirname(os.path.abspath(args.output))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    with open(args.output, 'w', encoding='utf-8') as f:
        f.write(output)
    
    print(f"✅ Document generated: {args.output}")
    print(f"📄 Lines: {len(output.splitlines())}")

if __name__ == '__main__':
    main()
'''
    
    with open(script_path, 'w') as f:
        f.write(script_content)
    os.chmod(script_path, 0o755)
    
    return script_path

def generate_skill_md(skill_dir, skill_name, template_name, parsed):
    """Write SKILL.md with proper frontmatter and documentation."""
    
    # Determine trigger phrases from template content
    trigger_phrases = skill_name.replace('-', ' ')
    
    skill_md = f'''---
name: {skill_name}
description: Auto-generated skill from template `{template_name}`. Generates professional documents from structured intake data. Use when the user needs to (1) create documents from the {template_name} template, (2) generate structured output from JSON data, (3) produce formatted documents with consistent branding. Triggers on phrases like "generate {trigger_phrases}", "create document from {template_name}", "use {skill_name} template", "render {trigger_phrases}".
---

# {skill_name.replace('-', ' ').title()} Skill

Auto-generated from template analysis. This skill generates documents by merging structured JSON data with a Markdown template.

## Workflow

1. **Prepare intake JSON** — Fill in the required data structure
2. **Run generator** — `python scripts/generator.py --intake X --template Y --output Z`
3. **Review output** — Markdown document ready for use

## Key Files

- `assets/template.md` — The source Markdown template with {{placeholders}}
- `scripts/generator.py` — Mustache template engine
- `references/sample-intake.json` — Example data structure

## Template Placeholders

### Simple Variables
'''
    
    for var in parsed['variables']:
        skill_md += f"- `{{{var}}}` — {var.split('.')[-1].replace('_', ' ').title()}\n"
    
    if parsed['loops']:
        skill_md += "\n### Loop Sections\n"
        for loop_key, inner_vars in parsed['loops'].items():
            skill_md += f"- `{{#{loop_key}}}...{{/{loop_key}}}` — Repeats for each item in `{loop_key}`\n"
            for iv in inner_vars:
                if iv not in ('this', 'index'):
                    skill_md += f"  - `{{{iv}}}` — {iv.split('.')[-1].replace('_', ' ').title()}\n"
    
    if parsed['conditionals']:
        skill_md += "\n### Conditional Sections\n"
        for cond in parsed['conditionals']:
            skill_md += f"- `{{#{cond}}}...{{/{cond}}}` — Shows only if `{cond}` exists\n"
    
    skill_md += '''
## Usage

```bash
cd ~/.openclaw/skills/''' + skill_name + '''
python3 scripts/generator.py \\
  --intake references/sample-intake.json \\
  --template assets/template.md \\
  --output document.md
```

## Intake JSON Structure

See `references/sample-intake.json` for the complete expected structure.

## Template Syntax

Uses Mustache-style placeholders:
- `{{variable}}` — Simple substitution
- `{{#list}}...{{/list}}` — Loop over array
- `{{#var}}...{{/var}}` — Conditional (show if exists)
- `{{this}}` — Current item in loop
'''
    
    skill_md_path = os.path.join(skill_dir, 'SKILL.md')
    with open(skill_md_path, 'w') as f:
        f.write(skill_md)
    
    return skill_md_path

def main():
    parser = argparse.ArgumentParser(
        description='Generate an OpenClaw skill from a Markdown template'
    )
    parser.add_argument('--template', required=True, help='Path to Markdown template file')
    parser.add_argument('--name', required=True, help='Skill name (e.g., my-proposal)')
    parser.add_argument('--output-dir', default='~/.openclaw/skills', help='Output directory for skill')
    args = parser.parse_args()
    
    # Expand paths
    template_path = os.path.abspath(os.path.expanduser(args.template))
    output_dir = os.path.abspath(os.path.expanduser(args.output_dir))
    skill_dir = os.path.join(output_dir, args.name)
    
    # Validate template exists
    if not os.path.exists(template_path):
        print(f"❌ Template not found: {template_path}")
        sys.exit(1)
    
    print(f"📄 Reading template: {template_path}")
    
    # Parse template
    parsed = parse_template(template_path)
    
    print(f"🔍 Found {len(parsed['variables'])} variables, {len(parsed['loops'])} loops, {len(parsed['conditionals'])} conditionals")
    
    # Create skill directory structure
    os.makedirs(skill_dir, exist_ok=True)
    os.makedirs(os.path.join(skill_dir, 'scripts'), exist_ok=True)
    os.makedirs(os.path.join(skill_dir, 'references'), exist_ok=True)
    os.makedirs(os.path.join(skill_dir, 'assets'), exist_ok=True)
    
    # Copy template to assets/
    template_name = os.path.basename(template_path)
    asset_template_path = os.path.join(skill_dir, 'assets', 'template.md')
    with open(template_path, 'r') as src, open(asset_template_path, 'w') as dst:
        dst.write(src.read())
    print(f"✅ Template copied to: {asset_template_path}")
    
    # Generate generator.py
    generator_path = generate_generator_script(skill_dir)
    print(f"✅ Generator created: {generator_path}")
    
    # Build and write sample intake JSON
    schema = build_intake_schema(parsed)
    sample_path = os.path.join(skill_dir, 'references', 'sample-intake.json')
    with open(sample_path, 'w') as f:
        json.dump(schema, f, indent=2)
    print(f"✅ Sample intake created: {sample_path}")
    
    # Generate SKILL.md
    skill_md_path = generate_skill_md(skill_dir, args.name, template_name, parsed)
    print(f"✅ SKILL.md created: {skill_md_path}")
    
    # Try to package
    try:
        import subprocess
        result = subprocess.run(
            ['python3', '/usr/lib/node_modules/openclaw/skills/skill-creator/scripts/package_skill.py', skill_dir],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            print(f"✅ Skill packaged: {skill_dir}.skill")
        else:
            print(f"⚠️  Packaging issue (non-critical): {result.stderr[:200]}")
    except Exception as e:
        print(f"⚠️  Packaging skipped: {e}")
    
    # Summary
    print("\n" + "="*50)
    print(f"✅ SKILL '{args.name}' GENERATED SUCCESSFULLY")
    print("="*50)
    print(f"\nLocation: {skill_dir}")
    print(f"\nFiles created:")
    for root, dirs, files in os.walk(skill_dir):
        for f in files:
            rel = os.path.relpath(os.path.join(root, f), skill_dir)
            print(f"  📄 {rel}")
    
    print(f"\nNext steps:")
    print(f"  1. Edit: {sample_path}")
    print(f"     → Replace [Enter ...] placeholders with real data")
    print(f"  2. Test:")
    print(f"     cd {skill_dir}")
    print(f"     python3 scripts/generator.py \\")
    print(f"       --intake references/sample-intake.json \\")
    print(f"       --template assets/template.md \\")
    print(f"       --output /tmp/test-output.md")
    print(f"  3. Review: cat /tmp/test-output.md")

if __name__ == '__main__':
    main()
