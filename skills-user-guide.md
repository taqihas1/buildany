# OpenClaw Skills User Guide

## Your Agent Now Has 38+ Production-Grade Skills

This guide covers how to use the skills that were just added to your OpenClaw assistant.

---

## What Was Added

### Addy Osmani's Agent-Skills (24 skills)
Full dev lifecycle: **Define → Plan → Build → Verify → Review → Ship**

| Phase | Skill | What It Does |
|-------|-------|-------------|
| **Define** | `interview-me` | Ask clarifying questions to extract requirements |
| **Define** | `idea-refine` | Validate and refine project ideas before building |
| **Define** | `spec-driven-development` | Write a PRD/spec before any code |
| **Plan** | `planning-and-task-breakdown` | Decompose into small, sequenced tasks |
| **Build** | `incremental-implementation` | Build one slice at a time, verify at each step |
| **Build** | `context-engineering` | Manage context window efficiently |
| **Build** | `source-driven-development` | Read existing code before modifying |
| **Build** | `doubt-driven-development` | Challenge assumptions, verify correctness |
| **Build** | `frontend-ui-engineering` | Component-first, accessibility-first coding |
| **Build** | `test-driven-development` | Write tests first, then implementation |
| **Build** | `api-and-interface-design` | Design contracts before implementation |
| **Verify** | `browser-testing-with-devtools` | Use browser DevTools for testing |
| **Verify** | `debugging-and-error-recovery` | Systematic debugging process |
| **Review** | `code-review-and-quality` | Review with quality gates |
| **Review** | `code-simplification` | Simplify, don't just refactor |
| **Review** | `security-and-hardening` | Security audit checklist |
| **Review** | `performance-optimization` | Performance audit & optimization |
| **Ship** | `git-workflow-and-versioning` | Clean commit history, branching |
| **Ship** | `ci-cd-and-automation` | CI/CD pipeline setup & best practices |
| **Ship** | `deprecation-and-migration` | Safe migration patterns |
| **Ship** | `documentation-and-adrs` | Write docs and ADRs (Architecture Decision Records) |
| **Ship** | `observability-and-instrumentation` | Add monitoring/logging |
| **Ship** | `shipping-and-launch` | Production checklist |
| **Meta** | `using-agent-skills` | How to use this skill library |

### Obra's Superpowers (14 skills)
Advanced workflows: **Subagents, Plans, Reviews, Debugging**

| Skill | What It Does |
|-------|-------------|
| `brainstorming` | Structured brainstorming with output formats |
| `dispatching-parallel-agents` | Run multiple subagents in parallel |
| `executing-plans` | Follow a plan file step-by-step |
| `finishing-a-development-branch` | Clean branch completion workflow |
| `receiving-code-review` | Process and act on code review feedback |
| `requesting-code-review` | Request structured code review |
| `subagent-driven-development` | Delegate to subagents with clear outputs |
| `systematic-debugging` | Methodical debugging process |
| `test-driven-development` | TDD with test-first approach |
| `using-git-worktrees` | Worktree-based parallel development |
| `using-superpowers` | Meta-guide for all superpowers |
| `verification-before-completion` | Verify before finishing |
| `writing-plans` | Create structured plan files |
| `writing-skills` | Write new custom skills |

---

## How to Use Skills

### The Simple Way: Just Ask for the Outcome

You don't need to memorize skill names. Just ask for what you want, and the right skills will be activated automatically.

| Instead of saying... | Say this... |
|---------------------|-------------|
| "Write me code for X" | **"Write a spec for X first, then build it incrementally"** |
| "Fix this bug" | **"Debug this systematically — find the root cause first"** |
| "Review my code" | **"Do a thorough code review with security and performance checks"** |
| "Plan this feature" | **"Break this into a detailed plan with small tasks"** |
| "Build this app" | **"Build this spec-driven: spec first, then incremental implementation"** |
| "Refactor this" | **"Simplify this code, then verify it still works"** |
| "Deploy this" | **"Ship this with proper CI/CD and monitoring setup"** |

### Advanced: Name the Skill Directly

You can also explicitly invoke a skill by naming it:

- **"Follow the spec-driven-development skill for this project"**
- **"Use the systematic-debugging skill to find this bug"**
- **"Apply the subagent-driven-development skill to delegate this"**
- **"Use the planning-and-task-breakdown skill for this feature"**

### Combine Multiple Skills

You can chain skills together:

> **"Start with idea-refine to validate this concept, then do spec-driven-development for the PRD, then use planning-and-task-breakdown to create tasks, then incremental-implementation to build it."**

> **"Use subagent-driven-development to delegate the frontend and backend work, then use code-review-and-quality to review everything, then ship with the shipping-and-launch skill."**

---

## Skill Details by Phase

### 🔍 Define Phase (Start Here)

**`spec-driven-development`** — The most important skill for any non-trivial work.

When to use: Starting any new feature, project, or change that touches multiple files.

What happens:
1. **SPECIFY** — Write a structured spec (what, why, how)
2. **PLAN** — Break into phases
3. **TASKS** — Break into small tasks
4. **IMPLEMENT** — Build incrementally

How to trigger: **"Write a spec before coding this"** or **"Use spec-driven-development"**

---

### 📋 Plan Phase

**`planning-and-task-breakdown`** — The constraint is: **keep tasks small enough that a single task touches ~5 files or fewer**.

When to use: Any multi-step work.

What happens:
- Tasks are sized for context windows
- Dependencies are explicit
- Tasks are sequenced (not parallelized unless safe)

How to trigger: **"Break this into a plan"** or **"Plan this with small tasks"**

---

### 🏗️ Build Phase

**`incremental-implementation`** — Build one slice at a time.

Golden rule: **Each increment should be verifiable on its own.** Don't start slice 2 until slice 1 works.

How to trigger: **"Build this incrementally"** or **"One slice at a time"**

**`test-driven-development`** — Write tests first.

Red → Green → Refactor. Always.

How to trigger: **"Use TDD for this"** or **"Write tests first"**

---

### ✅ Verify Phase

**`systematic-debugging`** — Methodical debugging, not guessing.

What happens:
1. Reproduce the bug
2. Gather evidence (logs, traces, inputs)
3. Form hypothesis
4. Test hypothesis (in isolation)
5. Fix and verify
6. Prevent regression

How to trigger: **"Debug this systematically"** or **"Find the root cause methodically"**

---

### 🔍 Review Phase

**`code-review-and-quality`** — Review with quality gates.

Checks for:
- Correctness
- Security (OWASP Top 10)
- Performance (Core Web Vitals)
- Maintainability
- Test coverage

How to trigger: **"Review this thoroughly"** or **"Do a quality review"**

**`security-and-hardening`** — Security audit checklist.

Checks for:
- Input validation
- SQL injection / XSS
- Authentication/authorization
- Secrets management
- Dependency vulnerabilities

How to trigger: **"Security audit this"** or **"Check for security issues"**

**`performance-optimization`** — Performance audit.

Checks for:
- Core Web Vitals (LCP, INP, CLS)
- Bundle size
- Caching strategies
- Image optimization
- Lazy loading

How to trigger: **"Optimize performance"** or **"Performance audit this"**

---

### 🚀 Ship Phase

**`shipping-and-launch`** — Production checklist.

Checks for:
- Tests passing
- Build succeeding
- Environment variables set
- Monitoring in place
- Rollback plan ready

How to trigger: **"Ship this"** or **"Production checklist before launch"**

**`ci-cd-and-automation`** — CI/CD pipeline setup.

Best practices for:
- GitHub Actions
- Automated testing
- Deployment pipelines
- Rollback strategies

How to trigger: **"Set up CI/CD"** or **"Automate the pipeline"**

---

## 🦸 Superpowers (Advanced)

### Subagent-Driven Development

**`subagent-driven-development`** — Delegate to subagents with clear outputs.

Best for: Large tasks that can be parallelized (frontend + backend, multiple features).

How to trigger: **"Use subagents for this"** or **"Delegate this work to subagents"**

### Dispatching Parallel Agents

**`dispatching-parallel-agents`** — Run multiple agents simultaneously.

Best for: Independent workstreams that don't depend on each other.

How to trigger: **"Run these in parallel"** or **"Dispatch parallel agents"**

### Writing Plans

**`writing-plans`** — Create structured plan files that can be executed.

Creates a `plan.md` or similar that can be fed back to the agent.

How to trigger: **"Write a plan file for this"** or **"Create an executable plan"**

---

## Quick Reference: Skill Triggers by Task Type

| Task Type | Skills to Use |
|-----------|--------------|
| **New project** | `idea-refine` → `spec-driven-development` → `planning-and-task-breakdown` → `incremental-implementation` |
| **New feature** | `spec-driven-development` → `planning-and-task-breakdown` → `incremental-implementation` |
| **Bug fix** | `systematic-debugging` → `incremental-implementation` → `verification-before-completion` |
| **Code review** | `code-review-and-quality` → `security-and-hardening` → `performance-optimization` |
| **Refactor** | `code-simplification` → `test-driven-development` → `verification-before-completion` |
| **Performance issue** | `performance-optimization` → `systematic-debugging` → `incremental-implementation` |
| **Security concern** | `security-and-hardening` → `systematic-debugging` → `verification-before-completion` |
| **Large multi-part work** | `subagent-driven-development` → `dispatching-parallel-agents` → `code-review-and-quality` → `shipping-and-launch` |
| **Deploy to prod** | `ci-cd-and-automation` → `shipping-and-launch` → `observability-and-instrumentation` |
| **Write docs** | `documentation-and-adrs` → `spec-driven-development` (for API docs) |
| **Brainstorm** | `brainstorming` → `idea-refine` → `spec-driven-development` |
| **Debug** | `systematic-debugging` → `browser-testing-with-devtools` → `verification-before-completion` |
| **Test** | `test-driven-development` → `browser-testing-with-devtools` → `verification-before-completion` |

---

## Example Conversations

### Example 1: New Feature
**You:** "Build a user dashboard with analytics charts"

**Better:** "Use spec-driven-development: first write a spec for a user dashboard with analytics charts, then break it into tasks with planning-and-task-breakdown, then build incrementally."

### Example 2: Bug Fix
**You:** "Fix this error in the API"

**Better:** "Debug this systematically — use systematic-debugging to find the root cause, then fix it incrementally with verification-before-completion."

### Example 3: Production Deploy
**You:** "Deploy this to production"

**Better:** "Ship this with the shipping-and-launch skill — run the production checklist, verify tests pass, and set up monitoring with observability-and-instrumentation."

### Example 4: Large Project
**You:** "Build a full e-commerce app"

**Better:** "Start with idea-refine to validate the concept, then spec-driven-development for the PRD, then use subagent-driven-development to delegate frontend, backend, and database work, then review everything with code-review-and-quality, then ship with shipping-and-launch."

---

## Hermes Integration Plan

### Goal: Add these same skills to Hermes on your VPS

**Hermes Architecture:** Hermes is a separate agent system on your VPS. It needs a way to load markdown instruction files.

### Option A: Direct Copy (Recommended)

Since Hermes is a custom agent on your VPS, the simplest approach is to:

1. **Clone the repos on the VPS:**
   ```bash
   cd /root
   git clone https://github.com/addyosmani/agent-skills.git
   git clone https://github.com/obra/superpowers.git
   ```

2. **Create a skills directory for Hermes:**
   ```bash
   mkdir -p /root/hermes-skills
   cd /root/hermes-skills
   # Link all agent-skills
   for d in /root/agent-skills/skills/*/; do
     ln -s "$d" "$(basename $d)"
   done
   # Link all superpowers
   for d in /root/superpowers/skills/*/; do
     ln -s "$d" "$(basename $d)"
   done
   ```

3. **Configure Hermes to load skills:**
   - Check if Hermes supports a `skills/` directory or config file
   - If Hermes has a config file, add the skills path
   - If Hermes uses system prompts, include the skill content in the prompt

### Option B: Hermes Integration via API

If Hermes is part of BuildAny and has an API endpoint:

1. Add a "skills" configuration in BuildAny's database or config
2. When Hermes processes a request, include relevant skill content in the prompt
3. Use the skill name as a trigger (e.g., user says "use spec-driven-development" → Hermes loads that skill)

### Option C: Manual Copy (Fallback)

If Hermes doesn't support dynamic loading, manually copy key SKILL.md content into:
- Hermes's system prompt / instructions file
- Or a hardcoded list of skills in the Hermes source code

### Next Steps for Hermes

1. **Check Hermes's skill loading mechanism:**
   ```bash
   # On your VPS, check how Hermes is configured
   cat /usr/local/lib/hermes-agent/config.* 2>/dev/null || echo "No config found"
   # Check if Hermes has a skills directory or config option
   grep -r "skill\|prompt\|instructions\|system" /usr/local/lib/hermes-agent/ 2>/dev/null | head -20
   ```

2. **Tell me the output** and I'll give you the exact commands to integrate the skills into Hermes.

---

## Summary

**Your OpenClaw assistant now has 38 production-grade skills covering the entire development lifecycle.**

**To use them:** Just ask for what you want in natural language, and the right skills will be activated. Or explicitly name a skill if you know which one you want.

**For Hermes:** We need to check how Hermes loads external instructions, then we'll copy/link the same skills there.

---

*Generated: 2026-06-15*
*Skills: agent-skills (24) + superpowers (14)*
