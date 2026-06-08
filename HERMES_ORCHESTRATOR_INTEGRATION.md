# Hermes Orchestrator Integration Guide for BuildAny

## Files to Add

### 1. `src/lib/orchestrator.ts`
- Copy `orchestrator.ts` from this workspace to `src/lib/orchestrator.ts`
- This is the core engine — state machine, phase management, learning logic

### 2. `src/hooks/useHermesOrchestrator.ts`
- Copy `useHermesOrchestrator.ts` from this workspace to `src/hooks/useHermesOrchestrator.ts`
- React hook for chat panel integration

### 3. `src/components/ChatOrchestratorPanel.tsx`
- Copy `ChatOrchestratorPanel.tsx` from this workspace to `src/components/ChatOrchestratorPanel.tsx`
- UI component that renders in the chat panel

## Integration Steps

### Step 1: Add Orchestrator to Chat Panel

In your AI chat panel component (probably `src/components/ChatPanel.tsx` or similar), add:

```tsx
import { ChatOrchestratorPanel } from './ChatOrchestratorPanel';

// In your chat panel component, when user sends a prompt:
const handlePrompt = async (prompt: string) => {
  // Instead of directly calling generate API:
  // OLD: await generateCode(prompt);
  
  // NEW: Start orchestration
  setShowOrchestrator(true);
  setOrchestratorProps({
    projectId: currentProject.id,
    prompt,
    platform: currentProject.platform, // 'web' | 'mobile' | 'backend'
  });
};

// In your JSX, conditionally render:
{showOrchestrator && (
  <ChatOrchestratorPanel
    projectId={orchestratorProps.projectId}
    prompt={orchestratorProps.prompt}
    platform={orchestratorProps.platform}
    onComplete={() => {
      setShowOrchestrator(false);
      // Refresh project files, show preview, etc.
    }}
  />
)}
```

### Step 2: Wire Real Agent Execution

The `orchestrator.ts` has placeholder methods. Replace with real API calls:

```typescript
// In orchestrator.ts, replace these methods:

private async executeCodeAgent(): Promise<PhaseResult> {
  // Call your actual code generation API
  const response = await fetch('/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      projectId: this.state.projectId,
      prompt: this.state.prompt,
      platform: this.state.platform,
    }),
  });
  const data = await response.json();
  
  return {
    phase: 'coding',
    success: data.success,
    message: data.success ? 'Code generated' : data.error,
    details: { filesGenerated: data.files?.length },
    timestamp: Date.now(),
  };
}

private async executeTestAgent(): Promise<PhaseResult> {
  // Call your test runner
  const response = await fetch('/api/test', {
    method: 'POST',
    body: JSON.stringify({ projectId: this.state.projectId }),
  });
  const data = await response.json();
  
  return {
    phase: 'testing',
    success: data.passed,
    message: data.passed 
      ? `${data.testsPassed} tests passed` 
      : `${data.testsFailed} tests failed`,
    details: data,
    timestamp: Date.now(),
  };
}

private async executeReviewAgent(): Promise<PhaseResult> {
  // Call Alibaba code review or your review agent
  const response = await fetch('/api/review', {
    method: 'POST',
    body: JSON.stringify({ projectId: this.state.projectId }),
  });
  const data = await response.json();
  
  return {
    phase: 'reviewing',
    success: true, // Review always "succeeds" even if issues found
    message: `Review complete: ${data.issues?.length || 0} issues found`,
    details: data,
    timestamp: Date.now(),
  };
}

private async executePreviewAgent(): Promise<PhaseResult> {
  // Build preview
  const response = await fetch('/api/preview/build', {
    method: 'POST',
    body: JSON.stringify({ projectId: this.state.projectId }),
  });
  const data = await response.json();
  
  return {
    phase: 'previewing',
    success: data.success,
    message: data.success ? 'Preview built' : 'Preview failed',
    details: { previewUrl: data.url },
    timestamp: Date.now(),
  };
}
```

### Step 3: Add Status Messages to Chat History

When orchestrator sends a status update, add it as a system message in the chat:

```tsx
// In your chat message list
const [messages, setMessages] = useState<Message[]>([]);

// When orchestrator updates status:
const onStatusUpdate = (status: string) => {
  setMessages(prev => [...prev, {
    id: `system-${Date.now()}`,
    role: 'system',
    content: status,
    timestamp: Date.now(),
  }]);
};
```

### Step 4: Style the System Messages

Render system messages differently from user/assistant messages:

```tsx
// In your message renderer
const MessageBubble = ({ message }: { message: Message }) => {
  if (message.role === 'system') {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }
  // ... user/assistant rendering
};
```

## What the User Sees

### Normal Flow (Success)
```
User: "Build a todo app"

🚀 Starting...
🔍 Analyzing your request...
⚡ Generating code...
✅ Code generated (12 files)
🧪 Running tests...
✅ All tests passed
🔍 Reviewing code quality...
🔍 Review: 2 issues, 5 suggestions
🚀 Building preview...
✅ Preview ready!
✅ All done! Your project is ready.
```

### Failure Flow (Test Fails)
```
User: "Build a todo app"

🚀 Starting...
🔍 Analyzing your request...
⚡ Generating code...
✅ Code generated (12 files)
🧪 Running tests...
⚠️ Testing failed: 3 tests failed
⏳ Waiting for your decision...

[Auto-fix issues] [Review test output] [Skip tests] [Regenerate code]
```

### User Clicks "Auto-fix"
```
⏳ fix...
⚡ Regenerating code with fixes...
✅ Code regenerated (12 files)
🧪 Running tests...
✅ All tests passed
🔍 Reviewing code quality...
🔍 Review: 0 issues, 2 suggestions
🚀 Building preview...
✅ Preview ready!
✅ All done! Your project is ready.
```

## Learning Features (Already Implemented)

The orchestrator automatically:

1. **Tracks outcomes** in localStorage (`hermes_outcomes` key)
2. **Adjusts flow** based on historical failure patterns
3. **Warns about known issues** (e.g., "High test failure rate detected, running extra validation...")
4. **Infers project type** from prompt (mobile/web/general)
5. **Infers complexity** from prompt length

## Next Steps

1. Copy the 3 files to your project
2. Wire the `execute*Agent` methods to your real APIs
3. Add `ChatOrchestratorPanel` to your chat panel
4. Test with a simple prompt
5. Watch the learning improve over time!

## Future Enhancements

- **WebSocket integration** for real-time status updates
- **Server-side learning** (store outcomes in database, not just localStorage)
- **Parallel agent execution** (run code + review simultaneously when safe)
- **Smart retry logic** (learn which fixes work best for each failure type)
- **Agent registry** (dynamic agent discovery and routing)
