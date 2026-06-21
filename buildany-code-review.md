# BuildAny Code Review Report - Kelly (Hermes)

**Date:** 2026-06-21
**Reviewer:** Kelly (Hermes Agent via `code-review-and-quality` skill)
**Scope:** BuildAny codebase (`/root/buildany/`)
**Framework:** Next.js 15 + React + TypeScript + SQLite (Drizzle)

---

## Summary

28 issues found across 5 categories. **Top 5 most critical fixes listed at the end.**

| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| HIGH | 10 |
| MEDIUM | 12 |
| LOW | 4 |

---

## 1. CHAT HOOKS

### 1.1 Stale Closure in `useHermesChat.sendMessage` -- MEDIUM
**File:** `src/hooks/useHermesChat.ts` (line 22-61)
**Description:** The `sendMessage` callback has an empty dependency array `[]`. This is safe here because it reads no state from the closure (it only calls the stable `fetch` and React setState setter functions). However, the hook's `isLoading` and `error` states cannot be read by the caller as a side effect of `sendMessage` completion since they are set asynchronously -- the caller only gets the returned `Promise<HermesResponse>`. The `isLoading` state is set to `true` before `await`, then `false` in `finally`, so if the component unmounts during the request, the `setIsLoading(false)` call in `finally` runs on an unmounted component. This is a memory warning pattern.
**Fix:** Use an `isMounted` ref pattern or use `useCallback` with a ref that guards setState calls. Alternatively, remove the `isLoading` state from the hook and let the caller manage it from the returned promise.

### 1.2 Orchestrator calls `startOrchestration` inside `retry` setState updater -- CRITICAL
**File:** `src/hooks/useHermesOrchestrator.ts` (lines 171-178)
```typescript
const retry = useCallback(() => {
  setStatus(prev => {
    if (prev.projectId) {
      startOrchestration(prev.projectId, 'Retrying...', 'web');
    }
    return prev;
  });
}, [startOrchestration]);
```
**Description:** `startOrchestration` is called **inside** a `setStatus` updater function. React's setState updater should be a **pure function** -- it should return the new state and nothing else. Calling `startOrchestration` (which makes API calls, updates state further, etc.) inside the updater is a side effect and violates React's rules. This can cause double-renders, race conditions, and the `return prev` means the status update is a no-op anyway.
**Fix:** Read `projectId` from a ref instead of from inside the updater:
```typescript
const retry = useCallback(() => {
  const pid = status.projectId; // or projectIdRef.current
  if (pid) {
    startOrchestration(pid, 'Retrying...', 'web');
  }
}, [startOrchestration, status.projectId]);
```

### 1.3 `applyCorrection` forces `'web'` platform unconditionally -- HIGH
**File:** `src/hooks/useHermesOrchestrator.ts` (line 159)
```typescript
startOrchestration(projectIdRef.current, correction, 'web');
```
**Description:** When the user applies a correction, the orchestrator always restarts with platform `'web'`, ignoring the original platform. If the project was `'mobile'` or `'backend'`, this silently changes the project type, leading to incorrect code generation.
**Fix:** Store the original platform in a ref (similar to `projectIdRef`) and use it here.

### 1.4 Decompose fetch result is silently swallowed -- MEDIUM
**File:** `src/hooks/useHermesOrchestrator.ts` (line 112)
```typescript
await fetch('/api/decompose', {...}).catch(() => {/* non-blocking */});
```
**Description:** The decompose step's response is completely ignored -- the `catch` is a no-op. If decompose fails, the orchestrator continues as if it succeeded and advances to 'completed'. The user sees "Orchestration complete!" even when tasks were never decomposed.
**Fix:** Handle the response: if the fetch fails, the catch should at minimum log it and prevent the silent success state advancement, or add a phase result for decompose.

### 1.5 `abortRef` does not cancel in-flight fetch -- HIGH
**File:** `src/hooks/useHermesOrchestrator.ts` (line 51, 85, 98)
**Description:** `abort()` sets `abortRef.current = true` but the in-flight `fetch('/api/generate')` call continues executing on the server. The `if (abortRef.current) return;` guards only prevent further state updates on the client. The server-side orchestration (with `KellyOrchestrator.start()`) continues running, writing to the database, and consuming tokens.
**Fix:** Use `AbortController` and pass `signal` to all fetch calls:
```typescript
const abortControllerRef = useRef<AbortController | null>(null);
// In startOrchestration:
abortControllerRef.current = new AbortController();
const response = await fetch('/api/generate', { ..., signal: abortControllerRef.current.signal });
// In abort:
if (abortControllerRef.current) abortControllerRef.current.abort();
```

---

## 2. API ROUTES

### 2.1 `hermes-chat/route.ts` -- History type mismatch / missing tool call loop -- CRITICAL
**File:** `src/app/api/hermes-chat/route.ts` (lines 51-58, 82-93)
**Description:** The `validHistory` filter passes raw `{ role: string, content: string }` objects directly into the Hermes API messages array without validating their structure. If a message has `content: undefined`, the LLM API could reject the request. Additionally, the tool call handler only processes `tcs[0]` (the first tool call), ignoring all subsequent tool calls. Many LLMs return multiple tool calls in a single response.
**Fix:** Validate each history entry has non-empty content. Loop over all tool calls instead of only processing `tcs[0]`:
```typescript
for (const tc of tcs) {
  let args = {};
  try { args = JSON.parse(tc.function?.arguments || "{}"); } catch {}
  toolResult = await executeTool(tc.function?.name, args);
}
```

### 2.2 `hermes-chat/route.ts` -- Tool result not fed back into LLM -- HIGH
**File:** `src/app/api/hermes-chat/route.ts` (lines 86-93)
**Description:** After executing a tool, the result is returned to the client but is **never sent back to the LLM**. The function tool call pattern requires the tool result to be appended as a new message to the conversation so the LLM can produce a natural-language response based on the result. Without this, the LLM's tool call is wasted -- the user never sees the LLM's response to the tool output.
**Fix:** After executing tools, send the tool results back to the LLM for a second completion:
```typescript
if (tcs.length > 0) {
  // Execute tools...
  // Append tool results as new messages
  messages.push({
    role: "tool" as const,
    content: JSON.stringify(toolResult),
    tool_call_id: tc.id,
  });
  // Call LLM again with tool results
  const response2 = await fetch(HERMES_URL, { ... body: JSON.stringify({ model: MODEL, messages }) });
  // Use this response's reply instead
}
```

### 2.3 `hermes-tool/route.ts` -- Unsafe type cast bypasses type checking -- HIGH
**File:** `src/app/api/hermes-tool/route.ts` (line 60)
```typescript
const result = await (TOOLS as any)[tool](params || {});
```
**Description:** The `TOOLS` object is properly typed but cast to `any` to call dynamic methods. If `tool` passes validation (`tool in TOOLS`) but the params are wrong, TypeScript provides no protection. A project ID lookup with undefined params could crash at runtime.
**Fix:** Use proper indexing with typed keys and validate params per tool:
```typescript
type ToolName = keyof typeof TOOLS;
const toolName = tool as ToolName;
const result = await TOOLS[toolName](params || {});
```

### 2.4 `hermes-chat/route.ts` -- Credentials in Authorization header construction -- MEDIUM
**File:** `src/app/api/hermes-chat/route.ts` (line 65)
```typescript
Authorization: "Bearer " + HERMES_API_KEY,
```
**Description:** If `HERMES_API_KEY` is empty string (the default fallback on line 7), the header becomes `"Bearer "` (empty token). Most LLM API gateways reject this, and the error message returned to the client is generic (`"Hermes error: 401 ..."`), giving the user no guidance.
**Fix:** Validate the API key exists before making the call:
```typescript
if (!HERMES_API_KEY) {
  return NextResponse.json({ success: false, error: "Hermes API key not configured" }, { status: 500 });
}
```

### 2.5 `generate/route.ts` -- Fire-and-forget creates silent failures -- HIGH
**File:** `src/app/api/generate/route.ts` (lines 151-192)
```typescript
import("@/lib/orchestrator").then(({ KellyOrchestrator }) => {
  const hermes = new KellyOrchestrator(...);
  hermes.start().catch((err) => console.error("Kelly start error:", err));
}).catch((err) => console.error("Failed to load orchestrator:", err));
```
**Description:** The entire orchestrator runs as a fire-and-forget dynamic import after the HTTP response has already been sent (line 194-200 sends the response BEFORE the import resolves). If the orchestrator fails, the client already received `"success": true` and cannot know about the failure. Additionally, the dynamic import itself could fail silently if the server is in a bad state.
**Fix:** Either (a) await the orchestrator result before responding (accepting a longer HTTP response time), or (b) set the project status to `'error'` in the DB on failure so the client can poll for it.

---

## 3. DATABASE SCHEMA

### 3.1 `templates.files` is untyped text but stores structured data -- MEDIUM
**File:** `src/lib/db/schema.ts` (line 64)
```typescript
files: text("files"),
```
**Description:** The `files` field stores what is presumably an array/set of file paths but is typed as plain `text`. No helper function, JSON column wrapper, or serializer is in place to validate it. Either all consumers must manually `JSON.parse`/`JSON.stringify`, or corruption is invisible until runtime.
**Fix:** Use `text("files", { mode: "json" })` if Drizzle supports it, or document the expected format and provide a helper function.

### 3.2 Missing foreign key relationships in schema -- MEDIUM
**File:** `src/lib/db/schema.ts` (multiple tables)
**Description:** No tables use Drizzle's `.references()` for foreign key relationships. Tables like `projectFiles.projectId`, `tasks.projectId`, `conversations.projectId`, `apiKeys.userId`, and `agents.projectId` all logically reference other tables but have no `REFERENCES` constraints. This means orphaned rows can accumulate and cascade deletes (e.g., deleting a project) will silently leave orphaned data.
**Fix:** Add `.references(() => projects.id)` to foreign keys, at minimum with `onDelete: 'cascade'` for project-scoped child tables.

### 3.3 `agents` table missing `updatedAt` -- LOW
**File:** `src/lib/db/schema.ts` (lines 163-173)
**Description:** All other tables have both `createdAt` and `updatedAt`, but `agents` only has `createdAt`. Since agent status is updated in `orchestrator.ts` (lines 534-538, 1684-1688), the mutation timestamps are lost.
**Fix:** Add `updatedAt` field consistent with other tables.

### 3.4 `projectFiles` language inference is purely extension-based -- MEDIUM
**File:** `src/lib/db/schema.ts` (line 42) and `src/lib/orchestrator.ts` (line 787)
**Description:** `language` is stored as text but in `orchestrator.ts` it's set from `file.language` which comes from `parseGeneratedCode` (regex-based). Files without recognizable extensions or paths end up with the default `'html'` language. Downstream consumers that use `file.language === 'html'` to make decisions (like the test agent at line 937) operate on incorrect assumptions.
**Fix:** Use a content-based detector as a fallback when the path doesn't imply a language, or flag the language as unknown.

---

## 4. COMPONENTS

### 4.1 `AIChatPanel` -- Stale closure over `messages` array -- HIGH
**File:** `src/components/AIChatPanel.tsx` (line 170)
```typescript
const history = messages
  .filter(...)
  .map((m) => ({ role: m.role, content: m.content }));
```
**Description:** `messages` is captured in the `handleSubmit` callback's closure at the time the function was created. When `messages` updates (a new message arrives from elsewhere -- e.g., via `window.__addStatusMessage` called by the orchestrator), the `history` sent in the next request may be stale, potentially missing recent messages. This is because `handleSubmit`'s dependency array includes `messages`, but React's functional updates are not used here.
**Fix:** Use a ref to track the latest messages for history purposes:
```typescript
const messagesRef = useRef(messages);
messagesRef.current = messages;
// In handleSubmit, read from messagesRef.current instead of messages
```

### 4.2 `AIChatPanel` -- `filter` discards assistant code messages silently -- MEDIUM
**File:** `src/components/AIChatPanel.tsx` (lines 315-317)
```typescript
if (message.role === "assistant" && isCodeContent(message.content)) {
  return null;
}
```
**Description:** Content containing '```', HTML tags, or functions is classified as "code" and silently hidden from the chat. This means if Kelly sends a message that includes a code example with an explanation (e.g., "Here's how you implement that:\n```js\n...\n```"), the entire message is hidden. The user sees nothing.
**Fix:** Instead of returning `null`, render a collapsible code block or a truncated preview:
```typescript
// Show a truncated message with a toggle for code blocks
const [showCode, setShowCode] = useState(false);
```

### 4.3 `AIChatPanel` -- `window.__addStatusMessage` leak on unmount -- MEDIUM
**File:** `src/components/AIChatPanel.tsx` (lines 131-137)
```typescript
useEffect(() => {
  const w = window as unknown as Record<string, unknown>;
  w.__addStatusMessage = addStatusMessage;
  return () => { delete w.__addStatusMessage; };
}, [addStatusMessage]);
```
**Description:** The cleanup function correctly deletes the global property. However, the orchestrator (`orchestrator.ts` line 1321-1324 in `generateAndServePreview` / `runAutomatedTests`) calls `db.insert(conversations)` rather than `window.__addStatusMessage`, so this mechanism may be dead code. If something else uses it, the stale closure problem still applies (the IIFE captures `addStatusMessage` at effect mount time).
**Fix:** This pattern works for the basic case. The real risk is that if two `AIChatPanel` instances are mounted, the second one overwrites the first's `__addStatusMessage`. Verify there's only ever one instance.

### 4.4 `ProjectWorkspace` -- `files[0].content` could be large in `activeFile` initial state -- MEDIUM
**File:** `src/components/ProjectWorkspace.tsx` (line 34)
```typescript
const [activeFile, setActiveFile] = useState(files[0] || null);
```
**Description:** `files[0]` may be a full file object with a large `.content` field (potentially megabytes of generated code). This content is immediately held in React state memory for the entire lifecycle of the component. Combined with the `files.length`-driven effects in `AIChatPanel`, the entire file list is memory-duplicated.
**Fix:** Store only the file ID initially and lazy-load content via an API call when a file is selected.

### 4.5 `AIChatPanel` -- Input disabled based on stale `!input.trim()` -- LOW
**File:** `src/components/AIChatPanel.tsx` (line 407, 411)
```typescript
disabled={isLoading || !input.trim()}
```
**Description:** Because `input` is a useState value, `!input.trim()` re-evaluates on every render. However, the `disabled` prop on the input itself prevents typing while loading (line 407), meaning the user cannot type a new message until loading finishes. This is intentional UX but the submit button also checks the same condition. The input being disabled while loading prevents the user from composing their next question while waiting, which is poor UX for a chat interface.
**Fix:** Keep the input enabled during loading (remove `isLoading` from the input's `disabled`). Only disable the submit button.

### 4.6 `AIChatPanel` -- Submit button visual state inconsistent -- LOW
**File:** `src/components/AIChatPanel.tsx` (line 411)
**Description:** The submit button is disabled when `!input.trim()` is true. But the button displays a static `<Send />` icon regardless. There is no visual feedback differentiating "waiting for input" from "processing message" (both show the same icon in disabled state).
**Fix:** Show a spinner icon when `isLoading` is true.

### 4.7 `ProjectWorkspace` -- `handleDeleteProject` double-tap anti-pattern -- MEDIUM
**File:** `src/components/ProjectWorkspace.tsx` (lines 86-102)
**Description:** The first click sets `showDeleteConfirm = true`, the second click deletes. But the button text never changes (always says "Delete"). Clicking the delete button when the confirm overlay is already visible triggers `handleDeleteProject` again, which attempts a DELETE request. This is fragile -- if the overlay render is delayed, the user could accidentally trigger deletion on the first click.
**Fix:** The first click opens the overlay (handled by the button calling `handleDeleteProject` -> `setShowDeleteConfirm(true)` and returning), and the DELETE button in the overlay should call a separate delete handler.

---

## 5. ORCHESTRATOR & LLM ROUTER

### 5.1 `orchestrator.ts` -- `typeof window !== 'undefined'` guards in server-side code -- HIGH
**File:** `src/lib/orchestrator.ts` (lines 1494, 1513, 1523, 1532, 1649, 1663)
**Description:** The orchestrator accesses `localStorage` and `window` directly in multiple methods (`logManualCorrection`, `loadManualCorrections`, `loadPersistentRules`, `savePersistentRules`, `loadPreviousOutcomes`, `logOutcome`). This is a server-side module (imported by API routes in `/api/generate/route.ts`). The `typeof window !== 'undefined'` guards prevent crashes, but these methods **always return empty arrays** on the server, making the entire learning/persistence system dead code for the primary API-driven orchestration path. The orchestrator writes nothing to the DB for these persistence concerns.
**Fix:** Replace all `localStorage` usage with database-backed persistence using the existing `projectMemory` or a new `orchestrator_data` table. Alternatively, if these features are not needed, remove the dead code.

### 5.2 `llm-router.ts` -- `LLMRouter.loadConfigs()` is called on every `generate()` call -- MEDIUM
**File:** `src/lib/llm-router.ts` (lines 115-149, 197)
**Description:** `loadConfigs()` queries the `api_keys` table **every single time** `generate()` or `stream()` is called. It also **clears and rebuilds** the entire config Map each time (no cache reuse). For a full orchestration run that makes 3-5 LLM calls, this means 3-5 separate DB queries for the same data.
**Fix:** Cache the configs with a TTL or load them once at module initialization:
```typescript
private configsLoaded = false;
async ensureConfigsLoaded() {
  if (!this.configsLoaded) {
    await this.loadConfigs();
    this.configsLoaded = true;
  }
}
```

### 5.3 `orchestrator.ts` -- `parseGeneratedCode` has a boolean operator precedence bug -- HIGH
**File:** `src/lib/llm-router.ts` (line 442)
```typescript
if (files.length === 0 && content.includes('<!DOCTYPE html>') || content.includes('<html')) {
```
**Description:** Due to JavaScript operator precedence (`&&` binds tighter than `||`), this evaluates as:
```typescript
if ((files.length === 0 && content.includes('<!DOCTYPE html>')) || content.includes('<html'))
```
This means if the content includes `<html` anywhere, even if files already exist, the parser **overwrites** existing parsed files by pushing a new `index.html` entry. A content string like `"some<html>text"` from a chat message could overwrite correctly parsed files.
**Fix:** Add parentheses for correct precedence:
```typescript
if (files.length === 0 && (content.includes('<!DOCTYPE html>') || content.includes('<html'))) {
```

### 5.4 `orchestrator.ts` -- `persistentRules` (DRY principle violation across 3 localStorage keys) -- MEDIUM
**File:** `src/lib/orchestrator.ts` (lines 1466, 1513-1529, 1648-1656)
**Description:** The orchestrator uses three separate `localStorage` keys (`'hermes_manual_corrections'`, `'hermes_persistent_rules'`, `'hermes_outcomes'`) all guarded with `typeof window === 'undefined'` return-empty checks. Each has its own JSON parse/stringify. Combined with issue 5.1, this is substantial dead code for server-side execution. The `updateLearningWeights` method (line 1537) computes `skipRate` but never does anything with it.
**Fix:** Consolidate into a single persistence layer (DB-backed) and remove unused/untested learning logic that can never execute server-side.

### 5.5 `orchestrator.ts` -- `userDecision('reject')` restarts from coding -- LOGIC BUG -- HIGH
**File:** `src/lib/orchestrator.ts` (line 1415)
```typescript
case 'reject':
  await this.executePhase('coding');
  break;
```
**Description:** Rejecting a failed phase should restart the failed phase, but this hard-codes `'coding'`. If a user rejects a failed `testing` or `review` phase, it regenerates code from scratch instead of re-running tests or review. The `'fix'` case (line 1404-1405) re-executes the last failed phase, which is the correct behavior. `'reject'` should likely do the same.
**Fix:** 
```typescript
case 'reject':
  const lastFailedPhase = this.state.phases.findLast(p => !p.success);
  if (lastFailedPhase) {
    await this.executePhase(lastFailedPhase.phase);
  }
  break;
```

### 5.6 `orchestrator.ts` -- `readHot()` called synchronously but has no awaits -- MEDIUM
**File:** `src/lib/orchestrator.ts` (lines 169, 701)
```typescript
const { memories: hotMemories, tokenCount } = memoryClient.readHot(180, this.state.projectId);
```
**Description:** `memoryClient.readHot()` is synchronous (uses `better-sqlite3`'s synchronous API), so this is correct. However, `memoryClient.search()` on line 708 is also synchronous. The `for...of` loop on lines 706-711 calls it inside a loop, performing up to 3 synchronous DB queries sequentially. For a SQLite WAL-backed DB with small tables this is fine, but the code style is inconsistent (most DB access is async Drizzle ORM). This inconsistency could cause bugs if someone wraps `readHot` in an async function in the future.
**Fix:** Either make `memoryClient` fully async (Promise-based) or document that it's intentionally synchronous. At minimum, the `for...of` loop should use `Promise.all` if methods become async.

### 5.7 `hermes-orchestrate/route.ts` -- `execAsync` with `docker exec` is insecure -- HIGH
**File:** `src/app/api/hermes-orchestrate/route.ts` (lines 31, 34)
```typescript
const command = `docker exec -e HERMES_HOME=${HERMES_HOME} ${HERMES_CONTAINER} hermes chat -f "${containerFilePath}" -Q`;
const { stdout, stderr } = await execAsync(command, { timeout: 180000 });
```
**Description:** The prompt is written to a temp file and then read by the container, so shell injection through the prompt is avoided. However, `containerFilePath` is derived from `Date.now()` with no sanitization, and `HOST_DATA_DIR` is a constant. If someone gains write access to `HOST_DATA_DIR`, they could create files with names that, when interpolated into the shell command, cause injection. More importantly, a 180-second (3-minute) synchronous `execSync`-style call blocks the Node.js event loop.
**Fix:** Use `spawn` instead of `execAsync` and pass arguments as an array to avoid shell interpretation entirely:
```typescript
const child = spawn('docker', ['exec', '-e', `HERMES_HOME=${HERMES_HOME}`, HERMES_CONTAINER, 'hermes', 'chat', '-f', containerFilePath, '-Q'], { timeout: 180000 });
```

### 5.8 `orchestrator.ts` -- `continueFromFailure` uses deprecated `findLastIndex` -- LOW
**File:** `src/lib/orchestrator.ts` (line 1578)
**Description:** `findLastIndex` is an ES2023 method. If the server runs an older Node.js version or transpilation target, this could throw a runtime error. TypeScript might not error since `target` could be `esnext`.
**Fix:** Use a traditional `for` loop from the end, or polyfill:
```typescript
let idx = -1;
for (let i = this.state.phases.length - 1; i >= 0; i--) {
  if (!this.state.phases[i].success) { idx = i; break; }
}
```

---

## Summary Table

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1.1 | MEDIUM | `useHermesChat.ts:22` | Stale closure safe but unmounted setState |
| 1.2 | CRITICAL | `useHermesOrchestrator.ts:171` | Side-effect inside setState updater |
| 1.3 | HIGH | `useHermesOrchestrator.ts:159` | Hard-coded 'web' platform on correction |
| 1.4 | MEDIUM | `useHermesOrchestrator.ts:112` | Silently swallowed decompose failure |
| 1.5 | HIGH | `useHermesOrchestrator.ts:85` | No AbortController for in-flight fetch |
| 2.1 | CRITICAL | `hermes-chat/route.ts:86` | Only processes first tool call |
| 2.2 | HIGH | `hermes-chat/route.ts:86` | Tool results not fed back to LLM |
| 2.3 | HIGH | `hermes-tool/route.ts:60` | Unsafe `as any` bypasses type checking |
| 2.4 | MEDIUM | `hermes-chat/route.ts:65` | Empty API key creates malformed header |
| 2.5 | HIGH | `generate/route.ts:151` | Fire-and-forget with success response |
| 3.1 | MEDIUM | `schema.ts:64` | Untyped JSON text field |
| 3.2 | MEDIUM | `schema.ts` | Missing foreign key constraints |
| 3.3 | LOW | `schema.ts:163` | `agents` missing `updatedAt` |
| 3.4 | MEDIUM | `schema.ts:42` | Language inference defaulting to 'html' |
| 4.1 | HIGH | `AIChatPanel.tsx:170` | Stale closure over messages for history |
| 4.2 | MEDIUM | `AIChatPanel.tsx:315` | Code content messages hidden silently |
| 4.3 | MEDIUM | `AIChatPanel.tsx:131` | Global leak with potential conflict |
| 4.4 | MEDIUM | `ProjectWorkspace.tsx:34` | Large file content in initial state |
| 4.5 | LOW | `AIChatPanel.tsx:407` | Input disabled while loading (UX) |
| 4.6 | LOW | `AIChatPanel.tsx:411` | No spinner on submit during loading |
| 4.7 | MEDIUM | `ProjectWorkspace.tsx:86` | Double-tap delete anti-pattern |
| 5.1 | HIGH | `orchestrator.ts:1494` | `localStorage` in server-side module |
| 5.2 | MEDIUM | `llm-router.ts:197` | DB queries on every LLM call |
| 5.3 | HIGH | `llm-router.ts:442` | Operator precedence bug in file parser |
| 5.4 | MEDIUM | `orchestrator.ts:1466` | Dead learning code across 3 localStorage keys |
| 5.5 | HIGH | `orchestrator.ts:1415` | 'reject' hard-codes 'coding' phase |
| 5.6 | MEDIUM | `orchestrator.ts:169` | Sync/async inconsistency in memory client |
| 5.7 | HIGH | `hermes-orchestrate/route.ts:31` | Docker exec with blocking 3-min timeout |
| 5.8 | LOW | `orchestrator.ts:1578` | `findLastIndex` compatibility risk |

---

## Top 5 Most Critical Fixes

1. **1.5** -- Add `AbortController` so `abort()` actually cancels server requests
2. **2.2** -- Feed tool execution results back to the LLM for coherent multi-turn tool use
3. **1.2** -- Fix the `setStatus` updater side-effect in `retry` (could cause infinite loops)
4. **5.1** -- Replace `localStorage` with DB persistence; the entire learning system is dead code on the server
5. **5.3** -- Fix the boolean precedence bug in `parseGeneratedCode` that overwrites valid parsed files
