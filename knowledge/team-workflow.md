# Team Workflow: Kelly + Morgan Collaboration

## Team Roles

| Agent | Role | Best For | How to Invoke |
|-------|------|----------|---------------|
| **Kelly** (Hermes) | AI Architect | Research, planning, architecture, task breakdown, wiki generation | BuildAny app chat panel, `/api/hermes-chat`, or direct API |
| **Morgan** (OpenManus) | Code Execution Specialist | Code review, security fixes, refactoring, automated edits, testing | `cd /root/OpenManus && .venv/bin/python3 main.py --prompt "..."` |
| **TaqClaw** (You, me) | Orchestrator | Deciding who does what, reviewing results, coordinating, building UI | Direct conversation |

## When to Use Each Agent

### Use KELLY When:
- 🧠 **Market research** — "What do top fitness apps look like?"
- 📋 **Task planning** — "Break this project into milestones"
- 🏗️ **Architecture decisions** — "What tech stack should I use for X?"
- 📚 **Wiki generation** — "Generate documentation for this feature"
- 🎯 **Code review** — "Review this file for best practices"
- 💡 **Feature ideation** — "What features should a recipe app have?"

### Use MORGAN When:
- 🔒 **Security audit** — "Find vulnerabilities in this codebase"
- 🛠️ **Automated fixes** — "Fix all the TypeScript errors in this file"
- 🧪 **Testing** — "Write tests for this component"
- 📝 **Refactoring** — "Refactor this to use async/await"
- 🔍 **Deep code analysis** — "Analyze this 500-line file and suggest improvements"
- 📊 **Data processing** — "Parse this JSON and generate a report"

## Collaboration Workflow

### Pattern 1: Research → Plan → Execute
```
User: "I want a recipe app"
    ↓
Kelly: Research top recipe apps, generate feature list, create task breakdown
    ↓
TaqClaw: Review Kelly's plan, approve
    ↓
Morgan: Generate the code files based on Kelly's spec
    ↓
Kelly: Review Morgan's code, suggest improvements
    ↓
Morgan: Apply fixes
    ↓
TaqClaw: Build, test, deploy
```

### Pattern 2: Security Audit → Fix → Verify
```
Morgan: "Found 9 security issues in route.ts"
    ↓
TaqClaw: Review findings, prioritize
    ↓
Morgan: Apply fixes to all 9 issues
    ↓
Kelly: Review the fixed code for correctness
    ↓
TaqClaw: Rebuild and test
```

### Pattern 3: Feature Request → Architecture → Implementation
```
User: "Add chat functionality"
    ↓
Kelly: Design the chat architecture, data model, API spec
    ↓
TaqClaw: Review architecture, approve
    ↓
Morgan: Implement the backend API and frontend components
    ↓
Kelly: Generate wiki docs for the new feature
    ↓
TaqClaw: Integrate, test, deploy
```

## How to Invoke Each Agent

### Kelly (Hermes)
```bash
# From BuildAny app (frontend)
# Type in the chat panel — Kelly responds via /api/hermes-chat

# Direct API call (for testing)
curl -X POST http://127.0.0.1:3000/api/hermes-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Plan a recipe app","history":[]}'

# Direct Hermes gateway (bypass BuildAny)
curl -s http://127.0.0.1:8642/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat /root/.hermes/.env | grep API_SERVER_KEY | cut -d= -f2)" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"Hello"}]}'
```

### Morgan (OpenManus)
```bash
# Quick code review
cd /root/OpenManus
.venv/bin/python3 main.py --prompt "Review /root/buildany/src/app/api/hermes-chat/route.ts for security issues"

# With Kelly context wrapper
./openmanus-kelly.sh "Review /root/buildany/src/components/AIChatPanel.tsx for bugs"

# Batch processing
./openmanus.sh "Find all TypeScript errors in /root/buildany/src and suggest fixes"
```

## Division of Labor Matrix

| Task | Kelly | Morgan | TaqClaw |
|------|-------|--------|---------|
| Market research | ✅ Primary | | |
| Architecture design | ✅ Primary | | |
| Task decomposition | ✅ Primary | | |
| Wiki/documentation | ✅ Primary | | |
| Code generation | ✅ Can do | ✅ Better | |
| Security audit | | ✅ Primary | |
| Code review | ✅ Primary | ✅ Secondary | |
| Automated fixes | | ✅ Primary | |
| Refactoring | | ✅ Primary | |
| Testing | | ✅ Primary | |
| UI/UX design | | | ✅ Primary |
| Database changes | | ✅ Can do | ✅ Primary |
| Deployment | | | ✅ Primary |
| Git operations | | ✅ Can do | ✅ Primary |

## Best Practices

1. **Always start with Kelly for planning** — Get the big picture first
2. **Use Morgan for execution** — Once you know what to do, Morgan does it faster
3. **Have Kelly review Morgan's work** — Kelly catches architectural issues
4. **Document everything in the KB** — Both agents should update the knowledge base
5. **TaqClaw is the final gate** — You approve, build, and deploy

## Example Commands

### Start a new project with both agents:
```bash
# 1. Kelly plans
./openmanus-kelly.sh "Plan a fitness tracker app with workout plans, progress photos, and social sharing"

# 2. Morgan implements the core files
./openmanus.sh "Generate the Next.js app structure for a fitness tracker based on Kelly's plan"

# 3. Kelly reviews
./openmanus-kelly.sh "Review the generated code for the fitness tracker"

# 4. Morgan fixes issues
./openmanus.sh "Fix all the issues Kelly found in the fitness tracker code"
```

### Debug a production issue:
```bash
# 1. Morgan investigates logs
./openmanus.sh "Analyze these logs and find the root cause: $(cat /var/log/error.log)"

# 2. Kelly suggests architecture fix
./openmanus-kelly.sh "How should we restructure this to prevent the error?"

# 3. Morgan implements the fix
./openmanus.sh "Apply the architecture fix Kelly suggested"
```
