with open('src/components/Workspace3Col.tsx', 'r') as f:
    content = f.read()

old_str = '  // Auto-send initial prompt if it came from URL'
new_str = '''  // Load chat history from server on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`/api/project/${project.id}/chat`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages.map((m) => ({
              id: Math.random().toString(36).substr(2, 9),
              role: m.role,
              content: m.content,
            })));
          }
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    }
    loadHistory();
  }, [project.id]);

  // Auto-send initial prompt if it came from URL'''

if old_str in content:
    content = content.replace(old_str, new_str)
    with open('src/components/Workspace3Col.tsx', 'w') as f:
        f.write(content)
    print("Chat history loading added")
else:
    print("Could not find insertion point")
