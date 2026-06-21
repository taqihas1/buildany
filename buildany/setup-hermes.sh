#!/bin/bash
# setup-hermes.sh - Install Hermes Gateway on VPS for BuildAny integration
# Run on VPS: bash setup-hermes.sh

set -e

HERMES_IMAGE="nousresearch/hermes-agent:latest"
HERMES_PORT=8642
HERMES_DATA="$HOME/.hermes"

# === 1. Prep directories ===
mkdir -p "$HERMES_DATA/skills"
mkdir -p "$HERMES_DATA/logs"

# === 2. Write env file ===
cat > "$HERMES_DATA/.env" << 'EOF'
# Required: your LLM provider key
DEEPSEEK_API_KEY=sk-69828b4ab62c4778850b1234480db1f9

# Enable API server for BuildAny integration
API_SERVER_ENABLED=true
API_SERVER_HOST=0.0.0.0
API_SERVER_PORT=8642
API_SERVER_KEY=REPLACE_ME

# Allow all users (we control access via BuildAny middleware)
GATEWAY_ALLOW_ALL_USERS=true

# Terminal backend: local (we're in Docker, so this is container-local)
TERMINAL_BACKEND=local
EOF

# Generate a random API key
API_KEY=$(openssl rand -hex 32)
sed -i "s/REPLACE_ME/$API_KEY/" "$HERMES_DATA/.env"

echo "=== Hermes API Key Generated ==="
echo "$API_KEY"
echo ""
echo "SAVE THIS ^^ - BuildAny needs it"
echo ""

# === 3. Pull and run Hermes ===
docker pull "$HERMES_IMAGE"

# Stop old container if exists
docker rm -f hermes-gateway 2>/dev/null || true

# Run with network=host so Hermes can reach BuildAny on localhost:3000
# OR use bridge with explicit host binding
docker run -d \
  --name hermes-gateway \
  --restart unless-stopped \
  -v "$HERMES_DATA:/opt/data" \
  -p "$HERMES_PORT:$HERMES_PORT" \
  --add-host=host.docker.internal:host-gateway \
  -e HERMES_HOME=/opt/data \
  "$HERMES_IMAGE" \
  gateway run

# === 4. Wait for startup ===
echo "=== Waiting for Hermes to start... ==="
sleep 10

# === 5. Health check ===
echo "=== Health Check ==="
curl -s http://localhost:8642/health || curl -s http://localhost:8642/v1/models || echo "Hermes not responding yet - wait 30s and retry"

# === 6. Clone skills ===
echo "=== Cloning skills... ==="
cd "$HERMES_DATA/skills"

if [ ! -d "agent-skills" ]; then
  git clone --depth 1 https://github.com/addyosmani/agent-skills.git agent-skills
fi

if [ ! -d "superpowers" ]; then
  git clone --depth 1 https://github.com/obra/superpowers.git superpowers
fi

echo ""
echo "=== Skills installed ==="
ls -1 agent-skills/skills 2>/dev/null | wc -l
echo "agent-skills"
ls -1 superpowers/skills 2>/dev/null | wc -l
echo "superpowers"

# === 7. Print status ===
echo ""
echo "========================================"
echo "HERMES GATEWAY INSTALLED"
echo "========================================"
echo "Container: hermes-gateway"
echo "API Port: 8642"
echo "API Key: $API_KEY"
echo "Data Dir: $HERMES_DATA"
echo ""
echo "Add to BuildAny .env.local:"
echo "HERMES_API_URL=http://localhost:8642"
echo "HERMES_API_KEY=$API_KEY"
echo ""
echo "Test:"
echo "curl -H \"Authorization: Bearer $API_KEY\" http://localhost:8642/v1/models"
echo ""
