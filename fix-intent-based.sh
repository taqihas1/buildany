#!/bin/bash
set -e
cd ~/buildany

echo "📝 Patching /api/hermes-chat for intent-based tool calling..."

# Create the new route file
cat > src/app/api/hermes-chat/route.ts << 'EOF'
import { NextRequest } from "next/server";

const HERMES_API_URL = process.env.HERMES_API_URL || "http://localhost:8642";
const HERMES_API_KEY = process.env.HERMES_API_KEY!;

/**
 * Detect if user wants to build/create an app
 */
function detectBuildIntent(message: string): { intent: string; name?: string; platform?: string } | null {
  const lower = message.toLowerCase();
  
  const buildWords = ['build', 'create', 'make', 'generate', 'start'];
  const appWords = ['app', 'website', 'web app', 'mobile app', 'site'];
  
  const hasBuildWord = buildWords.some(w => lower.includes(w));
  const hasAppWord = appWords.some(w => lower.includes(w));
  
  if (!hasBuildWord || !hasAppWord) return null;
  
  // Extract app name (text in quotes or after "called/named")
  let name: string | undefined;
  const nameMatch = message.match(/called\s+["']?([^"']+)["']?/i) || 
                    message.match(/named\s+["']?([^"']+)["']?/i);
  if (nameMatch) name = nameMatch[1].trim();
  
  // Detect platform
  let platform = 'both';
  if (lower.includes('mobile') && !lower.includes('web')) platform = 'mobile';
  else if (lower.includes('web') && !lower.includes('mobile')) platform = 'web';
  
  return { intent: 'create_project', name, platform };
}

/**
 * Execute a BuildAny tool call.
 */
async function executeTool(name: string, params: any) {
  switch (name) {
    case 'buildany_create_project': {
      const res = await fetch("http://localhost:3000/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: params.prompt,
          platform: params.platform || 'both',
          name: params.name
        })
      });
      return { name, output: await res.json() };
    }
    default:
      return { name, output: { error: `Unknown tool: ${name}` } };
  }
}

/**
 * POST /api/hermes-chat
 *
 * All chat messages go through Kelly (Hermes).
 * Build intent is detected server-side and tools are called automatically.
 */
export async function POST(req: NextRequest) {
  const { message, projectId, history = [] } = await req.json();

  // Build messages array
  const messages = [
    {
      role: "system" as const,
      content: `You are Kelly, the BuildAny AI agent. You help users build web and mobile apps.`
    },
    ...history,
    { role: "user", content: message }
  ];

  // Call Kelly for conversational response
  const kellyRes = await fetch(`${HERMES_API_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HERMES_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      stream: false
    })
  });

  if (!kellyRes.ok) {
    const error = await kellyRes.text();
    return new Response(`Kelly error: ${error}`, { status: 502 });
  }

  const kellyData = await kellyRes.json();
  const reply = kellyData.choices?.[0]?.message?.content || "No response";

  // Detect build intent and auto-call tool
  const intent = detectBuildIntent(message);
  let toolResult = null;

  if (intent && intent.intent === 'create_project') {
    console.log('[Kelly] Detected build intent, calling create_project...');
    toolResult = await executeTool('buildany_create_project', {
      prompt: message,
      platform: intent.platform,
      name: intent.name
    });
    console.log('[Kelly] Tool result:', JSON.stringify(toolResult.output).substring(0, 200));
  }

  return Response.json({
    reply,
    toolCalls: toolResult ? [{
      function: {
        name: toolResult.name,
        arguments: JSON.stringify(toolResult.output)
      }
    }] : undefined,
    toolResult: toolResult?.output,
    projectId: toolResult?.output?.id || projectId
  });
}
EOF

echo "🔨 Building..."
npm run build

echo "🚀 Restarting..."
pm2 restart buildany
sleep 3

echo "🧪 Testing..."
node -e "
fetch('http://localhost:3000/api/hermes-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Build me a simple recipe app called RecipeBuddy for mobile', projectId: null })
})
.then(r => r.json())
.then(d => {
  console.log('Reply:', d.reply?.substring(0, 100) + '...');
  if (d.toolCalls) {
    console.log('✅ TOOL CALL:', d.toolCalls[0].function.name);
    console.log('Project:', JSON.stringify(d.toolResult, null, 2));
  } else {
    console.log('⚠️ No tool call');
  }
})
.catch(e => console.log('❌ Error:', e.message));
"

git add src/app/api/hermes-chat/route.ts
git commit -m "fix: intent-based tool calling for Kelly (DeepSeek compat)"
git push

echo "🏁 Done!"
