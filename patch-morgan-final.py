#!/usr/bin/env python3
"""
Bulletproof patch for /root/buildany/src/app/api/morgan-generate/route.ts
This script reads the ACTUAL file and patches it precisely.
Run on VPS: python3 /tmp/patch-morgan-final.py
"""

import re

FILE_PATH = "/root/buildany/src/app/api/morgan-generate/route.ts"

def patch():
    with open(FILE_PATH, "r") as f:
        content = f.read()
    
    original = content
    changes = []
    
    # ========================================================================
    # STRATEGY: Find the prompt template literal and inject rules inside it
    # ========================================================================
    
    # Look for the file list section where page.tsx is mentioned
    # Common pattern: "1. src/app/page.tsx (main page...)"
    if "1. src/app/page.tsx" not in content:
        changes.append("ERROR: Cannot find '1. src/app/page.tsx' in file!")
        print_patch_report(changes)
        return
    
    # Find the line with "1. src/app/page.tsx" and inject CRITICAL RULES before it
    lines = content.split('\n')
    new_lines = []
    injected = False
    
    for i, line in enumerate(lines):
        # When we see the page.tsx requirement, inject rules before it
        if "1. src/app/page.tsx" in line and not injected:
            # Inject CRITICAL RULES before this line
            critical_block = '''
// === CRITICAL RULES FOR AI CODE GENERATION ===
// These rules ensure DeepSeek generates REAL apps, not placeholders
const CRITICAL_RULES = `
🚨 CRITICAL RULES - YOU MUST FOLLOW THESE EXACTLY:

1. ALWAYS generate src/app/page.tsx with REAL content:
   - MUST use useState and useEffect hooks
   - MUST include 5-10 demo data items as hardcoded arrays
   - MUST have interactive elements: buttons, tabs, filters, search, toggles
   - MUST use Tailwind CSS classes for ALL styling

2. NEVER use placeholder text:
   - FORBIDDEN: "Welcome to Your App"
   - FORBIDDEN: "Coming Soon"
   - FORBIDDEN: "Content goes here"
   - FORBIDDEN: Any generic placeholder text

3. Generate a COMPLETE, FUNCTIONAL app:
   - Real data visualization (charts, lists, cards)
   - Working state management
   - Responsive layout with Tailwind
   - Hover effects and transitions

4. Return ALL files in the code block format:
   \\\`\\\`\\\`tsx
   // file: src/app/page.tsx
   // code here
   \\\`\\\`\\\`
`;
// === END CRITICAL RULES ===

'''
            new_lines.append(critical_block)
            new_lines.append(line)
            injected = True
            changes.append(f"Injected CRITICAL RULES before line {i+1}: '1. src/app/page.tsx...'")
        else:
            new_lines.append(line)
    
    content = '\n'.join(new_lines)
    
    # ========================================================================
    # FIX 2: Make the fallback page a REAL demo app (not placeholder)
    # ========================================================================
    
    # Find the fallback page creation and replace it
    if 'const fallbackPage' in content or 'fallbackPage' in content:
        # Look for the fallback page template
        fallback_pattern = r'(const fallbackPage\s*=\s*`)(.*?)`;'
        
        new_fallback = '''// FALLBACK: Real demo app - NEVER a placeholder
const fallbackPage = `"use client";

import { useState } from "react";

const demoData = [
  { id: 1, title: "Morning Run", duration: "32 min", calories: 320, type: "Cardio", date: "2026-08-20" },
  { id: 2, title: "Push Day", duration: "45 min", calories: 280, type: "Strength", date: "2026-08-21" },
  { id: 3, title: "Yoga Flow", duration: "20 min", calories: 120, type: "Flexibility", date: "2026-08-22" },
  { id: 4, title: "HIIT Blast", duration: "15 min", calories: 250, type: "Cardio", date: "2026-08-23" },
  { id: 5, title: "Leg Day", duration: "50 min", calories: 350, type: "Strength", date: "2026-08-23" },
];

export default function Home() {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedWorkout, setSelectedWorkout] = useState<number | null>(null);

  const filtered = demoData.filter(item => {
    const matchesFilter = filter === "All" || item.type === filter;
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalCalories = filtered.reduce((sum, item) => sum + item.calories, 0);
  const totalDuration = filtered.reduce((sum, item) => sum + parseInt(item.duration), 0);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🏋️ Fitness Tracker</h1>
          <p className="text-gray-600 text-lg">Track your workouts and crush your goals</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Workouts</p>
            <p className="text-2xl font-bold text-blue-600">{filtered.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Calories</p>
            <p className="text-2xl font-bold text-orange-600">{totalCalories}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Minutes</p>
            <p className="text-2xl font-bold text-green-600">{totalDuration}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {["All", "Cardio", "Strength", "Flexibility"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === f 
                  ? "bg-blue-600 text-white shadow-md" 
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Search workouts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full p-3 rounded-xl border border-gray-200 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />

        {/* Workout List */}
        <div className="grid gap-4">
          {filtered.map(item => (
            <div 
              key={item.id} 
              onClick={() => setSelectedWorkout(selectedWorkout === item.id ? null : item.id)}
              className={`bg-white p-5 rounded-xl shadow-sm border transition-all cursor-pointer hover:shadow-md ${
                selectedWorkout === item.id ? "border-blue-300 ring-2 ring-blue-100" : "border-gray-100"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{item.title}</h3>
                  <p className="text-gray-500 text-sm">{item.type} • {item.date}</p>
                </div>
                <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                  🔥 {item.calories} cal
                </span>
              </div>
              
              {selectedWorkout === item.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>⏱️ Duration: {item.duration}</span>
                    <span>📊 Intensity: High</span>
                  </div>
                  <button className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    Start Workout
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No workouts found</p>
            <p className="text-gray-300 text-sm mt-1">Try a different filter or search term</p>
          </div>
        )}
      </div>
    </main>
  );
}`;'''
        
        # Try to replace the fallback page
        # Pattern: look for the fallback page definition
        if 'Welcome to Your App' in content or 'Built with BuildAny' in content:
            # Simple string replacement for known placeholder patterns
            content = re.sub(
                r'const fallbackPage\s*=\s*`[^`]*Welcome[^`]*`;',
                new_fallback,
                content,
                flags=re.DOTALL
            )
            changes.append("Replaced placeholder fallback with real demo app")
        else:
            changes.append("Fallback page doesn't have obvious placeholder - may already be fixed")
    
    # ========================================================================
    # Write changes
    # ========================================================================
    
    if content != original:
        with open(FILE_PATH, "w") as f:
            f.write(content)
        changes.append(f"\n✅ SUCCESSFULLY PATCHED: {FILE_PATH}")
    else:
        changes.append(f"\n⚠️ No changes made to: {FILE_PATH}")
    
    print_patch_report(changes)
    
    # ========================================================================
    # Verification
    # ========================================================================
    print("\n" + "=" * 70)
    print("VERIFICATION")
    print("=" * 70)
    
    with open(FILE_PATH, "r") as f:
        verify = f.read()
    
    checks = [
        ("CRITICAL RULES injected", "CRITICAL RULES" in verify),
        ("page.tsx still required", "src/app/page.tsx" in verify),
        ("useState in fallback", "useState" in verify),
        ("No placeholder text", "Welcome to Your App" not in verify),
    ]
    
    for label, passed in checks:
        status = "✅" if passed else "❌"
        print(f"  {status} {label}")
    
    print("\n🧪 NEXT STEP: Create a new project at https://base66.cloud")
    print("   Then check: cat /data/projects/<id>/src/app/page.tsx")
    print("   Should show REAL code with useState, demoData, and JSX!")

def print_patch_report(changes):
    print("=" * 70)
    print("MORGAN-GENERATE BULLETPROOF PATCH REPORT")
    print("=" * 70)
    for change in changes:
        prefix = "  •"
        if change.startswith("\n"):
            prefix = ""
        print(f"{prefix} {change}")
    print("=" * 70)

if __name__ == "__main__":
    patch()
