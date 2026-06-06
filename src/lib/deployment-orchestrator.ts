import { db } from "@/lib/db";
import { projects, projectFiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface DeploymentRecommendation {
  provider: string;
  providerDisplay: string;
  reason: string;
  valueProposition: string[];
  freeTier: string;
  estimatedTime: string;
  customDomain: boolean;
  ssl: boolean;
  serverless: boolean;
  bestFor: string[];
}

export async function analyzeProjectForDeployment(projectId: string): Promise<DeploymentRecommendation> {
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) throw new Error("Project not found");

  const files = await db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId));
  
  // Analyze complexity
  const hasApiRoutes = files.some(f => f.path.includes('/api/'));
  const hasDatabase = files.some(f => f.path.includes('db') || f.path.includes('schema'));
  const hasServerComponents = files.some(f => f.content?.includes('async function') && f.content?.includes('await'));
  const isSimpleStatic = files.length < 10 && !hasApiRoutes && !hasDatabase;
  const isNextJs = files.some(f => f.path.includes('next.config'));
  const hasReactComponents = files.some(f => f.path.endsWith('.tsx') || f.path.endsWith('.jsx'));
  
  // Determine project type and complexity
  if (project.type === 'mobile') {
    return {
      provider: "expo-eas",
      providerDisplay: "Expo EAS",
      reason: "Mobile apps require native builds. Expo EAS is the fastest path to app store submission with zero local setup.",
      valueProposition: [
        "⚡ Zero-config builds in the cloud — no Xcode or Android Studio needed",
        "📱 Generates APK (Android), AAB (Play Store), and IPA (App Store) automatically",
        "🔄 Over-the-air updates — push fixes without app store review",
        "🆓 Free tier: 30 builds/month, perfect for prototyping and testing",
        "🔐 Automatic code signing and certificate management"
      ],
      freeTier: "30 builds/month, OTA updates included",
      estimatedTime: "8-12 minutes",
      customDomain: false,
      ssl: true,
      serverless: false,
      bestFor: ["React Native apps", "Expo projects", "iOS/Android distribution"]
    };
  }
  
  // Web projects - decide based on complexity
  if (isSimpleStatic && !isNextJs && !hasApiRoutes) {
    // Simple HTML/CSS/JS - Cloudflare Pages or GitHub Pages
    const hasCustomDomain = true; // Could check user settings
    
    return {
      provider: "cloudflare-pages",
      providerDisplay: "Cloudflare Pages",
      reason: "Your project is a lightweight static site with no server-side requirements. Cloudflare Pages deploys globally in seconds with zero friction.",
      valueProposition: [
        "🌍 200+ edge locations — your site loads instantly worldwide",
        "⚡ Deploys in under 30 seconds — faster than any competitor",
        "🆓 Completely free: Unlimited requests, unlimited bandwidth, unlimited sites",
        "🔒 Automatic SSL (HTTPS) and custom domain support",
        "🚀 Built-in CI/CD from GitHub — push to deploy",
        "📊 Real-time analytics included"
      ],
      freeTier: "Unlimited sites, unlimited bandwidth, unlimited requests",
      estimatedTime: "30 seconds",
      customDomain: true,
      ssl: true,
      serverless: true, // Also get Cloudflare Workers
      bestFor: ["Static websites", "Landing pages", "HTML/CSS/JS apps", "JAMstack sites"]
    };
  }
  
  // Medium complexity - Next.js without heavy backend
  if (isNextJs && !hasDatabase && !hasApiRoutes) {
    return {
      provider: "vercel",
      providerDisplay: "Vercel",
      reason: "Your project uses Next.js. Vercel is the creator of Next.js and offers the most optimized hosting experience with zero configuration.",
      valueProposition: [
        "🥇 First-class Next.js support — created by the same team",
        "⚡ Automatic image optimization, font optimization, and ISR",
        "🆓 Generous free tier: 1TB bandwidth, 6000 build minutes/month",
        "🔒 Automatic HTTPS and preview deployments for every push",
        "🌍 Global edge network with instant static generation",
        "🤖 AI SDK integration built-in for future AI features"
      ],
      freeTier: "1TB bandwidth, 6000 build minutes, 100GB storage",
      estimatedTime: "1-2 minutes",
      customDomain: true,
      ssl: true,
      serverless: true,
      bestFor: ["Next.js apps", "React apps", "Serverless functions", "Edge apps"]
    };
  }
  
  // Complex web app with API routes, database, etc.
  return {
    provider: "vercel",
    providerDisplay: "Vercel (Pro)",
    reason: "Your project has server-side requirements (API routes, database connections, server components). Vercel's serverless infrastructure handles this seamlessly with auto-scaling.",
    valueProposition: [
      "🥇 Full Next.js App Router support — Server Components, Streaming, Edge",
      "⚡ Serverless Functions auto-scale from 0 to thousands of requests",
      "🗄️ Database integrations: Vercel Postgres, Redis, Blob storage",
      "🆓 Free tier: 1TB bandwidth, 6000 build minutes, serverless functions included",
      "🔒 Enterprise-grade security with automatic SSL and DDoS protection",
      "📈 Real-time analytics and performance monitoring"
    ],
    freeTier: "1TB bandwidth, 6000 build minutes, serverless functions included",
    estimatedTime: "2-3 minutes",
    customDomain: true,
    ssl: true,
    serverless: true,
    bestFor: ["Full-stack apps", "API backends", "Database-driven apps", "E-commerce"]
  };
}

export async function getAlternativeOptions(projectId: string): Promise<DeploymentRecommendation[]> {
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) return [];
  
  const alternatives: DeploymentRecommendation[] = [];
  
  if (project.type === 'mobile') {
    alternatives.push({
      provider: "manual-build",
      providerDisplay: "Local Build (Expo CLI)",
      reason: "Build locally with your own machine using Expo CLI.",
      valueProposition: [
        "💻 Full control over build environment",
        "🔧 Access to native modules and custom configurations",
        "🆓 No build limits — unlimited local builds"
      ],
      freeTier: "Free (uses your machine resources)",
      estimatedTime: "15-30 minutes (depends on your machine)",
      customDomain: false,
      ssl: true,
      serverless: false,
      bestFor: ["Custom native modules", "Offline builds", "CI/CD pipelines"]
    });
  } else {
    // Web alternatives
    alternatives.push({
      provider: "netlify",
      providerDisplay: "Netlify",
      reason: "Popular alternative with excellent developer experience and form handling.",
      valueProposition: [
        "🌟 Drag-and-drop deploy from ZIP",
        "📋 Built-in form handling without backend",
        "🆓 100GB bandwidth, 300 build minutes/month free",
        "🔒 Branch previews and split testing"
      ],
      freeTier: "100GB bandwidth, 300 build minutes",
      estimatedTime: "1-2 minutes",
      customDomain: true,
      ssl: true,
      serverless: true,
      bestFor: ["Static sites", "JAMstack", "Form-heavy sites"]
    });
    
    alternatives.push({
      provider: "github-pages",
      providerDisplay: "GitHub Pages",
      reason: "Zero-config hosting directly from your GitHub repository.",
      valueProposition: [
        "🐙 Native GitHub integration — push to deploy",
        "🆓 Completely free for public repositories",
        "🔒 Automatic HTTPS with custom domain support",
        "📚 Perfect for documentation and portfolios"
      ],
      freeTier: "Free for public repos",
      estimatedTime: "1 minute",
      customDomain: true,
      ssl: true,
      serverless: false,
      bestFor: ["Documentation", "Portfolio sites", "Open source projects"]
    });
  }
  
  return alternatives;
}
