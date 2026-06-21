// patch-research-v2.js — simpler, no backticks in template literals
const fs = require('fs');
const path = '/root/buildany/src/lib/orchestrator.ts';
let content = fs.readFileSync(path, 'utf8');

if (content.includes('private async research()')) {
  console.log('Already patched!');
  process.exit(0);
}

// 1. Hook: add research call before generateWikiPages
content = content.replace(
  'await this.generateWikiPages();',
  'if (!this.state.researchData) { this.state.researchData = await this.research(); }\n    await this.generateWikiPages();'
);

// 2. Insert research() method before inferTechStack
const pos = content.indexOf('private inferTechStack');
if (pos < 0) {
  console.error('Could not find inferTechStack');
  process.exit(1);
}

const method = [
  '',
  '  /**',
  '   * Kelly does her own market research before generating wiki pages',
  '   */',
  '  private async research(): Promise<any> {',
  '    this.onStatusUpdate("🔍 Kelly is researching market...");',
  '    try {',
  '      const { recall, memory } = require("./memory-client");',
  '      const past = await recall(this.state.prompt.slice(0, 30));',
  '      if (past.length > 0) {',
  '        this.onStatusUpdate(`💡 Kelly remembers ${past.length} similar projects`);',
  '      }',
  '      const researchPrompt = "Research this app idea and return ONLY valid JSON with: targetAudience, painPoints[], competitors[{name,features[],strengths[],weaknesses[]}], marketGaps[], techStack[], coreFeatures[], designTrends[]\\n\\nApp Idea: " + this.state.prompt + "\\nPlatform: " + this.state.platform;',
  '      const { llmRouter } = require("./llm-router");',
  '      const result = await llmRouter.generate({',
  '        prompt: researchPrompt,',
  '        systemPrompt: "You are a market research analyst. Return ONLY valid JSON.",',
  '        provider: "deepseek", temperature: 0.7, maxTokens: 2000,',
  '      });',
  '      let researchData = null;',
  '      if (result.success && result.content) {',
  '        try {',
  '          const jsonStr = result.content.replace(/```json\\s*/g, "").replace(/```\\s*/g, "");',
  '          researchData = JSON.parse(jsonStr);',
  '        } catch (e) {',
  '          researchData = { raw: result.content };',
  '        }',
  '      }',
  '      if (researchData) {',
  '        await memory.pattern("research-" + this.state.platform, JSON.stringify(researchData).slice(0, 200), ["research", this.state.platform]);',
  '        if (researchData.competitors?.length) {',
  '          await memory.pattern("competitors-" + this.state.platform, "Competitors: " + researchData.competitors.map((c) => c.name).join(", "), ["competitors"]);',
  '        }',
  '        if (researchData.techStack?.length) {',
  '          await memory.decision("stack-" + this.state.projectId, "Stack: " + researchData.techStack.join(", "), this.state.projectId, ["stack"]);',
  '        }',
  '      }',
  '      return researchData;',
  '    } catch (error) {',
  '      console.error("[Kelly] Research failed:", error);',
  '      return null;',
  '    }',
  '  }',
  ''
].join('\n');

content = content.slice(0, pos) + method + content.slice(pos);
fs.writeFileSync(path, content);
console.log('✅ Kelly research() added!');
