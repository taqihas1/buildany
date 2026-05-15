#!/usr/bin/env python3
"""
Proposal Generator — Auto-fills RFP templates from client intake forms.

Usage:
    python generator.py --intake client.json --template proposal-template-vendor.md --output proposal.md
    python generator.py --intake client.json --template proposal-template-vendor.html --output proposal.html
    python generator.py --intake client.json --template template.md --output proposal.pdf  # needs weasyprint or pandoc

Features:
    • Maps intake JSON fields to template placeholders ({{key}} or [KEY])
    • Conditional blocks: {{#if key}}...{{/if}}
    • Date calculations: {{date:+90}} for 90 days from today
    • Array loops: {{#each team_members}}...{{/each}}
    • Auto-calculates pricing, timelines, and derived fields
    • Outputs Markdown, HTML, or PDF
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

# ── Placeholder regex ────────────────────────────────────────────────────────
# Matches {{key}}, {{key.sub}}, {{#if key}}, {{#each key}}, {{/if}}, {{/each}}
# Block directives (#if, #each) may contain spaces: {{#if needs.objectives}}
PLACEHOLDER_RE = re.compile(r'\{\{([#\/]?)\s*([\w.]+(?:\s+[\w.]+)*)\s*(?::([^}]+))?\}\}')
# Also supports [KEY] style as fallback
BRACKET_RE = re.compile(r'\[([A-Z][A-Z_0-9 ]+)\]')

# ── Core engine ─────────────────────────────────────────────────────────────

class ProposalGenerator:
    def __init__(self, intake: dict, config: Optional[dict] = None):
        self.intake = intake
        self.config = config or {}
        self.now = datetime.now()
        self._computed: Dict[str, Any] = {}
        self._precompute()

    # ── Pre-compute derived / smart fields ─────────────────────────────────────
    def _precompute(self):
        """Compute derived values (pricing totals, timeline dates, etc.)."""
        i = self.intake
        c = self._computed

        # Dates
        c['TODAY'] = self.now.strftime('%B %d, %Y')
        c['TODAY_ISO'] = self.now.strftime('%Y-%m-%d')
        c['DATE_SHORT'] = self.now.strftime('%m/%d/%Y')

        # Timeline helpers
        duration_weeks = self._get(i, 'project.duration_weeks', 12)
        c['DURATION_WEEKS'] = duration_weeks
        c['DURATION_MONTHS'] = round(duration_weeks / 4.33, 1)
        c['VALID_UNTIL'] = (self.now + timedelta(days=90)).strftime('%B %d, %Y')
        c['VALID_UNTIL_SHORT'] = (self.now + timedelta(days=90)).strftime('%m/%d/%Y')

        # Pricing totals
        services = self._get(i, 'pricing.professional_services', 0)
        licenses = self._get(i, 'pricing.software_licenses', 0)
        infra = self._get(i, 'pricing.infrastructure', 0)
        training = self._get(i, 'pricing.training', 0)
        c['TOTAL_INVESTMENT'] = f'${services + licenses + infra + training:,}'
        c['PROF_SERVICES'] = f'${services:,}'
        c['SOFTWARE_LICENSES'] = f'${licenses:,}'
        c['INFRASTRUCTURE'] = f'${infra:,}'
        c['TRAINING_COST'] = f'${training:,}'

        # Payment schedule (default 10/15/20/25/15/10/5)
        total = services + licenses + infra + training
        c['PAY_KICKOFF'] = f'${int(total * 0.10):,}'
        c['PAY_DISCOVERY'] = f'${int(total * 0.15):,}'
        c['PAY_DESIGN'] = f'${int(total * 0.20):,}'
        c['PAY_BUILD'] = f'${int(total * 0.25):,}'
        c['PAY_UAT'] = f'${int(total * 0.15):,}'
        c['PAY_GOLIVE'] = f'${int(total * 0.10):,}'
        c['PAY_CLOSE'] = f'${int(total * 0.05):,}'

        # Phase durations (default distribution)
        c['PHASE_DISCOVERY_WEEKS'] = max(2, int(duration_weeks * 0.15))
        c['PHASE_DESIGN_WEEKS'] = max(2, int(duration_weeks * 0.20))
        c['PHASE_IMPL_WEEKS'] = max(3, int(duration_weeks * 0.35))
        c['PHASE_TEST_WEEKS'] = max(2, int(duration_weeks * 0.15))
        c['PHASE_GOLIVE_WEEKS'] = max(1, int(duration_weeks * 0.15))

        # Reference counter
        team = self._get(i, 'team', [])
        c['TEAM_SIZE'] = len(team)

        # Vendor years in business
        founded = self._get(i, 'vendor.founded')
        if founded:
            try:
                c['vendor.founded_years'] = self.now.year - int(founded)
            except (ValueError, TypeError):
                c['vendor.founded_years'] = ''

        # Milestone dates (linear from start_date if provided)
        start = self._get(i, 'project.start_date')
        if start:
            try:
                start_dt = datetime.strptime(start, '%Y-%m-%d')
                c['MILESTONE_KICKOFF'] = start_dt.strftime('%B %d, %Y')
                c['MILESTONE_DISCOVERY'] = (start_dt + timedelta(weeks=c['PHASE_DISCOVERY_WEEKS'])).strftime('%B %d, %Y')
                c['MILESTONE_DESIGN'] = (start_dt + timedelta(weeks=c['PHASE_DISCOVERY_WEEKS'] + c['PHASE_DESIGN_WEEKS'])).strftime('%B %d, %Y')
                c['MILESTONE_BUILD'] = (start_dt + timedelta(weeks=c['PHASE_DISCOVERY_WEEKS'] + c['PHASE_DESIGN_WEEKS'] + c['PHASE_IMPL_WEEKS'])).strftime('%B %d, %Y')
                c['MILESTONE_UAT'] = (start_dt + timedelta(weeks=duration_weeks - c['PHASE_GOLIVE_WEEKS'] - c['PHASE_TEST_WEEKS'])).strftime('%B %d, %Y')
                c['MILESTONE_GOLIVE'] = (start_dt + timedelta(weeks=duration_weeks - c['PHASE_GOLIVE_WEEKS'])).strftime('%B %d, %Y')
                c['MILESTONE_CLOSE'] = (start_dt + timedelta(weeks=duration_weeks)).strftime('%B %d, %Y')
            except Exception:
                pass

        # Project title defaults
        c['PROJECT_TITLE'] = self._get(i, 'project.title', 'IT Consulting Services')
        c['REF_NUMBER'] = self._get(i, 'project.ref', f"PROP-{self.now.strftime('%Y%m%d')}-001")

        # Merge everything into a flat lookup
        self._flat = self._flatten({**i, **c})

    def _get(self, d: dict, path: str, default=None):
        """Safe nested dict access using dot notation."""
        keys = path.split('.')
        for k in keys:
            if isinstance(d, dict) and k in d:
                d = d[k]
            else:
                return default
        return d

    def _flatten(self, d: dict, prefix='') -> dict:
        """Flatten nested dict into dot-notation keys."""
        items = {}
        for k, v in d.items():
            key = f"{prefix}{k}" if not prefix else f"{prefix}.{k}"
            if isinstance(v, dict):
                items.update(self._flatten(v, key))
            else:
                items[key] = v
        return items

    def resolve(self, key: str) -> Any:
        """Look up a key in flat data, then raw intake, then computed."""
        if key in self._flat:
            v = self._flat[key]
            if v is None:
                return ''
            return v
        # Fallback to bracket-style aliases
        aliases = {
            'YOUR COMPANY NAME': 'vendor.company_name',
            'CLIENT NAME': 'client.name',
            'PROJECT TITLE': 'project.title',
            'DATE': 'TODAY',
            'REF-XXXX': 'REF_NUMBER',
            'DATE + 90/120 DAYS': 'VALID_UNTIL',
            'AMOUNT': 'PROF_SERVICES',
            'X': 'DURATION_WEEKS',
            'X weeks / months': 'DURATION_WEEKS',
            'X%': '30%',
            '[Year]': 'vendor.founded',
            '[Location]': 'vendor.headquarters',
            '[Number]': 'vendor.employees',
            'X years': 'vendor.founded_years',
            'methodology name': 'solution.methodology',
            'industry': 'client.industry',
            '[technologies]': 'solution.platform',
        }
        if key in aliases:
            return self.resolve(aliases[key])
        return ''

    # ── Template processing ──────────────────────────────────────────────────
    def render(self, template: str) -> str:
        """Render a template string with all placeholders resolved."""
        # First handle {{...}} style
        result = self._render_blocks(template)
        # Then handle legacy [UPPERCASE] brackets
        result = self._render_brackets(result)
        return result

    def _render_brackets(self, text: str) -> str:
        def repl(m):
            key = m.group(1).strip()
            val = self.resolve(key)
            if val == '' or val is None:
                return m.group(0)  # keep placeholder if no data
            return str(val)
        return BRACKET_RE.sub(repl, text)

    def _render_blocks(self, text: str) -> str:
        """Handle {{key}}, {{#if key}}, {{#each key}}, and date math."""
        result = []
        i = 0
        while i < len(text):
            m = PLACEHOLDER_RE.search(text, i)
            if not m:
                result.append(text[i:])
                break

            result.append(text[i:m.start()])

            prefix = m.group(1)      # '', '#', or '/'
            key = m.group(2)
            fmt = m.group(3)         # e.g. +90 for dates

            if prefix == '#':
                # Block open — find matching close
                if key.startswith('if '):
                    cond_key = key[3:].strip()
                    block_content, end_pos = self._extract_block(text, m.end(), 'if')
                    cond_val = self.resolve(cond_key)
                    truthy = bool(cond_val and str(cond_val).lower() not in ('false', '0', '', 'none', 'null'))
                    if truthy:
                        rendered = self._render_blocks(block_content)
                        result.append(rendered)
                    i = end_pos
                elif key.startswith('each '):
                    arr_key = key[5:].strip()
                    block_content, end_pos = self._extract_block(text, m.end(), 'each')
                    arr = self.resolve(arr_key)
                    if isinstance(arr, list):
                        for idx, item in enumerate(arr, start=1):
                            # Temporarily overlay item fields
                            old_flat = dict(self._flat)
                            if isinstance(item, dict):
                                for k, v in item.items():
                                    self._flat[k] = v
                                    self._flat[f'{arr_key}.{k}'] = v
                            else:
                                # For primitive arrays (strings, numbers), set `.` and `this`
                                self._flat['.'] = item
                                self._flat['this'] = item
                            # Also provide loop index
                            self._flat['index'] = idx
                            rendered = self._render_blocks(block_content)
                            result.append(rendered)
                            self._flat = old_flat
                    i = end_pos
                else:
                    # Unknown block — keep as-is
                    result.append(m.group(0))
                    i = m.end()
            elif prefix == '/':
                # Closing tag should never be hit here (handled by _extract_block)
                result.append(m.group(0))
                i = m.end()
            else:
                # Simple value
                val = self.resolve(key)
                if fmt and fmt.startswith(('+', '-')):
                    # Date math
                    try:
                        days = int(fmt)
                        dt = self.now + timedelta(days=days)
                        val = dt.strftime('%B %d, %Y')
                    except ValueError:
                        pass
                if val == '' or val is None:
                    val = m.group(0)  # keep placeholder
                result.append(str(val))
                i = m.end()

        return ''.join(result)

    def _extract_block(self, text: str, start: int, block_type: str) -> tuple:
        """Extract content of a {{#if}} or {{#each}} block until matching {{/if}}/{{/each}}."""
        depth = 1
        i = start
        # Match block open with optional spaces: {{#if foo.bar}} or {{#if  foo}}
        open_pat = re.compile(r'\{\{#\s*' + re.escape(block_type) + r'\b')
        close_pat = re.compile(r'\{\{/\s*' + re.escape(block_type) + r'\s*\}\}')
        while i < len(text):
            # Search for next placeholder
            m = PLACEHOLDER_RE.search(text, i)
            if not m:
                break
            prefix = m.group(1)
            key = m.group(2).strip()
            if prefix == '#' and key.startswith(block_type + ' '):
                depth += 1
            elif prefix == '/' and key == block_type:
                depth -= 1
                if depth == 0:
                    return text[start:m.start()], m.end()
            i = m.end()
        # Unclosed block — return rest
        return text[start:], len(text)


# ── Output helpers ──────────────────────────────────────────────────────────

def to_pdf_weasyprint(html: str, output_path: str):
    try:
        from weasyprint import HTML
        HTML(string=html).write_pdf(output_path)
        return True
    except ImportError:
        return False

def to_pdf_pandoc(md: str, output_path: str):
    import subprocess
    try:
        proc = subprocess.run(
            ['pandoc', '-f', 'markdown', '-t', 'pdf', '-o', output_path],
            input=md.encode(),
            capture_output=True,
            timeout=30
        )
        return proc.returncode == 0
    except Exception:
        return False

def md_to_html(md: str) -> str:
    """Basic markdown → HTML conversion for template wrapping."""
    try:
        import markdown
        return markdown.markdown(md, extensions=['tables', 'fenced_code', 'toc'])
    except ImportError:
        # Very naive fallback
        html = md
        html = re.sub(r'^### (.*)$', r'<h3>\1</h3>', html, flags=re.M)
        html = re.sub(r'^## (.*)$', r'<h2>\1</h2>', html, flags=re.M)
        html = re.sub(r'^# (.*)$', r'<h1>\1</h1>', html, flags=re.M)
        html = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', html)
        html = re.sub(r'\*(.*?)\*', r'<em>\1</em>', html)
        html = f'<html><body>\n{html}\n</body></html>'
        return html


def load_template(path: str) -> str:
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def load_intake(path: str) -> dict:
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser(description='Auto-fill proposal templates from client intake JSON.')
    parser.add_argument('--intake', '-i', required=True, help='Path to client intake JSON file')
    parser.add_argument('--template', '-t', required=True, help='Path to template file (.md or .html)')
    parser.add_argument('--output', '-o', required=True, help='Output path (.md, .html, .pdf)')
    parser.add_argument('--config', '-c', help='Optional generator config JSON')
    parser.add_argument('--wrap-html', action='store_true', help='Wrap markdown output in HTML body')
    args = parser.parse_args()

    if not os.path.exists(args.intake):
        print(f"❌ Intake file not found: {args.intake}")
        sys.exit(1)
    if not os.path.exists(args.template):
        print(f"❌ Template file not found: {args.template}")
        sys.exit(1)

    intake = load_intake(args.intake)
    config = load_intake(args.config) if args.config and os.path.exists(args.config) else {}
    template = load_template(args.template)

    gen = ProposalGenerator(intake, config)
    rendered = gen.render(template)

    ext = Path(args.output).suffix.lower()

    if ext == '.pdf':
        # Try markdown path first if template was markdown
        is_md = Path(args.template).suffix.lower() == '.md'
        ok = False
        if is_md:
            ok = to_pdf_pandoc(rendered, args.output)
        if not ok:
            html = md_to_html(rendered) if is_md else rendered
            ok = to_pdf_weasyprint(html, args.output)
        if not ok:
            # Fallback: write HTML then tell user
            html_out = args.output.replace('.pdf', '.html')
            with open(html_out, 'w', encoding='utf-8') as f:
                f.write(md_to_html(rendered) if is_md else rendered)
            print(f"⚠️  PDF generation requires pandoc or weasyprint. Wrote HTML instead: {html_out}")
            sys.exit(1)
    elif ext == '.html':
        if Path(args.template).suffix.lower() == '.md' or args.wrap_html:
            rendered = md_to_html(rendered)
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(rendered)
    else:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(rendered)

    print(f"✅ Proposal generated: {args.output}")
    print(f"   Client: {gen.resolve('client.name')}")
    print(f"   Project: {gen.resolve('project.title')}")
    print(f"   Total Investment: {gen.resolve('TOTAL_INVESTMENT')}")


if __name__ == '__main__':
    main()
