import { describe, it, expect } from '@jest/globals';

/**
 * Smoke Test - Quick verification that the app compiles and runs
 */
describe('BuildAny Smoke Tests', () => {
  
  it('skill loader discovers all 37 skills', () => {
    const { getSkillList } = require('../lib/skill-loader');
    const skills = getSkillList();
    expect(skills.length).toBe(37);
    console.log('🔥 Skills loaded:', skills.length);
  });

  it('orchestrator creates with correct defaults', () => {
    const { HermesOrchestrator } = require('../lib/orchestrator');
    const orch = new HermesOrchestrator(
      'smoke-test', 'Build a test app', 'web',
      () => {}, () => {}, () => {}, {}, null
    );
    const state = orch.getState();
    expect(state.projectId).toBe('smoke-test');
    expect(state.currentPhase).toBe('idle');
    console.log('🔥 Orchestrator initialized');
  });

  it('system prompt includes platform-specific content', () => {
    const { getSystemPromptForType } = require('../lib/llm-router');
    const web = getSystemPromptForType('web');
    const mobile = getSystemPromptForType('mobile');
    expect(web).toContain('Next.js');
    expect(mobile).toContain('Expo');
    console.log('🔥 System prompts ready');
  });

  it('enhanced prompts include skill content', () => {
    const { buildEnhancedSystemPrompt } = require('../lib/skill-loader');
    const prompt = buildEnhancedSystemPrompt('Base', 'coding', 'Test');
    expect(prompt).toContain('=== SKILL INSTRUCTIONS');
    expect(prompt.length).toBeGreaterThan(1000);
    console.log('🔥 Skill-enhanced prompts ready');
  });
});
