---
type: skill
scope: personal
created: 2026-06-21
updated: 2026-06-21
tags: [okf, how-to, reference]
---

# How to Use This OKF Structure

## Reading Knowledge

Always check the knowledge directory before assuming facts:

```bash
# List available knowledge
ls /root/.openclaw/workspace/knowledge/knowledge/

# Read user profile
cat /root/.openclaw/workspace/knowledge/knowledge/user-profile.md

# Read project history
cat /root/.openclaw/workspace/knowledge/knowledge/project-buildany.md
```

## Writing Knowledge

After learning something new from the user, update the relevant file:

1. **Update `updated` timestamp** in YAML frontmatter
2. **Add new facts** — don't overwrite existing content
3. **Link related knowledge** using markdown links
4. **Log decisions** in `decision-log.md`

## Adding New Knowledge

```bash
# Create new file with YAML frontmatter
cat > /root/.openclaw/workspace/knowledge/knowledge/new-topic.md << 'EOF'
---
type: knowledge
scope: personal
created: 2026-06-21
updated: 2026-06-21
tags: [tag1, tag2]
---

# New Topic

Content here...

## Related Knowledge

- [Related Topic](related-topic.md)
EOF
```

## State Updates

Track session history:

```bash
# Append to session history
echo "- $(date +%Y-%m-%d\ %H:%M): Completed task X" >> /root/.openclaw/workspace/knowledge/state/session-history.md
```

## Memory Checklist

Before each session:
- [ ] Read user-profile.md
- [ ] Read project-buildany.md
- [ ] Read decision-log.md
- [ ] Check for new knowledge files

After each session:
- [ ] Update relevant knowledge files
- [ ] Log decisions in decision-log.md
- [ ] Append session summary to state/session-history.md
