/**
 * Skill Loader for Kelly
 * Loads agent skills from agent-skills + superpowers repos
 * Skills are markdown files with instructions that get injected into system prompts
 */

import fs from 'fs';
import path from 'path';

export interface Skill {
  name: string;
  description: string;
  content: string;
  source: string; // 'agent-skills' | 'superpowers'
}

const SKILL_DIRS = [
  '/root/buildany/skills/agent-skills/skills',
  '/root/buildany/skills/superpowers/skills',
];

class SkillLoader {
  private skills: Map<string, Skill> = new Map();
  private loaded = false;

  async loadAll(): Promise<Skill[]> {
    if (this.loaded) return Array.from(this.skills.values());

    for (const dir of SKILL_DIRS) {
      if (!fs.existsSync(dir)) continue;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const skillPath = path.join(dir, entry.name, 'SKILL.md');
        if (!fs.existsSync(skillPath)) continue;

        const content = fs.readFileSync(skillPath, 'utf8');
        const skill = this.parseSkill(entry.name, content, dir.includes('superpowers') ? 'superpowers' : 'agent-skills');
        this.skills.set(skill.name, skill);
      }
    }

    this.loaded = true;
    console.log(`[Kelly] Loaded ${this.skills.size} skills`);
    return Array.from(this.skills.values());
  }

  private parseSkill(name: string, content: string, source: string): Skill {
    // Parse frontmatter
    let description = '';
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const descMatch = frontmatterMatch[1].match(/description:\s*(.+)/);
      if (descMatch) description = descMatch[1].trim();
    }

    return {
      name,
      description: description || `${name} skill`,
      content: content.slice(frontmatterMatch ? frontmatterMatch[0].length : 0).trim(),
      source,
    };
  }

  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  getPromptForSkill(name: string): string {
    const skill = this.skills.get(name);
    if (!skill) return '';
    return `## SKILL: ${skill.name}\n\n${skill.content}\n`;
  }

  // Get combined prompt for multiple skills
  getPromptForSkills(names: string[]): string {
    return names
      .map(n => this.getPromptForSkill(n))
      .filter(Boolean)
      .join('\n---\n');
  }

  list(): string[] {
    return Array.from(this.skills.keys());
  }

  search(query: string): Skill[] {
    const q = query.toLowerCase();
    return Array.from(this.skills.values()).filter(
      s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    );
  }
}

export const skillLoader = new SkillLoader();

// Phase-to-skills mapping
export const PHASE_SKILLS: Record<string, string[]> = {
  research: ['planning-and-task-breakdown', 'idea-refine'],
  wiki: ['spec-driven-development', 'documentation-and-adrs'],
  code: ['incremental-implementation', 'frontend-ui-engineering', 'source-driven-development'],
  review: ['code-review-and-quality', 'verification-before-completion'],
  debug: ['systematic-debugging', 'debugging-and-error-recovery'],
  test: ['test-driven-development'],
  ship: ['shipping-and-launch'],
};

export async function getPhasePrompt(phase: string): Promise<string> {
  await skillLoader.loadAll();
  const skills = PHASE_SKILLS[phase] || [];
  return skillLoader.getPromptForSkills(skills);
}
