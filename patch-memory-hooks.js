const fs = require('fs');
const path = '/root/buildany/src/lib/orchestrator.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. After generateWikiPages success - remember research findings
content = content.replace(
  "await this.updateTaskStatus('Research', 'completed');",
  `await this.updateTaskStatus('Research', 'completed');
      // Remember research findings for future projects
      try {
        const { memory } = require('./memory-client');
        if (research?.competitors?.length) {
          await memory.pattern('research-competitors-' + this.state.platform, 
            \`Top competitors for \${this.state.learningContext.projectType}: \${research.competitors.map((c: any) => c.name).join(', ')}\`,
            ['research', this.state.platform]
          );
        }
        if (research?.techStack?.length) {
          await memory.decision('stack-choice-' + this.state.projectId,
            \`Chose stack for \${this.state.platform} \${this.state.learningContext.projectType}: \${research.techStack.join(', ')}\`,
            this.state.projectId,
            ['stack', this.state.platform]
          );
        }
      } catch (e) { /* silent fail */ }`
);

// 2. After code generation success - remember what was built
content = content.replace(
  "this.onStatusUpdate(`📋 Decomposed into`,",
  `// Remember project files for pattern learning
      try {
        const { memory } = require('./memory-client');
        await memory.project('files-' + this.state.projectId,
          \`Generated \${parsedFiles.length} files: \${parsedFiles.map((f: any) => f.path).join(', ')}\`,
          this.state.projectId,
          ['codegen', this.state.platform]
        );
      } catch (e) { /* silent fail */ }
      this.onStatusUpdate(\`📋 Decomposed into`,
);

// 3. After review phase - remember issues found
content = content.replace(
  "await this.updateTaskStatus('Code Review', 'completed');",
  `await this.updateTaskStatus('Code Review', 'completed');
      // Remember review findings
      try {
        const { memory } = require('./memory-client');
        if (issuesFound > 0) {
          await memory.bugfix('review-issues-' + this.state.projectId,
            \`Found \${issuesFound} issues in \${this.state.platform} project: \${issuesFound} critical/warnings\`,
            ['review', this.state.platform]
          );
        }
      } catch (e) { /* silent fail */ }`
);

// 4. At completion - remember success
content = content.replace(
  "await this.transitionTo('completed');",
  `// Remember successful outcome
      try {
        const { memory } = require('./memory-client');
        await memory.decision('outcome-' + this.state.projectId,
          \`Project completed successfully. Platform: \${this.state.platform}, Type: \${this.state.learningContext.projectType}, Complexity: \${this.state.learningContext.complexity}\`,
          this.state.projectId,
          ['outcome', 'success', this.state.platform]
        );
      } catch (e) { /* silent fail */ }
      await this.transitionTo('completed');`
);

// 5. At failure - remember failure
content = content.replace(
  "await this.transitionTo('failed');",
  `// Remember failure for learning
      try {
        const { memory } = require('./memory-client');
        await memory.decision('outcome-' + this.state.projectId,
          \`Project FAILED at \${result.phase}: \${result.message}\`,
          this.state.projectId,
          ['outcome', 'failure', this.state.platform]
        );
      } catch (e) { /* silent fail */ }
      await this.transitionTo('failed');`
);

fs.writeFileSync(path, content);
console.log('✅ Memory hooks wired into orchestrator!');
