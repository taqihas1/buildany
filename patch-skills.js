const fs = require('fs');
const path = '/root/buildany/src/lib/orchestrator.ts';
let content = fs.readFileSync(path, 'utf8');

// Add skill import at top (after memory-client import)
if (!content.includes('skill-loader')) {
  content = content.replace(
    "import { memory, getMemoryContext } from \"./memory-client\";",
    "import { memory, getMemoryContext } from \"./memory-client\";\nimport { skillLoader, getPhasePrompt } from \"./skill-loader\";"
  );
}

// Add skill loading in constructor
if (!content.includes('skillLoader.loadAll()')) {
  content = content.replace(
    'this.state = {',
    'skillLoader.loadAll().then(() => console.log("[Kelly] Skills ready"));\n    this.state = {'
  );
}

// Patch generateWikiPages to use spec-driven-development skill
content = content.replace(
  "const systemPrompt = `You are an expert technical writer`,
          "const skillPrompt = await getPhasePrompt('wiki');\n    const systemPrompt = `You are an expert technical writer.\n\n${skillPrompt}\n`,
        );

// Patch generateFiles to use coding skills
content = content.replace(
  "const codeSystemPrompt = `You are a senior full-stack developer`,
          "const skillPrompt = await getPhasePrompt('code');\n    const codeSystemPrompt = `You are a senior full-stack developer.\n\n${skillPrompt}\n`,
        );

// Patch reviewAndFix to use review skills
content = content.replace(
  "const reviewSystemPrompt = `You are a senior code reviewer`,
          "const skillPrompt = await getPhasePrompt('review');\n    const reviewSystemPrompt = `You are a senior code reviewer.\n\n${skillPrompt}\n`,
        );

fs.writeFileSync(path, content);
console.log('✅ Skills wired into Kelly phases!');
