const fs = require('fs');
const p = '/root/buildany/src/lib/orchestrator.ts';
let c = fs.readFileSync(p, 'utf8');
if (c.indexOf('private async research()') > -1) {
  console.log('Already patched!');
  process.exit(0);
}
c = c.replace('await this.generateWikiPages();',
  'if (!this.state.researchData) { this.state.researchData = await this.research(); }\n    await this.generateWikiPages();'
);
const pos = c.indexOf('private inferTechStack');
const method = [
  '',
  '  private async research(): Promise<any> {',
  '    this.onStatusUpdate("🔍 Kelly is researching market...");',
  '    try {',
  '      const { recall, memory } = require("./memory-client");',
  '      const past = await recall(this.state.prompt.slice(0, 30));',
  '      if (past.length > 0) {',
  '        this.onStatusUpdate("💡 Kelly remembers " + past.length + " similar projects");',
  '      }',
  '      const prompt = "Research this app idea and return ONLY valid JSON with: targetAudience, painPoints[], competitors[{name,features[],strengths[],weaknesses[]}], marketGaps[], techStack[], coreFeatures[], designTrends[]. App Idea: " + this.state.prompt + ". Platform: " + this.state.platform;',
  '      const { llmRouter } = require("./llm-router");',
  '      const result = await llmRouter.generate({',
  '        prompt: prompt,',
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
  '        if (researchData.competitors && researchData.competitors.length) {',
  '          const names = researchData.competitors.map(function(c) { return c.name; }).join(", ");',
  '          await memory.pattern("competitors-" + this.state.platform, "Competitors: " + names, ["competitors"]);',
  '        }',
  '        if (researchData.techStack && researchData.techStack.length) {',
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
c = c.slice(0, pos) + method + c.slice(pos);
fs.writeFileSync(p, c);
console.log('✅ Kelly research() added!');
