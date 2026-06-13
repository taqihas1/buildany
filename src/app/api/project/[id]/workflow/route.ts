import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projectFiles, projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await db.select().from(projects).where(eq(projects.id, id)).get();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { platform = 'ios', expoToken } = await req.json();

    const workflowContent = generateGitHubActionsWorkflow({
      projectName: project.name,
      platform,
      expoToken: expoToken || '${{ secrets.EXPO_TOKEN }}',
    });

    // Save workflow file to project files
    const existingWorkflow = await db.select()
      .from(projectFiles)
      .where(eq(projectFiles.projectId, id))
      .get();
    
    if (existingWorkflow && existingWorkflow.path === '.github/workflows/eas-build.yml') {
      // Update existing workflow
      await db.update(projectFiles)
        .set({ content: workflowContent, updatedAt: new Date() })
        .where(eq(projectFiles.id, existingWorkflow.id));
    } else {
      // Insert new workflow
      await db.insert(projectFiles).values({
        id: crypto.randomUUID(),
        projectId: id,
        path: '.github/workflows/eas-build.yml',
        content: workflowContent,
        language: 'yaml',
        isGenerated: true,
      });
    }

    return NextResponse.json({
      success: true,
      workflowPath: '.github/workflows/eas-build.yml',
      platform,
      workflowContent,
    });
  } catch (error: any) {
    console.error('Workflow generation error:', error);
    return NextResponse.json({ error: 'Workflow generation failed', details: error.message }, { status: 500 });
  }
}

function generateGitHubActionsWorkflow(options: {
  projectName: string;
  platform: string;
  expoToken: string;
}) {
  const { projectName, platform, expoToken } = options;
  
  return `name: EAS Build - ${projectName}

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      platform:
        description: 'Build platform'
        required: true
        default: '${platform}'
        type: choice
        options:
          - ios
          - android
          - both

jobs:
  build:
    name: EAS Build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${expoToken}

      - name: Install dependencies
        run: npm install --legacy-peer-deps

      - name: Build with EAS
        run: eas build --platform \${{ github.event.inputs.platform || '${platform}' }} --non-interactive

      - name: Upload build artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: build-logs
          path: |
            ~/.npm/_logs/
            ~/buildany/logs/

  # Auto-retry on failure
  retry-build:
    name: Retry EAS Build
    needs: build
    if: failure()
    runs-on: ubuntu-latest
    strategy:
      max-parallel: 1
      fail-fast: false
      matrix:
        attempt: [1, 2, 3]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${expoToken}

      - name: Install dependencies
        run: npm install --legacy-peer-deps

      - name: Build with EAS (Retry \${{ matrix.attempt }})
        run: eas build --platform \${{ github.event.inputs.platform || '${platform}' }} --non-interactive

  # Create GitHub issue on failure
  notify-failure:
    name: Create Issue on Failure
    needs: [build, retry-build]
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Create Issue
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '❌ EAS Build Failed - ${projectName}',
              body: 'Build failed after retries. Check logs and fix issues.',
              labels: ['bug', 'build', 'mobile']
            });
`;
}
