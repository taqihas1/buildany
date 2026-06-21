const fs = require('fs');
const path = '/root/buildany/src/lib/orchestrator.ts';
let content = fs.readFileSync(path, 'utf8');

// Check if already patched
if (content.includes('private async research()')) {
  console.log('Already patched!');
  process.exit(0);
}

// 1. Add research() call before generateWikiPages()
content = content.replace(
  'await this.generateWikiPages();',
  `// Kelly does her own research first
    if (!this.state.researchData) {
      this.state.researchData = await this.research();
    }
    await this.generateWikiPages();`
);

// 2. Find where to insert research() method - before inferTechStack
const insertMark = 'private inferTechStack';
const pos = content.indexOf(insertMark);
if (pos < 0) {
  console.error('Could not find insertion point');
  process.exit(1);
}

const researchMethod = `
  /**
   * Kelly's Research Phase - checks memory, calls LLM, saves findings
   */
  private async research(): Promise<any> {
    this.onStatusUpdate('🔍 Kelly is researching market...');
    
    try {
      // Check memory for similar past research
      const { recall, memory } = require('./memory-client');
      const pastResearch = await recall(this.state.prompt.slice(0, 30));
      
      if (pastResearch.length > 0) {
        this.onStatusUpdate(\`💡 Kelly remembers \${pastResearch.length} similar projects\`);
      }

      // Call LLM for fresh research
      const researchPrompt = \`Research this app idea and provide structured JSON:
App Idea: \${this.state.prompt}
Platform: \${this.state.platform}

Return ONLY valid JSON with:
- targetAudience: string
- painPoints: string[]
- competitors: array of {name, features[], strengths[], weaknesses[]}
- marketGaps: string[]
- techStack: string[]
- coreFeatures: string[]
- designTrends: string[]\`;

      const { llmRouter } = require('./llm-router');
      const result = await llmRouter.generate({
        prompt: researchPrompt,
        systemPrompt: "You are a market research analyst. Return ONLY valid JSON.",
        provider: 'deepseek',
        temperature: 0.7,
        maxTokens: 2000,
      });

      let researchData = null;
      
      if (result.success && result.content) {
        try {
          let jsonStr = result.content.replace(/\`\`\`json\\s*/g, '').replace(/\`\`\`\\s*/g, '');
          researchData = JSON.parse(jsonStr);
        } catch (parseErr) {
          researchData = { raw: result.content, error: 'Parse failed' };
        }
      }

      // Save research to memory
      if (researchData) {
        await memory.pattern(
          'research-' + this.state.platform + '-' + this.state.learningContext.projectType,
          \`Research for "\${this.state.prompt.slice(0, 50)}": \${JSON.stringify(researchData).slice(0, 200)}\`,
          ['research', this.state.platform, this.state.learningContext.projectType]
        );
        
        if (researchData.competitors?.length) {
          await memory.pattern(
            'competitors-' + this.state.platform,
            \`Competitors: \${researchData.competitors.map((c: any) => c.name).join(', ')}\`,
            ['competitors', this.state.platform]
          );
        }
        
        if (researchData.techStack?.length) {
          await memory.decision(
            'stack-' + this.state.projectId,
            \`Recommended stack: \${researchData.techStack.join(', ')}\`,
            this.state.projectId,
            ['stack', this.state.platform]
          );
        }
      }

      return researchData;
    } catch (error) {
      console.error('[Kelly] Research failed:', error);
      return null;
    }
  }

`;

content = content.slice(0, pos) + researchMethod + content.slice(pos);

fs.writeFileSync(path, content);
console.log('✅ Kelly now does her own research!');
