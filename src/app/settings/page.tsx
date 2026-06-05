import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ClearKeyButton } from "@/components/ClearKeyButton";
import { Settings, Key, Save, Check, AlertTriangle, Globe, Smartphone, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function saveApiKey(formData: FormData) {
  "use server";
  const authData = await auth();
  const userId = authData.userId;
  if (!userId) return;

  const provider = formData.get("provider") as string;
  const keyValue = formData.get("keyValue") as string;
  const isActive = formData.get("isActive") === "on";

  if (!provider) return;

  const existing = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.provider, provider))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(apiKeys)
      .set({ keyValue: keyValue || existing[0].keyValue, isActive, updatedAt: new Date() })
      .where(eq(apiKeys.provider, provider));
  } else {
    await db.insert(apiKeys).values({
      id: crypto.randomUUID(),
      provider,
      keyValue: keyValue || "",
      isActive,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  revalidatePath("/settings");
}

async function clearApiKey(formData: FormData) {
  "use server";
  const authData = await auth();
  const userId = authData.userId;
  if (!userId) return;

  const provider = formData.get("provider") as string;
  if (!provider) return;

  await db
    .update(apiKeys)
    .set({ keyValue: "", isActive: false, updatedAt: new Date() })
    .where(eq(apiKeys.provider, provider));

  revalidatePath("/settings");
}

export default async function SettingsPage() {
  const authData = await auth();
  const userId = authData.userId;
  
  if (!userId) {
    redirect("/");
  }

  // Get all API keys
  const keys = await db.select().from(apiKeys);
  const keyMap = new Map(keys.map((k) => [k.provider, k]));

  const providers = [
    {
      id: "deepseek",
      name: "DeepSeek",
      description: "Best for coding & research tasks",
      placeholder: "sk-...",
      key: keyMap.get("deepseek")?.keyValue || "",
      active: keyMap.get("deepseek")?.isActive ?? true,
    },
    {
      id: "kimi",
      name: "Kimi",
      description: "Fast & versatile Chinese/English model",
      placeholder: "sk-...",
      key: keyMap.get("kimi")?.keyValue || "",
      active: keyMap.get("kimi")?.isActive ?? true,
    },
    {
      id: "openai",
      name: "OpenAI",
      description: "GPT-4o for UI/UX generation",
      placeholder: "sk-...",
      key: keyMap.get("openai")?.keyValue || "",
      active: keyMap.get("openai")?.isActive ?? true,
    },
    {
      id: "github",
      name: "GitHub",
      description: "Personal Access Token for code export",
      placeholder: "ghp_...",
      key: keyMap.get("github")?.keyValue || "",
      active: keyMap.get("github")?.isActive ?? true,
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
      <DashboardHeader user={{ id: userId }} />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-base text-gray-500">
                Manage API keys and preferences
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* API Keys Section */}
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-5 h-5 text-cyan-600" />
              <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
            </div>

            {providers.map((provider) => (
              <form
                key={provider.id}
                action={saveApiKey}
                className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm relative"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-medium text-gray-900">{provider.name}</h3>
                    <p className="text-sm text-gray-500">{provider.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={provider.active}
                        className="w-4 h-4 rounded border-gray-300 bg-white text-cyan-500"
                      />
                      Active
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="password"
                      name="keyValue"
                      defaultValue={provider.key}
                      placeholder={provider.placeholder}
                      className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-cyan-500"
                    />
                    <input type="hidden" name="provider" value={provider.id} />
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-4 py-2 text-base bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    {provider.key && (
                      <ClearKeyButton provider={provider.id} clearAction={clearApiKey} />
                    )}
                  </div>
                  {provider.key && (
                    <div className="flex items-center gap-1 text-sm text-green-600">
                      <Check className="w-4 h-4" />
                      Key configured
                    </div>
                  )}
                </div>
              </form>
            ))}
            
            {/* Preferences */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base text-gray-900">Auto-research</div>
                    <div className="text-sm text-gray-500">Research competitors before building</div>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 bg-white text-cyan-500" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base text-gray-900">Default app type</div>
                    <div className="text-sm text-gray-500">Pre-selected when creating projects</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-sm bg-cyan-50 text-cyan-600 rounded border border-cyan-200">
                      <Globe className="w-4 h-4 inline mr-1" />Web
                    </button>
                    <button className="px-3 py-1.5 text-sm bg-gray-100 text-gray-500 rounded border border-gray-200">
                      <Smartphone className="w-4 h-4 inline mr-1" />Mobile
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-700 mb-1">Important</h3>
                <p className="text-sm text-yellow-600/80 leading-relaxed">
                  API keys are stored in the database. Never share your keys or commit them to version control. 
                  The DeepSeek key currently configured appears to be invalid — please update it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
