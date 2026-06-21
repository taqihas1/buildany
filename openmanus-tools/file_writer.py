"""
File Writer Tool for Morgan (OpenManus)
Allows Morgan to write, read, and modify files in BuildAny projects.
"""
import os
from typing import Optional
from app.tool.base import BaseTool, ToolResult


class FileWriter(BaseTool):
    name: str = "file_writer"
    description: str = """
    Write, read, or modify files in the BuildAny project workspace.
    Use this to generate code, create files, update existing files, or read project context.
    
    Args:
        action: "write", "read", "append", or "delete"
        path: Relative path within the project (e.g., "src/app/page.tsx")
        content: File content (for write/append)
        project_path: Absolute project directory path
    """
    
    parameters: dict = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["write", "read", "append", "delete"],
                "description": "File operation to perform"
            },
            "path": {
                "type": "string",
                "description": "Relative file path within project"
            },
            "content": {
                "type": "string",
                "description": "Content to write or append"
            },
            "project_path": {
                "type": "string",
                "description": "Absolute path to project directory"
            }
        },
        "required": ["action", "path", "project_path"]
    }
    
    async def execute(
        self, 
        action: str, 
        path: str, 
        project_path: str, 
        content: Optional[str] = None
    ) -> ToolResult:
        full_path = os.path.join(project_path, path)
        
        # Safety: ensure path is within project
        real_project = os.path.realpath(project_path)
        real_target = os.path.realpath(full_path)
        if not real_target.startswith(real_project):
            return ToolResult(error=f"Safety: Path {path} escapes project directory")
        
        try:
            if action == "write":
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, 'w') as f:
                    f.write(content or "")
                return ToolResult(output=f"Written: {path} ({len(content or '')} chars)")
            
            elif action == "read":
                if not os.path.exists(full_path):
                    return ToolResult(error=f"File not found: {path}")
                with open(full_path, 'r') as f:
                    data = f.read()
                return ToolResult(output=data)
            
            elif action == "append":
                with open(full_path, 'a') as f:
                    f.write(content or "")
                return ToolResult(output=f"Appended to: {path}")
            
            elif action == "delete":
                if os.path.exists(full_path):
                    os.remove(full_path)
                    return ToolResult(output=f"Deleted: {path}")
                return ToolResult(error=f"File not found: {path}")
            
            else:
                return ToolResult(error=f"Unknown action: {action}")
                
        except Exception as e:
            return ToolResult(error=f"File operation failed: {str(e)}")
