# BuildAny MCP Memory Server

## What It Is
A lightweight MCP (Model Context Protocol) server that provides persistent, searchable memory for Kelly and any other AI agents.

## Architecture
```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│  BuildAny   │────▶│  MCP Memory     │────▶│  SQLite DB  │
│  (Next.js)  │     │  Server :3001   │     │  /data/     │
└─────────────┘     └─────────────────┘     └─────────────┘
                           ▲
                           │ MCP Protocol
                    ┌──────┴──────┐
                    │   Hermes    │
                    │   Agent     │
                    └─────────────┘
```

## Quick Start

```bash
# Build and run locally
cd mcp-memory
npm install
npm run build
npm start

# Or with Docker
docker build -t buildany-memory .
docker run -p 3001:3001 -v ./data:/data buildany-memory
```

## API Endpoints

### Tools (MCP Protocol)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/tools/memory_write` | POST | Save a memory |
| `/tools/memory_search` | POST | Search memories |
| `/tools/memory_read` | POST | Read specific memory |
| `/tools/memory_update_priority` | POST | Change priority (hot/warm/cold) |
| `/tools/memory_delete` | POST | Delete memory |
| `/tools/memory_status` | POST | Get stats |
| `/tools/memory_consolidate` | POST | Merge duplicates, clean old |

### Context Injection
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/context` | POST | Get hot memories formatted for LLM |

### Other
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/mcp/manifest` | GET | MCP tool manifest |

## Memory Types
- **fact** — Objective facts about the project/domain
- **preference** — User preferences (fonts, colors, patterns)
- **decision** — Key decisions made and why
- **pattern** — Recurring patterns in user behavior
- **bugfix** — Bugs encountered and their fixes
- **project** — Project-specific context

## Priority Levels
- **hot** — Always included in context (< 180 tokens)
- **warm** — Included when relevant
- **cold** — Only retrieved via search

## Example Usage

```bash
# Write a memory
curl -X POST http://localhost:3001/tools/memory_write \
  -H "Content-Type: application/json" \
  -d '{
    "type": "preference",
    "key": "user-font-choice",
    "content": "User prefers Playfair Display for headings and Geist Sans for body text",
    "priority": "hot",
    "tags": ["design", "fonts"]
  }'

# Search memories
curl -X POST http://localhost:3001/tools/memory_search \
  -H "Content-Type: application/json" \
  -d '{"query": "font preference"}'

# Get context for LLM
curl -X POST http://localhost:3001/context \
  -H "Content-Type: application/json" \
  -d '{"projectId": "abc123", "maxTokens": 180}'
```
