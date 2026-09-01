/**
 * Cordis-Inspired Plugin System for BuildAny
 * 
 * Architecture:
 * - Host Plane: Registries (tools, skills, sessions) — shared across all requests
 * - Agent Plane: Per-session plugins that register into host registries
 * - Self-modification: Plugins can write new plugins to disk
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, watch } from "fs";
import { join, dirname, basename } from "path";
import { randomUUID } from "crypto";

// ─── Types ───

export interface CordisPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  plane: "host" | "agent";
  inject?: string[]; // Services this plugin needs
  provides?: string[]; // Services this plugin registers
  config?: Record<string, any>;
  code: string; // JavaScript code that exports apply(ctx)
  disabled?: boolean;
}

export interface CordisContext {
  get<T>(service: string): T | undefined;
  register<T>(service: string, instance: T): void;
  tools: ToolRegistry;
  skills: SkillRegistry;
  sessions: Map<string, CordisSession>;
}

export interface ToolRegistry {
  register(name: string, tool: AgentTool): void;
  get(name: string): AgentTool | undefined;
  list(): AgentTool[];
}

export interface SkillRegistry {
  register(skill: Skill): void;
  get(name: string): Skill | undefined;
  list(): Skill[];
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
}

export interface Skill {
  name: string;
  description: string;
  whenToUse: string;
  body: string;
}

export interface CordisSession {
  id: string;
  plugins: CordisPlugin[];
  context: CordisContext;
}

// ─── Host Plane ───

class HostContext implements CordisContext {
  private services = new Map<string, any>();
  tools: ToolRegistry;
  skills: SkillRegistry;
  sessions = new Map<string, CordisSession>();

  constructor() {
    this.tools = new HostToolRegistry();
    this.skills = new HostSkillRegistry();
    this.register("tools", this.tools);
    this.register("skills", this.skills);
  }

  get<T>(service: string): T | undefined {
    return this.services.get(service);
  }

  register<T>(service: string, instance: T): void {
    if (this.services.has(service)) {
      throw new Error(`Service "${service}" already registered`);
    }
    this.services.set(service, instance);
  }
}

class HostToolRegistry implements ToolRegistry {
  private tools = new Map<string, AgentTool>();

  register(name: string, tool: AgentTool): void {
    this.tools.set(name, tool);
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  list(): AgentTool[] {
    return Array.from(this.tools.values());
  }
}

class HostSkillRegistry implements SkillRegistry {
  private skills = new Map<string, Skill>();

  register(skill: Skill): void {
    this.skills.set(skill.name, skill);
  }

  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  list(): Skill[] {
    return Array.from(this.skills.values());
  }
}

// ─── Singleton Host ───

let hostContext: HostContext | null = null;

export function getHostContext(): HostContext {
  if (!hostContext) {
    hostContext = new HostContext();
  }
  return hostContext;
}

// ─── Agent Plane ───

export function createSession(sessionId: string): CordisSession {
  const host = getHostContext();
  
  const session: CordisSession = {
    id: sessionId,
    plugins: [],
    context: {
      get: (service: string) => host.get(service),
      register: () => {
        throw new Error("Sessions cannot register host services");
      },
      tools: {
        register: (name: string, tool: AgentTool) => {
          // Agent tools are scoped to session but stored in host
          const scopedName = `${sessionId}:${name}`;
          host.tools.register(scopedName, {
            ...tool,
            execute: async (params: any) => {
              console.log(`[Session ${sessionId}] Tool "${name}" executing`);
              return tool.execute(params);
            },
          });
        },
        get: (name: string) => host.tools.get(`${sessionId}:${name}`) || host.tools.get(name),
        list: () => host.tools.list().filter(t => t.name.startsWith(`${sessionId}:`) || !t.name.includes(":")),
      },
      skills: host.skills,
      sessions: host.sessions,
    },
  };

  host.sessions.set(sessionId, session);
  return session;
}

// ─── Plugin Loader ───

const PLUGINS_DIR = join(process.cwd(), "src/lib/cordis-plugins");
const SKILLS_DIR = join(process.cwd(), "src/lib/cordis-skills");

export function loadPlugin(path: string): CordisPlugin {
  const content = readFileSync(path, "utf-8");
  const parsed = parsePluginFile(content, path);
  return parsed;
}

export function parsePluginFile(content: string, path: string): CordisPlugin {
  // Parse YAML frontmatter + JS body
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (!frontmatterMatch) {
    throw new Error(`Invalid plugin file: ${path}`);
  }

  const yamlText = frontmatterMatch[1];
  const code = frontmatterMatch[2].trim();

  // Simple YAML parser (sufficient for our use case)
  const config: Record<string, any> = {};
  for (const line of yamlText.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      config[key] = value.replace(/^["']|["']$/g, ""); // Remove quotes
    }
  }

  return {
    id: config.id || randomUUID(),
    name: config.name || basename(path, ".plugin.js"),
    version: config.version || "1.0.0",
    description: config.description || "",
    plane: (config.plane as "host" | "agent") || "agent",
    inject: config.inject?.split(",").map((s: string) => s.trim()) || [],
    provides: config.provides?.split(",").map((s: string) => s.trim()) || [],
    config,
    code,
    disabled: config.disabled === "true",
  };
}

export function mountPlugin(plugin: CordisPlugin, session?: CordisSession): void {
  if (plugin.disabled) return;

  const host = getHostContext();
  const ctx = session?.context || host;

  // Resolve injections
  const injections: Record<string, any> = {};
  for (const service of plugin.inject || []) {
    const instance = ctx.get(service);
    if (!instance) {
      console.warn(`[Cordis] Plugin "${plugin.name}" requires "${service}" but it's not available`);
      return;
    }
    injections[service] = instance;
  }

  // Execute plugin code
  try {
    const pluginFn = new Function("ctx", "injections", `
      ${plugin.code}
      return typeof apply !== 'undefined' ? apply : (() => {});
    `);
    
    const apply = pluginFn(ctx, injections);
    
    if (typeof apply === "function") {
      apply(ctx);
      console.log(`[Cordis] Mounted plugin: ${plugin.name} (${plugin.plane})`);
    }
  } catch (err: any) {
    console.error(`[Cordis] Failed to mount plugin "${plugin.name}":`, err.message);
  }
}

// ─── Skill Loader ───

export interface SkillFile {
  name: string;
  description: string;
  whenToUse?: string;
  body: string;
}

export function loadSkill(path: string): SkillFile {
  const content = readFileSync(path, "utf-8");
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    return {
      name: basename(path, ".md"),
      description: "",
      body: content,
    };
  }

  const yamlText = frontmatterMatch[1];
  const body = frontmatterMatch[2].trim();

  const meta: Record<string, string> = {};
  for (const line of yamlText.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      meta[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
    }
  }

  return {
    name: meta.name || basename(path, ".md"),
    description: meta.description || "",
    whenToUse: meta.whenToUse || "",
    body,
  };
}

export function scanSkills(dir: string): SkillFile[] {
  if (!existsSync(dir)) return [];

  const skills: SkillFile[] = [];
  
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Look for SKILL.md inside directory
      const skillMd = join(fullPath, "SKILL.md");
      if (existsSync(skillMd)) {
        skills.push(loadSkill(skillMd));
      }
    } else if (entry.endsWith(".md")) {
      skills.push(loadSkill(fullPath));
    }
  }

  return skills;
}

// ─── Self-Modification: Plugin Writer ───

export function writePlugin(plugin: Omit<CordisPlugin, "id">): CordisPlugin {
  const id = randomUUID();
  const fullPlugin: CordisPlugin = { ...plugin, id };

  // Ensure directory exists
  mkdirSync(PLUGINS_DIR, { recursive: true });

  // Write plugin file
  const fileName = `${plugin.name.replace(/[^a-z0-9]/g, "-")}.plugin.js`;
  const filePath = join(PLUGINS_DIR, fileName);

  const content = `---
id: ${id}
name: ${plugin.name}
version: ${plugin.version}
description: ${plugin.description}
plane: ${plugin.plane}
inject: ${plugin.inject?.join(", ") || ""}
provides: ${plugin.provides?.join(", ") || ""}
---

${plugin.code}
`;

  writeFileSync(filePath, content);
  console.log(`[Cordis] Wrote plugin: ${filePath}`);

  return fullPlugin;
}

export function writeSkill(skill: SkillFile): string {
  mkdirSync(SKILLS_DIR, { recursive: true });

  const dir = join(SKILLS_DIR, skill.name.replace(/[^a-z0-9]/g, "-"));
  mkdirSync(dir, { recursive: true });

  const filePath = join(dir, "SKILL.md");
  const content = `---
name: ${skill.name}
description: ${skill.description}
whenToUse: ${skill.whenToUse || ""}
---

${skill.body}
`;

  writeFileSync(filePath, content);
  console.log(`[Cordis] Wrote skill: ${filePath}`);

  return filePath;
}

// ─── Watch for Changes (Self-Improvement) ───

export function startWatching(): void {
  const host = getHostContext();

  // Watch plugins directory
  if (existsSync(PLUGINS_DIR)) {
    watch(PLUGINS_DIR, { recursive: true }, (eventType, filename) => {
      if (filename?.endsWith(".plugin.js")) {
        console.log(`[Cordis] Plugin file changed: ${filename}`);
        // In production, would reload plugin here
      }
    });
  }

  // Watch skills directory
  if (existsSync(SKILLS_DIR)) {
    watch(SKILLS_DIR, { recursive: true }, (eventType, filename) => {
      if (filename?.endsWith("SKILL.md") || filename?.endsWith(".md")) {
        console.log(`[Cordis] Skill file changed: ${filename}`);
        // Rescan skills
        const skills = scanSkills(SKILLS_DIR);
        for (const skill of skills) {
          host.skills.register(skill);
        }
      }
    });
  }

  console.log("[Cordis] Watching for plugin/skill changes...");
}

// ─── Initialize ───

export function initializeCordis(): void {
  const host = getHostContext();

  // Load built-in plugins
  if (existsSync(PLUGINS_DIR)) {
    for (const entry of readdirSync(PLUGINS_DIR)) {
      if (entry.endsWith(".plugin.js")) {
        try {
          const plugin = loadPlugin(join(PLUGINS_DIR, entry));
          if (plugin.plane === "host") {
            mountPlugin(plugin);
          }
        } catch (err: any) {
          console.error(`[Cordis] Failed to load plugin ${entry}:`, err.message);
        }
      }
    }
  }

  // Load skills
  if (existsSync(SKILLS_DIR)) {
    const skills = scanSkills(SKILLS_DIR);
    for (const skill of skills) {
      host.skills.register(skill);
    }
  }

  startWatching();
  console.log("[Cordis] Initialized");
}
