#!/bin/bash
# Run these commands DIRECTLY on your VPS (copy-paste)

cd /root

# 1. Create directory
mkdir -p /root/kelly-chat-ui
cd /root/kelly-chat-ui

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install minimal dependencies
pip install fastapi uvicorn httpx websockets

# 4. Create the chat UI
cat > main.py << 'PYTHON'
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
import json
import httpx
import os

app = FastAPI(title="Kelly Chat")

# Connect to Hermes/Kelly
HERMES_URL = os.getenv("HERMES_URL", "http://127.0.0.1:8642/v1/chat/completions")
HERMES_API_KEY = os.getenv("HERMES_API_KEY", "820a8890e58dfd3dadd4166cb2be9b8c4db1afce6514110039374ea1da7b84cc")

HTML_PAGE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Kelly Chat</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            background: rgba(0,0,0,0.2);
            padding: 15px 20px;
            color: white;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .header h1 { font-size: 18px; }
        .status { 
            width: 8px; height: 8px; 
            border-radius: 50%; 
            background: #4ade80;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .message {
            max-width: 80%;
            padding: 12px 16px;
            border-radius: 18px;
            line-height: 1.5;
            word-wrap: break-word;
        }
        .user-msg {
            align-self: flex-end;
            background: white;
            color: #333;
        }
        .ai-msg {
            align-self: flex-start;
            background: rgba(255,255,255,0.2);
            color: white;
            backdrop-filter: blur(10px);
        }
        .input-area {
            padding: 15px 20px;
            background: rgba(0,0,0,0.2);
            display: flex;
            gap: 10px;
        }
        .input-area input {
            flex: 1;
            padding: 12px 16px;
            border: none;
            border-radius: 25px;
            font-size: 14px;
            outline: none;
        }
        .input-area button {
            padding: 12px 24px;
            background: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 600;
            color: #764ba2;
        }
        .input-area button:hover { opacity: 0.9; }
        .loading {
            display: flex;
            gap: 4px;
            align-items: center;
        }
        .loading span {
            width: 6px; height: 6px;
            background: white;
            border-radius: 50%;
            animation: bounce 1.4s infinite ease-in-out;
        }
        .loading span:nth-child(1) { animation-delay: -0.32s; }
        .loading span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="status"></div>
        <h1>Kelly Chat</h1>
        <span style="opacity:0.7;font-size:12px;">BuildAny AI Agent</span>
    </div>
    <div class="chat-container" id="chat"></div>
    <div class="input-area">
        <input type="text" id="msg" placeholder="Ask Kelly anything..." onkeypress="if(event.key==='Enter')send()">
        <button onclick="send()">Send</button>
    </div>
    <script>
        const chat = document.getElementById('chat');
        const msgInput = document.getElementById('msg');
        let ws;
        
        function connect() {
            const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(protocol + '//' + location.host + '/ws');
            ws.onmessage = (e) => {
                const data = JSON.parse(e.data);
                if (data.type === 'chunk') {
                    appendChunk(data.content);
                } else if (data.type === 'done') {
                    finishMessage();
                } else if (data.type === 'error') {
                    showError(data.content);
                }
            };
            ws.onclose = () => setTimeout(connect, 1000);
        }
        
        let currentMsg = null;
        
        function appendUser(text) {
            const div = document.createElement('div');
            div.className = 'message user-msg';
            div.textContent = text;
            chat.appendChild(div);
            chat.scrollTop = chat.scrollHeight;
        }
        
        function appendAI() {
            const div = document.createElement('div');
            div.className = 'message ai-msg';
            div.innerHTML = '<div class="loading"><span></span><span></span><span></span></div>';
            chat.appendChild(div);
            chat.scrollTop = chat.scrollHeight;
            currentMsg = div;
            return div;
        }
        
        function appendChunk(text) {
            if (!currentMsg) currentMsg = appendAI();
            if (currentMsg.querySelector('.loading')) {
                currentMsg.innerHTML = '';
            }
            currentMsg.textContent += text;
            chat.scrollTop = chat.scrollHeight;
        }
        
        function finishMessage() {
            currentMsg = null;
        }
        
        function showError(text) {
            if (currentMsg) {
                currentMsg.textContent = '❌ ' + text;
                currentMsg = null;
            }
        }
        
        function send() {
            const text = msgInput.value.trim();
            if (!text) return;
            appendUser(text);
            msgInput.value = '';
            currentMsg = appendAI();
            ws.send(JSON.stringify({message: text}));
        }
        
        connect();
    </script>
</body>
</html>
"""

@app.get("/")
async def root():
    return HTMLResponse(HTML_PAGE)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    async def stream_to_hermes(message: str):
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    HERMES_URL,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {HERMES_API_KEY}"
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": [{"role": "user", "content": message}],
                        "stream": True
                    }
                )
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            content = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if content:
                                await websocket.send_json({"type": "chunk", "content": content})
                        except:
                            pass
                            
                await websocket.send_json({"type": "done"})
                
            except Exception as e:
                await websocket.send_json({"type": "error", "content": str(e)})
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            await stream_to_hermes(msg.get("message", ""))
    except WebSocketDisconnect:
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
PYTHON

# 5. Start the server
nohup python3 main.py > /tmp/kelly-chat.log 2>&1 &

echo ""
echo "============================================"
echo "✅ Kelly Chat UI started!"
echo "============================================"
echo ""
echo "Access at:"
echo "  http://srv1730121:8002"
echo ""
echo "Or via Nginx (after config):"
echo "  https://base66.cloud/kelly-chat"
