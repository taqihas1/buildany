---
name: debug-methodology
description: Systematic debugging and problem-solving methodology for development work. Use when encountering build errors, runtime failures, infrastructure issues, or any technical problem that needs root cause analysis. Triggers on phrases like "debug this", "fix this error", "something is broken", "not working", "investigate", "root cause", or when asked to resolve technical issues without a clear plan.
---

# Debug Methodology — Golden Rules

## Rule #1: NO RUSH

When something breaks, the first instinct is to fix it immediately. Resist this urge.

**Bad:** See error → Google fix → Apply patch → Hope it works
**Good:** See error → STOP → Think → Understand → Plan → Fix

## Rule #2: Understand Before Fixing

### Step 1: Read the Full Error
- Read the COMPLETE error message, not just the first line
- Look at stack traces — they tell you WHERE, not just WHAT
- Check multiple error locations if present

### Step 2: Understand the Context
- What changed recently? (git log, recent edits)
- What was working before?
- What is the expected behavior vs actual behavior?

### Step 3: Understand the Codebase
- Read the relevant files before modifying them
- Understand the data flow: input → processing → output
- Check imports, dependencies, and configurations
- Look at related files, not just the error location

## Rule #3: Root Cause Over Symptom

**Symptom:** Build fails with type error
**Root cause possibilities:**
- TypeScript version mismatch
- Missing `strictNullChecks` in tsconfig
- Incorrect import path
- Package version incompatibility
- Cached build artifacts

**Always ask: Why is this error happening?** Not just: How do I make the error go away?

## Rule #4: Thoroughly Plan the Work

Before touching any code:

1. **Hypothesis:** What do I think is causing this?
2. **Verification:** How can I confirm this hypothesis?
3. **Fix options:** What are multiple ways to fix this?
4. **Side effects:** What could break if I apply this fix?
5. **Rollback plan:** How do I undo if this doesn't work?

## Rule #5: One Change at a Time

- Make ONE change
- Test the result
- Verify it fixes the issue without breaking anything else
- Only then make the next change

**Bad:** Change config + update package + modify code + rebuild → Which fixed it? Which broke something else?

**Good:** Change config → Test → Works? → Move to next issue

## Rule #6: Verify the Fix

After applying a fix:
- Confirm the original error is gone
- Check that related functionality still works
- Run the full test suite if available
- Test edge cases
- Monitor for regressions

## Rule #7: Document What You Learned

- What was the root cause?
- What was the fix?
- What would have prevented this?
- Add to MEMORY.md or skill notes for future reference

## Quick Checklist Before Fixing

```
□ Read the full error message
□ Understand what changed recently
□ Read the relevant code before modifying
□ Form a hypothesis about root cause
□ Plan the fix (consider side effects)
□ Make one change at a time
□ Verify the fix works
□ Document the lesson learned
```

## Emergency Exception

If production is down and users are affected, apply the fastest fix first, THEN do root cause analysis after the fire is out. But still document what happened.

---

*Remember: A rushed fix often creates two new problems. A systematic fix prevents the next ten.*
