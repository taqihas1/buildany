// BuildAny Hermes Orchestrator
// Everything goes through Hermes with loaded skills
// Agent name: Kelly
// Uses Hermes Gateway API (port 8642) instead of docker exec

const HERMES_URL = "http://127.0.0.1:8642/v1/chat/completions";
const HERMES_API_KEY = "820a8890e58dfd3dadd4166cb2be9b8c4db1afce6514110039374ea1da7b84cc";
const HERMES_MODEL = "deepseek-v4-pro";

// Skills to load for orchestration
const ORCHESTRATION_SKILLS = [
  "planning-and-task-breakdown",
  "spec-driven-development",
  "code-review",
  "test-driven-development",
];

// Read skill content from files (on VPS)
// These will be embedded into the prompt
const SKILL_TEMPLATES = {
  "planning-and-task-breakdown": `## Planning & Task Breakdown Skill
When given a project idea, break it down into:
1. Core features (MVP)
2. Technical architecture
3. File structure
4. Implementation phases
5. Testing plan`,

  "spec-driven-development": `## Spec-Driven Development Skill
Before writing code, write detailed specs:
1. User stories
2. API contracts
3. Data models
4. UI/UX specifications
5. Error handling`,

  "code-review": `## Code Review Skill
Review all code for:
1. TypeScript correctness
2. React best practices
3. Performance
4. Accessibility
5. Security`,

  "test-driven-development": `## Test-Driven Development Skill
Write tests alongside code:
1. Unit tests for functions
2. Integration tests for APIs
3. Component tests for UI
4. End-to-end tests for flows`,
};

export function buildHermesPrompt(prompt: string, type: string): string {
  const skillsContent = Object.entries(SKILL_TEMPLATES)
    .map(([name, content]) => `--- SKILL: ${name} ---\n${content}`)
    .join("\n\n");

  return `${skillsContent}

--- TASK ---
Build a ${type} application for: "${prompt}"

Follow the loaded skills above. Return ONLY valid JSON with this structure:
{
  "projectName": "Short descriptive name",
  "description": "One-sentence description",
  "type": "${type}",
  "research": {
    "targetAudience": "...",
    "painPoints": ["..."],
    "competitors": [{"name": "...", "features": ["..."], "strengths": ["..."], "weaknesses": ["..."]}],
    "marketGaps": ["..."],
    "coreFeatures": ["..."]
  },
  "specs": {
    "userStories": ["..."],
    "dataModels": [{"name": "...", "fields": ["..."]}],
    "apiEndpoints": [{"method": "GET", "path": "...", "description": "..."}],
    "uiComponents": ["..."]
  },
  "files": [
    {
      "path": "src/app/page.tsx",
      "content": "..."
    }
  ],
  "tests": [
    {
      "name": "...",
      "content": "..."
    }
  ],
  "wiki": [
    {
      "title": "Architecture",
      "content": "..."
    }
  ]
}

Generate complete, runnable code. Use TypeScript, React/Next.js, Tailwind CSS. Ensure all imports are correct. Return ONLY the JSON, no markdown formatting.`;
}

export { HERMES_URL, HERMES_API_KEY, HERMES_MODEL, ORCHESTRATION_SKILLS };
