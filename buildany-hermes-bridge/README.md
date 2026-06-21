# BuildAny ↔ Hermes Bridge

## What You Just Built

✅ **Hermes agent** running on DeepSeek API  
✅ **37 new skills** loaded (Addy Osmani + Superpowers)  
✅ **DeepSeek configured** as the LLM provider  

Now wire it into BuildAny's chat panel!

---

## Deployment Steps

### 1. Copy API Route to VPS

```bash
# On VPS (root@srv1730121):
cd /root/buildany

# Create the API route directory
mkdir -p src/app/api/hermes-chat

# Copy the bridge code
cat > src/app/api/hermes-chat/route.ts << 'APIEOF'
# [Paste the route.ts content here]
APIEOF
```

Or copy from the file I wrote:
```bash
cp /root/.openclaw/workspace/buildany-hermes-bridge/route.ts /root/buildany/src/app/api/hermes-chat/route.ts
```

### 2. Copy the React Hook

```bash
cp /root/.openclaw/workspace/buildany-hermes-bridge/useHermesChat.ts /root/buildany/src/hooks/useHermesChat.ts
```

### 3. Wire Into Your Chat Panel

In your existing chat component, replace or augment the AI call:

```tsx
import { useHermesChat } from "@/hooks/useHermesChat";

function ChatPanel() {
  const { messages, isLoading, sendMessage, clearMessages } = useHermesChat({
    onError: (err) => console.error("Hermes error:", err),
  });

  const handleSend = async (text: string) => {
    // Option A: Always use Hermes
    await sendMessage(text);

    // Option B: Use Hermes with skills
    await sendMessage(text, ["spec-driven-development"]);
  };

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id} className={msg.role === "user" ? "user-msg" : "ai-msg"}>
          {msg.isLoading ? "Thinking..." : msg.content}
        </div>
      ))}
      <input onKeyDown={(e) => e.key === "Enter" && handleSend(e.currentTarget.value)} />
    </div>
  );
}
```

### 4. Build and Restart

```bash
cd /root/buildany && npm run build && pm2 restart 0 --update-env
```

---

## Features

| Feature | Status |
|---------|--------|
| Basic chat | ✅ Working |
| Multi-turn conversation | ✅ History included |
| Skills loading | ⚠️ Needs `-s` flag fix |
| Error handling | ✅ Built-in |
| Timeout | ✅ 2 min |

---

## Next Steps

1. **Fix skills loading** — The `-s` flag doesn't work yet. Skills are loaded into the system context but not via CLI preload. We can work around this by including the skill content in the prompt.

2. **Add streaming** — Current version returns full response. For real-time feel, switch to Server-Sent Events (SSE).

3. **Add skill selector** — UI dropdown to pick which skill to use for the conversation.

4. **Add project context** — Pass the current BuildAny project state to Hermes for context-aware responses.

---

## Test the API

```bash
# Test directly:
curl -X POST http://localhost:3000/api/hermes-chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[], "query": "Hello Hermes!"}'
```

Or use the deployed domain:
```bash
curl -X POST https://base66.cloud/api/hermes-chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[], "query": "Hello Hermes!"}'
```

---

## Files Location

- **API Route:** `/root/.openclaw/workspace/buildany-hermes-bridge/route.ts`
- **React Hook:** `/root/.openclaw/workspace/buildany-hermes-bridge/useHermesChat.ts`
- **Skills User Guide:** `/root/.openclaw/workspace/skills-user-guide.md`
