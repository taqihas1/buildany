#!/usr/bin/env python3
"""Compare two RFP versions and report differences."""
import difflib, re, os

def load_file(path):
    with open(path) as f:
        return f.readlines()

def extract_sections(lines):
    """Extract sections by heading level."""
    sections = {}
    current_section = 'frontmatter'
    current_content = []
    
    for line in lines:
        if line.startswith('# ') and not line.startswith('## '):
            sections[current_section] = current_content
            current_section = line.strip().lstrip('# ').lower().replace(' ', '_').replace('-', '_')
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
                'old_text': '',
                'new_text': new_text
            })
        elif not new:
            changes.append({
                'section': section,
                'type': 'deleted',
                'old_text': old_text,
                'new_text': ''
            })
        else:
            # Show line-by-line diff — convert to lists of lines
            old_lines = old_text.splitlines(keepends=True)
            new_lines = new_text.splitlines(keepends=True)
            diff = list(difflib.unified_diff(
                old_lines, new_lines,
                fromfile=f'{section} (old)',
                tofile=f'{section} (new)',
                lineterm=''
            ))
            changes.append({
                'section': section,
                'type': 'modified',
                'old_text': old_text,
                'new_text': new_text,
                'diff': '\n'.join(diff)
            })
    
    return changes

def format_changes(changes, old_version, new_version):
    """Format changes for human review."""
    output = f"# Change Report: {old_version} → {new_version}\n\n"
    output += f"**Total sections changed**: {len(changes)}\n\n"
    
    added = sum(1 for c in changes if c['type'] == 'added')
    deleted = sum(1 for c in changes if c['type'] == 'deleted')
    modified = sum(1 for c in changes if c['type'] == 'modified')
    
    output += f"| Type | Count |\n|------|-------|\n"
    output += f"| Added | {added} |\n"
    output += f"| Deleted | {deleted} |\n"
    output += f"| Modified | {modified} |\n\n"
    output += "---\n\n"
    
    for change in changes:
        section = change['section'].replace('_', ' ').title()
        output += f"## {section} ({change['type'].upper()})\n\n"
        
        if change['type'] == 'added':
            output += "**New section added:**\n\n```\n"
            output += change['new_text'][:2000]
            if len(change['new_text']) > 2000:
                output += "\n... [truncated, see full version for complete text]"
            output += "\n```\n\n"
        elif change['type'] == 'deleted':
            output += "**Section removed:**\n\n```\n"
            output += change['old_text'][:2000]
            if len(change['old_text']) > 2000:
                output += "\n... [truncated]"
            output += "\n```\n\n"
        else:
            output += "**Changes detected:**\n\n```diff\n"
            diff_lines = change['diff'].split('\n')
            output += '\n'.join(diff_lines[:50])
            if len(diff_lines) > 50:
                output += "\n... [truncated, see full diff in source files]"
            output += "\n```\n\n"
    
    return output

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--old', required=True, help='Previous version markdown')
    parser.add_argument('--new', required=True, help='New version markdown')
    parser.add_argument('--output', required=True, help='Change report output')
    parser.add_argument('--old-label', default='v1', help='Label for old version')
    parser.add_argument('--new-label', default='v2', help='Label for new version')
    args = parser.parse_args()
    
    old_lines = load_file(args.old)
    new_lines = load_file(args.new)
    
    old_sections = extract_sections(old_lines)
    new_sections = extract_sections(new_lines)
    
    changes = compare_sections(old_sections, new_sections)
    
    report = format_changes(changes, args.old_label, args.new_label)
    
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    
    with open(args.output, 'w') as f:
        f.write(report)
    
    print(f"✅ Change report: {args.output}")
    print(f"📊 {len(changes)} sections changed")
    print(f"   Added: {sum(1 for c in changes if c['type'] == 'added')}")
    print(f"   Deleted: {sum(1 for c in changes if c['type'] == 'deleted')}")
    print(f"   Modified: {sum(1 for c in changes if c['type'] == 'modified')}")

if __name__ == '__main__':
    main()
