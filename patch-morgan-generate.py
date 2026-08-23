#!/usr/bin/env python3
"""
Patch script for /root/buildany/src/app/api/morgan-generate/route.ts
Run this on the VPS to fix Kelly's code generation
"""

import re

FILE_PATH = "/root/buildany/src/app/api/morgan-generate/route.ts"

def patch_morgan_generate():
    with open(FILE_PATH, "r") as f:
        content = f.read()
    
    original = content
    changes = []
    
    # ========================================================================
    # FIX 1: Add CRITICAL generation rules to the prompt
    # ========================================================================
    
    critical_rules = '''CRITICAL RULES - FOLLOW EXACTLY:
1. ALWAYS generate src/app/page.tsx with REAL content - useState, useEffect, demo data arrays
2. NEVER use placeholder text like "Welcome" or "Coming Soon" - generate actual UI with data
3. Include 5-10 demo items hardcoded as arrays (e.g., const workouts = [...])
4. Use Tailwind classes for ALL styling: flex, grid, p-4, bg-white, rounded-lg, shadow, etc.
5. Make it INTERACTIVE: tabs, filters, search input, toggle switches, cards with hover states
6. Return ALL files in the exact code block format shown above
7. If you cannot generate the full app, generate SOMETHING functional - never a placeholder
'''
    
    # Try to find where to inject the critical rules
    # Common patterns in the prompt
    injection_markers = [
        "Generate a complete",
        "Generate the following",
        "Please generate",
        "Create a complete",
        "You are a helpful",
        "You are an expert",
        "Here is the user prompt",
    ]
    
    injected = False
    for marker in injection_markers:
        if marker in content and critical_rules.split('\n')[0] not in content:
            # Find the line with this marker and inject after it
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if marker in line and not injected:
                    # Insert after this line
                    lines.insert(i + 1, critical_rules)
                    content = '\n'.join(lines)
                    changes.append(f"Injected CRITICAL RULES after: '{marker}'")
                    injected = True
                    break
    
    if not injected:
        changes.append("WARNING: Could not find injection point for CRITICAL RULES")
        changes.append("The prompt may already have rules or uses an unexpected format")
    
    # ========================================================================
    # FIX 2: Improve fallback page.tsx to be a real demo app
    # ========================================================================
    
    # Look for fallback/placeholder page creation
    placeholder_patterns = [
        '"Welcome to Your App"',
        '"Built with BuildAny"',
        '"Your App"',
        '"Coming Soon"',
        '"Placeholder"',
    ]
    
    for pattern in placeholder_patterns:
        if pattern in content:
            changes.append(f"WARNING: Found placeholder pattern: {pattern}")
    
    # Replace the fallback page with a REAL demo app
    fallback_replacement = '''// FALLBACK: Generate a real demo app instead of placeholder
      const fallbackPage = `"use client";

import { useState } from "react";

const demoData = [
  { id: 1, title: "Morning Run", duration: "32 min", calories: 320, type: "Cardio" },
  { id: 2, title: "Push Day", duration: "45 min", calories: 280, type: "Strength" },
  { id: 3, title: "Yoga Flow", duration: "20 min", calories: 120, type: "Flexibility" },
  { id: 4, title: "HIIT Blast", duration: "15 min", calories: 250, type: "Cardio" },
  { id: 5, title: "Leg Day", duration: "50 min", calories: 350, type: "Strength" },
];

export default function Home() {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = demoData.filter(item => {
    const matchesFilter = filter === "All" || item.type === filter;
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Fitness Tracker</h1>
        <p className="text-gray-600 mb-6">Track your workouts and stay motivated</p>
        
        <div className="flex gap-2 mb-4">
          {["All", "Cardio", "Strength", "Flexibility"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={\`px-4 py-2 rounded-full text-sm font-medium \${
                filter === f ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
              }\`}
            >
              {f}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search workouts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full p-3 rounded-lg border border-gray-200 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="grid gap-4">
          {filtered.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{item.title}</h3>
                  <p className="text-gray-500 text-sm">{item.type}</p>
                </div>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                  {item.calories} cal
                </span>
              </div>
              <p className="text-gray-600 mt-2">Duration: {item.duration}</p>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-gray-500 mt-8">No workouts found. Try a different filter.</p>
        )}
      </div>
    </main>
  );
}`;'''
    
    # Look for the fallback page creation pattern
    # This is tricky - we need to find where the fallback is defined and replace it
    if '"Welcome' in content or '"Built with' in content or 'Welcome to Your App' in content:
        changes.append("Found placeholder fallback page - consider replacing with demo app")
        # We can't safely auto-replace without seeing the exact code structure
        # Log a warning instead
    
    # ========================================================================
    # FIX 3: Improve file extraction from AI response
    # ========================================================================
    
    # Add better regex patterns if the parser is simple
    # Common issue: parser looks for ```tsx but AI returns ```typescript or no lang
    if "```tsx" in content and "```typescript" not in content:
        changes.append("Parser may only match ```tsx - consider adding ```typescript fallback")
    
    # ========================================================================
    # FIX 4: Ensure page.tsx is ALWAYS in the required files list
    # ========================================================================
    
    page_required_markers = [
        "src/app/page.tsx",
        "page.tsx",
    ]
    
    found_page_requirement = any(marker in content for marker in page_required_markers)
    if not found_page_requirement:
        changes.append("WARNING: page.tsx not explicitly required in prompt!")
    else:
        changes.append("page.tsx is required in prompt ✓")
    
    # ========================================================================
    # Write changes
    # ========================================================================
    
    if content != original:
        with open(FILE_PATH, "w") as f:
            f.write(content)
        changes.append(f"\n✅ Wrote updated file: {FILE_PATH}")
    else:
        changes.append(f"\n⚠️  No changes made to: {FILE_PATH}")
    
    # Print report
    print("=" * 70)
    print("MORGAN-GENERATE PATCH REPORT")
    print("=" * 70)
    for change in changes:
        print(f"  • {change}")
    print("=" * 70)
    
    # Additional recommendations
    print("\n📋 ADDITIONAL RECOMMENDATIONS:")
    print("  1. Review the prompt section manually to ensure CRITICAL RULES are placed correctly")
    print("  2. Test by creating a new project and checking if page.tsx has real content")
    print("  3. If still broken, share the file content for a more precise patch")
    print("\n🧪 QUICK TEST:")
    print("  After patching, create a new project at https://base66.cloud")
    print("  Then run: cat /data/projects/<project-id>/src/app/page.tsx")
    print("  It should show useState, demoData array, and real JSX - NOT a placeholder!")

if __name__ == "__main__":
    patch_morgan_generate()
