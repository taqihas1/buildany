# Option A: Enhanced Build Plan — AI App Builder Platform

**Incorporating:** OpenClaw skills, GitHub Actions CI/CD, Multi-LLM support (Kimi/DeepSeek/OpenAI), Mobile builds, Phase 1 Core

---

## 🧠 Reusable Skills from Our Journey

Over the last few weeks building RecipeWise, CarbuyingAssistant, TradePulse, and HotSell, we've created **institutional knowledge** that makes this platform build faster and more reliable:

### 1. Expo-React-Native Debug Skill
**Location:** `~/.openclaw/workspace/skills/expo-react-native-debug/`
**What it catches:**
- Expo SDK mismatch (Expo Go auto-updates — critical!)
- React version mismatch (must match react-native-renderer exactly)
- npm ERESOLVE errors (`--legacy-peer-deps` flag)
- Metro cache issues (`--clear` flag)
- ngrok tunnel staleness
- Silent Metro bundler failures
- Missing peer dependencies (e.g., @trpc/server)
- Circular imports with path aliases
- Path alias mismatches in tsconfig
- First bundle build time warnings

**How we reuse it:** Every generated mobile app runs through this pre-flight check before preview/deployment. Built into the platform's validation pipeline.

### 2. Expo EAS CI/CD Pipeline Skill
**Location:** `~/.openclaw/workspace/skills/expo-eas-cicd-pipeline/` (or `taqihas1/expo-eas-cicd-pipeline` on GitHub)
**What it provides:**
- Self-healing GitHub Actions workflow for EAS builds
- Auto-retry (4x) with exponential backoff
- Auto-create GitHub Issues on failure
- Email notifications on failure
- Build profiles: Preview (APK+QR) and Production (AAB/IPA)
- Human-in-the-loop: Share error → AI fixes → Push → CI retriggers

**How we reuse it:** Every app generated on our platform gets a `.github/workflows/eas-build.yml` automatically. Users get CI/CD out of the box.

### 3. GitHub SSH Operations Pattern
**From memory:** Verified working pattern — always use SSH for GitHub (`git@github.com:...`), never HTTPS. Keys are pre-configured.
**How we reuse it:** Platform auto-creates GitHub repos via SSH, pushes generated code, sets up Actions secrets.

### 4. Expo SDK 54 + React Native 0.81.5 Stack
**From memory:** User explicitly demanded every new project use Expo SDK 54 from inception to avoid compatibility issues. React 19.1.0 matches react-native-renderer 19.1.0.
**How we reuse it:** Platform defaults to Expo SDK 54, React Native 0.81.5, React 19.1.0 for ALL mobile app generation. No version conflicts, ever.

### 5. GitHub Actions for iOS (No EAS)
**From memory:** User asked about building iOS via GitHub Actions WITHOUT EAS. This is a **premium platform feature** — users who don't want EAS dependency get native GitHub Actions workflows using macOS runners + Xcode.

### 6. AI Image Generation (RecipeWise)
**From memory:** Used nano banana, menu gen, and similar free services for AI-generated recipe images. Zero tolerance for default images.
**How we reuse it:** Platform auto-generates app icons, splash screens, and placeholder images using AI — no default/fallback images ever.

### 7. Codemagic CI/CD (Mobile Builds Alternative)
**Why we skip it:** After evaluation, GitHub Actions + EAS Build covers all needs:
- **GitHub Actions:** FREE Android builds (2000 min/mo), paid macOS runners for iOS (~$1-2/build)
- **EAS Build:** FREE tier (200 builds/mo), automatic iOS signing, purpose-built for Expo
- Codemagic adds a third vendor with $0.10/build or $149/mo — unnecessary complexity

**Final approach:** Only **2 CI/CD options** per app:
1. **GitHub Actions** (default) — Free Android builds, paid iOS macOS runners
2. **EAS Build** (iOS shortcut) — One-click iOS with automatic signing, free tier generous

Simpler for us to maintain, simpler for users to choose.

### 8. Karpathy Auto-Research (Autonomous AI Agent)
**From memory:** Andrej Karpathy's auto-research concept — AI agents that autonomously research, test, and iterate without human intervention. Applied to RecipeWise bug fixes.
**How we reuse it:** This is our **killer platform feature** — no competitor has this!

**Implementation:**
- **Auto-Research Agent:** When user prompts "build a recipe app," the AI doesn't just generate code. It first:
  1. Researches top recipe apps (Yummly, Tasty, Allrecipes)
  2. Analyzes their UI patterns, features, user flows
  3. Reads reviews to find pain points
  4. Generates a competitive analysis report
  5. THEN builds the app incorporating best practices

- **Auto-Test Agent:** After code generation, an autonomous agent:
  1. Spins up the preview environment
  2. Clicks through every screen (like a real user)
  3. Tests all buttons, forms, navigation
  4. Checks console for errors
  5. Takes screenshots at each step
  6. Reports bugs back to the code generator
  7. Loops until all tests pass

- **Auto-Optimize Agent:** After deployment, monitors:
  1. App performance metrics
  2. User behavior (if analytics enabled)
  3. Crash reports
  4. Suggests improvements: "Users drop off at checkout — add Apple Pay?"
  5. Can auto-generate and test improvements

**

### 9. Karpathy Second Brain (Personal Knowledge + Context Memory)
**Concept:** Andrej Karpathy's "second brain" — an AI-augmented knowledge system that remembers, connects, and retrieves information for the user. Applied to our platform:

**Implementation:**
- **User Memory Bank:** Every user gets a persistent "brain" that stores:
  - Their preferences ("I always want Expo SDK 54, no TypeScript, dark mode")
  - Past project patterns ("You always add auth first, then database")
  - Common mistakes ("You often forget to add error handling in forms")
  - Their design taste ("You prefer shadcn/ui over custom components")
  - Code snippets they reuse ("You copy-paste this auth pattern every time")

- **Project Context Awareness:** The AI remembers:
  - Previous conversation history across sessions
  - Design decisions made ("We chose PostgreSQL over SQLite because...")
  - Failed approaches ("We tried Supabase auth but switched to Clerk")
  - User corrections ("You changed this button from blue to green")
  - Feature dependencies ("You asked for payments after we added auth")

- **Intelligent Suggestions:** Before user even asks:
  - "You usually add analytics to your apps — want me to add it?"
  - "You had a bug with this pattern in RecipeWise — using different approach"
  - "You prefer this component library — applying it automatically"
  - "Last time you said you didn't like Stripe — using Paddle instead?"

- **Cross-Project Learning:** The AI learns from ALL apps built on the platform:
  - "Most apps in the fitness category use this workout tracking pattern"
  - "Users who built recipe apps usually add meal planning next"
  - "This auth pattern works best for B2B apps — applying to your SaaS"

**This is the "AI that knows you better than you know yourself" — the ultimate user retention moat.**

### 10. Knowledgeable / LLM Wiki (Auto-Generated Living Documentation)
**Concept:** Dynamic, AI-generated knowledge base that evolves with the app — not static docs, but living documentation that updates as code changes.

**Implementation:**
- **Auto-Generated API Docs:** Every time code changes:
  - API endpoints documented automatically with examples
  - Request/response schemas extracted from TypeScript types
  - Authentication requirements documented
  - Rate limits and error codes documented
  - Interactive "try it" console built in

- **Component Library Wiki:** For the UI:
  - Every component auto-documented with props, usage examples
  - Interactive playground (like Storybook but auto-generated)
  - Accessibility notes ("This button meets WCAG 2.1 AA")
  - Performance notes ("This component re-renders on every state change")
  - Design tokens documented (colors, typography, spacing)

- **Architecture Decision Records (ADR):** The AI creates and maintains:
  - "Why we chose PostgreSQL over MongoDB" — auto-generated with reasoning
  - "Authentication flow decision" — with security considerations
  - "State management choice" — with trade-offs explained
  - All ADRs linked and searchable

- **User-Facing Wiki (for End Users):** Auto-generated from the app itself:
  - "How to use your app" — generated from actual features
  - "FAQ" — based on user behavior patterns
  - "Changelog" — auto-generated from git commits
  - "Privacy Policy" — generated from data collection points
  - "Terms of Service" — generated from app functionality

- **Searchable Knowledge Graph:** Not just text docs, but:
  - Graph of all entities (User, Product, Order, etc.)
  - Relationships mapped (User has many Orders, Order has many Products)
  - Data flow diagrams (auto-generated from code)
  - Search across ALL docs with AI-powered semantic search
  - "How does the checkout flow work?" → AI explains with code references

- **Developer Onboarding:** For team members or future you:
  - "Getting Started" guide auto-generated from project structure
  - "How to add a new feature" — based on existing patterns
  - "Common gotchas" — extracted from code comments and error patterns
  - "Runbook" — troubleshooting guide based on common issues

**This is the "documentation that writes itself" — no more outdated docs ever!****

---

## 🤖 LLM Integration Architecture

### Supported Models (Swappable)

| Model | Provider | Best For | API Base | Cost |
|-------|----------|----------|----------|------|
| **Kimi K2.6** | Moonshot AI | Long context, code generation | `https://api.moonshot.cn/v1` | ¥/token |
| **DeepSeek V3** | DeepSeek | Code, reasoning, cheap | `https://api.deepseek.com/v1` | Very cheap |
| **DeepSeek R1** | DeepSeek | Reasoning, planning | `https://api.deepseek.com/v1` | Very cheap |
| **GPT-4o** | OpenAI | General purpose, reliable | `https://api.openai.com/v1` | $$ |
| **Claude 3.7 Sonnet** | Anthropic | Complex architecture, long context | `https://api.anthropic.com/v1` | $$$ |
| **Gemini 2.5 Pro** | Google | Multimodal, large context | `https://generativelanguage.googleapis.com` | $$ |

### Architecture: LLM Router

```
User Prompt
    ↓
[Intent Classifier] — What type of app? Web? Mobile? Complex?
    ↓
[LLM Router] — Route to best model for the job
    ↓
├─→ Simple web app → DeepSeek V3 (fast, cheap)
├─→ Complex full-stack → Kimi K2.6 or Claude 3.7
├─→ Mobile app generation → GPT-4o or Kimi K2.6
├─→ UI/UX design → GPT-4o (visual reasoning)
└─→ Code review/debug → DeepSeek R1 (reasoning)
    ↓
[Generated Code] → [Validation] → [Preview]
```

### Kimi API Integration

```typescript
// packages/llm-router/src/providers/kimi.ts
import OpenAI from 'openai';

const kimi = new OpenAI({
  apiKey: process.env.KIMI_API_KEY,
  baseURL: 'https://api.moonshot.cn/v1',
});

export async function generateCodeWithKimi(prompt: string, context: string) {
  const response = await kimi.chat.completions.create({
    model: 'kimi-k2-6',  // or kimi-k2-6 for 2.6
    messages: [
      {
        role: 'system',
        content: `You are an expert full-stack developer. Generate production-ready React/TypeScript code.
        Rules:
        - Use Expo SDK 54, React Native 0.81.5, React 19.1.0 for mobile
        - Use Tailwind CSS for styling
        - Use shadcn/ui components for web
        - Include proper TypeScript types
        - Add error handling
        - Follow React best practices`
      },
      { role: 'user', content: prompt },
      { role: 'user', content: `Context: ${context}` }
    ],
    temperature: 0.2,
    max_tokens: 8000,
  });
  
  return response.choices[0].message.content;
}
```

### DeepSeek API Integration

```typescript
// packages/llm-router/src/providers/deepseek.ts
import OpenAI from 'openai';

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
});

export async function generateCodeWithDeepSeek(prompt: string) {
  const response = await deepseek.chat.completions.create({
    model: 'deepseek-chat',  // DeepSeek V3
    messages: [
      { role: 'system', content: 'You are a senior React developer.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
  });
  return response.choices[0].message.content;
}

// For reasoning/planning
export async function planWithDeepSeekR1(requirements: string) {
  const response = await deepseek.chat.completions.create({
    model: 'deepseek-reasoner',  // DeepSeek R1
    messages: [
      { role: 'user', content: `Create a technical plan for: ${requirements}` }
    ],
  });
  return response.choices[0].message.content;
}
```

### Model Router (Smart Selection)

```typescript
// packages/llm-router/src/router.ts
export function selectModel(task: TaskType, complexity: Complexity): string {
  const matrix = {
    'code-generation': {
      simple: 'deepseek-chat',      // Cheap, fast
      medium: 'kimi-k2-6',         // Good balance
      complex: 'claude-3-7-sonnet' // Best quality
    },
    'ui-design': {
      simple: 'deepseek-chat',
      medium: 'gpt-4o',
      complex: 'gpt-4o'
    },
    'architecture': {
      simple: 'deepseek-reasoner',
      medium: 'deepseek-reasoner',
      complex: 'claude-3-7-sonnet'
    },
    'debugging': {
      simple: 'deepseek-chat',
      medium: 'deepseek-reasoner',
      complex: 'kimi-k2-6'
    }
  };
  
  return matrix[task][complexity];
}
```

---

## 📱 GitHub Actions for Mobile Builds

### Option 1: EAS Build (Recommended for Most Users)

```yaml
# .github/workflows/eas-build.yml (auto-generated per app)
name: EAS Build
on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      platform:
        description: 'Build platform'
        required: true
        default: 'all'
        type: choice
        options: ['android', 'ios', 'all']
      profile:
        description: 'Build profile'
        required: true
        default: 'preview'
        type: choice
        options: ['preview', 'production']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
          
      - name: Install dependencies
        run: npm ci --legacy-peer-deps
        
      - name: Build with EAS
        run: |
          eas build \
            --platform ${{ github.event.inputs.platform || 'all' }} \
            --profile ${{ github.event.inputs.profile || 'preview' }} \
            --non-interactive
```

### Option 2: GitHub Actions WITHOUT EAS (Advanced Users)

```yaml
# .github/workflows/native-ios-build.yml
name: Native iOS Build
on: [workflow_dispatch]

jobs:
  build-ios:
    runs-on: macos-latest  # macOS runner required for Xcode
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci --legacy-peer-deps
        
      - name: Pre-flight check (from our skill!)
        run: node scripts/expo-preflight.js .
        
      - name: Setup Xcode
        uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: '16.0'
          
      - name: Install CocoaPods
        run: |
          cd ios
          pod install
          
      - name: Build iOS
        run: |
          xcodebuild \
            -workspace ios/YourApp.xcworkspace \
            -scheme YourApp \
            -configuration Release \
            -destination 'generic/platform=iOS' \
            -derivedDataPath ios/build
            
      - name: Upload IPA
        uses: actions/upload-artifact@v4
        with:
          name: ios-build
          path: ios/build/Build/Products/Release-iphoneos/*.ipa
```

### Option 3: GitHub Actions for Android (No EAS)

```yaml
# .github/workflows/native-android-build.yml
name: Native Android Build
on: [workflow_dispatch]

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          
      - name: Install dependencies
        run: npm ci --legacy-peer-deps
        
      - name: Pre-flight check
        run: node scripts/expo-preflight.js .
        
      - name: Build Android
        run: |
          cd android
          ./gradlew assembleRelease
          
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: android-build
          path: android/app/build/outputs/apk/release/*.apk
```

---

## 🏗️ Phase 1: Core Platform Architecture

### Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Browser)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   React 19   │  │  Monaco      │  │  Live        │       │
│  │   TypeScript │  │  Editor      │  │  Preview     │       │
│  │   Tailwind   │  │  (Code)      │  │  (Iframe)    │       │
│  │   shadcn/ui  │  │              │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  AI Chat Panel (Prompt → Code)                      │    │
│  │  - DeepSeek V3 for fast generation                  │    │
│  │  - Kimi K2.6 for complex apps                       │    │
│  │  - GPT-4o for UI/UX                                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND API (Node.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Express/    │  │  LLM Router  │  │  GitHub      │       │
│  │  Fastify     │  │  (Multi-     │  │  Integration │       │
│  │              │  │  provider)   │  │  (repos,     │       │
│  │              │  │              │  │  actions)    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Auth        │  │  Database    │  │  File        │       │
│  │  (Clerk/     │  │  (SQLite/    │  │  Storage     │       │
│  │  Supabase)   │  │  Postgres)   │  │  (S3/R2)     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   CODE GENERATION ENGINE                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Template    │  │  AI Code     │  │  Validation  │       │
│  │  Engine      │  │  Generator   │  │  (Pre-flight │       │
│  │  (EJS/       │  │  (LLM +      │  │  checks)     │       │
│  │  Handlebars) │  │  templates)  │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Expo Pre-flight Script (from our skill!)           │    │
│  │  - Check SDK version                                │    │
│  │  - Check React version match                        │    │
│  │  - Check dependencies                               │    │
│  │  - Check path aliases                               │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Vercel      │  │  EAS         │  │  GitHub      │       │
│  │  (Web)       │  │  (Mobile)    │  │  Actions     │       │
│  │              │  │              │  │  (CI/CD)     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema (SQLite for Phase 1)

```sql
-- Users (managed by Clerk/Supabase Auth)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free', -- free, builder, pro, team, enterprise
  credits_remaining INTEGER DEFAULT 20,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects (Apps)
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'web', -- web, mobile, both
  framework TEXT DEFAULT 'react', -- react, vue, svelte, nextjs
  status TEXT DEFAULT 'draft', -- draft, generating, preview, deployed
  github_repo TEXT, -- e.g., "taqihas1/my-app"
  vercel_url TEXT,
  expo_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Project Files (Code)
CREATE TABLE project_files (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  path TEXT NOT NULL, -- e.g., "src/App.tsx"
  content TEXT NOT NULL,
  language TEXT, -- typescript, javascript, css, etc.
  is_generated BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI Conversations (Chat history)
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  role TEXT NOT NULL, -- user, assistant, system
  content TEXT NOT NULL,
  model_used TEXT, -- deepseek-chat, kimi-k2-6, gpt-4o
  tokens_used INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Templates (Marketplace)
CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- saas, ecommerce, dashboard, blog, etc.
  price INTEGER DEFAULT 0, -- 0 = free, otherwise cents
  preview_image TEXT,
  downloads INTEGER DEFAULT 0,
  rating REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Template Files
CREATE TABLE template_files (
  id TEXT PRIMARY KEY,
  template_id TEXT REFERENCES templates(id),
  path TEXT NOT NULL,
  content TEXT NOT NULL
);

-- Deployments
CREATE TABLE deployments (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  platform TEXT NOT NULL, -- vercel, eas, github-actions
  status TEXT NOT NULL, -- pending, building, success, failed
  url TEXT,
  logs TEXT, -- build logs
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 Phase 1: Build Checklist

### Week 1: Foundation

- [ ] **Project setup** — Next.js 15 + React 19 + TypeScript + Tailwind + shadcn/ui
- [ ] **Database** — SQLite with Drizzle ORM (migrate to PostgreSQL later)
- [ ] **Auth** — Clerk integration (free tier for dev)
- [ ] **Basic UI** — Landing page, dashboard, project list
- [ ] **LLM Router** — DeepSeek V3 + Kimi K2.6 + GPT-4o support
- [ ] **Code generation** — Simple prompt → React component

### Week 2: Core Builder

- [ ] **Chat interface** — AI chat panel (like Base44/Lovable)
- [ ] **Code editor** — Monaco Editor integration
- [ ] **Live preview** — iframe with sandboxed preview
- [ ] **File tree** — Project files explorer
- [ ] **Code generation** — Full page generation from prompt
- [ ] **Template system** — EJS/Handlebars templates for common patterns

### Week 3: Mobile + GitHub

- [ ] **Mobile generation** — React Native/Expo export from web app
- [ ] **Expo pre-flight** — Integrate our debug skill into generation pipeline
- [ ] **GitHub integration** — OAuth + repo creation + code push
- [ ] **GitHub Actions** — Auto-generate EAS workflow per project
- [ ] **GitHub Actions (No EAS)** — Native iOS/Android workflow options
- [ ] **QR code preview** — Generate QR for Expo Go testing

### Week 4: Polish + Deploy

- [ ] **Template marketplace** — Browse, buy, sell templates
- [ ] **AI testing** — Automated UI testing with AI agent
- [ ] **Credit system** — Usage tracking, billing integration
- [ ] **Deployment** — Vercel integration for web, EAS for mobile
- [ ] **Documentation** — API docs, user guides
- [ ] **Launch** — Deploy platform to production

---

## 🔧 Key Files to Create

```
app-builder-platform/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── app/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── page.tsx           # Dashboard
│   │   │   │   ├── projects/
│   │   │   │   │   ├── page.tsx       # Project list
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   ├── page.tsx   # Builder workspace
│   │   │   │   │   │   ├── layout.tsx # Chat + Editor + Preview
│   │   │   │   ├── templates/
│   │   │   │   │   ├── page.tsx       # Template marketplace
│   │   │   │   ├── settings/
│   │   │   │   │   ├── page.tsx       # User settings
│   │   │   ├── api/
│   │   │   │   ├── auth/
│   │   │   │   ├── generate/
│   │   │   │   │   ├── route.ts       # AI code generation endpoint
│   │   │   │   ├── projects/
│   │   │   │   ├── deploy/
│   │   │   │   ├── github/
│   │   │   │   │   ├── route.ts       # GitHub repo creation
│   │   │   │   │   ├── actions/
│   │   │   │   │   │   ├── route.ts   # Trigger GitHub Actions
│   │   │   │   ├── llm/
│   │   │   │   │   ├── route.ts       # LLM proxy/router
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx          # AI chat interface
│   │   │   ├── CodeEditor.tsx         # Monaco Editor
│   │   │   ├── LivePreview.tsx        # Iframe preview
│   │   │   ├── FileTree.tsx           # Project files explorer
│   │   │   ├── PromptBox.tsx          # "What would you build?" input
│   │   │   ├── TemplateCard.tsx       # Marketplace card
│   │   │   ├── QRCode.tsx             # Expo Go QR code
│   │   │   ├── DeployButton.tsx       # One-click deploy
│   │   │   ├── CreditMeter.tsx        # Usage display
│   │   ├── lib/
│   │   │   ├── llm-router.ts          # Multi-model router
│   │   │   ├── github.ts              # GitHub API client
│   │   │   ├── vercel.ts              # Vercel deploy API
│   │   │   ├── expo.ts                # Expo/EAS API client
│   │   │   ├── db/                    # Drizzle ORM
│   │   │   │   ├── schema.ts          # Database schema
│   │   │   │   ├── index.ts           # Connection
│   │   ├── hooks/
│   │   │   ├── useAI.ts               # AI generation hook
│   │   │   ├── useProject.ts          # Project management
│   │   │   ├── useDeploy.ts           # Deployment hook
│   │   ├── types/
│   │   │   ├── project.ts             # Project types
│   │   │   ├── llm.ts                 # LLM types
│   │   ├── public/
│   │   │   ├── templates/             # Built-in templates
│   │   │   │   ├── saas-starter/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── ecommerce/
│   │   │   │   ├── blog/
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── .env.local.example
│   ├── docs/                          # Documentation site
│   ├── landing/                       # Marketing site (optional)
│
├── packages/
│   ├── llm-router/                    # Shared LLM router package
│   │   ├── src/
│   │   │   ├── providers/
│   │   │   │   ├── kimi.ts            # Kimi API client
│   │   │   │   ├── deepseek.ts        # DeepSeek API client
│   │   │   │   ├── openai.ts          # OpenAI API client
│   │   │   │   ├── anthropic.ts       # Anthropic API client
│   │   │   │   ├── google.ts          # Gemini API client
│   │   │   ├── router.ts              # Smart model selection
│   │   │   ├── types.ts               # Shared types
│   │   │   ├── index.ts               # Package exports
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │
│   ├── code-generator/                # Code generation engine
│   │   ├── src/
│   │   │   ├── templates/             # Code templates
│   │   │   │   ├── react-web/
│   │   │   │   ├── react-native/
│   │   │   │   ├── nextjs/
│   │   │   │   ├── vue/
│   │   │   │   ├── svelte/
│   │   │   ├── generator.ts           # Main generator
│   │   │   ├── validator.ts           # Pre-flight checks
│   │   │   ├── exporter.ts            # Export to GitHub/zip
│   │   │   ├── index.ts
│   │   ├── package.json
│   │
│   ├── shared-types/                  # Shared types across apps
│   ├── ui/                            # Shared UI components (shadcn)
│
├── scripts/
│   ├── expo-preflight.js              # Our debug skill! (reused)
│   ├── setup-dev.sh                   # Development setup
│   ├── seed-db.ts                     # Database seeding
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                     # Platform CI/CD
│   │   ├── deploy.yml                 # Platform deployment
│
├── docker-compose.yml                 # Local development
├── turbo.json                         # Turborepo config
├── package.json                       # Root package (Turborepo)
├── pnpm-workspace.yaml               # pnpm workspace
├── README.md
├── .env.example
```

---

## 🎯 OpenClaw Integration (Meta!)

Since we're building this WITH OpenClaw, here's how the platform itself can use OpenClaw:

### 1. OpenClaw as a User of the Platform
- Users can build apps that integrate with OpenClaw's message tools
- Example: "Build me a Discord bot that uses OpenClaw to send messages"
- The platform generates code that calls OpenClaw APIs

### 2. Skills as Templates
- Every skill we've built becomes a **template** in the marketplace:
  - `expo-react-native-debug` → "Expo App with Debug Tools"
  - `expo-eas-cicd-pipeline` → "App with CI/CD Pipeline"
  - `feishu-task` → "Feishu-Integrated Task Manager"
  - `campaign-plan` → "Marketing Campaign Tracker"

### 3. OpenClaw as the Platform's AI Engine
- The platform itself could use OpenClaw's subagent system:
  - Main prompt → spawns subagents for different tasks (UI, backend, testing)
  - Each subagent uses different LLM models
  - Results merged into final app

### 4. GitHub Actions as a Service
- Users get our proven GitHub Actions workflows auto-generated:
  - EAS build workflow (from `expo-eas-cicd-pipeline` skill)
  - Native iOS build workflow (from our research)
  - Native Android build workflow (from our research)
  - Self-healing retry logic (from our experience)

---

## 💰 Cost Estimates (Phase 1)

### Infrastructure (Monthly)
| Service | Cost | Notes |
|---------|------|-------|
| Vercel (Hosting) | $0-20 | Free tier for dev, Pro for production |
| Railway/Render (Backend) | $5-20 | SQLite + Node.js server |
| Clerk (Auth) | $0-25 | Free tier: 10k users, Pro for more |
| DeepSeek API | $5-50 | Very cheap, ~$0.001/1K tokens |
| Kimi API | $10-100 | Moderate pricing |
| OpenAI API | $20-200 | Backup/overflow usage |
| GitHub Actions | $0-20 | Free for public repos, limited for private |
| EAS (Expo) | $0-99 | Free tier sufficient for dev |
| Codemagic | $0-149/mo | Alternative mobile CI/CD, pay-per-build or unlimited |
| **Total** | **$40-534/mo** | Scales with usage |

### Development (One-time)
| Phase | Effort | Cost |
|-------|--------|------|
| Phase 1 (Core) | 4 weeks | $0 (your time) |
| Phase 2 (Mobile) | 2 weeks | $0 |
| Phase 3 (Marketplace) | 2 weeks | $0 |
| Phase 4 (Enterprise) | 2 weeks | $0 |
| **Total** | **10 weeks** | **$0** |

---

## 🚀 Ready to Build?

This is a **10-week build** with the following priority:

1. **Week 1:** Next.js + DB + Auth + LLM Router + Basic UI
2. **Week 2:** Chat panel + Code editor + Live preview + File tree
3. **Week 3:** Mobile generation + GitHub integration + CI/CD workflows (GitHub Actions + EAS)
4. **Week 4:** Auto-research + Auto-test + Second Brain + LLM Wiki + Templates + Deploy + Launch

**Want me to start Week 1 right now?** I can scaffold the entire project, set up the database, auth, and LLM router in the next hour. 🔥

**Key advantages of our approach:**
- ✅ Uses our proven skills (expo-debug, EAS CI/CD, auto-research, second-brain)
- ✅ Multi-LLM support (Kimi, DeepSeek, OpenAI, Claude, Gemini)
- ✅ GitHub Actions + EAS Build for iOS/Android (2 CI/CD options)
- ✅ Mobile-first (React Native/Expo) — gap no competitor fills
- ✅ Predictable pricing — no Replit-style surprise bills
- ✅ Code ownership — GitHub from day one, no Base44 lock-in
- ✅ Template marketplace — network effect + revenue
- ✅ **Karpathy Auto-Research** — AI that researches before building
- ✅ **Auto-Test Agent** — AI that tests itself, finds bugs, fixes them
- ✅ **Karpathy Second Brain** — AI that remembers you, learns your patterns, suggests before you ask
- ✅ **LLM Wiki** — Documentation that writes itself, auto-updates as code changes
- ✅ Built with OpenClaw — eat our own dog food! 🐕

**Let's move!** 💥

---

## 🧠 Additional Database Schema (Second Brain + LLM Wiki)

```sql
-- User Memory Bank (Second Brain)
CREATE TABLE user_memory (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  memory_type TEXT NOT NULL, -- preference, pattern, mistake, taste, snippet
  content TEXT NOT NULL,
  context TEXT, -- when/where this was learned
  confidence REAL DEFAULT 0.5, -- how sure we are (0-1)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Project Memory (Context Awareness)
CREATE TABLE project_memory (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  memory_type TEXT NOT NULL, -- decision, failure, correction, dependency
  content TEXT NOT NULL,
  context TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cross-Project Patterns (Platform Learning)
CREATE TABLE platform_patterns (
  id TEXT PRIMARY KEY,
  pattern_type TEXT NOT NULL, -- category, feature, bug, best_practice
  trigger TEXT NOT NULL, -- e.g., "fitness_app", "auth_flow"
  suggestion TEXT NOT NULL, -- what to suggest
  frequency INTEGER DEFAULT 1, -- how many times seen
  success_rate REAL, -- how often it worked (0-1)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- LLM Wiki (Living Documentation)
CREATE TABLE wiki_pages (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  page_type TEXT NOT NULL, -- api_docs, component_docs, adr, user_guide, changelog
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  auto_generated BOOLEAN DEFAULT TRUE,
  last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Wiki Page Relationships (Knowledge Graph)
CREATE TABLE wiki_relationships (
  id TEXT PRIMARY KEY,
  source_page_id TEXT REFERENCES wiki_pages(id),
  target_page_id TEXT REFERENCES wiki_pages(id),
  relationship_type TEXT NOT NULL, -- references, depends_on, extends, explains
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ADRs (Architecture Decision Records)
CREATE TABLE adrs (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  title TEXT NOT NULL,
  context TEXT NOT NULL,
  decision TEXT NOT NULL,
  consequences TEXT NOT NULL,
  status TEXT DEFAULT 'proposed', -- proposed, accepted, deprecated, superseded
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
