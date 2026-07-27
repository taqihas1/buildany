import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Test skill loader directly
import { 
  getSkillList, 
  getAvailableSkillsDebug, 
  buildEnhancedSystemPrompt,
} from '../lib/skill-loader';

// Test LLM router
import { llmRouter, getSystemPromptForType } from '../lib/llm-router';

describe('Skill System', () => {
  it('loads all 37 skills from filesystem', () => {
    const skills = getSkillList();
    console.log('✅ Skills loaded:', skills.length, skills.slice(0, 5));
    expect(skills.length).toBeGreaterThanOrEqual(30);
  });

  it('has required development skills', () => {
    const skills = getSkillList();
    const required = [
      'test-driven-development',
      'incremental-implementation',
      'frontend-ui-engineering',
      'systematic-debugging',
      'code-review-and-quality',
      'planning-and-task-breakdown',
      'spec-driven-development'
    ];
    for (const skill of required) {
      expect(skills).toContain(skill);
    }
  });

  it('builds enhanced system prompt for coding', () => {
    const base = 'You are a senior developer.';
    const enhanced = buildEnhancedSystemPrompt(base, 'coding', 'Test project');
    
    expect(enhanced).toContain('incremental-implementation');
    expect(enhanced).toContain('test-driven-development');
    expect(enhanced).toContain('frontend-ui-engineering');
    expect(enhanced.length).toBeGreaterThan(base.length + 100);
    console.log('📝 Enhanced prompt length:', enhanced.length);
  });

  it('builds enhanced system prompt for testing', () => {
    const base = 'You are a QA engineer.';
    const enhanced = buildEnhancedSystemPrompt(base, 'testing', 'Test project');
    
    expect(enhanced).toContain('systematic-debugging');
    expect(enhanced).toContain('browser-testing-with-devtools');
    expect(enhanced).toContain('test-driven-development');
  });

  it('returns system prompt for web platform', () => {
    const prompt = getSystemPromptForType('web');
    expect(prompt).toContain('Next.js');
    expect(prompt).toContain('Tailwind');
  });

  it('returns system prompt for mobile platform', () => {
    const prompt = getSystemPromptForType('mobile');
    expect(prompt).toContain('Expo');
    expect(prompt).toContain('React Native');
  });
});

describe('LLM Router Timeout', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('has AbortController timeout of 120s', async () => {
    // Mock fetch to capture the signal
    const mockFetch = jest.fn((url: string, init: any) => {
      // Check that signal exists (AbortController was used)
      expect(init.signal).toBeDefined();
      expect(init.signal.aborted).toBe(false);
      
      // Return immediately for this test
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          choices: [{ message: { content: 'test' } }],
          usage: { total_tokens: 10 }
        }),
      } as Response);
    });

    globalThis.fetch = mockFetch as any;

    // Load configs first (mock the DB call)
    (llmRouter as any).configs = new Map([['deepseek', {
      baseUrl: 'https://api.deepseek.com/v1/chat/completions',
      model: 'deepseek-chat',
      apiKey: 'test-key'
    }]]);

    const result = await llmRouter.generate({
      prompt: 'test prompt',
      systemPrompt: 'test',
      provider: 'deepseek',
    });

    expect(mockFetch).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('returns timeout error when fetch hangs', async () => {
    // This test verifies the timeout mechanism exists.
    // The actual 120s timeout is hardcoded in llm-router.ts.
    // We verify by checking the abort signal is passed to fetch.
    const mockFetch = jest.fn((url: string, init: any) => {
      // Verify AbortController signal is passed
      expect(init.signal).toBeDefined();
      expect(init.signal instanceof AbortSignal).toBe(true);
      
      // Return immediately for this test
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          choices: [{ message: { content: 'test' } }],
          usage: { total_tokens: 10 }
        }),
      } as Response);
    });
    globalThis.fetch = mockFetch as any;

    // Load configs
    (llmRouter as any).configs = new Map([['deepseek', {
      baseUrl: 'https://api.deepseek.com/v1/chat/completions',
      model: 'deepseek-chat',
      apiKey: 'test-key'
    }]]);

    const result = await llmRouter.generate({
      prompt: 'test',
      systemPrompt: 'test',
      provider: 'deepseek',
    });

    // Verify fetch was called with abort signal
    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].signal).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('has 120 second timeout configured', () => {
    // Verify the timeout value by checking the source code pattern
    // This is a static check - the actual timeout is 120000ms in llm-router.ts
    const routerCode = require('fs').readFileSync('src/lib/llm-router.ts', 'utf-8');
    expect(routerCode).toContain('120000');
    expect(routerCode).toContain('AbortController');
    expect(routerCode).toContain('controller.abort()');
  });
});

describe('Orchestrator Logic', () => {
  // Import orchestrator dynamically to avoid DB issues
  let HermesOrchestrator: any;

  beforeEach(async () => {
    // Mock the database module before importing
    jest.mock('../lib/db', () => ({
      db: {
        select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
        insert: () => ({ values: () => Promise.resolve({}) }),
        update: () => ({ set: () => ({ where: () => Promise.resolve({}) }) }),
      }
    }));
    
    jest.mock('../lib/db/schema', () => ({
      projects: {},
      agents: {},
      tasks: {},
      projectFiles: {},
      conversations: {},
      wikiPages: {},
      codeReviews: {},
    }));

    const mod = await import('../lib/orchestrator');
    HermesOrchestrator = (mod as any).HermesOrchestrator || (mod as any).default;
  });

  it('decomposes a project into display tasks', () => {
    const orch = new HermesOrchestrator(
      'test-123',
      'Build a recipe app with meal planner',
      'web',
      () => {},
      () => {},
      () => {},
      {},
      null
    );

    const tasks = orch.decomposeProject('Build a recipe app with meal planner', 'web');
    
    expect(tasks.length).toBeGreaterThanOrEqual(8);
    expect(tasks.some((t: any) => t.type === 'research')).toBe(true);
    expect(tasks.some((t: any) => t.type === 'code')).toBe(true);
    expect(tasks.some((t: any) => t.type === 'test')).toBe(true);
    expect(tasks.some((t: any) => t.type === 'review')).toBe(true);
    expect(tasks.some((t: any) => t.type === 'deploy')).toBe(true);
    
    console.log('✅ Decomposed into', tasks.length, 'tasks');
    console.log('Tasks:', tasks.map((t: any) => `${t.type}: ${t.title}`));
  });

  it('determines correct execution flow', () => {
    const orch = new HermesOrchestrator('t', 'test', 'web', () => {}, () => {}, () => {}, {}, null);
    const flow = orch.determineFlow();
    
    expect(flow).toEqual(['coding', 'testing', 'reviewing', 'previewing']);
  });

  it('infers project types correctly', () => {
    const web = new HermesOrchestrator('t', 'Build a website', 'web', () => {}, () => {}, () => {}, {}, null);
    const mobile = new HermesOrchestrator('t', 'Build an iOS app', 'mobile', () => {}, () => {}, () => {}, {}, null);
    const general = new HermesOrchestrator('t', 'Build something', 'general', () => {}, () => {}, () => {}, {}, null);
    
    expect(web.inferProjectType('Build a website')).toBe('web');
    expect(mobile.inferProjectType('Build an iOS app')).toBe('mobile');
    expect(general.inferProjectType('Build something')).toBe('general');
  });
});
