#!/usr/bin/env python3
"""Generate RFP from template, intake, and knowledge base."""
import json, os, glob, re
from pathlib import Path

def load_intake(path):
    with open(path) as f:
        return json.load(f)

def extract_frontmatter(md_content):
    """Extract YAML frontmatter from markdown."""
    if md_content.startswith('---'):
        parts = md_content.split('---', 2)
        if len(parts) >= 3:
            return parts[1], parts[2]
    return "", md_content

def query_kb(kb_dir, industry, project_type):
    """Query markdown knowledge base for relevant content."""
    results = {}
    
    # Load vendor profile
    vendor_path = os.path.join(kb_dir, 'vendor-profile.md')
    if os.path.exists(vendor_path):
        with open(vendor_path) as f:
            _, content = extract_frontmatter(f.read())
            results['vendor'] = content
    
    # Load relevant case studies
    case_studies = []
    cs_dir = os.path.join(kb_dir, 'case-studies')
    if os.path.exists(cs_dir):
        for cs_file in glob.glob(os.path.join(cs_dir, '*.md')):
            with open(cs_file) as f:
                content = f.read()
                # Check if relevant to industry or project_type
                if industry.lower() in content.lower() or project_type.lower() in content.lower():
                    _, body = extract_frontmatter(content)
                    case_studies.append(body)
    results['case_studies'] = case_studies[:2] if case_studies else []
    
    # Load team template - try multiple naming conventions
    team_variants = [
        f'{project_type}.md',
        f'{project_type.replace("_", "-")}.md',
        f'{project_type.replace("_", "")}.md'
    ]
    team_content = None
    for variant in team_variants:
        team_file = os.path.join(kb_dir, 'team-templates', variant)
        if os.path.exists(team_file):
            with open(team_file) as f:
                _, content = extract_frontmatter(f.read())
                team_content = content
            break
    
    if team_content:
        results['team'] = team_content
    else:
        # Fallback to cloud-migration
        fallback = os.path.join(kb_dir, 'team-templates', 'cloud-migration.md')
        if os.path.exists(fallback):
            with open(fallback) as f:
                _, content = extract_frontmatter(f.read())
                results['team'] = content
    
    # Load methodology
    method_path = os.path.join(kb_dir, 'methodology', 'cloud-ascend.md')
    if os.path.exists(method_path):
        with open(method_path) as f:
            _, content = extract_frontmatter(f.read())
            results['methodology'] = content
    
    # Load differentiators
    diff_file = os.path.join(kb_dir, 'differentiators', f'{industry}.md')
    if os.path.exists(diff_file):
        with open(diff_file) as f:
            _, content = extract_frontmatter(f.read())
            results['differentiators'] = content
    else:
        # Fallback to general differentiators if available
        fallback_diff = os.path.join(kb_dir, 'differentiators', 'general.md')
        if os.path.exists(fallback_diff):
            with open(fallback_diff) as f:
                _, content = extract_frontmatter(f.read())
                results['differentiators'] = content
    
    # Load pricing
    pricing_path = os.path.join(kb_dir, 'pricing', 'daily-rates.md')
    if os.path.exists(pricing_path):
        with open(pricing_path) as f:
            _, content = extract_frontmatter(f.read())
            results['pricing'] = content
    
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
    
    # Client challenges and objectives
    needs = intake.get('needs', {})
    challenges = needs.get('challenges', ['Legacy system limitations', 'Scalability constraints', 'Compliance requirements'])
    objectives = needs.get('objectives', ['Modernize infrastructure', 'Improve operational efficiency', 'Reduce total cost of ownership'])
    output = output.replace('{{CLIENT_CHALLENGES}}', '\n'.join(f'- {c}' for c in challenges))
    output = output.replace('{{CLIENT_OBJECTIVES}}', '\n'.join(f'- {o}' for o in objectives))
    output = output.replace('{{NEEDS_ANALYSIS}}', needs.get('analysis', 'Your organization requires a comprehensive transformation to address current operational challenges and enable future growth.'))
    output = output.replace('{{SUCCESS_FACTORS}}', '\n'.join(f'- {s}' for s in needs.get('success_factors', ['Executive sponsorship', 'Clear scope definition', 'Dedicated project team'])))
    
    # Project info
    project = intake.get('project', {})
    output = output.replace('{{PROJECT_TYPE}}', project.get('type', 'IT Consulting').replace('_', ' ').title())
    
    # Vendor info
    output = output.replace('{{VENDOR_PROFILE}}', kb.get('vendor', '[VENDOR PROFILE]'))
    
    # Case studies
    cs_content = '\n\n---\n\n'.join(kb.get('case_studies', []))
    output = output.replace('{{CASE_STUDIES}}', cs_content if cs_content else '[CASE STUDIES]')
    
    # Team
    output = output.replace('{{TEAM_TEMPLATE}}', kb.get('team', '[TEAM TEMPLATE]'))
    
    # Methodology
    output = output.replace('{{METHODOLOGY}}', kb.get('methodology', '[METHODOLOGY]'))
    
    # Differentiators
    output = output.replace('{{DIFFERENTIATORS}}', kb.get('differentiators', '[DIFFERENTIATORS]'))
    
    # Pricing
    output = output.replace('{{PRICING}}', kb.get('pricing', '[PRICING]'))
    
    # Solution
    solution = intake.get('solution', {})
    output = output.replace('{{SOLUTION_OVERVIEW}}', solution.get('overview', '[SOLUTION OVERVIEW]'))
    scope = solution.get('scope', ['Assessment and planning', 'Architecture design', 'Implementation and migration', 'Training and knowledge transfer'])
    output = output.replace('{{SOLUTION_SCOPE}}', '\n'.join(f'- {s}' for s in scope))
    deliverables = solution.get('deliverables', ['Project documentation', 'Trained staff', 'Operational system', 'Support documentation'])
    output = output.replace('{{SOLUTION_DELIVERABLES}}', '\n'.join(f'- {d}' for d in deliverables))
    
    # Timeline
    timeline = intake.get('timeline', {})
    total_weeks = timeline.get('total_duration_weeks', 24)
    output = output.replace('{{TIMELINE_WEEKS}}', str(total_weeks))
    
    # Timeline detail
    phases = timeline.get('phases', [])
    if phases:
        timeline_detail = '\n'.join(
            f"- **{p.get('name', 'Phase')}**: Week {sum(ph.get('duration_weeks', 4) for ph in phases[:i]) + 1}–{sum(ph.get('duration_weeks', 4) for ph in phases[:i+1])} — {p.get('name', 'Phase')}"
            for i, p in enumerate(phases)
        )
    else:
        timeline_detail = f"- **Week 1–{total_weeks}**: Full project duration"
    output = output.replace('{{TIMELINE_DETAIL}}', timeline_detail)
    
    # Pricing details
    pricing = intake.get('pricing', {})
    total = pricing.get('total', 0)
    currency = pricing.get('currency', 'USD')
    output = output.replace('{{TOTAL_PRICE}}', f"${total:,}" if total else '[TOTAL PRICE]')
    output = output.replace('{{CURRENCY}}', currency)
    output = output.replace('{{PROFESSIONAL_SERVICES}}', f"${pricing.get('professional_services', int(total * 0.75)):,}")
    output = output.replace('{{SOFTWARE_LICENSES}}', f"${pricing.get('software_licenses', int(total * 0.2)):,}")
    output = output.replace('{{TRAINING_COST}}', f"${pricing.get('training', int(total * 0.05)):,}")
    output = output.replace('{{TRAVEL_COST}}', f"${pricing.get('travel', int(total * 0.05)):,}")
    
    # Payment milestones
    milestones = pricing.get('payment_milestones', [
        {'percentage': 10, 'description': 'Project kickoff', 'amount': int(total * 0.1)},
        {'percentage': 20, 'description': 'Design approval', 'amount': int(total * 0.2)},
        {'percentage': 30, 'description': 'Go-live', 'amount': int(total * 0.3)},
        {'percentage': 40, 'description': 'Final acceptance', 'amount': int(total * 0.4)}
    ])
    milestones_md = '\n'.join(
        f"| {m['percentage']}% | {m['description']} | ${m['amount']:,} |"
        for m in milestones
    )
    output = output.replace('{{PAYMENT_MILESTONES}}', f"| Milestone | Description | Amount |\n|-----------|-------------|--------|\n{milestones_md}")
    
    # Terms
    terms = intake.get('terms', {})
    output = output.replace('{{TERMS}}', f"""
- **Proposal Validity**: {terms.get('validity_days', 120)} days
- **Warranty Period**: {terms.get('warranty_period', '12 months')}
- **Governing Law**: {terms.get('governing_law', 'State of California')}
- **Payment Terms**: {terms.get('payment_terms', 'Net 30 days from invoice date')}
- **Confidentiality**: All information shared during this engagement will be treated as confidential.
""")
    
    # Clean up any remaining placeholders
    output = re.sub(r'\{\{[A-Z_]+\}\}', '[TO BE COMPLETED]', output)
    
    return output

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Generate RFP from template + intake + KB')
    parser.add_argument('--intake', required=True, help='Path to intake.json')
    parser.add_argument('--kb', default=os.path.expanduser('~/.openclaw/workspace/kb'), help='Path to knowledge base directory')
    parser.add_argument('--template', required=True, help='Path to RFP template')
    parser.add_argument('--output', required=True, help='Output markdown path')
    args = parser.parse_args()
    
    intake = load_intake(args.intake)
    
    industry = intake.get('client', {}).get('industry', 'general')
    project_type = intake.get('project', {}).get('type', 'cloud_migration')
    
    kb = query_kb(args.kb, industry, project_type)
    template = load_template(args.template)
    
    rfp = populate_template(template, intake, kb)
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    
    with open(args.output, 'w') as f:
        f.write(rfp)
    
    print(f"✅ RFP generated: {args.output}")
    print(f"💰 Client: {intake.get('client', {}).get('name', 'Unknown')}")
    print(f"🏭 Industry: {industry}")
    print(f"📊 Project: {project_type}")
    print(f"📄 KB sections loaded: {list(kb.keys())}")

if __name__ == '__main__':
    main()
