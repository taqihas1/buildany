#!/bin/bash
cd /root/buildany

echo "=== Find the Build button / chat send handler ==="
grep -rn "onClick.*Build\|handleBuild\|handleSend\|onSubmit" src/components/ src/app/project/ 2>/dev/null | grep -v node_modules | head -20

echo ""
echo "=== Find orchestrator API calls ==="
grep -rn "fetch.*orchestrate\|fetch.*generate\|useOrchestrator\|orchestrate" src/components/ src/hooks/ src/app/project/ 2>/dev/null | grep -v node_modules | head -20

echo ""
echo "=== Check AIChatPanel for message send ==="
grep -n "sendMessage\|handleSend\|onSubmit" src/components/AIChatPanel.tsx | head -10

echo ""
echo "=== Check if there's a separate orchestrator hook ==="
ls -la src/hooks/ 2>/dev/null
