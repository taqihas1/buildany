#!/usr/bin/env python3
"""Incorporate user changes into next RFP version."""
import os, re

def load_file(path):
    with open(path) as f:
        return f.read()

def extract_sections(content):
    """Extract markdown sections by H1 headings."""
    sections = {}
    current_section = 'preamble'
    current_content = []
    
    for line in content.split('\n'):
        if re.match(r'^# [^#]', line):
            sections[current_section] = '\n'.join(current_content)
            current_section = line.strip().lstrip('# ').lower().replace(' ', '_').replace('-', '_')
            current_content = [line]
        else:
            current_content.append(line)
    
    sections[current_section] = '\n'.join(current_content)
    return sections

def incorporate_changes(base_path, edited_path, output_path):
    """
    Create new version by taking the edited document as the new source.
    In a more sophisticated implementation, this would:
    1. Parse both documents into sections
    2. Compare section by section
    3. Apply changes selectively based on user acceptance
    
    For now, we treat the edited version as the new canonical version
    and add a revision marker.
    """
    
    # Load both documents
    base_content = load_file(base_path)
    edited_content = load_file(edited_path)
    
    # Extract sections from both
    base_sections = extract_sections(base_content)
    edited_sections = extract_sections(edited_content)
    
    # Build changelog entry
    changelog = []
    all_sections = set(base_sections.keys()) | set(edited_sections.keys())
    
    for section in sorted(all_sections):
        base_text = base_sections.get(section, '')
        edited_text = edited_sections.get(section, '')
        
        if base_text == edited_text:
            continue
        
        if not base_text:
            changelog.append(f"- **{section}**: Section added")
        elif not edited_text:
            changelog.append(f"- **{section}**: Section removed")
        else:
            # Estimate change size
            base_len = len(base_text)
            edited_len = len(edited_text)
            delta = edited_len - base_len
            if abs(delta) > 100:
                direction = "expanded" if delta > 0 else "condensed"
                changelog.append(f"- **{section}**: {direction} ({abs(delta)} chars)")
            else:
                changelog.append(f"- **{section}**: Modified")
    
    # Add revision marker to edited content
    revision_marker = f"""

<!-- 
REVISION METADATA
Previous version: {os.path.basename(base_path)}
Changes incorporated: {len(changelog)} sections
Change summary:
{chr(10).join(changelog) if changelog else 'No structural changes detected'}
-->
"""
    
    new_content = edited_content + revision_marker
    
    # Write output
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        f.write(new_content)
    
    return changelog

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', required=True, help='Base version markdown')
    parser.add_argument('--edited', required=True, help='User-edited markdown')
    parser.add_argument('--output', required=True, help='New version markdown')
    parser.add_argument('--changelog', help='Changelog output path')
    args = parser.parse_args()
    
    changelog = incorporate_changes(args.base, args.edited, args.output)
    
    print(f"✅ New version created: {args.output}")
    print(f"📊 Changes incorporated: {len(changelog)} sections")
    for entry in changelog:
        print(f"   {entry}")
    
    # Write separate changelog if requested
    if args.changelog:
        os.makedirs(os.path.dirname(args.changelog), exist_ok=True)
        with open(args.changelog, 'w') as f:
            f.write("# Changes Incorporated\n\n")
            f.write(f"From: {args.base}\n")
            f.write(f"To: {args.edited}\n\n")
            for entry in changelog:
                f.write(f"{entry}\n")
        print(f"📝 Changelog: {args.changelog}")

if __name__ == '__main__':
    main()
