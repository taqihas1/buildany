"use client";

import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Code2, Zap } from "lucide-react";

export function DashboardHeader({ user }: { user: any }) {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">BuildAny</span>
          <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20">
            Beta
          </span>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span>{user.creditsUsed || 0} / {user.creditsTotal || 100} credits</span>
              </div>
              <UserButton />
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <button className="text-sm text-slate-400 hover:text-white transition-colors">Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="text-sm bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                  Get Started
                </button>
              </SignUpButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
