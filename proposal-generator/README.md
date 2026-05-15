# Proposal Generator

Auto-fills RFP / proposal templates from a structured client intake JSON. No more manual copy-paste — define the client once, generate proposals in seconds.

## Quick Start

```bash
cd proposal-generator

# 1. Copy sample-intake.json to your-client.json and fill it in
cp sample-intake.json your-client.json
# ... edit your-client.json ...

# 2. Generate a proposal
python generator.py \
  --intake your-client.json \
  --template ../proposal-template-vendor.md \
  --output proposal.md

# 3. Or generate HTML
python generator.py \
  --intake your-client.json \
  --template ../proposal-template-vendor.html \
  --output proposal.html

# 4. Or try PDF (needs pandoc or weasyprint)
python generator.py \
  --intake your-client.json \
  --template ../proposal-template-vendor.md \
  --output proposal.pdf
```

## Intake JSON Schema

| Section | Key Fields | Purpose |
|---|---|---|
| `client` | `name`, `industry`, `location`, `contact_*` | Who the proposal is for |
| `vendor` | `company_name`, `headquarters`, `founded`, `employees` | Your company info |
| `project` | `title`, `ref`, `start_date`, `duration_weeks`, `type`, `summary` | Project identity + timeline |
| `needs` | `current_situation`, `challenges[]`, `objectives[]` | Problem statement section |
| `solution` | `methodology`, `platform`, `scope_included[]`, `scope_excluded[]`, `assumptions[]`, `value_adds[]` | What you're proposing |
| `deliverables[]` | `phase`, `deliverable`, `format`, `timing_week` | Deliverables table |
| `team[]` | `role`, `name`, `level`, `certifications`, `allocation`, `location` | Project team table |
| `pricing` | `professional_services`, `software_licenses`, `infrastructure`, `training` | Investment + auto-calculated totals |
| `case_studies[]` | `client`, `type`, `scope`, `duration`, `outcomes`, `quote` | Credibility section |
| `next_steps[]` | `step`, `action`, `owner`, `timing` | Call-to-action table |
| `contacts[]` | `role`, `name`, `email`, `phone` | Footer contact info |
| `legal` | `validity_days`, `warranty_months`, `insurance_*` | Terms |

## Placeholder Syntax

The generator replaces placeholders in templates:

| Style | Example | Description |
|---|---|---|
| Mustache | `{{client.name}}` | Basic value replacement |
| Mustache dot | `{{project.title}}` | Nested JSON access |
| Bracket | `[CLIENT NAME]` | Legacy fallback (still works) |
| Conditionals | `{{#if project.start_date}}...{{/if}}` | Show block only if value exists |
| Loops | `{{#each team}}...{{/each}}` | Iterate arrays |
| Date math | `{{date:+90}}` | Today + 90 days |

### Pre-computed / Smart Fields

You don't need to include these in intake — they're auto-calculated:

| Field | What it computes |
|---|---|
| `{{TODAY}}` | Current date (May 10, 2026) |
| `{{VALID_UNTIL}}` | Today + 90 days |
| `{{TOTAL_INVESTMENT}}` | Sum of all pricing line items |
| `{{DURATION_WEEKS}}` / `{{DURATION_MONTHS}}` | From `project.duration_weeks` |
| `{{PHASE_DISCOVERY_WEEKS}}` etc. | Auto-distributed phase durations |
| `{{PAY_KICKOFF}}` … `{{PAY_CLOSE}}` | Payment milestone amounts (10/15/20/25/15/10/5 split) |
| `{{MILESTONE_KICKOFF}}` … `{{MILESTONE_CLOSE}}` | Actual calendar dates from `start_date` |
| `{{TEAM_SIZE}}` | Count of team members |
| `{{REF_NUMBER}}` | From intake or auto-generated |

## How it Works

1. **Flatten** — nested JSON becomes dot-notation keys (`client.name`)
2. **Pre-compute** — derived fields (totals, dates, phases) calculated
3. **Render** — template parsed, placeholders replaced, conditionals evaluated, arrays looped
4. **Output** — written as Markdown, HTML, or PDF

## Customizing Templates

Any `.md` or `.html` file can be a template. Just add placeholders where you want dynamic content.

To make the existing templates work optimally, you can either:
- **Option A**: Edit the templates to use `{{client.name}}` style placeholders
- **Option B**: Use the bracket aliases — `[CLIENT NAME]` already maps to `client.name`

The generator ships with backward compatibility for the existing `[UPPERCASE]` placeholders.

## Extending

Add new computed fields in `ProposalGenerator._precompute()`:

```python
c['MY_NEW_FIELD'] = some_calculation(self.intake)
```

Then use `{{MY_NEW_FIELD}}` in any template.

## Requirements

- Python 3.9+
- Optional: `pandoc` for PDF from markdown
- Optional: `weasyprint` for PDF from HTML (`pip install weasyprint`)
- Optional: `markdown` for better MD→HTML conversion (`pip install markdown`)

## Files

| File | Purpose |
|---|---|
| `generator.py` | Core engine |
| `sample-intake.json` | Fully filled example (copy and customize) |
| `README.md` | This file |
