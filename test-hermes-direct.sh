#!/bin/bash
# Simple test: call Hermes directly with tools
curl -s -m 30 http://localhost:8642/v1/chat/completions \
  -H "Authorization: Bearer ${HERMES_API_KEY:-820a8890e58dfd3dadd4166cb2be9b8c4db1afce6514110039374ea1da7b84cc}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Build me a recipe app"}],
    "tools": [{"type": "function", "function": {"name": "buildany_create_project", "description": "Create a project", "parameters": {"type": "object", "properties": {"prompt": {"type": "string"}}, "required": ["prompt"]}}}],
    "tool_choice": "auto"
  }'
