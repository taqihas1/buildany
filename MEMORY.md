# MEMORY.md - Long-Term Memory

## Expo / React Native Debugging

When building React Native apps with Expo, these 5 issues happen predictably. Created a skill (`expo-react-native-debug`) to catch them pre-flight:

1. **Expo SDK mismatch** — iOS Expo Go auto-updates. Always match project SDK to user's Expo Go.
2. **React version mismatch** — `react` MUST match `react-native-renderer` exactly (e.g. both 19.1.0).
3. **npm ERESOLVE** — Always use `--legacy-peer-deps` for Expo projects.
4. **Metro cache** — Always use `--clear` after SDK changes.
5. **ngrok tunnel** — Can go stale. Verify with `curl` before giving QR to user.

**NEW (2026-05-15):**
6. **Silent Metro bundler failures** — When Expo Go shows "timeout", the bundler is usually failing, not the network. Always `curl http://localhost:PORT` to see actual Metro errors.
7. **Missing peer dependencies** — `@trpc/react-query` requires `@trpc/server` even for client-only use. Metro won't warn about this — it'll just fail.
8. **Circular imports with path aliases** — `lib/fridge.tsx` importing `@/lib/fridge` resolves to itself. Always use relative imports (`./fridge`) within the same directory.
9. **Path alias mismatches** — `@/constants/theme` won't find `lib/constants/theme.ts`. Path aliases in tsconfig must map to actual file locations.
10. **First bundle build time** — With `--clear`, initial Metro build can take 2+ minutes. Warn users to be patient on first connect.

Skill location: `skills/expo-react-native-debug/`
Pre-flight script: `node scripts/expo-preflight.js <project-dir>`

## User's Communication Style

Extremely concise and imperative. Sends screenshots of errors directly (very efficient). Knows React Native basics. Wants automated solutions — asked for a skill to prevent issues next time.

## Technical Preferences

Pragmatic tool-stack assembler who values inspectable, downloadable artifacts. Preference for modular, composable systems. Favors mid-size efficient models over frontier-scale options.

## Active Projects

- Dealership App (React Native + Expo SDK 54) — dealership locator with maps, search, settings
- RFP Automation System — web form → JSON → markdown → RFP pipeline
- SharePoint-hosted knowledge base of markdown files
