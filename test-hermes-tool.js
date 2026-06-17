#!/usr/bin/env node
/**
 * Test: Hermes -> BuildAny tool calling end-to-end
 * Run on VPS: node /tmp/test-hermes-tool.js
 */

const HERMES_URL = 'http://localhost:3000/api/hermes-chat';
const TOOL_URL = 'http://localhost:3000/api/hermes-tool';

async function testHermesWithTool() {
  console.log('🧪 Testing Hermes tool calling...\n');

  const payload = {
    messages: [
      { role: 'user', content: 'Build me a simple recipe app called RecipeBuddy' }
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'createProject',
          description: 'Create a new project on BuildAny. Returns projectId.',
          parameters: {
            type: 'object',
            properties: {
              prompt: { type: 'string', description: 'The project idea/description' },
              name: { type: 'string', description: 'Project name' }
            },
            required: ['prompt']
          }
        }
      }
    ]
  };

  console.log('📤 POST', HERMES_URL);
  
  const res = await fetch(HERMES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  const rawText = await res.text();
  console.log('📥 Raw response (first 500 chars):');
  console.log(rawText.substring(0, 500));
  
  let data;
  try {
    data = JSON.parse(rawText);
    console.log('\n✅ Valid JSON response');
  } catch (e) {
    console.log('\n⚠️ Not JSON — printing raw text:');
    console.log(rawText);
    return;
  }
  
  // Check if Hermes returned a tool call
  if (data.tool_calls && data.tool_calls.length > 0) {
    console.log('\n✅ Hermes returned a tool call!');
    console.log('Tool:', data.tool_calls[0].function.name);
    console.log('Args:', data.tool_calls[0].function.arguments);
    
    const toolCall = data.tool_calls[0];
    const args = JSON.parse(toolCall.function.arguments);
    
    console.log('\n📤 Calling tool:', TOOL_URL);
    const toolRes = await fetch(TOOL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: toolCall.function.name,
        params: args
      })
    });
    
    const toolData = await toolRes.json();
    console.log('\n📥 Tool Result:', JSON.stringify(toolData, null, 2));
    
    if (toolData.success) {
      console.log('\n🎉 END-TO-END SUCCESS!');
      console.log('Project ID:', toolData.result?.projectId || toolData.result?.id);
    } else {
      console.log('\n❌ Tool execution failed:', toolData.error);
    }
  } else if (data.content) {
    console.log('\n⚠️ Hermes responded with text (no tool call):');
    console.log(data.content);
  } else if (data.error) {
    console.log('\n❌ Error:', data.error);
  } else {
    console.log('\n⚠️ Unexpected response format:', Object.keys(data));
  }
}

testHermesWithTool().catch(console.error);
