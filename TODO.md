# BuildAny TODO List

## 🔥 Active: Make Kelly (Hermes) the Central Orchestrator

**Goal:** All user interactions in the chat panel go through Kelly. Kelly handles:
- [ ] Market research for new projects
- [ ] Wiki page generation
- [ ] Agent orchestration & task management
- [ ] Code generation
- [ ] Code review
- [ ] Preview generation
- [ ] Any other user request

**Phase 1: Discovery** (Current)
- [ ] Map current codebase (chat panel, project page, AI routes)
- [ ] Find where "AI Assistant" vs "Hermes" toggle lives
- [ ] Understand current project creation flow
- [ ] Identify all API routes Kelly should wrap

**Phase 2: Design**
- [ ] Design Kelly's system prompt for orchestration
- [ ] Design tool schemas for all BuildAny operations
- [ ] Plan chat UI changes (remove AI Assistant toggle, make Kelly default)

**Phase 3: Implementation**
- [ ] Update `useHermesChat` to support all operations
- [ ] Add tool definitions for research/wiki/agents/code/review/preview
- [ ] Update API route to handle tool calls for all operations
- [ ] Wire project page to use Kelly for everything

**Phase 4: Testing**
- [ ] Test each operation end-to-end
- [ ] Verify Kelly can chain multiple tools in one conversation
- [ ] Test error handling and recovery

---

## 📋 Other Items

- [ ] Fix Clerk development keys warning (switch to production)
- [ ] Clean up legacy `hermes-agent-cvaj` container if no longer needed
- [ ] Document the new Kelly workflow for users

