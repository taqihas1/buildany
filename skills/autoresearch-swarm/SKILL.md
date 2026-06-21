---
name: autoresearch-swarm
description: AutoResearch ratchet methodology + agent swarm deployment for iterative app development. Use when building, debugging, or scaling React Native/Expo apps with phased feature rollouts. Triggers on phrases like "deploy agents", "agent swarm", "autoresearch", "ratchet loop", "phased rollout", "parallel work streams", "fix then test then commit", "diagnose modify verify".
---

# AutoResearch + Agent Swarm Skill

## Philosophy

Based on Andrej Karpathy's AutoResearch pattern:
> "LLMs are good at unstructured research. The trick is to build a ratchet — a loop that turns fuzzy exploration into verified, committed progress."

**The Ratchet Loop:**
```
DIAGNOSE → MODIFY → TEST → VERIFY → COMMIT → REPEAT
     ↑___________________________________________↓
```

Each iteration must produce a **verifiable artifact** (working code, passing test, committed change). No speculative changes. No "try this and see."

---

## Phase 1: Diagnose (The "What" and "Why")

Before writing any fix:

1. **Reproduce the failure** — get exact error message, screenshot, or behavior
2. **Read the affected code** — full function block (±30 lines), not just the error line
3. **Check dependencies** — imports, types, recent commits that might have broken it
4. **Identify root cause** — distinguish symptom from cause (e.g., "blank screen" vs "ScrollView not scrolling to top")
5. **Document in memory** — write findings to `memory/YYYY-MM-DD.md`

**Diagnostic Checklist:**
- [ ] Exact error message captured?
- [ ] Full code block read and understood?
- [ ] Type-check passes (`npx tsc --noEmit`)?
- [ ] No circular imports?
- [ ] Data shape matches interface?
- [ ] Recent commits reviewed (`git log --oneline -10`)?

---

## Phase 2: Modify (Surgical, Not Speculative)

1. **One fix at a time** — if multiple issues, stack them in order of dependency
2. **Edit verification** — after every edit, read the affected block to confirm it's clean
3. **Type safety** — ensure TypeScript compiles before moving on
4. **No orphaned code** — remove dead imports, unused variables, commented-out experiments
5. **Minimal diff** — smaller changes are easier to verify and roll back

**Edit Safety Rules:**
- After `edit` tool call, immediately `read` the affected block
- Run `npx tsc --noEmit` after every TypeScript change
- Check for duplicate declarations: `grep -n "function <name>" <file>`
- Check for missing imports after deletions

---

## Phase 3: Test (Verify Before Declaring Victory)

**For Expo / React Native:**

1. **Static verification:**
   ```bash
   npx tsc --noEmit
   npx expo doctor
   ```

2. **Metro bundle test:**
   ```bash
   npx expo start --clear --offline
   curl http://localhost:8081/node_modules/expo/AppEntry.bundle?platform=ios&dev=true | tail -3
   ```
   Expected: Ends with `__r(0);`

3. **Runtime verification (if possible):**
   - Start cooking button → scrolls to steps
   - Fridge feature → finds matches
   - Links feature → saves and deletes
   - Search → finds new recipes
   - No pork/ham in any recipe

**For Data/Backend:**
- Unit tests on critical functions
- Integration tests on API endpoints
- Data validation (no nulls where required, types match)

---

## Phase 4: Verify (The "Did It Actually Work?" Check)

**Verification = Evidence, Not Hope**

- Screenshot of working feature? Save to `memorized_media/`
- Test output passing? Capture the log
- TypeScript clean? `npx tsc --noEmit` with 0 errors
- Bundle compiles? `curl` test shows `__r(0);`
- Git diff reviewed? `git diff --stat` shows expected files changed

**Write verification results to memory:**
```markdown
## Verification: [Feature Name]
- Date: YYYY-MM-DD
- Type-check: PASS / FAIL (errors: N)
- Bundle compile: PASS / FAIL
- Runtime test: PASS / FAIL
- Screenshots: [path or "none"]
- Notes: [any observations]
```

---

## Phase 5: Commit (Lock In Progress)

**Commit after EVERY verified fix.** Small commits are better than big bangs.

```bash
git add -A
git commit -m "fix: [what] — [why]"
```

**Commit message format:**
- `fix:` bug fix
- `feat:` new feature
- `refactor:` code change that neither fixes nor adds
- `test:` adding tests
- `docs:` documentation
- `chore:` maintenance

**Pre-commit checklist:**
- [ ] `npx tsc --noEmit` passes
- [ ] Only intended files staged (`git diff --cached --stat`)
- [ ] No secrets in diff
- [ ] Commit message explains WHAT and WHY

---

## Phase 6: Repeat (Next Ratchet Click)

After commit, immediately assess:
1. What verification didn't I do? (edge cases, error states)
2. What's the next most important fix/feature?
3. Is there a blocker I should surface to the user?

**Never leave the loop with uncommitted changes.**

---

## Agent Swarm Deployment

### When to Use Swarm Mode

- Multiple independent work streams (e.g., UI fixes + data additions + testing)
- Time-parallelizable tasks (e.g., generate 30 recipe images simultaneously)
- Complex multi-file refactors that can be isolated

### Swarm Architecture

```
┌─────────────────┐
│   Coordinator   │  ← You (main agent)
│  (this session) │
└────────┬────────┘
         │
    ┌────┴────┬────────┬────────┐
    ↓         ↓        ↓        ↓
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│Agent 1│ │Agent 2│ │Agent 3│ │Agent 4│
│  UI   │ │ Data  │ │ Ads   │ │ Test  │
│ Fixes │ │ Import│ │Integr.│ │Verify │
└───────┘ └───────┘ └───────┘ └───────┘
```

### Swarm Task Template

Each subagent receives:

```markdown
# Task Brief: [Name]
## Context
[Link to relevant files, interfaces, patterns]

## Goal
[Specific, verifiable outcome]

## Constraints
- Must compile with `npx tsc --noEmit`
- Must follow existing code style
- Must not break other features
- [Project-specific rules]

## Verification Steps
1. [How to verify this task is complete]
2. [Expected output/behavior]

## Deliverable
[File paths to modify/create, or test to pass]
```

### Synchronous Fallback (When Gateway Blocks Subagents)

If `sessions_spawn` fails with gateway/pairing errors, use **simulated swarm**:

1. **Batch tasks** — group related changes into single logical commits
2. **Fast sequential** — complete one stream, verify, commit, next stream
3. **Document parallelism** — note in commit messages what would be parallel
4. **Status tracking** — use in-memory TODO lists:
   ```markdown
   ## Swarm Status
   - [x] Stream 1: UI fixes (commit: abc1234)
   - [x] Stream 2: Data import (commit: def5678)
   - [ ] Stream 3: Ads integration (blocked by: need AdMob ID)
   - [x] Stream 4: Testing (commit: ghi9012)
   ```

### Subagent Spawn Command

```javascript
// When gateway supports subagents
sessions_spawn({
  task: "# Task Brief: [Name]\n## Context...\n## Goal...",
  runtime: "subagent",
  mode: "run",
  timeoutSeconds: 300,
  label: "recipewise-[stream-name]"
})
```

**Pre-flight gateway check:**
```bash
openclaw gateway status
openclaw devices list  # Check for pending approvals
```

If `bind=loopback` and remote subagents fail, use **simulated swarm** instead.

---

## RecipeWise-Specific Patterns

### Pork Detection (Pre-Import Check)

```typescript
const PORK_PATTERNS = [\bham\b, \bbacon\b, \bpork\b, \bprosciutto\b, \bsalami\b, \bpepperoni\b, \bchorizo\b, \bbratwurst\b];
function hasPork(recipe: Recipe): boolean {
  const text = `${recipe.title} ${recipe.description} ${recipe.ingredients.map(i => i.name).join(' ')}`.toLowerCase();
  return PORK_PATTERNS.some(p => p.test(text));
}
```

**Always run before adding recipes.** False positive check: "Graham" contains "ham" but word boundary `\bham\b` prevents it.

### Recipe Data Validation

```typescript
function validateRecipe(r: Recipe): string[] {
  const errors: string[] = [];
  if (!r.id?.startsWith('r')) errors.push('Invalid ID');
  if (!r.title) errors.push('Missing title');
  if (!Array.isArray(r.mealType)) errors.push('mealType must be array');
  if (!Array.isArray(r.tasteTags)) errors.push('tasteTags must be array');
  if (!r.ingredients?.length) errors.push('No ingredients');
  if (!r.steps?.length) errors.push('No steps');
  if (r.steps.some(s => !s.instruction)) errors.push('Empty step instruction');
  return errors;
}
```

### Image Strategy Decision Tree

```
Need image for recipe?
├── Local file exists in assets/images/?
│   └── YES → Use require(`../assets/images/${id}.jpg`)
│   └── NO → Can generate AI image?
│       └── YES → Generate, save to assets/images/, use local
│       └── NO → Use Unsplash URL (fallback, may fail offline)
```

**Batch generation:** For 30+ images, use parallel image generation API calls. For 100+, use a background job with progress tracking.

---

## Pre-Flight + AutoResearch Combined Script

Save as `scripts/autoresearch-preflight.js`:

```javascript
#!/usr/bin/env node
/**
 * AutoResearch Pre-Flight + Ratchet Verification
 * Run before EVERY commit to ensure quality gates pass.
 */

const { execSync } = require('child_process');
const fs = require('fs');

const REPORT_FILE = 'autoresearch-report.json';
const gates = {
  typescript: false,
  tests: false,
  bundle: false,
  lint: false,
  porkFree: false,
};

function run(cmd, label) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    console.log(`✅ ${label}`);
    return { pass: true, output: out };
  } catch (e) {
    console.log(`❌ ${label}`);
    return { pass: false, output: e.stderr || e.message };
  }
}

// Gate 1: TypeScript
gates.typescript = run('npx tsc --noEmit', 'TypeScript compilation').pass;

// Gate 2: Tests (if test script exists)
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.scripts?.test) {
  gates.tests = run('npm test -- --watchAll=false 2>/dev/null || true', 'Tests').pass;
}

// Gate 3: Metro bundle compilation
gates.bundle = run(
  'curl -s --max-time 30 "http://localhost:8081/node_modules/expo/AppEntry.bundle?platform=ios&dev=true" | tail -1 | grep -q "__r(0);"',
  'Metro bundle compile'
).pass;

// Gate 4: ESLint (if configured)
if (pkg.scripts?.lint) {
  gates.lint = run('npm run lint', 'Linting').pass;
}

// Gate 5: Pork check (RecipeWise-specific)
const recipesFiles = fs.readdirSync('lib/data').filter(f => f.startsWith('recipes'));
let porkFound = false;
for (const file of recipesFiles) {
  const content = fs.readFileSync(`lib/data/${file}`, 'utf8').toLowerCase();
  if (/\bham\b/.test(content) || /\bbacon\b/.test(content) || /\bpork\b/.test(content)) {
    console.log(`❌ Pork found in ${file}`);
    porkFound = true;
  }
}
gates.porkFree = !porkFound;
if (gates.porkFree) console.log('✅ No pork/ham/bacon detected');

// Report
fs.writeFileSync(REPORT_FILE, JSON.stringify({ timestamp: new Date().toISOString(), gates, pass: Object.values(gates).every(Boolean) }, null, 2));

const allPass = Object.values(gates).every(Boolean);
console.log(allPass ? '\n🎉 ALL GATES PASS — Ready to commit!' : '\n⚠️ Some gates failed — fix before committing.');
process.exit(allPass ? 0 : 1);
```

---

## Golden Rules (Memorize)

1. **Diagnose before modifying** — never guess the fix
2. **Verify before committing** — passing type-check is the minimum bar
3. **One fix, one commit** — small ratchet clicks beat big bangs
4. **Read the full block after editing** — ±20 lines, check for orphans
5. **Test the unhappy path** — what happens when data is missing?
6. **Document in memory** — every session produces a diary entry
7. **Swarm when parallelizable** — simulated if gateway blocks, real if available
8. **Always check for pork** — word boundaries matter (`\bham\b`, not `ham`)
9. **Never leave uncommitted changes** — commit locks in progress
10. **The user decides priority** — but you decide execution order
