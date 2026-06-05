export async function generateComponentCode(prompt: string, platform: 'web' | 'mobile' = 'web') {
  return `// Auto-generated component for: ${prompt}
// Platform: ${platform}
`;
}
