# App Change Log

When to use: Daily, or whenever you make changes to the BuildAny app. Creates a structured log that makes it easy to trace which change caused a regression.

## What This Skill Does

Maintains a daily log of every change made to the app — files edited, commands run, configs modified, dependencies added — so when something breaks, you can look back and identify the likely culprit.

## When to Use

- **After every work session:** Log what you changed before you forget
- **Before a big change:** Document the current working state as a baseline
- **When something breaks:** Review the change log to find what likely caused it
- **When delegating to AI:** Give the AI the change log so it knows the recent history

## Step-by-Step

### 1. Capture Current State (Before Changes)

Before starting work, capture the baseline:

```bash
cd /root/buildany

echo "=== BASELINE ==="
echo "Date: $(date)"
echo "Git status:"
git status --short
echo "Git last commit:"
git log -1 --oneline
echo "PM2 status:"
pm2 list
echo "Nginx test:"
sudo nginx -t 2>&1
```

### 2. Make Your Changes

Do your work — edit files, run commands, install packages, etc.

### 3. Log the Changes

After finishing, create the log entry:

**Option A: Use the helper script**
```bash
# The script is at ~/.openclaw/workspace/skills/app-change-log/log-change.sh
# (create it if it doesn't exist)
```

**Option B: Manual log entry**
```bash
cd /root/buildany

echo "" >> memory/2026-06-14.md
echo "## App Change Log — $(date '+%Y-%m-%d %H:%M')" >> memory/2026-06-14.md
echo "" >> memory/2026-06-14.md
echo "### Changes Made" >> memory/2026-06-14.md
echo "- <describe what you did>" >> memory/2026-06-14.md
echo "" >> memory/2026-06-14.md
echo "### Files Modified" >> memory/2026-06-14.md
git diff --name-only >> memory/2026-06-14.md
echo "" >> memory/2026-06-14.md
echo "### Commands Run" >> memory/2026-06-14.md
echo "- \`<command>\` — <what it did>" >> memory/2026-06-14.md
echo "" >> memory/2026-06-14.md
echo "### Result" >> memory/2026-06-14.md
echo "- ✅ Working / ❌ Broken — <description>" >> memory/2026-06-14.md
echo "" >> memory/2026-06-14.md
echo "### Git Commit" >> memory/2026-06-14.md
echo "- \`$(git log -1 --oneline)\`" >> memory/2026-06-14.md
```

### 4. Automated Daily Log (Recommended)

Add this to a daily cron or heartbeat check:

```bash
#!/bin/bash
# ~/.openclaw/workspace/skills/app-change-log/daily-log.sh

APP_DIR="/root/buildany"
LOG_DIR="$APP_DIR/memory"
LOG_FILE="$LOG_DIR/$(date '+%Y-%m-%d').md"

mkdir -p "$LOG_DIR"

if [ ! -f "$LOG_FILE" ]; then
    echo "## App Change Log — $(date '+%Y-%m-%d')" > "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    echo "### Baseline State" >> "$LOG_FILE"
    echo "- Git commit: $(cd $APP_DIR && git log -1 --oneline)" >> "$LOG_FILE"
    echo "- PM2 processes: $(cd $APP_DIR && pm2 list | grep -c online) running" >> "$LOG_FILE"
    echo "- Nginx: $(sudo nginx -t 2>&1 | tail -1)" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
fi

# Append changes if any
cd "$APP_DIR"
CHANGED_FILES=$(git diff --name-only)
if [ -n "$CHANGED_FILES" ]; then
    echo "### $(date '+%H:%M') — Changes Detected" >> "$LOG_FILE"
    echo "\`\`\`" >> "$LOG_FILE"
    echo "$CHANGED_FILES" >> "$LOG_FILE"
    echo "\`\`\`" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    echo "- Git status: $(git status --short | wc -l) files modified" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
fi
```

## Log Entry Template

```markdown
## App Change Log — 2026-06-14 20:35

### Changes Made
- Fixed nginx proxy port from 3000 to 3001
- Removed duplicate nginx vhost `/etc/nginx/sites-enabled/buildany`
- Restarted PM2 process `buildany-3000`
- Tried to build project but TypeScript failed on `schema.ts:38`

### Files Modified
```
src/lib/db/schema.ts
src/middleware.ts
src/app/api/generate/route.ts
```

### Database Schema Changes
- **No schema changes** (only code changes)
- OR: Added `users` table with fields: id, email, name, created_at
- OR: Modified `projects` table: added `github_repo` column

### API Changes
- **No API changes** (only internal logic)
- OR: Added new endpoint `POST /api/deploy`
- OR: Modified `GET /api/generate` to return streaming response

### Commands Run
- `sudo rm /etc/nginx/sites-enabled/buildany` — removed duplicate vhost
- `sudo sed -i 's/3000/3001/' /etc/nginx/sites-enabled/base66.cloud` — fixed proxy port
- `sudo nginx -t && sudo systemctl reload nginx` — reloaded nginx
- `npm run build` — ❌ failed with TypeScript error
- `rm -rf .next && npm run build` — ✅ succeeded after clearing cache

### Infrastructure Changes
- **No infrastructure changes**
- OR: Changed nginx proxy port from 3000 to 3001
- OR: Added SSL certificate for base66.cloud
- OR: Updated DNS A record

### Dependencies Added/Removed
- **No dependency changes**
- OR: Added `drizzle-orm` v0.30.0
- OR: Removed `some-old-package`

### Result
- ✅ Site loads at https://base66.cloud
- ❌ API POST still returns "attempt to write a readonly database"
- Next: Check SQLite file permissions

### Git Commit
- `abc1234` — fix nginx config and clear build cache

### Related Issues
- #42 — API readonly database error (not yet resolved)
```

## How to Use for Debugging

When something breaks, look at the log and ask:

1. **What changed last?** — The most recent entry is the prime suspect
2. **What worked before?** — Find the last "✅ Working" entry
3. **What changed between working and broken?** — That's your culprit
4. **Did I touch that file?** — Search the log for the file mentioned in the error

### Example Debugging Flow

**Error:** `attempt to write a readonly database`

1. Check today's log:
   ```bash
   grep -n "sqlite\|db\|chmod\|permission" memory/2026-06-14.md
   ```
2. No db-related changes today? Check yesterday:
   ```bash
   grep -n "sqlite\|db\|chmod\|permission" memory/2026-06-13.md
   ```
3. Found: "Changed `dbPath` from `/tmp/db.sqlite` to `/root/buildany/sqlite.db`"
4. Aha! The new path might have different permissions
5. Check: `ls -la /root/buildany/sqlite.db`
6. Fix: `chmod 666 /root/buildany/sqlite.db`

## Quick Commands

```bash
# View today's log
cat memory/2026-06-14.md

# Search all logs for a specific file
grep -r "schema.ts" memory/

# Search for "broken" or "failed" entries
grep -r "❌\|❌ Broken\|failed" memory/

# Search for when a specific command was run
grep -r "npm run build" memory/

# See what changed in the last 3 days
for f in memory/2026-06-14.md memory/2026-06-13.md memory/2026-06-12.md; do
  echo "=== $f ==="
  cat "$f" 2>/dev/null | head -30
  echo ""
done
```

## Key Rules

- **Log immediately after changes** — don't wait, you'll forget the details
- **Include the exact error message** — copy-paste it, don't paraphrase
- **Mark results clearly** — ✅ Working / ❌ Broken / ⚠️ Partial
- **Note git commits** — so you can `git diff` later if needed
- **One entry per work session** — not per file, per session
- **When AI makes changes, the AI should log them** — the AI has the context, the human doesn't
